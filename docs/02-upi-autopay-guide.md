# UPI Autopay / e-Mandate — implementation guide

> **Read this first.** On **21 April 2026** the RBI issued a consolidated
> **E-Mandate Framework** (RBI/DPSS/2026-27/396), effective immediately, which
> repealed eight circulars issued between 2019 and 2024. It covers cards, PPIs
> and UPI, domestic and cross-border. Everything below is written against that
> framework. Verify against the primary RBI Directions before go-live — the
> summaries here come from secondary sources (linked at the end).

---

## 0. What the framework requires of you

| Obligation | Where it lands in this codebase |
|---|---|
| AFA **not** required for recurring debits **up to ₹15,000** per transaction (₹1,00,000 for insurance premiums, mutual funds, credit-card bills) | All BridgeNow plans (₹49–₹499) sit far below the floor, so **no per-debit AFA** — the autopay UX is one approval, then silence |
| AFA **always** required for mandate registration, modification, withdrawal, and the **first** transaction | Razorpay Checkout handles this. Your `status` starts at `pending` and only becomes `active` on `subscription.charged` |
| **Pre-debit notification ≥24 hours** before every debit, carrying merchant name, amount, debit date/time, mandate reference and reason | `src/workers/renewal-worker.ts` + the reminder email template. `pre_debit_notified_at` is your evidence timestamp |
| Customer may **opt out of a single debit** during that 24h window | `cycle_opt_out_at` column; the worker excludes those rows; `assertNotifiedInTime()` blocks the debit |
| Mandate must carry an explicit **validity period** and (for variable mandates) a **per-transaction maximum** | `mandate_valid_until`, `mandate_max_amount_in_paise` |
| Customer may **modify or cancel** at any time | `cancelMandate()` in `src/lib/razorpay.ts`, surfaced on the billing page |
| **No fee** may be charged to the customer for using e-mandate | Don't add a "convenience fee" line to checkout |
| Post-debit notice must include **grievance redressal** details | Add your support address + grievance officer to the renewal-success template footer before launch |

**The one that bites engineers:** if your notification job is backlogged and the
notice goes out 3 hours before the debit, you must **skip the cycle**, not charge
late. That is what `assertNotifiedInTime()` exists for.

---

## 1. Choose the gateway

| | Razorpay | Cashfree | PayU |
|---|---|---|---|
| UPI Autopay | ✅ Subscriptions API | ✅ Subscriptions API | ✅ |
| Hosted mandate page | ✅ `short_url` | ✅ | ✅ |
| Dashboard plan objects | ✅ | ✅ | partial |
| Node SDK quality | best | good | thin |
| Settlement | T+2 standard | T+1 available | T+2 |

**Recommendation: Razorpay Subscriptions.** The plan object maps 1:1 onto
`creatorPlansConfig`, the hosted authorization page removes the mandate UX from
your plate entirely, and the webhook taxonomy is the cleanest of the three.
This repo is written against it; Cashfree needs only `src/lib/razorpay.ts` and
the webhook event names swapped.

---

## 2. One-time account setup

1. **Activate the account.** Submit PAN, GSTIN (if registered), bank proof and
   website. Recurring payments need explicit approval — ask for *Subscriptions*
   and *UPI Autopay* specifically, they are not on by default.
2. **Enable UPI as a recurring method.** Dashboard → Settings → Payment Methods
   → UPI → turn on *Recurring*.
3. **Generate API keys.** Test keys first. `RAZORPAY_KEY_ID` /
   `RAZORPAY_KEY_SECRET` in `.env`.
4. **Create the webhook.** Dashboard → Settings → Webhooks →
   `https://bridgenow.in/api/webhooks/razorpay`, with a secret you paste into
   `RAZORPAY_WEBHOOK_SECRET`. Subscribe to:

   ```
   subscription.authenticated   subscription.activated
   subscription.charged         subscription.pending
   subscription.halted          subscription.cancelled
   payment.failed
   ```

---

## 3. Create the plans (once per tier)

Plans are gateway-side objects. Create them once, then store the returned IDs
in env. `item.amount` is in **paise** and must match `priceInPaise`.

```bash
curl -u $RAZORPAY_KEY_ID:$RAZORPAY_KEY_SECRET \
  -X POST https://api.razorpay.com/v1/plans \
  -H 'Content-Type: application/json' \
  -d '{
    "period": "monthly",
    "interval": 1,
    "item": {
      "name": "Creator Plus",
      "amount": 14900,
      "currency": "INR",
      "description": "For creators getting brand-ready"
    },
    "notes": { "tier": "creator_plus" }
  }'
```

Repeat for `creator_growth_pro` (19900), `creator_elite` (49900) and
`creator_premium` (99900). **Skip `creator_basic`** — it is a ₹49 lifetime
purchase, so it has no plan and no mandate. Paste each
`plan_xxx` into the matching `RAZORPAY_PLAN_*` env var — `gatewayPlanIdEnvKey`
on each plan object is what resolves them at runtime.

> When the Brand Brochure arrives: create the brand plans the same way, add
> `RAZORPAY_PLAN_BRAND_*` vars, and update `brand-plans.ts`. No code changes.

---

## 4. The authorization flow

```
User clicks "Set up autopay"
        │
        ▼
POST /api/checkout  { tier, audience }
        │  • resolves price SERVER-SIDE from the catalogue
        │  • creates Razorpay customer + subscription
        │  • inserts row: status=pending, mandate_status=created
        ▼
Redirect to subscription.short_url  (Razorpay hosted page)
        │
        ▼
User picks UPI → enters VPA → approves mandate in their UPI app   ◄── AFA happens here
        │
        ├──► webhook: subscription.authenticated   → mandate_status=authorized
        └──► webhook: subscription.charged (cycle 1) → status=active, WELCOME EMAIL
```

**The security property that matters:** the client sends a *tier id*, never an
amount. Price is resolved from `creatorPlansConfig` inside the route handler.
A tampered request can only ask for a different real plan, never a ₹1 one.

---

## 5. The recurring flow

```
T-24h   renewal worker → pre-debit notice email → pre_debit_notified_at = now()
        (customer may opt out here → cycle_opt_out_at set → no debit)
T-0     Razorpay auto-debits the mandate (no AFA, amount < ₹15,000)
        │
        ├─ success → webhook subscription.charged
        │            → bn_advance_creator_cycle() → RENEWAL EMAIL
        │
        └─ failure → webhook subscription.pending
                     → status=grace_period, grace_ends_at = now + 3d
                     → retries; if exhausted: subscription.halted → expired
```

Cycle dates anchor off the **old** `current_period_end`, not `now()`, so a
webhook that arrives six hours late doesn't shift every future billing date.

---

## 6. Webhook handling — the four rules

The handler is `src/app/api/webhooks/razorpay/route.ts`.

1. **Verify before parsing.** HMAC-SHA256 of the *raw* body against
   `RAZORPAY_WEBHOOK_SECRET`, compared with `timingSafeEqual`. Next.js App
   Router gives you the raw string via `await req.text()` — never
   `JSON.parse` then re-stringify, the whitespace will differ and every
   signature will fail.
2. **Store first, act second.** Insert into `webhook_events` with a unique
   `event_id`. A duplicate insert throws, and you return `200 {deduped:true}`.
   Razorpay retries aggressively; without this you will double-charge emails.
3. **Mutate in a transaction.** Subscription state and the payment row move
   together or not at all.
4. **Return 200 once stored, even on downstream failure.** A 500 makes Razorpay
   retry the whole event, re-running side effects. Record the error on the row
   and let your own retry handle it.

### Testing locally

```bash
# tunnel
npx ngrok http 3000
# point the dashboard webhook at https://<id>.ngrok.app/api/webhooks/razorpay

# or replay a captured payload with a valid signature:
BODY=$(cat fixtures/subscription.charged.json)
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$RAZORPAY_WEBHOOK_SECRET" -hex | cut -d' ' -f2)
curl -X POST localhost:3000/api/webhooks/razorpay \
  -H "x-razorpay-signature: $SIG" -H 'Content-Type: application/json' -d "$BODY"
```

---

## 7. Dynamic UPI QR — what it is and isn't

`src/lib/upi.ts` builds an NPCI-spec `upi://pay?...` URI with the amount locked
in, rendered to a QR client-side by `UpiQrModal`.

**It cannot create a recurring mandate.** A QR is a one-time collect; mandate
registration must go through a PSP with AFA. Use the QR for:

- first payments where the user's bank blocks mandates,
- manual/offline collection,
- a fallback when the gateway is down.

The modal says this in plain words on screen. Don't soften that copy — a user
who believes a QR scan set up autopay churns angrily in 30 days.

Parameter reference: `pa` payee VPA · `pn` payee name · `am` amount (2dp) ·
`cu` INR · `tr` your reference · `tn` note. Spaces must be `%20`, not `+`.

---

## 8. Go-live checklist

- [ ] Live keys swapped; test keys removed from every environment
- [ ] Webhook secret rotated and set in prod env
- [ ] All plan IDs created on the **live** account (test plan IDs won't work)
- [ ] `CRON_SECRET` set; `vercel.json` cron deployed and firing hourly
- [ ] Reminder email verified to land ≥24h before the first real debit
- [ ] Grievance-redressal details added to the post-debit (renewal) template
- [ ] Refund/cancellation policy page live and linked from checkout
- [ ] `mandate_valid_until` populated on every new mandate
- [ ] Settlement account verified; one real ₹49 end-to-end test completed
- [ ] RBI Directions read in the original before launch

---

## Sources

- [RBI consolidates e-mandate rules under the 2026 framework — King Stubb & Kasiva](https://ksandk.com/newsletter/rbi-e-mandate-framework/)
- [RBI e-mandate directions 2026: engineering checklist](https://ecorpit.com/rbi-e-mandate-directions-2026-recurring-payments-engineering-checklist/)
- [RBI raises e-mandate transaction limits from ₹5,000 to ₹15,000 — Khaitan & Co](https://www.khaitanco.com/thought-leaderships/RBI-enhances-transaction-limits-for-processing-of-e-mandates-for-recurring-transactions:-from-INR-5000-to-INR-15000)
- [How a UPI mandate works for recurring debits — Zoho Payments](https://www.zoho.com/payments/academy/payment-processing/upi-autopay-mandates-and-recurring-debits.html)
