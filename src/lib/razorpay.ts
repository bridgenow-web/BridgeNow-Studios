import crypto from "node:crypto";
import Razorpay from "razorpay";

import type { Plan } from "@/config/plans.types";

/**
 * Razorpay client + the three primitives the autopay flow needs:
 *   1. a customer
 *   2. a subscription against a pre-created plan (this is the UPI e-mandate)
 *   3. webhook signature verification
 *
 * Why Razorpay Subscriptions rather than raw orders: Razorpay registers the
 * NPCI mandate with the payer's bank/PSP, then auto-debits on schedule and
 * fires `subscription.charged`. You never hold the mandate yourself.
 */

export const razorpay = new Razorpay({
  key_id: requireEnv("RAZORPAY_KEY_ID"),
  key_secret: requireEnv("RAZORPAY_KEY_SECRET"),
});

function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing required env var: ${key}`);
  return v;
}

export function resolveGatewayPlanId(plan: Plan): string {
  return requireEnv(plan.gatewayPlanIdEnvKey);
}

export interface CreateMandateArgs {
  plan: Plan;
  profileId: string;
  email: string;
  name?: string | null;
  phone?: string | null;
  /** How many cycles the mandate is authorized for. 120 months ≈ 10 years. */
  totalCount?: number;
}

export interface CreateMandateResult {
  subscriptionId: string;
  /** Hand this to Razorpay Checkout on the client. */
  shortUrl: string;
  customerId: string;
}

/**
 * Creates the subscription in `created` state. The payer authorizes it in
 * Checkout (UPI app → "Approve mandate"), which fires `subscription.authenticated`
 * and then `subscription.charged` for the first debit.
 */
export async function createUpiMandate(args: CreateMandateArgs): Promise<CreateMandateResult> {
  const { plan, profileId, email, name, phone, totalCount = 120 } = args;

  const customer = await razorpay.customers.create({
    name: name ?? email.split("@")[0]!,
    email,
    ...(phone ? { contact: phone } : {}),
    fail_existing: 0, // reuse if this email already exists
    notes: { profile_id: profileId, audience: plan.audience },
  });

  // `customer_id` is a valid Subscriptions API field, but the SDK's bundled
  // types don't declare it (and type the return as `Promise<T> & void`), so
  // both sides are cast. Checked against Razorpay's Subscriptions API docs.
  const subscription = (await razorpay.subscriptions.create({
    plan_id: resolveGatewayPlanId(plan),
    customer_id: customer.id,
    total_count: totalCount,
    quantity: 1,
    customer_notify: 1,
    notes: {
      profile_id: profileId,
      tier: plan.id,
      audience: plan.audience,
      amount_in_paise: String(plan.priceInPaise),
    },
  } as never)) as unknown as { id: string; short_url?: string };

  return {
    subscriptionId: subscription.id,
    shortUrl: subscription.short_url ?? "",
    customerId: customer.id,
  };
}

export async function cancelMandate(subscriptionId: string, atCycleEnd = true) {
  return razorpay.subscriptions.cancel(subscriptionId, atCycleEnd);
}

/**
 * Webhook signature check. HMAC-SHA256 of the RAW body with the webhook secret.
 * Must run on the untouched string — never on a re-serialized JSON object.
 */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const expected = crypto
    .createHmac("sha256", requireEnv("RAZORPAY_WEBHOOK_SECRET"))
    .update(rawBody)
    .digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** Checkout-callback signature (order_id|payment_id) for one-off payments. */
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
): boolean {
  const expected = crypto
    .createHmac("sha256", requireEnv("RAZORPAY_KEY_SECRET"))
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
