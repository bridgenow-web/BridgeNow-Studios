/**
 * Shared plan contracts for both sides of the marketplace.
 *
 * The whole point of this file: the Creator and Brand catalogues are *data*.
 * The pricing UI, the checkout route, the Razorpay plan mapping and the DB
 * enum all read from these types — so when the Brand Brochure lands, you swap
 * `brand-plans.ts` and nothing else changes.
 */

export type Audience = "creator" | "brand";

/**
 * `lifetime` is a one-off purchase, not a cadence: no mandate, no renewal, no
 * pre-debit notice. Checkout, the renewal sweep and the payment modal all
 * branch on it — see `isRecurring` below, which is the single place that
 * decides.
 */
export type BillingFrequency = "monthly" | "quarterly" | "yearly" | "lifetime";

export type PlanStatus = "live" | "coming_soon" | "invite_only";

/** Keep in sync with the `creator_tier` / `brand_tier` Postgres enums. */
export type CreatorTierId =
  | "creator_basic"
  | "creator_plus"
  | "creator_growth_pro"
  | "creator_elite"
  | "creator_premium";
export type BrandTierId =
  | "brand_starter"
  | "brand_growth_plus"
  | "brand_premium"
  | "brand_custom";
export type TierId = CreatorTierId | BrandTierId;

export interface PlanFeature {
  /** Copy exactly as it should render. Keep it short — the card is dense. */
  label: string;
  /** Inherited rows ("Everything in Starter") render with a different glyph. */
  inherited?: boolean;
  /** A second line under the label. Used by the custom tier's capability list. */
  detail?: string;
}

export interface PlanLimits {
  /** Hard caps enforced server-side. `null` = unlimited / not applicable. */
  communityAccess: boolean;
  collabRequestsPerMonth: number | null;
  brandPitchTemplates: number | null;
  mediaKitRefreshesPerMonth: number | null;
  strategySessionsPerMonth: number | null;

  /**
   * Creator-side service quotas — the units the creator brochure sells. A
   * number is a monthly cap; `0` means the tier does not include it at all.
   * Omitted on brand plans.
   */
  reelReviewsPerMonth?: number | null;
  reelScriptsPerMonth?: number | null;
  growthConsultationsPerMonth?: number | null;
  personalManager?: boolean;
  monthlyPerformanceReport?: boolean;
  prioritySupport?: boolean;

  /**
   * Brand-side service quotas. These are the units the brand brochure actually
   * sells — monthly reel volume and how much of it we script and edit — not
   * seats or unlocks. `null` on creator plans; `null` on a brand plan means
   * "not applicable", not "unlimited".
   */
  reelsSupportedMin?: number | null;
  reelsSupportedMax?: number | null;
  scriptedReels?: number | null;
  editedReels?: number | null;
  /** Custom engagements are quoted, so every quota is open. */
  quotedSeparately?: boolean;
}

export interface Plan<T extends TierId = TierId> {
  id: T;
  audience: Audience;
  /** "CREATOR" */
  nameTop: string;
  /** "STARTER" — rendered in gold under nameTop, matching the brochure. */
  nameBottom: string;
  tagline: string;
  /** Price in paise. 4900 = ₹49.00. Always integer money. */
  priceInPaise: number;
  currency: "INR";
  billing: BillingFrequency;
  /** Days of service bought per debit. Drives next_billing_date. */
  validityDays: number;
  status: PlanStatus;
  featured?: boolean;
  badge?: string;
  /** Section marker from the brochure, e.g. "01 · Build your presence". */
  eyebrow?: string;
  /** Heading above the feature list. Defaults to "What's included". */
  featuresHeading?: string;
  /** The brochure's closing "The outcome" paragraph. */
  outcome?: string;
  /** Renders full-width below the priced tiers instead of as a column. */
  wide?: boolean;
  features: PlanFeature[];
  limits: PlanLimits;
  /** Razorpay plan_id, injected from env so staging/prod can differ. */
  gatewayPlanIdEnvKey: string;
  ctaLabel: string;
}

/**
 * The earn-it-instead-of-buying-it route, where a catalogue offers one.
 *
 * Every claim here is conditional in the source document, and the conditions
 * travel with the copy rather than being trimmed for the card — an unqualified
 * "get it free" on a pricing page is a promise the campaign rules do not make.
 */
export interface FreeRoute {
  eyebrow: string;
  heading: string;
  intro: string;
  steps: { title: string; detail: string }[];
  whatNext: string;
  /** The conditions. Rendered, never dropped. */
  note: string;
  ctaLabel: string;
}

export interface PlanCatalogue<T extends TierId = TierId> {
  audience: Audience;
  /** Section heading, e.g. "CREATOR PLANS". */
  heading: string;
  subheading: string;
  /** The "Why BridgeNow?" strip beneath the cards. */
  valueProps: { label: string; icon: ValuePropIcon }[];
  plans: Plan<T>[];
  freeRoute?: FreeRoute;
}

export type ValuePropIcon = "community" | "collab" | "guidance" | "readiness" | "reach" | "roi";

/**
 * Does this plan debit again? The one place that question is answered.
 *
 * A lifetime plan is bought once, so it gets no e-mandate, never enters the
 * renewal sweep, and must never trigger a pre-debit notification — sending one
 * for a payment that will not happen is exactly the kind of thing the RBI
 * framework exists to prevent.
 */
export function isRecurring(plan: Pick<Plan, "billing">): boolean {
  return plan.billing !== "lifetime";
}

/** "/month" or "lifetime" — what sits next to the price on a card. */
export function billingSuffix(plan: Pick<Plan, "billing">): string {
  switch (plan.billing) {
    case "lifetime":
      return "lifetime";
    case "quarterly":
      return "/quarter";
    case "yearly":
      return "/year";
    default:
      return "/month";
  }
}

/** ₹49 from 4900 paise, no trailing zeros — matches the brochure's typography. */
export function formatINR(paise: number): string {
  const rupees = paise / 100;
  return `₹${rupees % 1 === 0 ? rupees.toLocaleString("en-IN") : rupees.toFixed(2)}`;
}

export function getPlan(catalogue: PlanCatalogue, id: string): Plan | undefined {
  return catalogue.plans.find((p) => p.id === id);
}
