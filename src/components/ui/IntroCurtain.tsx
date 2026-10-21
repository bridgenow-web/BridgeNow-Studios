"use client";

import { useEffect, useState } from "react";

/**
 * The landing intro.
 *
 * A blue curtain that writes the wordmark, flashes the proposition, then
 * splits apart to reveal the hero. About 2.1 seconds end to end — there is no
 * skip control, because opening the curtain on its own is faster than
 * deciding to dismiss it.
 *
 * It plays ONCE per browser session and `prefers-reduced-motion` removes it
 * entirely.
 *
 * Every beat, the exit included, is a CSS animation with a delay. Two reasons,
 * both learned from watching it fail:
 *
 *   1. The markup ships in the server HTML so the curtain already covers the
 *      page on first paint. JS-driven entrance classes only apply after
 *      hydration, which left the first second blank.
 *   2. Building the hero's 3D scenes blocks the main thread for seconds on a
 *      cold load, and a blocked thread delays `setTimeout`. With the exit on
 *      a JS timer the curtain hung around long past its welcome; on the
 *      compositor it leaves on schedule no matter how busy the page is.
 *
 * React's only job is to unmount the leftover markup afterwards, and the
 * overlay ignores pointer events throughout, so the site is usable the moment
 * the halves have parted — even if that unmount arrives late.
 */

const SEEN_KEY = "bn_intro_seen_v1";

/** Curtain starts parting here; it is fully open 700ms later. */
const PART_AT = 1450;
const TOTAL = PART_AT + 700;

/** Runs before first paint. Keep it small — it blocks rendering. */
const NO_FLASH = `
try {
  var seen = sessionStorage.getItem('${SEEN_KEY}');
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (seen || reduced) document.documentElement.setAttribute('data-intro', 'done');
} catch (e) {
  document.documentElement.setAttribute('data-intro', 'done');
}
`;

const EASE_PART = "cubic-bezier(0.76, 0, 0.24, 1)";
const EASE_RISE = "cubic-bezier(0.16, 1, 0.3, 1)";

export function IntroCurtain() {
  // `playing` starts true so the server-rendered markup is the curtain.
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    // Anyone the inline script already marked as done skips straight out.
    if (document.documentElement.getAttribute("data-intro") === "done") {
      setPlaying(false);
      return;
    }

    // Recorded up front rather than on the way out: a gate that writes the
    // same key it reads would bail on a re-run of this effect.
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* private window — it simply plays again next time */
    }

    document.body.style.overflow = "hidden";

    const id = window.setTimeout(() => {
      setPlaying(false);
      document.body.style.overflow = "";
    }, TOTAL);

    return () => {
      clearTimeout(id);
      document.body.style.overflow = "";
    };
  }, []);

  if (!playing) return null;

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: NO_FLASH }} />

      <div
        className="pointer-events-none fixed inset-0 z-[90] overflow-hidden [html[data-intro=done]_&]:hidden"
        role="presentation"
      >
        {/* Two halves that part like a curtain */}
        <div
          className="absolute inset-y-0 left-0 w-1/2 bg-sky-wash"
          style={{ animation: `bn-intro-part-left 700ms ${EASE_PART} ${PART_AT}ms both` }}
        />
        <div
          className="absolute inset-y-0 right-0 w-1/2 bg-sky-wash"
          style={{ animation: `bn-intro-part-right 700ms ${EASE_PART} ${PART_AT}ms both` }}
        />

        {/* A lime seam down the join, gone just before the halves move */}
        <div
          className="absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 bg-lime"
          style={{ animation: `bn-intro-dim 240ms ease-out ${PART_AT - 70}ms both` }}
        />

        <div
          className="relative flex h-full flex-col items-center justify-center px-6 text-center"
          style={{ animation: `bn-intro-dim 240ms ease-out ${PART_AT - 70}ms both` }}
        >
          <p
            className="display text-[clamp(2.2rem,8vw,5.5rem)] lowercase leading-none tracking-tight text-white"
            style={{ animation: `bn-intro-rise 560ms ${EASE_RISE} 150ms both` }}
          >
            bridge<span className="text-lime">now</span>
          </p>

          <p
            className="mt-7 display text-[clamp(0.85rem,2.2vw,1.35rem)] tracking-[0.2em] text-white/90"
            style={{ animation: `bn-intro-rise 560ms ${EASE_RISE} 600ms both` }}
          >
            INFLUENCE MEETS INTENT
          </p>

          <span
            className="mt-12 block h-[2px] bg-lime"
            style={{ animation: "bn-intro-rule 1100ms ease-out 200ms both" }}
          />
        </div>
      </div>
    </>
  );
}
