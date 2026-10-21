"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { LazyObject3D } from "@/components/three/LazyObject3D";
import type { SceneName } from "@/components/three/scenes";

/**
 * The three propositions, side by side, as a slider.
 *
 * It is a native scroll-snap track, not a JS carousel: the browser already
 * does momentum, touch, trackpad and keyboard properly, and re-implementing
 * that in JS is how carousels end up feeling wrong on exactly one device you
 * do not own. JS is left with the two things scroll-snap cannot do on its own
 * — telling the dots which card is centred, and moving the track when a dot is
 * clicked.
 *
 * Which card is active is read from scroll position rather than tracked in a
 * counter, so a flick that crosses two cards still lights the right dot.
 */
const SLIDES = [
  {
    bg: "bg-hot-wash",
    kicker: "FOR CREATORS",
    title: ["GET BRAND", "COLLABORATIONS"],
    body: "Monetise your content and grow with real opportunities.",
    scene: "orb" as SceneName,
    text: "text-white",
    dot: "bg-hot",
  },
  {
    bg: "bg-violet-wash",
    kicker: "FOR BRANDS",
    title: ["RUN INFLUENCER", "CAMPAIGNS"],
    body: "Work with relevant creators and get real results.",
    scene: "pin" as SceneName,
    text: "text-white",
    dot: "bg-violet",
  },
  {
    bg: "bg-lime-wash",
    kicker: "FOR EVENTS",
    title: ["END-TO-END", "EVENT SOLUTIONS"],
    body: "From ticketing to talent booking, we handle everything.",
    scene: "coins" as SceneName,
    text: "text-sky-deep",
    dot: "bg-lime",
  },
];

/** The slider opens centred on this card — "Run influencer campaigns". */
const INITIAL = 1;

export function Showcase() {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(INITIAL);
  const didInit = useRef(false);
  /**
   * Side padding so the FIRST and LAST cards can actually reach the centre.
   * Without it the track runs out of scroll before the end card is centred,
   * `snap-center` parks it off to one side, and its dot can never light up —
   * clicking the last dot would land on the second-to-last card.
   */
  const [pad, setPad] = useState(0);

  // Nearest card to the track's centre wins.
  // Measuring and reading are deliberately separate. When one function did
  // both, the first pass computed the active card from pre-padding offsets and
  // lit the wrong dot on load.
  const measure = useCallback(() => {
    const el = track.current;
    const first = el?.children[0] as HTMLElement | undefined;
    if (!el || !first) return;
    setPad(Math.max(0, (el.clientWidth - first.offsetWidth) / 2));
  }, []);

  const sync = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const mid = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    let bestGap = Infinity;
    Array.from(el.children).forEach((child, i) => {
      const c = child as HTMLElement;
      const gap = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid);
      if (gap < bestGap) {
        bestGap = gap;
        best = i;
      }
    });
    setActive(best);
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        sync();
        ticking = false;
      });
    };
    measure();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
    };
  }, [sync, measure]);

  // Once the padding is on the element, offsets are final — read the active
  // card from them.
  useEffect(() => {
    const el = track.current;
    if (!el) return;

    if (!didInit.current && pad > 0) {
      const card = el.children[INITIAL] as HTMLElement | undefined;
      if (card) {
        el.scrollTo({
          left: card.offsetLeft - (el.clientWidth - card.offsetWidth) / 2,
          behavior: "auto",
        });
        didInit.current = true;
      }
    }
    sync();
  }, [pad, sync]);

  const goTo = (i: number) => {
    const el = track.current;
    const card = el?.children[i] as HTMLElement | undefined;
    if (!el || !card) return;
    el.scrollTo({
      left: card.offsetLeft - (el.clientWidth - card.offsetWidth) / 2,
      behavior: "smooth",
    });
  };

  return (
    <section id="what" className="bg-sky-deep px-4 pb-14 pt-8 sm:px-6 sm:pb-20">
      <div className="mx-auto max-w-6xl">
        <p className="reveal display text-[13px] tracking-[0.24em] text-lime">OUR SERVICES</p>
        <h2 className="reveal mt-4 max-w-3xl display text-huge text-white" data-delay="60">
          EVERYTHING YOU NEED TO
          <br />
          GROW, IN ONE PLATFORM
        </h2>
      </div>

      {/* Full-bleed track so the cards can run past the content column. */}
      <div
        ref={track}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") goTo(Math.min(active + 1, SLIDES.length - 1));
          if (e.key === "ArrowLeft") goTo(Math.max(active - 1, 0));
        }}
        tabIndex={0}
        role="group"
        aria-label="What BridgeNow does"
        style={{ paddingLeft: pad, paddingRight: pad }}
        className="mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-2
                   [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
                   focus-visible:outline-none"
      >
        {SLIDES.map((s, i) => (
          <article
            key={s.title.join(" ")}
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${SLIDES.length}`}
            className={`block-card ${s.bg} flex w-[82vw] shrink-0 snap-center flex-col justify-between
                        gap-6 p-7 transition-[transform,opacity] duration-500
                        sm:w-[64vw] lg:w-[34rem] lg:p-8
                        ${active === i ? "scale-100 opacity-100" : "scale-[0.97] opacity-75"}`}
          >
            <div>
              <p className={`font-mono text-[10px] uppercase tracking-[0.22em] opacity-70 ${s.text}`}>
                {s.kicker}
              </p>
              <h3 className={`mt-3 display text-big ${s.text}`}>
                {s.title.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </h3>
              <p className={`mt-4 max-w-prose text-[14px] leading-relaxed ${s.text} opacity-85`}>
                {s.body}
              </p>
            </div>

            <LazyObject3D scene={s.scene} spin={0.3} className="h-44 w-full shrink-0 lg:h-52" />
          </article>
        ))}
      </div>

      {/* Dots */}
      <div className="mt-7 flex items-center justify-center gap-2.5">
        {SLIDES.map((s, i) => (
          <button
            key={s.title.join(" ")}
            onClick={() => goTo(i)}
            aria-label={`Go to ${s.kicker.toLowerCase()}`}
            aria-current={active === i}
            className={`h-2.5 rounded-full transition-all duration-300
                        ${active === i ? `w-8 ${s.dot}` : "w-2.5 bg-white/25 hover:bg-white/45"}`}
          />
        ))}
      </div>

      <div className="mx-auto mt-12 flex max-w-6xl flex-wrap gap-4 px-0 sm:px-0">
        <Link href="/auth?role=creator" className="btn-hot sweep">
          Get your Passport
        </Link>
        <Link href="/#pricing" className="btn-white sweep">
          See the plans
        </Link>
      </div>
    </section>
  );
}
