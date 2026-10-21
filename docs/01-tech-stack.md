# Tech stack — what and why

| Layer | Choice | Why this over the obvious alternative |
|---|---|---|
| Framework | **Next.js 14, App Router** | Server Components let the dashboards query Postgres directly — no API layer to build or secure for reads. Route Handlers give you the webhook endpoint in the same deploy. |
| Styling | **Tailwind + a brand token layer** | Every colour, shadow and font size in `tailwind.config.ts` is BridgeNow's, not a Tailwind default. The components never reach for `gray-500`. |
| Motion | **Framer Motion** (+ GSAP only if needed) | `layoutId` gives you the sliding pill on the pricing toggle and role selector for free. GSAP ScrollTrigger is worth adding only if you want pinned scroll scenes later — don't ship both. |
| Database | **Postgres via Supabase** | Row Level Security means entitlement lives in the database, not in a React guard. A brand without an active plan cannot read the creator pool even with a stolen anon key. |
| ORM | **Prisma** | Typed queries that stay in sync with the enums the UI already uses. Supabase's own client handles auth; Prisma handles data. |
| Auth | **Supabase Auth, magic link** | No passwords to store or leak. `role` goes into user metadata at signup and the `bn_handle_new_user` trigger writes it into `profiles`, which every RLS policy reads. |
| Payments | **Razorpay Subscriptions** | The only Indian gateway whose plan objects map cleanly onto a typed catalogue, with a hosted mandate page. See `02-upi-autopay-guide.md`. |
| Email | **Resend** | Per-send `replyTo` and tags, so creator mail and brand mail go out under different identities from one API key. SendGrid works identically — swap `src/lib/email/send.ts`. |
| Scheduling | **Vercel Cron → Route Handler** | Hourly sweep, stateless, no Redis to run. Move to BullMQ only when you need retries with backoff across thousands of rows. |

## Why not…

- **Stripe** — no UPI Autopay in India. Non-starter for a ₹49/month product.
- **Clerk/Auth0** — fine, but then entitlement lives outside the database and
  RLS can't see it. You'd rebuild the paywall in every query.
- **A separate Express backend** — nothing here needs it. One deploy, one set
  of env vars, one place to look when a webhook misbehaves.
- **tRPC** — Server Components already give typed server access. tRPC earns its
  place when you add a mobile client.

## Running it

```bash
cp .env.example .env         # fill in Supabase + Razorpay + Resend
npm install
npx prisma db push           # creates tables from schema.prisma
psql "$DIRECT_URL" -f supabase/migrations/0001_init.sql   # RLS, functions, indexes
npm run dev
```

Then, in the Supabase dashboard, enable the `pg_cron` extension and schedule
`bn_sync_subscription_statuses()` hourly (the commented line in the SQL file).

## Deploy

Vercel. Set every var from `.env.example` in Project Settings, point the
Razorpay webhook at `https://<domain>/api/webhooks/razorpay`, and confirm the
cron shows as active under the Cron tab after the first deploy.
