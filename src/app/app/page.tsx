import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CreatorForm } from "@/components/app/CreatorForm";
import { Dreams } from "@/components/app/Dreams";
import { PassportScene } from "@/components/app/PassportScene";
import { UpiPayPanel } from "@/components/app/UpiPayPanel";
import { PricingSection } from "@/components/landing/PricingSection";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { RainbowBand } from "@/components/ui/RainbowBand";
import { WelcomeCeremony } from "@/components/app/WelcomeCeremony";
import { brandPlansConfig } from "@/config/brand-plans";
import { creatorPlansConfig } from "@/config/creator-plans";
import { formatINR } from "@/config/plans.types";
import { getSessionProfile } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Your BridgeNow" };
export const dynamic = "force-dynamic";

/**
 * The signed-in world, built to the slice credit-card reference: deep plum,
 * the Passport rising out of the terrain as you scroll, then plans, the
 * application form and payment.
 */
export default async function AppPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/auth?mode=signin&next=/app");

  const audience = profile.role === "brand" ? "brand" : "creator";

  const subscription =
    audience === "creator"
      ? await prisma.creatorSubscription.findFirst({
          where: { userId: profile.id, status: { in: ["active", "grace_period", "pending"] } },
          orderBy: { createdAt: "desc" },
        })
      : await prisma.brandSubscription.findFirst({
          where: { brandId: profile.id, status: { in: ["active", "grace_period", "pending"] } },
          orderBy: { createdAt: "desc" },
        });

  const catalogue = audience === "creator" ? creatorPlansConfig : brandPlansConfig;
  const plan = catalogue.plans.find((p) => p.id === subscription?.tier);
  const name = profile.fullName?.trim() || profile.email.split("@")[0]!;
  const tier = plan ? `${plan.nameTop} ${plan.nameBottom}` : "NO PLAN YET";

  return (
    <div data-world="app" className="bg-plum-900">
      <ScrollReveal />
      <WelcomeCeremony audience={audience} name={name} tier={tier} />
      <AppNav />

      {/* Hero */}
      <section className="relative overflow-hidden bg-plum-wash px-6 pb-20 pt-36 text-center">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-plum-glow" />
        <div className="relative mx-auto max-w-4xl">
          <p className="display text-[13px] tracking-[0.3em] text-hot-light">
            {audience === "creator" ? "CREATOR ACCOUNT" : "BRAND ACCOUNT"}
          </p>
          <h1 className="mt-6 display text-huge text-white">
            WELCOME BACK,
            <br />
            {name.toUpperCase()}
          </h1>
          <p className="mx-auto mt-6 max-w-prose text-[15px] leading-relaxed text-chalk-dim">
            Everything lives here: your Passport, the application, the plans and payment.
          </p>

          <div className="mt-10 inline-flex flex-wrap items-center justify-center gap-x-10 gap-y-4 rounded-[28px] bg-white/[0.06] px-8 py-5 backdrop-blur-xl">
            <Stat label="Plan" value={plan ? `${plan.nameTop} ${plan.nameBottom}` : "None yet"} />
            {subscription && (
              <>
                <Stat
                  label="Billing"
                  value={
                    subscription.billing === "lifetime"
                      ? `${formatINR(subscription.amountInPaise)} once`
                      : `${formatINR(subscription.amountInPaise)} / mo`
                  }
                />
                {/* A lifetime plan has no next debit; showing one would be a lie. */}
                <Stat
                  label={subscription.billing === "lifetime" ? "Access" : "Next debit"}
                  value={
                    subscription.billing === "lifetime"
                      ? "Lifetime"
                      : subscription.nextBillingDate.toLocaleDateString("en-IN", {
                          day: "numeric", month: "short", year: "numeric",
                        })
                  }
                />
                <Stat label="Status" value={subscription.status.replace("_", " ")} />
              </>
            )}
          </div>
        </div>
      </section>

      {/* The super-slicer moment */}
      <PassportScene holder={name.toUpperCase()} tier={tier} />

      {/* What this is all for — before the admin. */}
      <Dreams audience={audience} />

      <main className="bg-plum-900">
        {audience === "creator" && (
          <div className="mx-auto max-w-6xl px-6 pt-20">
            <CreatorForm />
          </div>
        )}

        {/* Locked: a creator never sees brand pricing, and vice versa. */}
        <PricingSection defaultAudience={audience} tone="dark" lockAudience />

        <div className="mx-auto max-w-6xl px-6 pb-20">
          <UpiPayPanel audience={audience} />
        </div>

        <RainbowBand height="h-48" label="CONNECT. COLLABORATE. GROW." />
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-left">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-chalk-faint">{label}</p>
      <p className="mt-1.5 display text-[15px] text-white">{value}</p>
    </div>
  );
}

function AppNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <nav className="mx-auto flex max-w-[1680px] items-center justify-between gap-4 px-5 py-6 sm:px-8">
        <Link href="/app" className="display text-[24px] lowercase tracking-tight text-white">
          bridge<span className="text-hot-light">now</span>
        </Link>
        <div className="flex items-center gap-2.5">
          <a href="#apply" className="pill-nav hidden sm:inline-flex">Apply</a>
          <a href="#pricing" className="pill-nav hidden sm:inline-flex">Plans</a>
          <a href="#pay" className="pill-nav hidden sm:inline-flex">Pay</a>
          <form action="/auth/signout" method="post">
            <button className="pill-nav-ghost">Sign out</button>
          </form>
        </div>
      </nav>
    </header>
  );
}
