import type { Audience } from "./plans.types";

/**
 * Single source of truth for every outbound channel.
 * Components and email templates resolve addresses through `channelsFor()`
 * so creator mail never goes out under the brand identity, and vice versa.
 */

export const contactConfig = {
  brandName: "BridgeNow",
  tagline: "Where Creators Connect. Collaborate. Grow.",
  shortTagline: "Connect. Collaborate. Grow.",

  email: {
    creator: "bridgenowforcreators@gmail.com",
    general: "contact.bridgenow@gmail.com",
  },

  /** Collection account for manual UPI payments. */
  upi: {
    vpa: "rajkumarbhol29@oksbi",
    payeeName: "Raj Kumar Bhol",
  },

  whatsapp: {
    /** E.164, no spaces — used to build wa.me links. */
    number: "+916280328730",
    display: "+91 62803 28730",
  },

  social: {
    instagram: {
      handle: "@bridge_.now",
      url: "https://www.instagram.com/bridge_.now",
    },
    /** Supplied in a follow-up. `null` hides the link everywhere automatically. */
    linkedin: null as { label: string; url: string } | null,
  },

  forms: {
    /**
     * forms.gle short links do not embed — an <iframe> needs the expanded
     * /viewform URL, with `embedded=true` so Google drops its own chrome.
     * `shortUrl` is kept for sharing in messages and bios.
     */
    creatorApplication: {
      kind: "form" as "form" | "sheet",
      shortUrl: "https://forms.gle/Afx9hWV2Y5VTon4aA",
      url: "https://docs.google.com/forms/d/e/1FAIpQLSfac5X5w3_VkWHHMMb8XAXWB7uNaI_hRjsuRwLD9DQvackz7w/viewform",
      embedUrl:
        "https://docs.google.com/forms/d/e/1FAIpQLSfac5X5w3_VkWHHMMb8XAXWB7uNaI_hRjsuRwLD9DQvackz7w/viewform?embedded=true",
    },
    /**
     * The Journey Sharing campaign — the route to a free membership. A
     * SEPARATE form from the creator application above: that one onboards a
     * paying member, this one enters a campaign with its own rules, so they
     * must not share a link.
     *
     * Title: "Turn Your Creator Journey Into an Opportunity!"
     */
    campaignMembership: {
      kind: "form" as "form" | "sheet",
      shortUrl: "https://forms.gle/kBtjhe323borRwnd6",
      url: "https://docs.google.com/forms/d/e/1FAIpQLSdzvUz-_HKbBmA2Gj0CyF3dyR7T_VsdSPcrBLwerc0rlGKMwQ/viewform",
      embedUrl:
        "https://docs.google.com/forms/d/e/1FAIpQLSdzvUz-_HKbBmA2Gj0CyF3dyR7T_VsdSPcrBLwerc0rlGKMwQ/viewform?embedded=true",
    },
    brandApplication: null as { kind: "form" | "sheet"; url: string } | null,
  },
} as const;

export interface Channels {
  supportEmail: string;
  fromEnvKey: "CREATOR_FROM_EMAIL" | "BRAND_FROM_EMAIL";
  replyToEnvKey: "CREATOR_REPLY_TO" | "BRAND_REPLY_TO";
  whatsappUrl: string;
}

export function channelsFor(audience: Audience): Channels {
  const text =
    audience === "creator"
      ? "Hi BridgeNow — I'm a creator and I'd like help with my plan."
      : "Hi BridgeNow — I'd like to discuss a brand campaign.";

  return {
    supportEmail:
      audience === "creator" ? contactConfig.email.creator : contactConfig.email.general,
    fromEnvKey: audience === "creator" ? "CREATOR_FROM_EMAIL" : "BRAND_FROM_EMAIL",
    replyToEnvKey: audience === "creator" ? "CREATOR_REPLY_TO" : "BRAND_REPLY_TO",
    whatsappUrl: `https://wa.me/${contactConfig.whatsapp.number.replace(
      /\D/g,
      "",
    )}?text=${encodeURIComponent(text)}`,
  };
}
