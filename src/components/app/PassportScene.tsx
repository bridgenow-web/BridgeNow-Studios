"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const PassportStage = dynamic(
  () => import("@/components/three/PassportStage").then((m) => m.PassportStage),
  {
    ssr: false,
    loading: () => (
      <div
        aria-hidden
        className="h-full w-full bg-[radial-gradient(60%_50%_at_50%_55%,rgba(255,46,196,0.35),transparent_70%)]"
      />
    ),
  },
);

/**
 * The scroll section that houses the 3D stage.
 *
 * Scroll progress is written to a ref and read inside the render loop, so
 * scrolling never re-renders React. The three text beats are the exception —
 * they change rarely enough that state is fine, and `beat` only ever holds
 * one of three values.
 */
const BEATS = [
  {
    title: "Issued, not generated.",
    body: "Your Passport updates itself as your tier and reach change.",
  },
  {
    title: "Carried into every pitch.",
    body: "Brands see verified reach, niche and region before they reply.",
  },
  {
    title: "One bridge. Both sides.",
    body: "Creators get found. Brands get matched. Nobody chases DMs.",
  },
];

export function PassportScene({ holder, tier }: { holder: string; tier: string }) {
  const section = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const [beat, setBeat] = useState(0);

  useEffect(() => {
    const el = section.current;
    if (!el) return;

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const travel = r.height - window.innerHeight;
        const p = travel > 0 ? Math.max(0, Math.min(1, -r.top / travel)) : 0;
        progress.current = p;
        setBeat(p < 0.34 ? 0 : p < 0.68 ? 1 : 2);
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

  return (
    <section ref={section} className="relative h-[280vh] bg-plum-900">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <PassportStage
          progressRef={progress}
          holder={holder}
          tier={tier}
          className="absolute inset-0"
        />

        {/* Section label — kept clear of the card, which carries the name itself */}
        <div className="pointer-events-none absolute inset-x-0 top-[9%] z-10 px-6 text-center">
          <p className="display text-[12px] tracking-[0.3em] text-hot-light">
            THE BRIDGENOW PASSPORT
          </p>
        </div>

        {/* Beats */}
        <div className="pointer-events-none absolute inset-x-0 bottom-16 z-10 px-6">
          <div className="mx-auto max-w-xl text-center">
            {BEATS.map((b, i) => (
              <div
                key={b.title}
                className="transition-all duration-500"
                style={{
                  opacity: beat === i ? 1 : 0,
                  transform: beat === i ? "translateY(0)" : "translateY(14px)",
                  position: i === 0 ? "relative" : "absolute",
                  insetInline: i === 0 ? undefined : 0,
                  bottom: i === 0 ? undefined : 0,
                }}
              >
                <p className="display text-[clamp(1.2rem,2.4vw,1.9rem)] text-white">{b.title}</p>
                <p className="mx-auto mt-3 max-w-prose text-sm leading-relaxed text-chalk-dim">
                  {b.body}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Ground fade into the next section */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-plum-900 to-transparent"
        />
      </div>
    </section>
  );
}
