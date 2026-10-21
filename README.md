# BridgeNow

> Influence meets intent. The bridge between micro-creators and marquee brands.

A dual-sided marketplace: creators subscribe to get brand-ready and find
collaborations; brands subscribe to discover creators and run campaigns. Both
sides pay by UPI Autopay.

---

## Quick start

```bash
cp .env.example .env         # fill in Supabase, Razorpay, Resend
npm install
npx prisma db push
psql "$DIRECT_URL" -f supabase/migrations/0001_init.sql
npm run dev
```

**Upgrading an existing database** to the five-tier creator catalogue: run
`supabase/migrations/0002_creator_plans_v2.sql` **before** `prisma db push`.
It moves any existing rows off the two retired tier names so Postgres will let
Prisma drop them. On a fresh database it is a no-op.

## What's here

```
src/
  app/
    page.tsx                         Landing — hero, Passport, marquee, steps, pricing, scroll finale
    app/page.tsx                     THE signed-in hub: status, form, plans, UPI
    auth/page.tsx                    Email + password auth, role switching, remember-me
    auth/callback/route.ts           Email-confirmation / recovery session exchange
    auth/update-password/page.tsx    Password reset landing
    dashboard/*                      Redirects into /app (kept so old links work)
    api/checkout/route.ts            Creates the UPI mandate (price resolved server-side)
    api/webhooks/razorpay/route.ts   Signed, idempotent, transactional
    api/cron/renewal-reminders/      T-24h pre-debit notification sweep
  components/
    landing/                         Hero, Manifesto, Showcase, Pricing, Nav, Footer
    three/                           Procedural 3D objects + the Passport stage
    app/                             CreatorForm, UpiPayPanel, PassportScene, Dreams
    ui/RainbowBand.tsx               Animated spectrum band
    auth/AuthScreen.tsx              Sign up / log in / forgot password
    payments/UpiQrModal.tsx          Autopay + dynamic one-time QR
  config/
    plans.types.ts                   Shared plan contracts
    creator-plans.ts                 ← from the Creator Brochure
    brand-plans.ts                   ← from the Brand Brochure
    contact.ts                       Every outbound channel, role-routed
  lib/
    razorpay.ts  upi.ts  auth.ts  db.ts
    email/send.ts  email/templates/
  workers/renewal-worker.ts          Reminder sweep + the 24h abort guard
prisma/schema.prisma                 Dual subscription engine
supabase/migrations/0001_init.sql    RLS, RBAC, status automation, indexes
docs/                                Stack rationale, autopay guide, image prompts
```

## The one design decision to understand

**Plans are data, not code.** `PlanCatalogue` in `config/plans.types.ts` is the
contract. The pricing section, checkout route, webhook handler and email
templates all read it generically — none of them knows what "Creator Plus" is.

Both brochures are now loaded.

**Creator tiers** — Basic (₹49, **lifetime**), Plus (₹99), Growth Pro (₹199),
Elite (₹499), Premium (₹999). The four priced tiers are monthly. Five dense
feature lists do not sit in one row, so the cards flow 3 + 2.

**Brand tiers** — Starter (₹9,999), Growth Plus (₹14,999), Premium (₹24,999)
and a quoted Custom tier. The quoted tier renders full width below the priced
columns and routes to email rather than checkout.

Creators can also earn membership instead of buying it: `freeRoute` on the
creator catalogue carries the Journey Sharing campaign — form, script, post,
and the 500k-views threshold — and renders under the priced tiers. Its
conditions are part of the data and are always rendered; an unqualified "get
it free" on a pricing page is a promise the campaign rules don't make.

### Lifetime is not a billing cadence

Creator Basic is bought once, and that distinction runs through the stack.
`isRecurring()` in `plans.types.ts` is the single place that decides, and three
things branch on it:

- **Checkout** creates no e-mandate, no gateway subscription and no
  `mandateMaxAmountInPaise`. Setting up a recurring debit for a one-off
  purchase would be a billing error, not a cosmetic one.
- **The renewal sweep** excludes `billing = lifetime` at the query. Sending a
  pre-debit notice for a payment that will never happen is exactly what the RBI
  framework exists to prevent.
- **The payment modal** hides the autopay tab entirely — the one-time QR is the
  only way to buy it — and the dashboard shows "Access: Lifetime" instead of a
  fabricated next-debit date.

Creator Basic therefore needs no `RAZORPAY_PLAN_*` key. Leave it unset.

Brand quotas are measured in what the brochure actually sells — monthly reel
volume, scripted reels, edited reels, strategy sessions — not seats or unlocks.
Those are snapshotted onto `brand_subscriptions` at purchase so a later
brochure change never silently downgrades an existing customer.

## Design system

Two worlds, deliberately different:

- **Public (`/`)** — electric blue → cyan, acid-lime display caps, hot-magenta
  3D objects. Loud and optimistic.
- **Private (`/app`)** — deep plum → black with magenta glow. Quieter; the
  place the Passport lives.

Tokens are in `tailwind.config.ts`, component classes in `globals.css`.

The glossy objects are **real Three.js geometry**, not images — see
`docs/03-image-prompts.md`. Everything honours `prefers-reduced-motion`, pauses
when off-screen, and is visible at rest so the first paint is never blank.

## The landing page

`src/app/page.tsx` composes `components/landing/`: hero, manifesto, showcase,
pricing, footer — with the intro curtain over the top.

It runs the **dark navy** world. `sky` in `tailwind.config.ts` is a navy ramp
(`sky-deep` #070C24 is the page ground, `sky-mid` a raised card surface), and
`violet` is the third accent beside lime and hot. The hero's cloud bank is
violet, and every section below it sits on `sky-deep`.

Copy comes from the approved BridgeNow mockup: the hero headline and stat row,
the three audience propositions in the showcase, the plan section headings
(which live in the catalogues, not the components) and the footer CTA. The
crown from that mockup sits beside the creator pricing — creator side only,
since on the brand side it would mean nothing.

The wordmark is `public/logo.png` — the real mark, keyed out of the black JPEG
it arrived as by using luminance as the alpha channel, which keeps the
anti-aliased edges that a hard colour-key would have chewed up. It is white, so
it works on every surface this site has.

`ScrollReveal` watches for `.reveal` elements added **after** mount with a
MutationObserver, not just the ones present on first render. Without that,
anything React swaps in later is never observed and sits at opacity 0 forever
— which is how the pricing section went blank the moment you switched to the
brand tab.

The showcase is a native scroll-snap track with dots, not a JS carousel — the
browser already does momentum, touch, trackpad and keyboard correctly. JS only
lights the right dot and scrolls on a dot click. Two things it needs that are
easy to miss: the track takes **side padding** equal to half its leftover
width, or the last card can never reach the centre and its dot never lights;
and measuring that padding is kept **separate** from reading the active card,
because doing both in one pass computes the active card from pre-padding
offsets and lights the wrong dot on load.

The nav is fully transparent — no fill, no blur — so nothing is hidden behind
it while scrolling. The links carry their own pills and the logo a drop shadow,
which is what holds legibility over a bright section without putting a plate
across the page.

All five creator tiers sit in one row from 1280px up, which is why `PlanCard`
takes a `compact` flag — type, padding and the feature list all step down a
size so a 5-wide column still breathes. The crown is positioned from price
rather than plan id, so repricing or renaming a tier still puts it on the
dearest one. It renders as a SIBLING of the card, because `block-card` sets
overflow-hidden for its rounded corners and clipped anything hanging over the
top edge.

The hero objects are a **camera on a tripod** (`cameraRig`) and a
**clapperboard** (`clapper`), both built in `components/three/scenes.ts`. Three
things they depend on:

- They run `world="plum"`, the violet studio. Under the navy one the dark
  bodies reflected blue and came out looking like plastic toys.
- Their bodies use `gearBody()`, not `glossy()`. The glossy helper runs
  reflectivity 0.85 with a full clearcoat, which mirrors the environment so
  hard that a near-black body renders bright. Gear is dark because it absorbs
  light, so `gearBody` keeps reflectivity low and leans on sheen for the violet
  edge.
- The lens points along the object's +Z, which faces the viewer. A POSITIVE
  y-rotation swings it toward screen-right and then behind the body — the
  rotation has to be negative to aim it down-left as the reference does.

The floating glass chips and screens around them are DOM, not geometry. They
are flat translucent rectangles, which composite crisply at any size for
nothing; modelling them would have cost two more WebGL contexts for shapes with
no depth to show.

Two things to know if you edit the hero:

- The headline has its **own clamp**, not `text-mega`. That token was tuned for
  two short words and ran this longer headline off the bottom of the screen.
- Each 3D object owns a WebGL context and browsers cap how many can be live at
  once (~16 in Chrome, fewer under software rendering). `Object3D` waits until
  an element is within 500px of the viewport before building its renderer, so
  a page full of objects never hits that ceiling — when it does, the browser
  drops the oldest contexts and those objects silently never appear.

**Pricing is not written into the page.** The pricing section reads
`config/creator-plans.ts` and `config/brand-plans.ts`, so the page and checkout
can never disagree about what something costs.

## The two animations

**Landing (`components/ui/IntroCurtain.tsx`).** A blue curtain writes the
wordmark, flashes "Influence meets intent", then splits apart to reveal the
hero. ~2.1s.

**After login (`components/app/WelcomeCeremony.tsx`).** Role-aware, ~2.9s.
Creators watch their Passport get issued — the card flies in, a VERIFIED stamp
slams down with a shockwave, confetti bursts, foil sweeps across and their name
appears on it. Brands watch twelve creator dots fly in from off-stage and lock
into a ring wired to the BridgeNow mark: a shortlist that assembled itself.

Both play **once per browser session** and are skipped entirely under
`prefers-reduced-motion`. **There is no skip control** — they are short enough
that getting out of the way on their own beats asking the visitor to dismiss
them. The intro ignores pointer events throughout, so nothing it covers can
swallow a click.

Three rules keep them from ever stalling or showing blank. All three were
written after watching them fail:

1. **Every beat is a CSS animation with a delay, not a JS timer.** Timers only
   start after hydration; on a cold load that left a second of empty screen.
2. **The intro's keyframes live in `globals.css`, not styled-jsx.** The curtain
   is server-rendered, and styled-jsx injects its CSS during hydration — so
   keyframes declared there do not exist for the first paint.
3. **The intro's exit is CSS too.** Building the hero's 3D scenes blocks the
   main thread for seconds on a cold load (measured: one 5s task), and a
   blocked thread delays `setTimeout`. Driven from JS the curtain hung around
   long past its welcome; on the compositor it leaves on schedule however busy
   the page is. React only unmounts the leftover markup afterwards.

Two gotchas worth knowing if you touch these:

- The "have they seen it?" check **writes the key it reads**. An effect that
  re-runs therefore reads `seen: true` the second time. Both components decide
  once and keep the verdict in a ref; the dismiss timer is re-armed on every
  run. Without that, StrictMode left the ceremony covering the page forever.
- The ceremony's keyframes can stay in styled-jsx because it only ever mounts
  client-side, after the session check.

## Email policy

**Supabase sends nothing.** Email confirmation must be switched OFF
(Authentication → Sign In / Providers → Email). With it on, sign-up creates an
unconfirmed user and the next login fails with "Email not confirmed".

Every email comes from BridgeNow through Resend:

| Email | Trigger |
|---|---|
| Account created | Sign-up, via `/api/auth/signup-notify` |
| Welcome | First successful payment |
| Renewal reminder | 24h before a debit |
| Renewal receipt | Successful recurring debit |

Logging in sends nothing.

### Sign-up flow

1. `supabase.auth.signUp()` - account is live immediately, no link to click
2. `POST /api/auth/signup-notify` while the session is briefly active; the
   route reads the recipient **from that session**, never from the request
   body, so it cannot be used to mail an arbitrary address
3. `signOut()`, then the form switches to log-in with a confirmation banner

Resend needs a verified domain to send to anyone but yourself. Set
`RESEND_API_KEY`, `CREATOR_FROM_EMAIL` and `BRAND_FROM_EMAIL` before relying on
these in production.

## UPI collection

`config/contact.ts` -> `upi.vpa` is a **personal** VPA, not a merchant one.

Two things follow, and both caused real failures:

**The `@` must stay literal.** `URLSearchParams` percent-encodes it, so
`name@oksbi` became `name%40oksbi`. UPI apps read `pa` without decoding, look
up an account by that literal string, find nothing, and the payer sees
"payment could not be processed to this account". `buildUpiUri()` now builds
the query by hand and leaves `@` alone - which is what Google Pay's own QR
codes do, and what RFC 3986 permits.

**No merchant fields on a personal VPA.** `tr` and `tid` are merchant
parameters. `buildUpiUri()` takes a `merchant` flag, left `false`, so the
reference travels in the note instead.

Consequences while the VPA is personal:

- no webhook fires, so nothing marks a subscription active automatically —
  reconcile by hand against the reference in the note
- it is a one-time collect, never autopay
- payers may see an "unverified" warning in their app

All three go away once Razorpay is live. Then set `merchant: true` and the
reference moves back into `tr`.

## Known gaps to close before launch

1. **LinkedIn is `null`** in `config/contact.ts`. Set it and the link appears in
   the footer and every email footer — nothing else to change.
3. **Brand Razorpay plans not created yet.** The three priced brand tiers are
   `live` in config but have no gateway plan IDs, so checkout will throw until
   you create them and set `RAZORPAY_PLAN_BRAND_*`. See `docs/02`.
3. **Grievance-redressal details** must be added to the renewal email footer
   before you take live payments (RBI E-Mandate Framework 2026).
4. **No Open Graph image yet.** Links to the site preview as a blank card.
   See `docs/03-image-prompts.md`.

## Docs

- [`docs/01-tech-stack.md`](docs/01-tech-stack.md) — what was chosen and why
- [`docs/02-upi-autopay-guide.md`](docs/02-upi-autopay-guide.md) — e-mandate setup, step by step
- [`docs/03-image-prompts.md`](docs/03-image-prompts.md) — imagery direction and what to add first
