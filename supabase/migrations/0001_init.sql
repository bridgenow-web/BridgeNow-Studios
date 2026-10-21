-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  BridgeNow — 0001_init                                               ║
-- ║  Run AFTER `prisma db push` (or paste the whole thing if you are     ║
-- ║  managing Postgres by hand). Everything here is what Prisma cannot   ║
-- ║  express: partial indexes, status automation, RLS/RBAC.              ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ─────────────────────────── 1. Constants ──────────────────────────────
-- Grace window after a failed debit before access is revoked.
create or replace function bn_grace_days() returns int
language sql immutable as $$ select 3 $$;

-- ───────────────────── 2. Partial unique indexes ───────────────────────
-- A user may have many historical rows, but only ONE that is live.
create unique index if not exists creator_subscriptions_one_live
  on creator_subscriptions (user_id)
  where status in ('active', 'grace_period', 'pending');

create unique index if not exists brand_subscriptions_one_live
  on brand_subscriptions (brand_id)
  where status in ('active', 'grace_period', 'pending');

-- Hot path for the renewal worker: "who renews in the next 24h?"
create index if not exists creator_subs_due_idx
  on creator_subscriptions (next_billing_date)
  where status = 'active';

create index if not exists brand_subs_due_idx
  on brand_subscriptions (next_billing_date)
  where status = 'active';

-- Webhook replay protection lookup.
create index if not exists webhook_events_unprocessed_idx
  on webhook_events (received_at)
  where processed_at is null;

-- ──────────────────── 3. Automated status transitions ──────────────────
-- Called by pg_cron hourly. Pure SQL so it works even if the Node worker
-- is down — the database is the final authority on entitlement.
create or replace function bn_sync_subscription_statuses()
returns table (table_name text, moved_to text, row_count bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  grace interval := make_interval(days => bn_grace_days());
begin
  -- active → grace_period once the paid period has elapsed without a capture
  return query
  with moved as (
    update creator_subscriptions
       set status = 'grace_period',
           grace_ends_at = current_period_end + grace,
           updated_at = now()
     where status = 'active'
       and current_period_end < now()
    returning 1
  )
  select 'creator_subscriptions', 'grace_period', count(*) from moved;

  return query
  with moved as (
    update brand_subscriptions
       set status = 'grace_period',
           grace_ends_at = current_period_end + grace,
           updated_at = now()
     where status = 'active'
       and current_period_end < now()
    returning 1
  )
  select 'brand_subscriptions', 'grace_period', count(*) from moved;

  -- grace_period → expired
  return query
  with moved as (
    update creator_subscriptions
       set status = 'expired', updated_at = now()
     where status = 'grace_period'
       and grace_ends_at < now()
    returning 1
  )
  select 'creator_subscriptions', 'expired', count(*) from moved;

  return query
  with moved as (
    update brand_subscriptions
       set status = 'expired', updated_at = now()
     where status = 'grace_period'
       and grace_ends_at < now()
    returning 1
  )
  select 'brand_subscriptions', 'expired', count(*) from moved;

  -- pending mandates that were never authorized within 48h
  return query
  with moved as (
    update creator_subscriptions
       set status = 'expired', updated_at = now()
     where status = 'pending'
       and created_at < now() - interval '48 hours'
    returning 1
  )
  select 'creator_subscriptions', 'expired_unauthorized', count(*) from moved;
end;
$$;

-- Advance a subscription one cycle. Called by the webhook on a captured debit.
create or replace function bn_advance_creator_cycle(
  p_subscription_id uuid,
  p_validity_days int default 30
) returns creator_subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  result creator_subscriptions;
begin
  update creator_subscriptions
     set status = 'active',
         -- anchor off the OLD period end so cycles never drift,
         -- unless we are recovering from an expiry (then anchor off now()).
         current_period_end = greatest(current_period_end, now()) + make_interval(days => p_validity_days),
         next_billing_date  = greatest(current_period_end, now()) + make_interval(days => p_validity_days),
         grace_ends_at = null,
         updated_at = now()
   where id = p_subscription_id
  returning * into result;

  return result;
end;
$$;

create or replace function bn_advance_brand_cycle(
  p_subscription_id uuid,
  p_validity_days int default 30
) returns brand_subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  result brand_subscriptions;
begin
  update brand_subscriptions
     set status = 'active',
         current_period_end = greatest(current_period_end, now()) + make_interval(days => p_validity_days),
         next_billing_date  = greatest(current_period_end, now()) + make_interval(days => p_validity_days),
         renewal_date       = greatest(current_period_end, now()) + make_interval(days => p_validity_days),
         grace_ends_at = null,
         updated_at = now()
   where id = p_subscription_id
  returning * into result;

  return result;
end;
$$;

-- Hourly sweep (Supabase: enable the pg_cron extension first).
-- select cron.schedule('bn-status-sync', '7 * * * *',
--   $$select bn_sync_subscription_statuses()$$);

-- ─────────────── 4. Auth bootstrap: auth.users → profiles ──────────────
create or replace function bn_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, email, role, full_name, created_at, updated_at)
  values (
    new.id,
    new.email,
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'creator'),
    new.raw_user_meta_data ->> 'full_name',
    now(), now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function bn_handle_new_user();

-- ─────────────────────── 5. RBAC helper functions ──────────────────────
create or replace function bn_role() returns user_role
language sql stable
security definer
set search_path = public
as $$ select role from profiles where id = auth.uid() $$;

create or replace function bn_is_admin() returns boolean
language sql stable as $$ select bn_role() = 'admin' $$;

-- Entitlement gate used by the app AND by RLS on premium tables.
create or replace function bn_has_active_creator_plan(p_user uuid default auth.uid())
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from creator_subscriptions
     where user_id = p_user
       and status in ('active', 'grace_period')
  )
$$;

create or replace function bn_has_active_brand_plan(p_brand uuid default auth.uid())
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from brand_subscriptions
     where brand_id = p_brand
       and status in ('active', 'grace_period')
  )
$$;

-- ───────────────────────── 6. Row Level Security ───────────────────────
alter table profiles              enable row level security;
alter table creator_profiles      enable row level security;
alter table brand_profiles        enable row level security;
alter table creator_subscriptions enable row level security;
alter table brand_subscriptions   enable row level security;
alter table payments              enable row level security;
alter table email_logs            enable row level security;
alter table campaigns             enable row level security;
alter table deals                 enable row level security;
alter table webhook_events        enable row level security; -- service_role only

-- Profiles: read self; admins read all.
create policy profiles_select_self on profiles
  for select using (id = auth.uid() or bn_is_admin());
create policy profiles_update_self on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Creator profiles: owner writes. Brands with an ACTIVE plan may browse the
-- discovery pool — that is the paywall, enforced in the database, not the UI.
create policy creator_profiles_owner on creator_profiles
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy creator_profiles_discoverable on creator_profiles
  for select using (bn_role() = 'brand' and bn_has_active_brand_plan());
create policy creator_profiles_admin on creator_profiles
  for select using (bn_is_admin());

create policy brand_profiles_owner on brand_profiles
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- Subscriptions: strictly read-only to the owner. Only the service role
-- (webhook handler) ever writes — a client must never set its own status.
create policy creator_subs_select_own on creator_subscriptions
  for select using (user_id = auth.uid() or bn_is_admin());
create policy brand_subs_select_own on brand_subscriptions
  for select using (brand_id = auth.uid() or bn_is_admin());

create policy payments_select_own on payments
  for select using (user_id = auth.uid() or bn_is_admin());
create policy email_logs_select_own on email_logs
  for select using (user_id = auth.uid() or bn_is_admin());

-- Campaigns: brand owns; creators see live campaigns only if subscribed.
create policy campaigns_owner on campaigns
  for all
  using (brand_id in (select id from brand_profiles where profile_id = auth.uid()))
  with check (brand_id in (select id from brand_profiles where profile_id = auth.uid()));
create policy campaigns_visible_to_creators on campaigns
  for select using (
    status = 'live'
    and bn_role() = 'creator'
    and bn_has_active_creator_plan()
  );

-- Deals: visible to both sides of that deal.
create policy deals_participants on deals
  for select using (
    creator_id in (select id from creator_profiles where profile_id = auth.uid())
    or campaign_id in (
      select c.id from campaigns c
      join brand_profiles bp on bp.id = c.brand_id
      where bp.profile_id = auth.uid()
    )
    or bn_is_admin()
  );

-- No policies on webhook_events ⇒ unreachable with the anon/authenticated key.
-- The webhook route uses SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS.

-- ───────────────────────── 7. Useful views ─────────────────────────────
create or replace view bn_renewals_due_24h as
  select 'creator' as audience, s.id, s.user_id as profile_id, s.tier::text as tier,
         s.amount_in_paise, s.next_billing_date, s.last_reminder_sent_for, p.email, p.full_name
    from creator_subscriptions s
    join profiles p on p.id = s.user_id
   where s.status = 'active'
     and s.next_billing_date between now() and now() + interval '24 hours'
     and (s.last_reminder_sent_for is null
          or s.last_reminder_sent_for <> s.next_billing_date)
  union all
  select 'brand', s.id, s.brand_id, s.tier::text,
         s.amount_in_paise, s.next_billing_date, s.last_reminder_sent_for, p.email, p.full_name
    from brand_subscriptions s
    join profiles p on p.id = s.brand_id
   where s.status = 'active'
     and s.next_billing_date between now() and now() + interval '24 hours'
     and (s.last_reminder_sent_for is null
          or s.last_reminder_sent_for <> s.next_billing_date);

-- ─────────── 8. RBI E-Mandate Framework 2026 compliance ────────────────
-- Issued 21 Apr 2026, effective immediately. Two obligations land in the
-- schema: a mandate must carry an explicit validity period and per-txn cap,
-- and no debit may run until 24h after the pre-debit notification, during
-- which the customer may opt out of that single cycle.
-- (Columns themselves are created by `prisma db push` from schema.prisma.)

create index if not exists creator_subs_notified_idx
  on creator_subscriptions (pre_debit_notified_at)
  where status = 'active';

create index if not exists brand_subs_notified_idx
  on brand_subscriptions (pre_debit_notified_at)
  where status = 'active';

-- Exclude cycles the customer opted out of from the reminder sweep.
create or replace view bn_renewals_due_24h as
  select 'creator' as audience, s.id, s.user_id as profile_id, s.tier::text as tier,
         s.amount_in_paise, s.next_billing_date, s.last_reminder_sent_for, p.email, p.full_name
    from creator_subscriptions s
    join profiles p on p.id = s.user_id
   where s.status = 'active'
     and s.cycle_opt_out_at is null
     and s.next_billing_date between now() and now() + interval '24 hours'
     and (s.last_reminder_sent_for is null
          or s.last_reminder_sent_for <> s.next_billing_date)
  union all
  select 'brand', s.id, s.brand_id, s.tier::text,
         s.amount_in_paise, s.next_billing_date, s.last_reminder_sent_for, p.email, p.full_name
    from brand_subscriptions s
    join profiles p on p.id = s.brand_id
   where s.status = 'active'
     and s.cycle_opt_out_at is null
     and s.next_billing_date between now() and now() + interval '24 hours'
     and (s.last_reminder_sent_for is null
          or s.last_reminder_sent_for <> s.next_billing_date);

-- Hard invariant: a debit must never be attempted without a ≥24h-old notice.
create or replace function bn_may_debit(p_notified_at timestamptz, p_opted_out timestamptz)
returns boolean
language sql immutable as $$
  select p_opted_out is null
     and p_notified_at is not null
     and p_notified_at <= now() - interval '24 hours'
$$;
