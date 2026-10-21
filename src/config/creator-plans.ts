import type { CreatorTierId, PlanCatalogue } from "./plans.types";

/**
 * CREATOR PLANS — transcribed from the BridgeNow Creator Plans document.
 * Pricing is INR, stored in paise.
 *
 * Five tiers. Basic is bought ONCE (₹49, lifetime); the other four are monthly
 * subscriptions. That split is load-bearing: a lifetime plan takes no
 * e-mandate and never enters the renewal sweep. See `isRecurring` in
 * plans.types.ts.
 *
 * If the brochure changes, this file is the only thing that changes —
 * except the tier ids, which are mirrored in the `creator_tier` Postgres enum.
 */
export const creatorPlansConfig: PlanCatalogue<CreatorTierId> = {
  audience: "creator",
  heading: "JOIN BRIDGENOW AND UNLOCK OPPORTUNITIES",
  subheading:
    "Be a part of a community that helps you get brand collaborations, event gigs and more.",
  valueProps: [
    { label: "Creator community", icon: "community" },
    { label: "Collaboration opportunities", icon: "collab" },
    { label: "Professional guidance", icon: "guidance" },
    { label: "Brand readiness", icon: "readiness" },
  ],
  plans: [
    {
      id: "creator_basic",
      audience: "creator",
      nameTop: "CREATOR",
      nameBottom: "BASIC",
      tagline: "Your entry into the BridgeNow ecosystem.",
      priceInPaise: 4_900, // ₹49
      currency: "INR",
      billing: "lifetime",
      // Bought once. Nothing reads this for a lifetime plan, but a finite
      // number keeps date arithmetic total if something ever does.
      validityDays: 36_500,
      status: "live",
      ctaLabel: "Join for ₹49",
      outcome: "Build a large, accessible creator network across India.",
      features: [
        { label: "Personalized welcome poster with name, photo and social handle" },
        { label: "BridgeNow Creator Member identity" },
        { label: "Registration in the BridgeNow creator database" },
        { label: "Access to the BridgeNow creator community" },
        { label: "Networking with creators across niches" },
        { label: "Updates about upcoming campaigns, events and opportunities" },
        { label: "Digital membership card or certificate" },
      ],
      limits: {
        communityAccess: true,
        collabRequestsPerMonth: 15,
        brandPitchTemplates: 0,
        mediaKitRefreshesPerMonth: 0,
        strategySessionsPerMonth: 0,
        reelReviewsPerMonth: 0,
        reelScriptsPerMonth: 0,
        growthConsultationsPerMonth: 0,
        personalManager: false,
        monthlyPerformanceReport: false,
        prioritySupport: false,
      },
      gatewayPlanIdEnvKey: "RAZORPAY_PLAN_CREATOR_BASIC",
    },
    {
      id: "creator_plus",
      audience: "creator",
      nameTop: "CREATOR",
      nameBottom: "PLUS",
      tagline: "Learn, participate and grow independently.",
      priceInPaise: 9_900, // ₹99
      currency: "INR",
      billing: "monthly",
      validityDays: 30,
      status: "live",
      ctaLabel: "Get started",
      outcome: "Give creators recurring resources and reasons to stay subscribed.",
      features: [
        {
          label: "Everything in Creator Basic",
          inherited: true,
          detail: "While the membership is active; lifetime Basic benefits are retained separately.",
        },
        { label: "Weekly reel ideas, hooks and content prompts" },
        { label: "Monthly 30-day creator growth challenge" },
        { label: "Creator Growth Score and monthly self-assessment" },
        { label: "Profile optimization and growth toolkit" },
        {
          label: "Creator resource library",
          detail: "Captions, content calendars and brand-pitch templates.",
        },
        { label: "Members-only creator networking and collaboration directory" },
        { label: "Monthly Creator of the Month recognition opportunity" },
        { label: "Relevant brand campaign, event and collaboration alerts" },
        {
          label: "Journey Sharing Campaign registration",
          detail:
            "Includes eligibility to participate for the advertised ₹1 lakh prize pool, subject to official rules and confirmed funding.",
        },
      ],
      limits: {
        communityAccess: true,
        collabRequestsPerMonth: 50,
        brandPitchTemplates: null, // resource library — open access
        mediaKitRefreshesPerMonth: 0,
        strategySessionsPerMonth: 0,
        reelReviewsPerMonth: 0,
        reelScriptsPerMonth: 0,
        growthConsultationsPerMonth: 0,
        personalManager: false,
        monthlyPerformanceReport: false,
        prioritySupport: false,
      },
      gatewayPlanIdEnvKey: "RAZORPAY_PLAN_CREATOR_PLUS",
    },
    {
      id: "creator_growth_pro",
      audience: "creator",
      nameTop: "CREATOR",
      nameBottom: "GROWTH PRO",
      tagline: "Build a stronger personal brand.",
      priceInPaise: 19_900, // ₹199
      currency: "INR",
      billing: "monthly",
      validityDays: 30,
      status: "live",
      featured: true,
      badge: "Most popular",
      ctaLabel: "Get started",
      outcome: "Deliver structured growth support without full personal management.",
      features: [
        { label: "Everything in Creator Plus", inherited: true },
        { label: "Structured personal brand audit" },
        { label: "Personalized monthly content calendar" },
        { label: "One reel review per month" },
        { label: "Advanced brand-pitch and media-kit templates" },
        { label: "Digital creator portfolio setup" },
        { label: "Priority consideration for relevant campaign opportunities where offered" },
        { label: "Eligibility for selected BridgeNow creator showcases and spotlights" },
        { label: "Practical recommendations to improve content, positioning and engagement" },
      ],
      limits: {
        communityAccess: true,
        collabRequestsPerMonth: null,
        brandPitchTemplates: null,
        mediaKitRefreshesPerMonth: 0,
        strategySessionsPerMonth: 0,
        reelReviewsPerMonth: 1,
        reelScriptsPerMonth: 0,
        growthConsultationsPerMonth: 0,
        personalManager: false,
        monthlyPerformanceReport: false,
        prioritySupport: false,
      },
      gatewayPlanIdEnvKey: "RAZORPAY_PLAN_CREATOR_GROWTH_PRO",
    },
    {
      id: "creator_elite",
      audience: "creator",
      nameTop: "CREATOR",
      nameBottom: "ELITE",
      tagline: "Personal guidance from BridgeNow.",
      priceInPaise: 49_900, // ₹499
      currency: "INR",
      billing: "monthly",
      validityDays: 30,
      status: "live",
      ctaLabel: "Get started",
      outcome: "Give creators ongoing guidance and personalized support.",
      features: [
        { label: "Everything in Creator Growth Pro", inherited: true },
        { label: "Dedicated personal creator manager as the primary point of contact" },
        { label: "One monthly growth consultation" },
        { label: "Personalized monthly growth roadmap" },
        { label: "Up to four reel reviews per month" },
        { label: "Brand collaboration assistance and outreach guidance" },
        { label: "Monthly accountability check-in" },
        { label: "Priority creator spotlight consideration" },
        { label: "Priority support through an agreed communication channel and support hours" },
      ],
      limits: {
        communityAccess: true,
        collabRequestsPerMonth: null,
        brandPitchTemplates: null,
        mediaKitRefreshesPerMonth: 1,
        strategySessionsPerMonth: 1,
        reelReviewsPerMonth: 4,
        reelScriptsPerMonth: 0,
        growthConsultationsPerMonth: 1,
        personalManager: true,
        monthlyPerformanceReport: false,
        prioritySupport: true,
      },
      gatewayPlanIdEnvKey: "RAZORPAY_PLAN_CREATOR_ELITE",
    },
    {
      id: "creator_premium",
      audience: "creator",
      nameTop: "CREATOR",
      nameBottom: "PREMIUM",
      tagline: "Advanced, personalized creator development.",
      priceInPaise: 99_900, // ₹999
      currency: "INR",
      billing: "monthly",
      validityDays: 30,
      status: "live",
      ctaLabel: "Get started",
      outcome:
        "Provide a higher-touch service for creators serious about developing their personal brand.",
      features: [
        { label: "Everything in Creator Elite", inherited: true },
        { label: "Dedicated personal creator manager" },
        { label: "Up to eight customized reel scripts per month, when requested" },
        { label: "Personalized monthly content calendar" },
        { label: "Up to 12 reel reviews per month" },
        { label: "Two monthly strategy sessions" },
        {
          label: "Monthly performance report",
          detail: "Available views, reach, engagement and consistency metrics.",
        },
        { label: "Personal branding and media-kit refinement" },
        { label: "Brand outreach planning, pitch preparation and follow-up assistance" },
        { label: "Quarterly growth roadmap" },
        { label: "Priority creator support within defined support hours" },
      ],
      limits: {
        communityAccess: true,
        collabRequestsPerMonth: null,
        brandPitchTemplates: null,
        mediaKitRefreshesPerMonth: null,
        strategySessionsPerMonth: 2,
        reelReviewsPerMonth: 12,
        reelScriptsPerMonth: 8,
        growthConsultationsPerMonth: 2,
        personalManager: true,
        monthlyPerformanceReport: true,
        prioritySupport: true,
      },
      gatewayPlanIdEnvKey: "RAZORPAY_PLAN_CREATOR_PREMIUM",
    },
  ],

  freeRoute: {
    eyebrow: "AVAIL THE MEMBERSHIP FOR FREE",
    heading: "GET YOUR FREE BRIDGENOW CREATOR MEMBERSHIP",
    intro: "Want to join the BridgeNow creator community for FREE? Here's how.",
    steps: [
      {
        title: "Fill out the Google Form",
        detail: "Share your details and social media profile with us.",
      },
      {
        title: "Get your script",
        detail: "Our team will contact shortlisted creators and provide a video script.",
      },
      {
        title: "Create & post",
        detail:
          "Make a video using our script, post it on your social media channel, and invite @bridge_.now to collaborate on the post.",
      },
      {
        title: "Get rewarded",
        detail:
          "If your video reaches 500,000 views, 10,000 likes and 500 comments within the campaign period, you'll qualify for a paid opportunity on your next reel for BridgeNow, subject to campaign terms.",
      },
    ],
    whatNext:
      "Our team will review your application and contact selected creators with the next steps.",
    note:
      "Membership approval, video eligibility and rewards are subject to BridgeNow's campaign rules. The paid opportunity applies to your next BridgeNow reel; payment and deliverables will be confirmed with selected creators in writing.",
    ctaLabel: "Fill out the Google Form",
  },
};
