import type { BrandTierId, PlanCatalogue } from "./plans.types";

/**
 * BRAND PLANS — transcribed from the BridgeNow Brand Brochure.
 * Monthly, INR, stored in paise.
 *
 * Note what these actually sell: a managed content and growth service measured
 * in reels, scripts, edits and strategy sessions — not seats or creator
 * unlocks. The quotas in `limits` are the real units of delivery, so a
 * dashboard can show "8 of 12 scripted reels used" rather than a vanity count.
 */
export const BRAND_CONFIG_IS_PLACEHOLDER = false as const;

export const brandPlansConfig: PlanCatalogue<BrandTierId> = {
  audience: "brand",
  heading: "SIMPLE PLANS. REAL RESULTS.",
  subheading: "Plans for brands, events and organisers.",
  valueProps: [
    { label: "Consistent monthly content", icon: "collab" },
    { label: "Strategy and creative direction", icon: "guidance" },
    { label: "Creator and campaign coordination", icon: "community" },
    { label: "Performance reporting", icon: "roi" },
  ],
  plans: [
    {
      id: "brand_starter",
      audience: "brand",
      nameTop: "BRAND",
      nameBottom: "STARTER",
      eyebrow: "01 · Build your presence",
      tagline: "For startups, local businesses and emerging brands ready to show up consistently online.",
      priceInPaise: 999_900, // ₹9,999
      currency: "INR",
      billing: "monthly",
      validityDays: 30,
      status: "live",
      ctaLabel: "Get started",
      featuresHeading: "Monthly deliverables",
      outcome:
        "A consistent content system, a stronger online presence and a clear direction for what to publish next.",
      features: [
        { label: "10–12 reels: concept development, content assistance and creative direction" },
        { label: "10–12 reel hooks and content ideas tailored to your business" },
        { label: "Scripting support for up to 8 priority reels" },
        { label: "Monthly content calendar and posting recommendations" },
        { label: "Brand voice, messaging and profile improvement recommendations" },
        { label: "Shooting guidance: angles, lighting, setup and delivery" },
        { label: "One monthly strategy and review session" },
        { label: "Monthly performance summary with actionable improvements" },
      ],
      limits: {
        communityAccess: true,
        collabRequestsPerMonth: null,
        brandPitchTemplates: null,
        mediaKitRefreshesPerMonth: null,
        strategySessionsPerMonth: 1,
        reelsSupportedMin: 10,
        reelsSupportedMax: 12,
        scriptedReels: 8,
        editedReels: 0,
      },
      gatewayPlanIdEnvKey: "RAZORPAY_PLAN_BRAND_STARTER",
    },
    {
      id: "brand_growth_plus",
      audience: "brand",
      nameTop: "GROWTH",
      nameBottom: "PLUS",
      eyebrow: "02 · Accelerate your growth",
      tagline: "For businesses that need stronger storytelling, strategic content and a more active growth process.",
      priceInPaise: 1_499_900, // ₹14,999
      currency: "INR",
      billing: "monthly",
      validityDays: 30,
      status: "live",
      featured: true,
      badge: "Best for growing brands",
      ctaLabel: "Get started",
      featuresHeading: "Everything in Starter, plus",
      outcome:
        "More deliberate content, a recognizable brand identity and a repeatable process for improving performance.",
      features: [
        { label: "Everything in Starter", inherited: true },
        { label: "12–16 reels supported per month" },
        { label: "Customized scripting for up to 12 reels, including hooks, scene flow and calls to action" },
        { label: "Content pillars based on your audience, niche and business objectives" },
        { label: "Competitor content review and differentiation recommendations" },
        { label: "Detailed creative briefs for priority shoots" },
        { label: "Reel editing and packaging for up to 8 reels, using client-provided footage" },
        { label: "Caption, CTA and hashtag assistance" },
        { label: "Monthly performance analysis covering reach, engagement and content retention where data is available" },
        { label: "Two monthly strategy and review sessions" },
        { label: "Recommendations for converting content attention into enquiries or sales" },
      ],
      limits: {
        communityAccess: true,
        collabRequestsPerMonth: null,
        brandPitchTemplates: null,
        mediaKitRefreshesPerMonth: null,
        strategySessionsPerMonth: 2,
        reelsSupportedMin: 12,
        reelsSupportedMax: 16,
        scriptedReels: 12,
        editedReels: 8,
      },
      gatewayPlanIdEnvKey: "RAZORPAY_PLAN_BRAND_GROWTH_PLUS",
    },
    {
      id: "brand_premium",
      audience: "brand",
      nameTop: "BRAND",
      nameBottom: "PREMIUM",
      eyebrow: "03 · Scale your brand",
      tagline: "For ambitious businesses that want an integrated content, campaign and digital growth partner.",
      priceInPaise: 2_499_900, // ₹24,999
      currency: "INR",
      billing: "monthly",
      validityDays: 30,
      status: "live",
      ctaLabel: "Get started",
      featuresHeading: "Everything in Growth Plus, plus",
      outcome:
        "A more integrated growth operation that connects content, brand positioning, campaign execution and business objectives.",
      features: [
        { label: "Everything in Growth Plus", inherited: true },
        { label: "16–20 reels supported per month" },
        { label: "Scripting and creative briefs for up to 16 reels" },
        { label: "Reel editing and packaging for up to 12 reels using client-provided footage" },
        { label: "Monthly campaign concept and promotional content planning" },
        { label: "Brand positioning and messaging refinement" },
        { label: "Competitor benchmarking and creative trend analysis" },
        { label: "Content repurposing recommendations across Instagram, YouTube Shorts and other relevant platforms" },
        { label: "Lead-generation content and conversion-focused CTA planning" },
        { label: "Monthly analytics report and next-month growth roadmap" },
        { label: "Priority communication and coordinated monthly execution" },
        {
          label: "Coordination for approved creator collaborations and brand activations",
          detail: "External fees quoted separately.",
        },
      ],
      limits: {
        communityAccess: true,
        collabRequestsPerMonth: null,
        brandPitchTemplates: null,
        mediaKitRefreshesPerMonth: null,
        strategySessionsPerMonth: 2,
        reelsSupportedMin: 16,
        reelsSupportedMax: 20,
        scriptedReels: 16,
        editedReels: 12,
      },
      gatewayPlanIdEnvKey: "RAZORPAY_PLAN_BRAND_PREMIUM",
    },
    {
      id: "brand_custom",
      audience: "brand",
      nameTop: "BUILT AROUND",
      nameBottom: "YOUR CAMPAIGN",
      tagline: "For companies, established brands, events and organizations with larger or specialized requirements.",
      priceInPaise: 0, // quoted
      currency: "INR",
      billing: "monthly",
      validityDays: 30,
      status: "invite_only",
      wide: true,
      ctaLabel: "Build a custom campaign proposal",
      featuresHeading: "What we take on",
      features: [
        {
          label: "Influencer and creator campaigns",
          detail: "Creator discovery, shortlisting, outreach, negotiations, briefing and campaign coordination.",
        },
        {
          label: "Brand launches and promotions",
          detail: "Campaign strategy, promotional content, launch planning and creative coordination.",
        },
        {
          label: "Events and on-ground activations",
          detail: "Campus promotions, event marketing, ambassador networks and offline execution.",
        },
        {
          label: "Integrated growth campaigns",
          detail: "A coordinated plan combining creators, social content, partnerships and measurable campaign reporting.",
        },
      ],
      limits: {
        communityAccess: true,
        collabRequestsPerMonth: null,
        brandPitchTemplates: null,
        mediaKitRefreshesPerMonth: null,
        strategySessionsPerMonth: null,
        reelsSupportedMin: null,
        reelsSupportedMax: null,
        scriptedReels: null,
        editedReels: null,
        quotedSeparately: true,
      },
      gatewayPlanIdEnvKey: "RAZORPAY_PLAN_BRAND_CUSTOM",
    },
  ],
};
