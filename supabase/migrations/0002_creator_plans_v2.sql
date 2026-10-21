-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  BridgeNow — 0002_creator_plans_v2                                   ║
-- ║                                                                      ║
-- ║  The creator catalogue went from three tiers to five, and gained a   ║
-- ║  one-off "lifetime" billing mode.                                    ║
-- ║                                                                      ║
-- ║    creator_starter  →  creator_basic       (₹49, now lifetime)       ║
-- ║    creator_plus     →  creator_plus        (₹149 → ₹99)              ║
-- ║    creator_pro      →  creator_elite       (₹499, same price)        ║
-- ║    (new)               creator_growth_pro  ₹199                      ║
-- ║    (new)               creator_premium     ₹999                      ║
-- ╚══════════════════════════════════════════════════════════════════════╝
--
-- RUN THIS BEFORE `npx prisma db push`.
--
-- Order matters. Postgres cannot drop an enum value while a row still uses
-- it, so existing rows have to move to the new names first — and a value
-- cannot be used until it exists. Hence: add, then move, then let Prisma
-- drop the leftovers.
--
-- If you have no creator subscriptions yet (likely pre-launch), this is a
-- no-op and you can skip straight to `prisma db push`. It is safe to run
-- either way.

-- ───────────────── 1. Add the new values ───────────────────────────────
-- `add value` cannot run inside a transaction block alongside its own use,
-- so these are deliberately separate statements. psql runs them one at a
-- time; if you are pasting into the Supabase SQL editor, run this block on
-- its own before the next one.

alter type "CreatorTier" add value if not exists 'creator_basic';
alter type "CreatorTier" add value if not exists 'creator_growth_pro';
alter type "CreatorTier" add value if not exists 'creator_elite';
alter type "CreatorTier" add value if not exists 'creator_premium';

alter type "BillingFrequency" add value if not exists 'lifetime';

-- ───────────────── 2. Move existing rows ───────────────────────────────
-- RUN THIS SEPARATELY, after step 1 has committed.

update creator_subscriptions
   set tier = 'creator_basic', billing = 'lifetime'
 where tier = 'creator_starter';

update creator_subscriptions
   set tier = 'creator_elite'
 where tier = 'creator_pro';

-- A lifetime row has no further debit. Clear the recurring-billing state so
-- the renewal sweep and the pre-debit notifier have nothing to act on, and
-- so no mandate is left looking live.
update creator_subscriptions
   set mandate_status          = null,
       mandate_max_amount_in_paise = null,
       mandate_valid_until     = null,
       last_reminder_sent_for  = null,
       pre_debit_notified_at   = null
 where billing = 'lifetime';

-- ───────────────── 3. Then run: npx prisma db push ─────────────────────
-- Prisma drops the now-unused 'creator_starter' and 'creator_pro' values.
-- If it refuses, a row somewhere still references one — find it with:
--
--   select tier, count(*) from creator_subscriptions group by tier;
