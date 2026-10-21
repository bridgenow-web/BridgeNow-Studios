import type { Config } from "tailwindcss";

/**
 * Two worlds, deliberately.
 *
 *   PUBLIC (landing)  — electric blue → cyan, acid lime display type, hot
 *                       magenta objects. Loud, optimistic, "come in".
 *   PRIVATE (/app)    — deep purple → black, magenta glow. Quieter, focused,
 *                       the place where the Passport lives.
 *
 * Shared: one condensed display face at enormous sizes, flat colour blocks,
 * glossy 3D objects over gradient.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // ── Public world ──
        // Dark navy. `deep` is the ground the whole public page sits on;
        // `mid` is a raised card surface; `pale` is muted body text ON navy
        // (it is no longer a background). `sky-deep` stays the darkest value
        // in the ramp, so the many `text-sky-deep` labels that sit on white
        // and lime still read as near-black.
        sky: {
          DEFAULT: "#2B3FA8",
          deep: "#070C24",
          mid: "#16255C",
          light: "#2E4BA8",
          pale: "#9FB4E8",
        },
        /**
         * The landing page's own palette, from the approved mockup.
         * Deliberately separate from `sky`/`plum`, which still dress /app and
         * /auth — this page is light, those stay dark.
         */
        ink: {
          DEFAULT: "#0B1033",
          soft: "#4A5578",
          faint: "#8A93AE",
          line: "#E4E9F5",
        },
        tint: {
          rose: "#FFE5EE",
          azure: "#DFEBFF",
          lilac: "#EEE6FF",
          mint: "#E2F6E9",
          sky: "#EAF2FF",
        },
        // Clouds, and the third accent alongside lime and hot.
        violet: {
          DEFAULT: "#8B45E8",
          light: "#B182FF",
          deep: "#5B21B6",
          mist: "#6D3BC4",
        },
        lime: {
          DEFAULT: "#D7FF3E",
          bright: "#E8FF6B",
          deep: "#A8D400",
        },
        hot: {
          DEFAULT: "#FF2EC4",
          light: "#FF6BD8",
          deep: "#C80092",
        },
        // ── Private world ──
        plum: {
          DEFAULT: "#1A0520",
          900: "#12031A",
          800: "#240A2E",
          700: "#3A1049",
          600: "#55196B",
          500: "#7A2499",
        },
        // ── Neutrals ──
        chalk: { DEFAULT: "#FFFFFF", muted: "#E8E6F2", dim: "#B6B2C8", faint: "#7E7A92" },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        // Tightened one step across the board: the original scale was built
        // for two-word headlines and left the page feeling loose once real
        // copy went in.
        mega: ["clamp(2.5rem, 8.6vw, 6.6rem)", { lineHeight: "0.86", letterSpacing: "-0.032em" }],
        huge: ["clamp(1.85rem, 4.8vw, 3.8rem)", { lineHeight: "0.92", letterSpacing: "-0.028em" }],
        big: ["clamp(1.35rem, 3vw, 2.3rem)", { lineHeight: "1.0", letterSpacing: "-0.022em" }],
      },
      backgroundImage: {
        // Night sky: deepest at the top, opening toward indigo at the horizon
        // so the purple cloud bank has something to sit against.
        "sky-wash":
          "linear-gradient(170deg, #050918 0%, #0A1030 26%, #121C4E 52%, #1E2A6E 76%, #32277F 100%)",
        "sky-soft":
          "linear-gradient(180deg, #0A1030 0%, #121C4E 45%, #070C24 100%)",
        "violet-wash": "linear-gradient(150deg, #8B45E8 0%, #5B21B6 100%)",
        // Landing page surfaces
        "hero-sky":
          "linear-gradient(135deg, #CFE2FF 0%, #DCEAFF 30%, #E9F1FF 58%, #F6F9FF 100%)",
        "band-soft":
          "linear-gradient(90deg, #DCE9FF 0%, #F0E4FF 38%, #FFE2F1 68%, #E6ECFF 100%)",
        "cta-violet": "linear-gradient(120deg, #4F46E5 0%, #7C5CF5 55%, #9F6BF7 100%)",
        "plum-wash":
          "radial-gradient(70% 55% at 50% 0%, #55196B 0%, #240A2E 48%, #12031A 100%)",
        "plum-glow":
          "radial-gradient(60% 50% at 50% 42%, rgba(255,46,196,0.34) 0%, transparent 68%)",
        "hot-wash": "linear-gradient(150deg, #FF2EC4 0%, #C80092 100%)",
        "lime-wash": "linear-gradient(150deg, #D7FF3E 0%, #A8D400 100%)",
      },
      boxShadow: {
        pill: "0 6px 20px -8px rgba(0,0,0,0.35)",
        block: "0 40px 90px -45px rgba(0,0,0,0.55)",
        "glow-hot": "0 0 0 1px rgba(255,46,196,0.25), 0 40px 110px -40px rgba(255,46,196,0.85)",
      },
      keyframes: {
        drift: { "0%,100%": { transform: "translateY(0) rotate(0deg)" }, "50%": { transform: "translateY(-22px) rotate(3deg)" } },
        driftSlow: { "0%,100%": { transform: "translateY(0) rotate(0deg)" }, "50%": { transform: "translateY(18px) rotate(-4deg)" } },
        marq: { from: { transform: "translateX(0)" }, to: { transform: "translateX(-100%)" } },
      },
      animation: {
        drift: "drift 9s ease-in-out infinite",
        "drift-slow": "driftSlow 12s ease-in-out infinite",
        marq: "marq 34s linear infinite",
      },
      maxWidth: { prose: "56ch" },
    },
  },
  plugins: [],
};

export default config;
