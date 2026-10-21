import { Hero } from "@/components/landing/Hero";
import { Manifesto } from "@/components/landing/Manifesto";
import { PricingSection } from "@/components/landing/PricingSection";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { SiteNav } from "@/components/landing/SiteNav";
import { Showcase } from "@/components/landing/Showcase";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { IntroCurtain } from "@/components/ui/IntroCurtain";

export default function HomePage() {
  return (
    <>
      {/* Ships in the server HTML so it covers the page on first paint. */}
      <IntroCurtain />
      <ScrollReveal />
      <SiteNav />
      <main>
        <Hero />
        <Manifesto />
        <Showcase />
        <PricingSection requireAuth />
      </main>
      <SiteFooter />
    </>
  );
}
