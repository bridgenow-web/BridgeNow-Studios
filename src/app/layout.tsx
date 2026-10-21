import type { Metadata, Viewport } from "next";
import { Manrope, Sora, JetBrains_Mono } from "next/font/google";

import { contactConfig } from "@/config/contact";
import "./globals.css";

// Sora for display (geometric, slightly condensed caps — carries the brochure's
// headline weight), Manrope for body (open apertures, reads well at 14px on dark).
const sora = Sora({ subsets: ["latin"], variable: "--font-display", weight: ["400", "600", "700", "800"] });
const inter = Manrope({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "500"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://bridgenow.in"),
  title: {
    default: `${contactConfig.brandName} — Influence meets intent.`,
    template: `%s · ${contactConfig.brandName}`,
  },
  description:
    "The bridge between micro-creators and marquee brands. Collaboration, brand-readiness and campaign tooling in one place.",
  openGraph: {
    title: `${contactConfig.brandName} — Influence meets intent.`,
    description: contactConfig.tagline,
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#1B3FE0",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sora.variable} ${inter.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
