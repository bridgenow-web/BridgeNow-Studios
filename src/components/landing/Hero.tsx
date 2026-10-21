import Link from "next/link";

import { LazyObject3D } from "@/components/three/LazyObject3D";

/**
 * Landing hero, built to the slice savings-account reference: a full-bleed
 * blue→cyan wash, acid-lime display type at enormous size, and glossy 3D
 * objects breaking into the frame from the edges.
 *
 * The objects are real Three.js geometry — glossy plastic and chrome lit by a
 * procedural studio environment — not images. See components/three/.
 */
export function Hero() {
  return (
    <section className="relative isolate min-h-[88svh] overflow-hidden bg-sky-wash px-6 pb-28 pt-28">
      {/* Atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2
                   bg-[radial-gradient(60%_80%_at_20%_100%,rgba(139,69,232,0.55),transparent_60%),radial-gradient(50%_70%_at_85%_95%,rgba(177,130,255,0.38),transparent_60%)]"
      />

      {/*
        Cloud bank.

        The hero's gradient ends on pale blue and the section beneath starts on
        the same value, but the white radial above lightens the hero's last few
        pixels — which showed as a hard seam. Three overlapping blurred ellipses
        dissolve the boundary into cloud instead of butting two flat colours
        together.
      */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-56">
        <div className="absolute -bottom-24 left-[-8%] h-64 w-[62%] rounded-[50%] bg-violet/85 blur-[46px]" />
        <div className="absolute -bottom-28 right-[-10%] h-72 w-[58%] rounded-[50%] bg-violet-light/70 blur-[52px]" />
        <div className="absolute -bottom-16 left-[22%] h-52 w-[56%] rounded-[50%] bg-violet-deep/80 blur-[40px]" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-sky-deep" />
      </div>

      {/* ── Left rig: the clapperboard, with its ticket and chips ── */}
      <div className="pointer-events-none absolute left-[-1%] top-[42%] hidden h-[17rem] w-[17rem] lg:block xl:left-[3%] xl:h-[18.5rem] xl:w-[18.5rem]">
        <span
          aria-hidden
          className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(139,69,232,0.55),transparent_62%)] blur-2xl"
        />
        <LazyObject3D world="plum" scene="clapper" spin={0.16} className="absolute inset-0" />

        <Chip className="left-[2%] top-[8%] -rotate-[14deg]" tone="lime">
          <span className="font-mono text-[7.5px] font-bold uppercase tracking-[0.18em]">Event</span>
        </Chip>
        <Chip className="right-[6%] top-[22%] rotate-[9deg]">
          <PersonGlyph />
        </Chip>
        <Chip className="right-[0%] top-[46%] -rotate-[7deg]">
          <PlayGlyph />
        </Chip>
        <Chip className="left-[6%] bottom-[8%] rotate-[6deg]">
          <span className="block h-[3px] w-6 rounded-full bg-white/55" />
          <span className="mt-1.5 block h-[3px] w-4 rounded-full bg-white/35" />
        </Chip>
      </div>

      {/* ── Right rig: the camera on its tripod, with its screens ── */}
      <div className="pointer-events-none absolute -right-6 top-[18%] hidden h-[18.5rem] w-[18.5rem] lg:block xl:right-[1%] xl:h-[21rem] xl:w-[21rem]">
        <span
          aria-hidden
          className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(139,69,232,0.6),transparent_62%)] blur-2xl"
        />
        <LazyObject3D world="plum" scene="cameraRig" spin={0.14} className="absolute inset-0" />

        {/* Stage screen */}
        <Panel className="left-[1%] top-[3%] h-11 w-16 -rotate-[10deg]">
          <span className="absolute inset-0 bg-[linear-gradient(160deg,#C9A6FF,#6B2FD0_55%,#2A1250)]" />
          <span className="absolute inset-x-1.5 bottom-1.5 h-3 rounded-sm bg-[linear-gradient(90deg,#FFD36B,#FF8ACF,#9B6BFF)] opacity-80 blur-[2px]" />
        </Panel>

        {/* Portrait screen */}
        <Panel className="right-[2%] bottom-[26%] h-[3.25rem] w-[2.75rem] rotate-[8deg]">
          <span className="absolute inset-0 bg-[linear-gradient(150deg,#8FC7FF,#5B37C8_60%,#23114A)]" />
          <span className="absolute left-1/2 top-[26%] h-3 w-3 -translate-x-1/2 rounded-full bg-white/70" />
          <span className="absolute left-1/2 top-[52%] h-4 w-6 -translate-x-1/2 rounded-t-full bg-white/55" />
        </Panel>

        <Chip className="right-[22%] top-[2%] rotate-[12deg]" />
        <Chip className="left-[12%] bottom-[18%] -rotate-[8deg]">
          <span className="block h-[3px] w-5 rounded-full bg-white/55" />
          <span className="mt-1.5 block h-[3px] w-3 rounded-full bg-white/35" />
        </Chip>
      </div>

      <div className="relative mx-auto max-w-6xl text-center">
        <span className="reveal inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-white/85 backdrop-blur">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-lime" />
          India&apos;s Execution-First Platform
        </span>

        {/* Sized for THIS copy, not `text-mega` — that clamp was tuned for two
            short words and ran this headline off the bottom of the screen. */}
        <h1
          className="reveal mt-6 display text-[clamp(1.85rem,5.1vw,4rem)] leading-[0.92] tracking-[-0.03em] text-lime drop-shadow-[0_6px_44px_rgba(139,69,232,0.5)]"
          data-delay="60"
        >
          WHERE INDIA&apos;S
          <br />
          TALENT BECOMES
          <br />
          UNSTOPPABLE
        </h1>

        <p
          className="reveal mx-auto mt-7 max-w-2xl text-[clamp(0.9rem,1.4vw,1.05rem)] leading-relaxed text-white/85"
          data-delay="120"
        >
          We connect creators, brands, events and on-ground talent — and turn opportunities
          into real growth.
        </p>

        <div className="reveal mt-9 flex flex-wrap items-center justify-center gap-4" data-delay="220">
          <Link href="/auth?role=creator" className="btn-lime sweep">
            Get Started
          </Link>
          <Link href="/auth?role=brand" className="btn-white sweep">
            Join as a brand
          </Link>
        </div>

        {/* Sits on the cloud bank, so it takes light type, not the near-black
            that worked against the old pale sky. */}
        <dl
          className="reveal mt-11 flex flex-wrap items-start justify-center gap-x-12 gap-y-5"
          data-delay="300"
        >
          {[
            ["20K+", "Creators Onboarded"],
            ["500+", "Brand Collaborations"],
            ["100+", "Events Delivered"],
          ].map(([value, label]) => (
            <div key={label}>
              <dt className="display text-[clamp(1.2rem,2.1vw,1.65rem)] leading-none text-white">
                {value}
              </dt>
              <dd className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/60">
                {label}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/**
 * The floating glass chips and screens around the hero rigs.
 *
 * These are DOM, not geometry. They are flat translucent rectangles, which the
 * browser composites crisply at any size for nothing — modelling them would
 * have cost two more WebGL contexts for shapes with no depth to show.
 */
function Chip({
  className = "",
  tone = "violet",
  children,
}: {
  className?: string;
  tone?: "violet" | "lime";
  children?: React.ReactNode;
}) {
  return (
    <span
      aria-hidden
      className={`absolute grid place-items-center rounded-lg px-1.5 py-1 backdrop-blur-sm
                  ${tone === "lime"
                    ? "border border-lime/50 bg-lime/15 text-lime"
                    : "border border-white/20 bg-violet/25 text-white"}
                  ${className}`}
    >
      {children}
    </span>
  );
}

function Panel({ className = "", children }: { className?: string; children?: React.ReactNode }) {
  return (
    <span
      aria-hidden
      className={`absolute overflow-hidden rounded-xl border border-white/25 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.8)] ${className}`}
    >
      {children}
    </span>
  );
}

function PersonGlyph() {
  return (
    <svg width="11" height="11" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <circle cx="10" cy="7" r="3" />
      <path d="M4 16.5c.6-3 3-4.8 6-4.8s5.4 1.8 6 4.8" strokeLinecap="round" />
    </svg>
  );
}

function PlayGlyph() {
  return (
    <svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M7 4.6v10.8L16 10 7 4.6Z" />
    </svg>
  );
}
