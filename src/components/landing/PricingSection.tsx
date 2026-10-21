"use client";

import { useState } from "react";

import { brandPlansConfig } from "@/config/brand-plans";
import { creatorPlansConfig } from "@/config/creator-plans";
import { contactConfig } from "@/config/contact";
import {
  billingSuffix,
  formatINR,
  type Audience,
  type Plan,
  type PlanCatalogue,
} from "@/config/plans.types";
import { UpiQrModal } from "@/components/payments/UpiQrModal";
import { LazyObject3D } from "@/components/three/LazyObject3D";

/**
 * One component, both catalogues, both worlds.
 *
 * `tone` switches it between the bright public page and the plum app shell;
 * `requireAuth` decides whether a plan button opens checkout or sends someone
 * to sign up first.
 */
export function PricingSection({
  requireAuth = false,
  defaultAudience = "creator",
  tone = "light",
  lockAudience = false,
}: {
  requireAuth?: boolean;
  defaultAudience?: Audience;
  tone?: "light" | "dark";
  /**
   * Hides the creator/brand switch and shows only `defaultAudience`.
   *
   * Set inside /app: a signed-in creator has no use for brand pricing, and
   * offering it invites them to start a checkout their role cannot complete.
   * The public page leaves the switch on, because a visitor hasn't chosen yet.
   */
  lockAudience?: boolean;
}) {
  const [audience, setAudience] = useState<Audience>(defaultAudience);
  const shown: Audience = lockAudience ? defaultAudience : audience;
  const [checkout, setCheckout] = useState<Plan | null>(null);

  const catalogue: PlanCatalogue =
    shown === "creator" ? creatorPlansConfig : brandPlansConfig;

  const columns = catalogue.plans.filter((p) => !p.wide);

  /**
   * The crown marks the dearest tier, so it is derived from price rather than
   * hard-coded — rename or reprice a plan and it still lands in the right
   * place. Creator side only; on the brand side it would mean nothing.
   */
  const topTierId =
    shown === "creator"
      ? columns.reduce(
          (best, p) => (p.priceInPaise > (best?.priceInPaise ?? -1) ? p : best),
          columns[0],
        )?.id
      : undefined;
  const wide = catalogue.plans.filter((p) => p.wide);
  const dark = tone === "dark";

  function select(plan: Plan) {
    if (requireAuth) {
      window.location.href = `/auth?role=${plan.audience}&next=/app`;
      return;
    }
    setCheckout(plan);
  }

  return (
    <section
      id="pricing"
      className={`relative overflow-hidden ${dark ? "px-6 py-16" : "bg-sky-deep px-6 py-16 sm:py-20"}`}
    >
      <div className="relative mx-auto max-w-6xl">
        <div className="flex flex-col gap-7 sm:flex-row sm:items-end sm:justify-between">
          <div className="reveal">
            <p className={`display text-[13px] tracking-[0.24em] ${dark ? "text-hot-light" : "text-lime"}`}>
              PRICING
            </p>
            <h2 className={`mt-4 display text-huge ${dark ? "text-white" : "text-white"}`}>
              {catalogue.heading}
            </h2>
            <p className={`mt-4 max-w-prose text-[15px] ${dark ? "text-chalk-dim" : "text-white/75"}`}>
              {catalogue.subheading}
            </p>
          </div>

          {!lockAudience && <Toggle value={audience} onChange={setAudience} dark={dark} />}
        </div>

        <div className={`mt-9 grid gap-4 sm:grid-cols-2 ${gridCols(columns.length)}`}>
          {columns.map((plan, i) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              index={i}
              dark={dark}
              compact={columns.length >= 5}
              crown={plan.id === topTierId}
              onSelect={() => select(plan)}
            />
          ))}
        </div>

        {wide.map((plan) => (
          <WideCard key={plan.id} plan={plan} dark={dark} />
        ))}

        {catalogue.freeRoute && <FreeRouteCard route={catalogue.freeRoute} dark={dark} />}
      </div>

      {checkout && <UpiQrModal plan={checkout} onClose={() => setCheckout(null)} />}
    </section>
  );
}

/**
 * All five creator tiers sit in one row on a wide screen so the ladder can be
 * read at a glance. Below 1280px that would squeeze each card under ~200px,
 * so it steps down to three and then two.
 */
function gridCols(n: number): string {
  if (n >= 5) return "lg:grid-cols-3 xl:grid-cols-5";
  if (n === 4) return "lg:grid-cols-4";
  if (n === 3) return "lg:grid-cols-3";
  return "lg:grid-cols-2";
}

function Toggle({
  value,
  onChange,
  dark,
}: {
  value: Audience;
  onChange: (a: Audience) => void;
  dark: boolean;
}) {
  return (
    <div
      role="tablist"
      aria-label="Choose plan type"
      className={`reveal inline-flex shrink-0 rounded-full p-1 ${dark ? "bg-white/10" : "bg-white/15"}`}
    >
      {(["creator", "brand"] as const).map((a) => {
        const active = value === a;
        return (
          <button
            key={a}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(a)}
            className={`rounded-full px-6 py-2.5 display text-[13px] transition-all duration-200
                        ${active
                          ? dark
                            ? "bg-hot-wash text-white"
                            : "bg-lime text-sky-deep"
                          : "text-white/70 hover:text-white"}`}
          >
            For {a}s
          </button>
        );
      })}
    </div>
  );
}

function PlanCard({
  plan,
  index,
  dark,
  compact = false,
  crown = false,
  onSelect,
}: {
  plan: Plan;
  index: number;
  dark: boolean;
  /** Five across — everything steps down a size so the column still breathes. */
  compact?: boolean;
  /** Hangs the 3D crown off this card's top-right corner. */
  crown?: boolean;
  onSelect: () => void;
}) {
  return (
    // The crown is a SIBLING of the card, not a child: `block-card` sets
    // overflow-hidden for its rounded corners, which clipped anything hanging
    // over the top edge.
    <div className="relative flex">
      {crown && (
        <LazyObject3D
          scene="crown"
          spin={0}
          className="pointer-events-none absolute -right-9 -top-10 z-20 hidden h-24 w-24 lg:block"
        />
      )}

      <article
        data-delay={index * 80}
        className={`block-card reveal flex w-full flex-col transition-transform duration-300 hover:-translate-y-1.5
                  ${compact ? "p-5" : "p-7"}
                  ${plan.featured
                    ? dark ? "bg-hot-wash" : "bg-lime-wash"
                    : dark ? "bg-plum-700" : "bg-sky-mid"}`}
      >
      {(() => {
        // Lime is the only light surface left on this page, so it is the only
        // one that still takes near-black type. Everything else is navy.
        const onLime = plan.featured && !dark;
        const head = onLime ? "text-sky-deep" : "text-white";
        const body = onLime ? "text-sky-deep/80" : "text-white/80";
        const onColour = true;

        return (
          <>
            {plan.badge && (
              <span className={`w-fit rounded-full px-3 py-1 display text-[11px] tracking-[0.1em]
                                ${plan.featured && !dark ? "bg-sky-deep text-lime" : "bg-white/20 text-white"}`}>
                {plan.badge}
              </span>
            )}
            {plan.eyebrow && (
              <p className={`${plan.badge ? "mt-4" : ""} display text-[11px] tracking-[0.22em] ${body}`}>
                {plan.eyebrow}
              </p>
            )}

            <h3
              className={`mt-3 display ${head}
                          ${compact ? "text-[clamp(1.05rem,1.5vw,1.3rem)]" : "text-[clamp(1.3rem,2.2vw,1.75rem)]"}`}
            >
              {plan.nameTop} {plan.nameBottom}
            </h3>

            <p className="mt-4 flex items-baseline gap-1.5">
              <span
                className={`display tabular-nums ${head}
                            ${compact ? "text-[clamp(1.5rem,2.3vw,1.95rem)]" : "text-[clamp(1.9rem,3.2vw,2.5rem)]"}`}
              >
                {formatINR(plan.priceInPaise)}
              </span>
              <span className={`${compact ? "text-[11px]" : "text-sm"} ${body}`}>
                {billingSuffix(plan)}
              </span>
            </p>

            <p className={`mt-3 leading-relaxed ${compact ? "text-[11.5px]" : "text-sm"} ${body}`}>
              {plan.tagline}
            </p>

            <button
              onClick={onSelect}
              className={`btn sweep w-full ${compact ? "mt-5 !px-4 !py-2.5 !text-[12px]" : "mt-7"}
                          ${plan.featured && !dark
                            ? "bg-sky-deep text-white"
                            : plan.featured && dark
                              ? "bg-white text-plum"
                              : dark
                                ? "bg-hot-wash text-white"
                                : "bg-white text-sky-deep"}`}
            >
              {plan.ctaLabel}
            </button>

            <p
              className={`display tracking-[0.16em] ${body}
                          ${compact ? "mt-5 text-[10px]" : "mt-7 text-[12px]"}`}
            >
              {plan.featuresHeading ?? "WHAT'S INCLUDED"}
            </p>

            <ul className={compact ? "mt-3 space-y-2" : "mt-4 space-y-3"}>
              {plan.features.map((f) => (
                <li
                  key={f.label}
                  className={`flex leading-relaxed ${body}
                              ${compact ? "gap-1.5 text-[11.5px]" : "gap-2.5 text-sm"}`}
                >
                  <span aria-hidden className={`mt-[2px] shrink-0 font-bold ${head}`}>
                    {f.inherited ? "+" : "→"}
                  </span>
                  <span className="min-w-0">
                    <span className={f.inherited ? `font-semibold ${head}` : ""}>{f.label}</span>
                    {f.detail && <span className="block text-[12.5px] opacity-75">{f.detail}</span>}
                  </span>
                </li>
              ))}
            </ul>

            {/* Pinned to the bottom so cards of very different length still
                line up along their lower edge within a row. */}
            {plan.outcome && (
              <div className="mt-auto pt-7">
                <div className={`rounded-2xl p-4 ${onLime ? "bg-black/15" : "bg-white/[0.07]"}`}>
                  <p className={`display text-[11px] tracking-[0.16em] ${head}`}>THE OUTCOME</p>
                  <p className={`mt-1.5 text-[13px] leading-relaxed ${body}`}>{plan.outcome}</p>
                </div>
              </div>
            )}
          </>
        );
      })()}
      </article>
    </div>
  );
}

function WideCard({ plan, dark }: { plan: Plan; dark: boolean }) {
  const mailto = `mailto:${contactConfig.email.general}?subject=${encodeURIComponent("Custom campaign proposal")}`;

  return (
    <article className={`block-card reveal mt-5 p-8 sm:p-12 ${dark ? "bg-plum-700" : "bg-sky-mid"}`}>
      <p className={`display text-[12px] tracking-[0.22em] ${dark ? "text-hot-light" : "text-violet-light"}`}>
        BUILT AROUND YOUR CAMPAIGN
      </p>
      <h3 className={`mt-4 display text-big ${dark ? "text-white" : "text-white"}`}>CUSTOM PRICING</h3>
      <p className={`mt-4 max-w-prose text-sm leading-relaxed ${dark ? "text-chalk-dim" : "text-white/70"}`}>
        {plan.tagline}
      </p>

      <div className={`mt-9 grid gap-6 border-t pt-8 sm:grid-cols-2 ${dark ? "border-white/10" : "border-white/10"}`}>
        {plan.features.map((f) => (
          <div key={f.label} className="flex gap-3">
            <span aria-hidden className={`mt-[2px] shrink-0 font-bold ${dark ? "text-hot-light" : "text-violet-light"}`}>→</span>
            <div className="min-w-0">
              <p className={`display text-[14px] ${dark ? "text-white" : "text-white"}`}>{f.label}</p>
              {f.detail && (
                <p className={`mt-1.5 text-[13px] leading-relaxed ${dark ? "text-chalk-dim" : "text-white/70"}`}>
                  {f.detail}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <a href={mailto} className={`btn sweep mt-9 ${dark ? "bg-hot-wash text-white" : "bg-sky-deep text-white"}`}>
        {plan.ctaLabel}
      </a>
    </article>
  );
}

/**
 * The earn-it route. Sits under the priced tiers because it is an alternative
 * to paying, not a tier of its own — and the campaign conditions ride along
 * with it rather than being left for someone to discover later.
 */
function FreeRouteCard({
  route,
  dark,
}: {
  route: NonNullable<PlanCatalogue["freeRoute"]>;
  dark: boolean;
}) {
  const form = contactConfig.forms.campaignMembership;

  return (
    <article
      className={`block-card reveal mt-5 p-8 sm:p-12 ${dark ? "bg-plum-700" : "bg-lime-wash"}`}
    >
      <p
        className={`display text-[12px] tracking-[0.22em] ${dark ? "text-hot-light" : "text-sky-deep/70"}`}
      >
        {route.eyebrow}
      </p>
      <h3 className={`mt-4 display text-big ${dark ? "text-white" : "text-sky-deep"}`}>
        {route.heading}
      </h3>
      <p
        className={`mt-4 max-w-prose text-sm leading-relaxed ${dark ? "text-chalk-dim" : "text-sky-deep/75"}`}
      >
        {route.intro}
      </p>

      <ol
        className={`mt-9 grid gap-6 border-t pt-8 sm:grid-cols-2 ${dark ? "border-white/10" : "border-sky-deep/15"}`}
      >
        {route.steps.map((step, i) => (
          <li key={step.title} className="flex gap-3.5">
            <span
              aria-hidden
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-full display text-[12px]
                          ${dark ? "bg-hot-wash text-white" : "bg-sky-deep text-lime"}`}
            >
              {i + 1}
            </span>
            <div className="min-w-0">
              <p className={`display text-[14px] ${dark ? "text-white" : "text-sky-deep"}`}>
                {step.title}
              </p>
              <p
                className={`mt-1.5 text-[13px] leading-relaxed ${dark ? "text-chalk-dim" : "text-sky-deep/75"}`}
              >
                {step.detail}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <p
        className={`mt-8 text-[13px] leading-relaxed ${dark ? "text-chalk-dim" : "text-sky-deep/75"}`}
      >
        {route.whatNext}
      </p>

      <a
        href={form.shortUrl}
        target="_blank"
        rel="noreferrer"
        className={`btn sweep mt-7 ${dark ? "bg-hot-wash text-white" : "bg-sky-deep text-white"}`}
      >
        {route.ctaLabel}
      </a>

      <p
        className={`mt-7 text-[11.5px] leading-relaxed ${dark ? "text-chalk-faint" : "text-sky-deep/55"}`}
      >
        {route.note}
      </p>
    </article>
  );
}
