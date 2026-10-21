import { NextResponse } from "next/server";
import { z } from "zod";

import { brandPlansConfig } from "@/config/brand-plans";
import { creatorPlansConfig } from "@/config/creator-plans";
import { isRecurring, type Plan } from "@/config/plans.types";
import { addDays, prisma } from "@/lib/db";
import { createUpiMandate } from "@/lib/razorpay";
import { getSessionProfile } from "@/lib/auth";

export const runtime = "nodejs";

const BodySchema = z.object({
  tier: z.string().min(3),
  audience: z.enum(["creator", "brand"]),
});

/**
 * Starts a UPI autopay mandate.
 *
 * Price is resolved SERVER-SIDE from the plan catalogue — the client sends a
 * tier id, never an amount. That is the whole security model for pricing.
 */
export async function POST(req: Request) {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });

  const { tier, audience } = parsed.data;

  if (profile.role !== audience && profile.role !== "admin") {
    return NextResponse.json({ error: "role mismatch" }, { status: 403 });
  }

  const catalogue = audience === "creator" ? creatorPlansConfig : brandPlansConfig;
  const plan = catalogue.plans.find((p) => p.id === tier) as Plan | undefined;

  if (!plan) return NextResponse.json({ error: "unknown plan" }, { status: 404 });
  if (plan.status !== "live") {
    return NextResponse.json({ error: "plan not yet available" }, { status: 409 });
  }

  // One live subscription per account — mirrors the partial unique index.
  const existing =
    audience === "creator"
      ? await prisma.creatorSubscription.findFirst({
          where: { userId: profile.id, status: { in: ["active", "grace_period", "pending"] } },
        })
      : await prisma.brandSubscription.findFirst({
          where: { brandId: profile.id, status: { in: ["active", "grace_period", "pending"] } },
        });

  if (existing) {
    return NextResponse.json(
      { error: "already_subscribed", subscriptionId: existing.id },
      { status: 409 },
    );
  }

  // A lifetime plan is bought once. Creating an e-mandate for it would set up
  // a recurring debit nobody agreed to, so there is no mandate, no gateway
  // subscription and nothing for the renewal sweep to find.
  const recurring = isRecurring(plan);

  const mandate = recurring
    ? await createUpiMandate({
        plan,
        profileId: profile.id,
        email: profile.email,
        name: profile.fullName,
        phone: profile.phone,
      })
    : null;

  const now = new Date();
  const periodEnd = addDays(now, plan.validityDays);

  const common = {
    tier: plan.id as never,
    status: "pending" as const,
    billing: plan.billing as never,
    amountInPaise: plan.priceInPaise,
    currency: plan.currency,
    gatewayCustomerId: mandate?.customerId ?? null,
    gatewaySubscriptionId: mandate?.subscriptionId ?? null,
    upiMandateId: mandate?.subscriptionId ?? null,
    mandateStatus: mandate ? ("created" as const) : null,
    // Headroom so a future price rise doesn't force re-authorization.
    mandateMaxAmountInPaise: mandate
      ? Math.max(plan.priceInPaise * 2, 100_000)
      : null,
    startDate: now,
    currentPeriodEnd: periodEnd,
    nextBillingDate: periodEnd,
  };

  const subscription =
    audience === "creator"
      ? await prisma.creatorSubscription.create({ data: { ...common, userId: profile.id } })
      : await prisma.brandSubscription.create({
          data: {
            ...common,
            brandId: profile.id,
            reelsSupportedMax: plan.limits.reelsSupportedMax ?? null,
            scriptedReelsLimit: plan.limits.scriptedReels ?? null,
            editedReelsLimit: plan.limits.editedReels ?? null,
            strategySessionsLimit: plan.limits.strategySessionsPerMonth ?? null,
          },
        });

  return NextResponse.json({
    subscriptionId: subscription.id,
    gatewaySubscriptionId: mandate?.subscriptionId ?? null,
    // Null for a lifetime plan — there is no mandate page to send anyone to.
    // The client falls back to the one-time QR, which is the only way to pay
    // for it.
    shortUrl: mandate?.shortUrl ?? null,
    recurring,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    amountInPaise: plan.priceInPaise,
  });
}
