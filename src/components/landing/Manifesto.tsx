"use client";

import { useEffect, useRef, useState } from "react";

import { LazyObject3D } from "@/components/three/LazyObject3D";

const TEXT =
  "BridgeNow is a full-stack execution platform for creators, brands, event organisers and on-ground talent. We don't just connect people — we create real opportunities. From brand deals and event gigs to ticketing and talent booking, you get everything you need to grow — in one place.";

/**
 * The manifesto paragraph that lights up word by word as you scroll, matching
 * the savings-page reference.
 *
 * Progress is read from the section's own position in the viewport rather than
 * from a scroll listener on window, and every frame is coalesced into one
 * rAF — a per-word scroll handler is what makes this effect stutter.
 */
export function Manifesto() {
  const ref = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setProgress(1);
      return;
    }

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const vh = window.innerHeight;
        // 0 when the block enters from the bottom, 1 once it's read.
        const p = 1 - (r.top - vh * 0.18) / (vh * 0.62);
        setProgress(Math.max(0, Math.min(1, p)));
        ticking = false;
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const words = TEXT.split(" ");
  const lit = Math.round(progress * words.length);

  return (
    <section ref={ref} className="relative bg-[linear-gradient(180deg,#070C24_0%,#101A44_32%,#1A1550_58%,#070C24_100%)] px-6 pb-20 pt-14 sm:pb-24">
      <p className="mx-auto max-w-4xl text-center font-display text-[clamp(1.15rem,2.5vw,1.9rem)] font-bold leading-[1.45] tracking-[-0.02em]">
        {words.map((w, i) => (
          <span key={`${w}-${i}`} className="word" style={{ color: i < lit ? "#FFFFFF" : "#3C4E90" }}>
            {w}{" "}
          </span>
        ))}
      </p>

      <div className="mx-auto mt-14 flex max-w-4xl flex-wrap items-center justify-center gap-8">
        <span className="rounded-full bg-hot-wash px-9 py-4 display text-[clamp(1.1rem,2.4vw,1.8rem)] text-white shadow-block">
          ONE PLATFORM. ENDLESS OPPORTUNITIES.
        </span>
        <LazyObject3D scene="asterisk" spin={0.5} className="h-40 w-40" />
      </div>
    </section>
  );
}
