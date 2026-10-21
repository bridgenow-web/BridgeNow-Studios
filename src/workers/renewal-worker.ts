import { brandPlansConfig } from "@/config/brand-plans";
import { creatorPlansConfig } from "@/config/creator-plans";
import { prisma } from "@/lib/db";
import { dedupeKeyFor, maskVpa, sendTransactional } from "@/lib/email/send";

/**
 * Finds every active subscription whose next debit lands inside the next 24
 * hours and fires the pre-expiry reminder exactly once per cycle.
 *
 * Three layers stop a double-send:
 *   1. `last_reminder_sent_for` on the subscription row (per cycle)
 *   2. the unique `dedupe_key` on email_logs (per kind + cycle)
 *   3. the provider's own X-Entity-Ref-ID header (per Gmail thread)
 *
 * Safe to run every hour, and safe to run twice by accident.
 */

const WINDOW_HOURS = 24;

export interface ReminderRunResult {
  scanned: number;
  sent: number;
  skipped: number;
  failed: number;
  errors: string[];
}

export async function runRenewalReminders(): Promise<ReminderRunResult> {
  const now = new Date();
  const horizon = new Date(now.getTime() + WINDOW_HOURS * 60 * 60 * 1000);

  const result: ReminderRunResult = { scanned: 0, sent: 0, skipped: 0, failed: 0, errors: [] };

  // `cycleOptOutAt: null` — a customer may opt out of a single debit during
  // the 24h notification window. Opted-out cycles get no reminder and, per
  // `assertNotifiedInTime` below, no debit either.
  const [creators, brands] = await Promise.all([
    prisma.creatorSubscription.findMany({
      where: {
        status: "active",
        // Lifetime plans never debit again. Sending a pre-debit notice for a
        // payment that will not happen is precisely what the RBI framework
        // exists to prevent, so they are excluded at the query.
        billing: { not: "lifetime" },
        nextBillingDate: { gte: now, lte: horizon },
        cycleOptOutAt: null,
      },
      include: { user: true },
    }),
    prisma.brandSubscription.findMany({
      where: {
        status: "active",
        billing: { not: "lifetime" },
        nextBillingDate: { gte: now, lte: horizon },
        cycleOptOutAt: null,
      },
      include: { brand: true },
    }),
  ]);

  const rows = [
    ...creators.map((s) => ({
      kind: "creator" as const,
      id: s.id,
      tier: s.tier as string,
      amountInPaise: s.amountInPaise,
      nextBillingDate: s.nextBillingDate,
      lastReminderSentFor: s.lastReminderSentFor,
      profile: s.user,
    })),
    ...brands.map((s) => ({
      kind: "brand" as const,
      id: s.id,
      tier: s.tier as string,
      amountInPaise: s.amountInPaise,
      nextBillingDate: s.nextBillingDate,
      lastReminderSentFor: s.lastReminderSentFor,
      profile: s.brand,
    })),
  ];

  result.scanned = rows.length;

  for (const row of rows) {
    // Layer 1: already reminded for this exact cycle?
    if (
      row.lastReminderSentFor &&
      row.lastReminderSentFor.getTime() === row.nextBillingDate.getTime()
    ) {
      result.skipped += 1;
      continue;
    }

    try {
      const lastPayment = await prisma.payment.findFirst({
        where: {
          ...(row.kind === "creator"
            ? { creatorSubscriptionId: row.id }
            : { brandSubscriptionId: row.id }),
          status: "captured",
        },
        orderBy: { capturedAt: "desc" },
        select: { vpa: true },
      });

      const { sent, reason } = await sendTransactional({
        kind: "pre_expiry_reminder",
        to: row.profile.email,
        userId: row.profile.id,
        dedupeKey: dedupeKeyFor("pre_expiry_reminder", row.id, row.nextBillingDate),
        context: {
          audience: row.kind,
          firstName: firstNameOf(row.profile.fullName, row.profile.email),
          planName: planLabel(row.tier),
          amountInPaise: row.amountInPaise,
          nextBillingDate: row.nextBillingDate,
          maskedVpa: maskVpa(lastPayment?.vpa),
        },
      });

      if (sent) {
        // Layer 1 bookkeeping — only after a confirmed send.
        // `preDebitNotifiedAt` is the evidence timestamp the RBI E-Mandate
        // Framework 2026 expects: the debit must not run until 24h after it.
        const data = {
          lastReminderSentFor: row.nextBillingDate,
          preDebitNotifiedAt: new Date(),
        };
        if (row.kind === "creator") {
          await prisma.creatorSubscription.update({ where: { id: row.id }, data });
        } else {
          await prisma.brandSubscription.update({ where: { id: row.id }, data });
        }
        result.sent += 1;
      } else if (reason === "duplicate") {
        result.skipped += 1;
      } else {
        result.failed += 1;
        result.errors.push(`${row.id}: ${reason ?? "unknown"}`);
      }
    } catch (err) {
      result.failed += 1;
      result.errors.push(`${row.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return result;
}

/**
 * Abort guard. Call this immediately before triggering any debit you control.
 *
 * The RBI E-Mandate Framework 2026 sets a hard 24-hour floor between the
 * pre-debit notification and the debit, and the customer may opt out inside
 * that window. If a queue backlog delayed the notice, the correct behaviour
 * is to skip the cycle, not to charge late.
 *
 * (With Razorpay Subscriptions the PSP issues the statutory notice and runs
 * the debit itself — this guard covers any debit BridgeNow triggers directly,
 * and documents the invariant either way.)
 */
export function assertNotifiedInTime(sub: {
  preDebitNotifiedAt: Date | null;
  cycleOptOutAt: Date | null;
  nextBillingDate: Date;
}): { ok: boolean; reason?: string } {
  if (sub.cycleOptOutAt) return { ok: false, reason: "customer_opted_out" };
  if (!sub.preDebitNotifiedAt) return { ok: false, reason: "no_pre_debit_notice" };

  const elapsedMs = Date.now() - sub.preDebitNotifiedAt.getTime();
  if (elapsedMs < 24 * 60 * 60 * 1000) {
    return { ok: false, reason: "notice_too_recent" };
  }
  return { ok: true };
}

function planLabel(tier: string): string {
  const plan =
    creatorPlansConfig.plans.find((p) => p.id === tier) ??
    brandPlansConfig.plans.find((p) => p.id === tier);
  if (!plan) return tier;
  const t = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();
  return `${t(plan.nameTop)} ${t(plan.nameBottom)}`;
}

function firstNameOf(fullName: string | null, email: string): string {
  if (fullName?.trim()) return fullName.trim().split(/\s+/)[0]!;
  return email.split("@")[0]!;
}

// ── Standalone runner: `npm run worker:renewals` ──────────────────────
if (require.main === module) {
  runRenewalReminders()
    .then((r) => {
      console.log("[renewal-reminders]", JSON.stringify(r, null, 2));
      process.exit(r.failed > 0 ? 1 : 0);
    })
    .catch((e) => {
      console.error("[renewal-reminders] fatal", e);
      process.exit(1);
    });
}
