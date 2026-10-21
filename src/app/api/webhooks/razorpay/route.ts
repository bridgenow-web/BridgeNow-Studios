import { NextResponse } from "next/server";

import { brandPlansConfig } from "@/config/brand-plans";
import { creatorPlansConfig } from "@/config/creator-plans";
import type { Plan } from "@/config/plans.types";
import { GRACE_DAYS, addDays, prisma } from "@/lib/db";
import { dedupeKeyFor, maskVpa, sendTransactional } from "@/lib/email/send";
import { verifyWebhookSignature } from "@/lib/razorpay";

export const runtime = "nodejs"; // needs node:crypto + raw body
export const dynamic = "force-dynamic";

/**
 * Razorpay webhook receiver.
 *
 * Contract we hold ourselves to:
 *   1. Verify the HMAC on the RAW body before parsing. No signature, no entry.
 *   2. Persist the event first (unique on event_id) — replays become no-ops.
 *   3. Mutate subscription state inside a transaction.
 *   4. Always return 200 once the event is stored, even if a downstream step
 *      failed; otherwise Razorpay retries forever and we re-send emails.
 *      Failures are recorded on the row and retried by our own worker.
 *
 * Subscribe to these events in the Razorpay dashboard:
 *   subscription.authenticated   → mandate.authorized (our naming)
 *   subscription.activated
 *   subscription.charged         → payment.captured + subscription.renewed
 *   subscription.pending         → debit failed, retrying
 *   subscription.halted          → retries exhausted
 *   subscription.cancelled       → mandate.revoked
 *   payment.failed
 */

type RzpEvent = {
  event: string;
  payload: {
    subscription?: { entity: RzpSubscription };
    payment?: { entity: RzpPayment };
  };
};

interface RzpSubscription {
  id: string;
  status: string;
  plan_id: string;
  customer_id: string;
  current_end?: number;
  charge_at?: number;
  notes?: Record<string, string>;
}

interface RzpPayment {
  id: string;
  order_id?: string;
  amount: number;
  currency: string;
  status: string;
  method?: string;
  vpa?: string;
  error_description?: string;
  description?: string;
  notes?: Record<string, string>;
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let event: RzpEvent;
  try {
    event = JSON.parse(rawBody) as RzpEvent;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  // Razorpay sends a per-delivery id; fall back to a content hash.
  const eventId =
    req.headers.get("x-razorpay-event-id") ??
    `${event.event}:${event.payload.subscription?.entity.id ?? event.payload.payment?.entity.id}`;

  // ── Step 2: idempotent claim ────────────────────────────────────────
  try {
    await prisma.webhookEvent.create({
      data: {
        eventId,
        eventType: event.event,
        payload: event as object,
        signature,
      },
    });
  } catch {
    return NextResponse.json({ ok: true, deduped: true }); // already seen
  }

  // ── Step 3: handle ──────────────────────────────────────────────────
  try {
    await handleEvent(event);
    await prisma.webhookEvent.update({
      where: { eventId },
      data: { processedAt: new Date() },
    });
  } catch (err) {
    await prisma.webhookEvent.update({
      where: { eventId },
      data: { error: err instanceof Error ? err.message : String(err) },
    });
    // 200 on purpose — see contract note 4.
  }

  return NextResponse.json({ ok: true });
}

// ───────────────────────────── Dispatch ──────────────────────────────

async function handleEvent(event: RzpEvent) {
  const sub = event.payload.subscription?.entity;
  const pay = event.payload.payment?.entity;

  switch (event.event) {
    case "subscription.authenticated":
      // Mandate approved in the payer's UPI app. Money has not moved yet.
      if (sub) await onMandateAuthorized(sub);
      break;

    case "subscription.activated":
    case "subscription.charged":
      // First or recurring debit captured.
      if (sub) await onCharged(sub, pay);
      break;

    case "subscription.pending":
      // A debit failed; Razorpay will retry. Open the grace window.
      if (sub) await onDebitFailed(sub);
      break;

    case "subscription.halted":
      // Retries exhausted.
      if (sub) await onHalted(sub);
      break;

    case "subscription.cancelled":
    case "subscription.completed":
      if (sub) await onMandateRevoked(sub);
      break;

    case "payment.failed":
      if (pay) await recordPayment(pay, "failed");
      break;

    default:
      break; // stored for audit, nothing to do
  }
}

// ─────────────────────────── Handlers ────────────────────────────────

async function onMandateAuthorized(sub: RzpSubscription) {
  const target = await locate(sub.id);
  if (!target) return;

  const data = {
    mandateStatus: "authorized" as const,
    upiMandateId: sub.id,
    gatewayCustomerId: sub.customer_id,
  };

  if (target.audience === "creator") {
    await prisma.creatorSubscription.update({ where: { id: target.id }, data });
  } else {
    await prisma.brandSubscription.update({ where: { id: target.id }, data });
  }
}

async function onCharged(sub: RzpSubscription, pay?: RzpPayment) {
  const target = await locate(sub.id);
  if (!target) return;

  const plan = findPlan(target.tier);
  const validityDays = plan?.validityDays ?? 30;

  const isFirstCycle = target.status === "pending";
  const anchor = new Date(
    Math.max(target.currentPeriodEnd.getTime(), Date.now()),
  );
  const nextDate = sub.charge_at
    ? new Date(sub.charge_at * 1000) // trust the gateway's own schedule
    : addDays(anchor, validityDays);

  await prisma.$transaction(async (tx) => {
    const data = {
      status: "active" as const,
      mandateStatus: "authorized" as const,
      upiMandateId: sub.id,
      currentPeriodEnd: nextDate,
      nextBillingDate: nextDate,
      graceEndsAt: null,
      ...(target.audience === "brand" ? { renewalDate: nextDate } : {}),
    };

    if (target.audience === "creator") {
      await tx.creatorSubscription.update({ where: { id: target.id }, data });
    } else {
      await tx.brandSubscription.update({ where: { id: target.id }, data });
    }

    if (pay) {
      await tx.payment.upsert({
        where: { gatewayPaymentId: pay.id },
        create: {
          userId: target.profileId,
          ...(target.audience === "creator"
            ? { creatorSubscriptionId: target.id }
            : { brandSubscriptionId: target.id }),
          gatewayPaymentId: pay.id,
          gatewayOrderId: pay.order_id ?? null,
          amountInPaise: pay.amount,
          currency: pay.currency,
          status: "captured",
          method: pay.method ?? "upi",
          vpa: pay.vpa ?? null,
          capturedAt: new Date(),
        },
        update: { status: "captured", capturedAt: new Date() },
      });
    }
  });

  // ── Email: welcome on cycle 1, renewal confirmation thereafter ──────
  const profile = await prisma.profile.findUnique({ where: { id: target.profileId } });
  if (!profile) return;

  const ctx = {
    audience: target.audience,
    firstName: firstNameOf(profile.fullName, profile.email),
    planName: planLabel(target.tier),
    amountInPaise: pay?.amount ?? target.amountInPaise,
    nextBillingDate: nextDate,
    maskedVpa: maskVpa(pay?.vpa),
    features: plan?.features.map((f) => f.label),
    paymentId: pay?.id,
  };

  await sendTransactional({
    kind: isFirstCycle ? "welcome" : "renewal_success",
    to: profile.email,
    userId: profile.id,
    dedupeKey: dedupeKeyFor(
      isFirstCycle ? "welcome" : "renewal_success",
      target.id,
      isFirstCycle ? new Date(0) : new Date(),
    ),
    context: ctx,
  });
}

async function onDebitFailed(sub: RzpSubscription) {
  const target = await locate(sub.id);
  if (!target) return;

  const data = {
    status: "grace_period" as const,
    graceEndsAt: addDays(new Date(), GRACE_DAYS),
  };

  if (target.audience === "creator") {
    await prisma.creatorSubscription.update({ where: { id: target.id }, data });
  } else {
    await prisma.brandSubscription.update({ where: { id: target.id }, data });
  }
}

async function onHalted(sub: RzpSubscription) {
  const target = await locate(sub.id);
  if (!target) return;
  const data = { status: "expired" as const, mandateStatus: "paused" as const };
  if (target.audience === "creator") {
    await prisma.creatorSubscription.update({ where: { id: target.id }, data });
  } else {
    await prisma.brandSubscription.update({ where: { id: target.id }, data });
  }
}

async function onMandateRevoked(sub: RzpSubscription) {
  const target = await locate(sub.id);
  if (!target) return;
  const data = {
    status: "cancelled" as const,
    mandateStatus: "revoked" as const,
    cancelledAt: new Date(),
  };
  if (target.audience === "creator") {
    await prisma.creatorSubscription.update({ where: { id: target.id }, data });
  } else {
    await prisma.brandSubscription.update({ where: { id: target.id }, data });
  }
}

async function recordPayment(pay: RzpPayment, status: "failed") {
  const profileId = pay.notes?.profile_id;
  if (!profileId) return;
  await prisma.payment.upsert({
    where: { gatewayPaymentId: pay.id },
    create: {
      userId: profileId,
      gatewayPaymentId: pay.id,
      gatewayOrderId: pay.order_id ?? null,
      amountInPaise: pay.amount,
      currency: pay.currency,
      status,
      method: pay.method ?? "upi",
      vpa: pay.vpa ?? null,
      failureReason: pay.error_description ?? null,
    },
    update: { status, failureReason: pay.error_description ?? null },
  });
}

// ───────────────────────────── Helpers ───────────────────────────────

interface Located {
  id: string;
  audience: "creator" | "brand";
  profileId: string;
  tier: string;
  status: string;
  amountInPaise: number;
  currentPeriodEnd: Date;
}

/** One gateway subscription id maps to exactly one row across both tables. */
async function locate(gatewaySubscriptionId: string): Promise<Located | null> {
  const c = await prisma.creatorSubscription.findFirst({
    where: {
      OR: [
        { gatewaySubscriptionId },
        { upiMandateId: gatewaySubscriptionId },
      ],
    },
  });
  if (c) {
    return {
      id: c.id,
      audience: "creator",
      profileId: c.userId,
      tier: c.tier,
      status: c.status,
      amountInPaise: c.amountInPaise,
      currentPeriodEnd: c.currentPeriodEnd,
    };
  }

  const b = await prisma.brandSubscription.findFirst({
    where: {
      OR: [
        { gatewaySubscriptionId },
        { upiMandateId: gatewaySubscriptionId },
      ],
    },
  });
  if (b) {
    return {
      id: b.id,
      audience: "brand",
      profileId: b.brandId,
      tier: b.tier,
      status: b.status,
      amountInPaise: b.amountInPaise,
      currentPeriodEnd: b.currentPeriodEnd,
    };
  }
  return null;
}

function findPlan(tier: string): Plan | undefined {
  return (
    creatorPlansConfig.plans.find((p) => p.id === tier) ??
    brandPlansConfig.plans.find((p) => p.id === tier)
  );
}

function planLabel(tier: string): string {
  const plan = findPlan(tier);
  return plan ? `${titleCase(plan.nameTop)} ${titleCase(plan.nameBottom)}` : tier;
}

const titleCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

function firstNameOf(fullName: string | null, email: string): string {
  if (fullName?.trim()) return fullName.trim().split(/\s+/)[0]!;
  return email.split("@")[0]!;
}
