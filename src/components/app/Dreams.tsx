"use client";

import Link from "next/link";

import { LazyObject3D } from "@/components/three/LazyObject3D";
import type { SceneOptions } from "@/components/three/scenes";
import type { Audience } from "@/config/plans.types";

/**
 * What this could become.
 *
 * The signed-in page was all admin — status, form, plans, pay. This is the
 * part that answers "why am I paying for this", in the alternating
 * phone-on-rock rhythm of the reference pages: one claim, one figure, one
 * object, repeated.
 *
 * Copy is role-aware. A brand is not buying the same future as a creator, and
 * showing a creator's earnings panel to a brand reads as a template.
 */

interface Panel {
  eyebrow: string;
  title: string;
  body: string;
  scene: "phone" | "trophy" | "rocket" | "heart";
  screen?: SceneOptions["screen"];
}

const CREATOR: Panel[] = [
  {
    eyebrow: "01 · Get found",
    title: "Brands come to you.",
    body: "Your Passport puts verified reach, niche and region in front of brands searching your category — instead of you sending the fortieth cold DM of the week.",
    scene: "phone",
    screen: {
      eyebrow: "BRAND DEALS",
      big: "6 live",
      rows: [
        ["Skincare launch", "₹12,000"],
        ["Café · Ludhiana", "Barter"],
        ["Festive reels", "₹8,500"],
      ],
      cta: "Open deals",
    },
  },
  {
    eyebrow: "02 · Charge properly",
    title: "Know what you're worth.",
    body: "Rate guidance built from what brands actually pay creators your size, in your city, in your niche. No more guessing and no more undercharging because you were too nervous to ask.",
    scene: "trophy",
  },
  {
    eyebrow: "03 · Grow on purpose",
    title: "A plan, not a feeling.",
    body: "A content strategy session, a profile audit and a growth roadmap — so the next three months have a direction rather than a posting schedule.",
    scene: "rocket",
  },
  {
    eyebrow: "04 · Belong somewhere",
    title: "Creators who get it.",
    body: "A regional, niche-matched community for joint reels, meetups and cross-promotion. The people who understand why a 2% drop in reach ruined your week.",
    scene: "heart",
  },
];

const BRAND: Panel[] = [
  {
    eyebrow: "01 · Find the right people",
    title: "Reach that converts.",
    body: "Shortlist by city, language, niche and audience size. Micro-creators whose followers actually buy, instead of big accounts whose comments are bots.",
    scene: "phone",
    screen: {
      eyebrow: "CAMPAIGN",
      big: "24 creators",
      rows: [
        ["Shortlisted", "11"],
        ["Reels live", "18"],
        ["Reach", "412K"],
      ],
      cta: "View campaign",
    },
  },
  {
    eyebrow: "02 · Ship consistently",
    title: "Content, every month.",
    body: "Concepts, scripts, hooks and a posting calendar — a system that keeps publishing whether or not anyone on your team had a good week.",
    scene: "rocket",
  },
  {
    eyebrow: "03 · See what worked",
    title: "Numbers, not vibes.",
    body: "Monthly analysis of reach, engagement and retention, plus what to change next month. The reporting your founder keeps asking for.",
    scene: "trophy",
  },
  {
    eyebrow: "04 · Build something people like",
    title: "A brand, not an ad.",
    body: "Positioning, voice and creative direction that make people stop — rather than another discount post nobody remembers an hour later.",
    scene: "heart",
  },
];

export function Dreams({ audience }: { audience: Audience }) {
  const panels = audience === "creator" ? CREATOR : BRAND;
  const isCreator = audience === "creator";

  return (
    <section className="relative overflow-hidden bg-plum-900 px-6 py-24 sm:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0
                   bg-[radial-gradient(60%_40%_at_20%_8%,rgba(255,46,196,0.16),transparent_60%),radial-gradient(50%_40%_at_85%_70%,rgba(124,61,245,0.18),transparent_60%)]"
      />

      <div className="relative mx-auto max-w-6xl">
        <p className="reveal display text-[12px] tracking-[0.3em] text-hot-light">
          {isCreator ? "WHAT YOUR YEAR COULD LOOK LIKE" : "WHAT YOUR QUARTER COULD LOOK LIKE"}
        </p>
        <h2 className="reveal mt-5 max-w-3xl display text-huge text-white" data-delay="60">
          {isCreator ? (
            <>
              YOU ALREADY HAVE
              <br />
              THE AUDIENCE.
            </>
          ) : (
            <>
              YOUR CUSTOMERS
              <br />
              ARE ALREADY SCROLLING.
            </>
          )}
        </h2>
        <p className="reveal mt-6 max-w-prose text-[15px] leading-relaxed text-chalk-dim" data-delay="120">
          {isCreator
            ? "What's missing is the bridge between that and the people who'll pay for it."
            : "What's missing is the right person holding the phone when they do."}
        </p>

        <div className="mt-20 space-y-16 sm:space-y-24">
          {panels.map((panel, i) => (
            <article
              key={panel.title}
              className={`reveal flex flex-col items-center gap-10 lg:gap-16
                          ${i % 2 === 1 ? "lg:flex-row-reverse" : "lg:flex-row"}`}
            >
              <div className="relative shrink-0">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 -z-10 rounded-full blur-3xl
                             bg-[radial-gradient(circle,rgba(255,46,196,0.3),transparent_68%)]"
                />
                <LazyObject3D
                  scene={panel.scene}
                  world="plum"
                  spin={panel.scene === "phone" ? 0 : 0.3}
                  options={panel.screen ? { screen: panel.screen } : undefined}
                  className="h-[20rem] w-[18rem] sm:h-[24rem] sm:w-[22rem]"
                />
              </div>

              <div className="min-w-0 flex-1 text-center lg:text-left">
                <p className="display text-[12px] tracking-[0.26em] text-hot-light">
                  {panel.eyebrow}
                </p>
                <h3 className="mt-4 display text-[clamp(1.7rem,3.4vw,2.8rem)] text-white">
                  {panel.title}
                </h3>
                <p className="mx-auto mt-5 max-w-prose text-[15px] leading-relaxed text-chalk-dim lg:mx-0">
                  {panel.body}
                </p>
              </div>
            </article>
          ))}
        </div>

        <div className="reveal mt-24 rounded-[32px] bg-[linear-gradient(135deg,#FF2EC4,#9B4DFF_55%,#2F6BFF)] px-8 py-14 text-center shadow-block sm:px-14">
          <h3 className="display text-[clamp(1.6rem,3.6vw,2.6rem)] text-white">
            {isCreator ? "START WHERE YOU ARE." : "START THIS MONTH."}
          </h3>
          <p className="mx-auto mt-4 max-w-prose text-[15px] leading-relaxed text-white/85">
            {isCreator
              ? "Creator Starter is ₹49 a month. That's less than one coffee for a month of being findable."
              : "Brand Starter is ₹9,999 a month — a content system, not a one-off post."}
          </p>
          <Link href="#pricing" className="btn mt-9 bg-white text-plum hover:-translate-y-0.5">
            {isCreator ? "Pick your plan" : "See the plans"}
          </Link>
        </div>
      </div>
    </section>
  );
}
