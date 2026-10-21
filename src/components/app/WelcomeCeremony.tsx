"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { Audience } from "@/config/plans.types";

/**
 * The moment after signing in.
 *
 * Creators watch their Passport get issued: the card flies in, a verification
 * stamp slams down with a shockwave, confetti bursts, and their name appears
 * on it. Brands get the matching metaphor — scattered creator dots converging
 * on a single point, then locking. Both run about three seconds.
 *
 * Every visual beat is a CSS animation with a delay, not a JS timer. The
 * component only mounts once (after the session check), and from that instant
 * the browser owns the choreography — so a slow hydration or a busy main
 * thread cannot leave the overlay sitting blank while timers queue up. JS is
 * left with the two jobs it is actually needed for: deciding whether to play
 * at all, and tearing down.
 *
 * Plays once per session, skippable, and skipped entirely under
 * `prefers-reduced-motion`.
 */

const seenKey = (audience: Audience) => `bn_welcome_${audience}_v1`;

/** The beat sheet, in milliseconds from mount. Kept tight on purpose — this
 *  sits between the user and the site, so it earns its place by being over
 *  before anyone thinks to look for a way out of it. There is no skip
 *  control. */
const T = {
  eyebrow: 80,
  object: 140,
  land: 820,
  name: 1280,
  out: 2400,
} as const;

export function WelcomeCeremony({
  audience,
  name,
  tier,
}: {
  audience: Audience;
  name: string;
  tier: string;
}) {
  const [playing, setPlaying] = useState(false);
  const [leaving, setLeaving] = useState(false);

  /**
   * Whether this instance plays, decided ONCE and remembered in a ref.
   *
   * It has to live outside the effect body. The "have they seen it?" check
   * consumes its own answer — it writes the session key as soon as it reads
   * it — so an effect that re-runs reads `seen: true` the second time and
   * bails. Under StrictMode (and any future re-run) that left `playing`
   * stuck true with no timer armed: the ceremony covered the page forever.
   */
  const decidedFor = useRef<Audience | null>(null);
  const status = useRef<"play" | "skip" | "done">("skip");

  const finish = useCallback(() => {
    status.current = "done";
    setLeaving(true);
    window.setTimeout(() => {
      setPlaying(false);
      document.body.style.overflow = "";
    }, 480);
  }, []);

  useEffect(() => {
    if (decidedFor.current !== audience) {
      decidedFor.current = audience;
      status.current = "skip";

      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        let seen = false;
        try {
          seen = Boolean(sessionStorage.getItem(seenKey(audience)));
        } catch {
          seen = false;
        }
        if (!seen) {
          status.current = "play";
          try {
            sessionStorage.setItem(seenKey(audience), "1");
          } catch {
            /* private window — it plays again next session, which is harmless */
          }
        }
      }
    }

    if (status.current !== "play") return;

    setPlaying(true);
    document.body.style.overflow = "hidden";

    // Armed on every run of this effect, so a re-run can never leave the
    // overlay up with nothing scheduled to take it down.
    const id = window.setTimeout(finish, T.out);
    return () => {
      clearTimeout(id);
      document.body.style.overflow = "";
    };
  }, [audience, finish]);

  // Generated once so a re-render never reshuffles the burst mid-flight.
  const confetti = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => {
        const angle = (i / 30) * Math.PI * 2 + (i % 3) * 0.3;
        const dist = 160 + ((i * 37) % 190);
        return {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist - 50,
          rot: (i % 2 ? 1 : -1) * (180 + ((i * 29) % 360)),
          delay: T.land + (i % 7) * 28,
          colour: ["#FF2EC4", "#D7FF3E", "#9B4DFF", "#2F6BFF", "#FFFFFF"][i % 5]!,
          w: i % 3 === 0 ? 14 : 8,
          h: i % 3 === 0 ? 6 : 11,
        };
      }),
    [],
  );

  if (!playing) return null;

  const isCreator = audience === "creator";

  return (
    <div
      role="presentation"
      className={`fixed inset-0 z-[95] flex items-center justify-center overflow-hidden bg-plum-900
                  transition-opacity duration-[460ms] ${leaving ? "opacity-0" : "opacity-100"}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(55% 45% at 50% 46%, rgba(255,46,196,0.34), transparent 68%)",
          animation: `bn-wc-glow 900ms ease-out ${T.land}ms both`,
        }}
      />

      {/* Shockwave from the stamp / lock */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 rounded-full border-2 border-hot"
        style={{ animation: `bn-wc-shock 750ms cubic-bezier(0.16,1,0.3,1) ${T.land}ms both` }}
      />

      {/* Confetti */}
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2">
        {confetti.map((c, i) => (
          <span
            key={i}
            className="absolute block rounded-[2px]"
            style={{
              width: c.w,
              height: c.h,
              background: c.colour,
              animation: `bn-wc-confetti 1200ms cubic-bezier(0.16,1,0.3,1) ${c.delay}ms both`,
              ["--cx" as string]: `${c.x}px`,
              ["--cy" as string]: `${c.y}px`,
              ["--cr" as string]: `${c.rot}deg`,
            }}
          />
        ))}
      </div>

      <div className="relative flex flex-col items-center px-6 text-center">
        <p
          className="display text-[12px] tracking-[0.3em] text-hot-light"
          style={{ animation: `bn-wc-rise 700ms cubic-bezier(0.16,1,0.3,1) ${T.eyebrow}ms both` }}
        >
          {isCreator ? "ISSUING YOUR PASSPORT" : "BUILDING YOUR SHORTLIST"}
        </p>

        <div className="relative mt-10" style={{ perspective: "1200px" }}>
          {isCreator ? <PassportCard name={name} tier={tier} /> : <MatchGraphic />}
        </div>

        <h2
          className="mt-12 display text-[clamp(1.6rem,4vw,3rem)] text-white"
          style={{ animation: `bn-wc-rise 700ms cubic-bezier(0.16,1,0.3,1) ${T.name}ms both` }}
        >
          WELCOME, {name.split(" ")[0]?.toUpperCase()}.
        </h2>

        <p
          className="mt-4 max-w-prose text-[15px] leading-relaxed text-chalk-dim"
          style={{ animation: `bn-wc-rise 700ms cubic-bezier(0.16,1,0.3,1) ${T.name + 150}ms both` }}
        >
          {isCreator
            ? "Your bridge to the brands is open."
            : "Your bridge to the creators is open."}
        </p>
      </div>

      <style jsx global>{`
        @keyframes bn-wc-rise {
          from {
            opacity: 0;
            transform: translateY(18px);
            filter: blur(5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
          }
        }
        @keyframes bn-wc-glow {
          from {
            opacity: 0.35;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes bn-wc-shock {
          from {
            width: 0;
            height: 0;
            opacity: 0.85;
            transform: translate(-50%, -50%);
          }
          to {
            width: 46rem;
            height: 46rem;
            opacity: 0;
            transform: translate(-50%, -50%);
          }
        }
        @keyframes bn-wc-confetti {
          from {
            transform: translate(0, 0) rotate(0deg) scale(0.4);
            opacity: 1;
          }
          to {
            transform: translate(var(--cx), var(--cy)) rotate(var(--cr)) scale(1);
            opacity: 0;
          }
        }
        @keyframes bn-wc-card {
          from {
            opacity: 0;
            transform: rotateY(-38deg) rotateX(16deg) translateY(70px) scale(0.78);
          }
          70% {
            opacity: 1;
            transform: rotateY(6deg) rotateX(-4deg) translateY(-6px) scale(1.03);
          }
          to {
            opacity: 1;
            transform: rotateY(0deg) rotateX(0deg) translateY(0) scale(1);
          }
        }
        @keyframes bn-wc-stamp {
          0% {
            transform: translate(-50%, -50%) scale(3.4) rotate(-24deg);
            opacity: 0;
          }
          55% {
            opacity: 1;
          }
          72% {
            transform: translate(-50%, -50%) scale(0.86) rotate(-12deg);
          }
          100% {
            transform: translate(-50%, -50%) scale(1) rotate(-12deg);
            opacity: 1;
          }
        }
        @keyframes bn-wc-fade {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes bn-wc-fly {
          from {
            transform: translate(calc(-50% + var(--fx)), calc(-50% + var(--fy))) scale(0.4);
            opacity: 0;
          }
          to {
            transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(1);
            opacity: 1;
          }
        }
        @keyframes bn-wc-foil {
          from {
            transform: translateX(-140%) skewX(-18deg);
            opacity: 0;
          }
          30% {
            opacity: 0.8;
          }
          to {
            transform: translateX(260%) skewX(-18deg);
            opacity: 0;
          }
        }
        @keyframes bn-wc-lock {
          from {
            transform: translate(-50%, -50%) scale(0.6);
            opacity: 0;
            box-shadow: none;
          }
          to {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
            box-shadow: 0 0 70px -10px rgba(255, 46, 196, 0.9);
          }
        }
      `}</style>
    </div>
  );
}

// ── Creator: the Passport being stamped ──────────────────────────────

function PassportCard({ name, tier }: { name: string; tier: string }) {
  return (
    <div
      className="relative h-[316px] w-[208px] rounded-[20px] p-[1.5px] shadow-[0_60px_110px_-30px_rgba(0,0,0,0.95)]"
      style={{
        background: "linear-gradient(150deg,#FFC4E8,#FF2EC4 38%,#7A2499 78%,#FFC4E8)",
        animation: `bn-wc-card 680ms cubic-bezier(0.16,1,0.3,1) ${T.object}ms both`,
      }}
    >
      <div className="relative flex h-full w-full flex-col justify-between overflow-hidden rounded-[19px] bg-[linear-gradient(158deg,#5A1468,#8A2CA8_42%,#30093C_88%)] p-5">
        <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.28]">
          <defs>
            <pattern id="bn-wc-g" width="22" height="22" patternUnits="userSpaceOnUse">
              <circle cx="11" cy="11" r="9" fill="none" stroke="#FFB8E4" strokeWidth="0.5" />
              <circle cx="11" cy="11" r="4" fill="none" stroke="#FFB8E4" strokeWidth="0.4" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#bn-wc-g)" />
        </svg>

        {/* A single sweep of foil, timed to the stamp landing. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-1/3"
          style={{
            background:
              "linear-gradient(90deg,transparent,rgba(255,255,255,0.55),transparent)",
            animation: `bn-wc-foil 850ms ease-out ${T.land + 140}ms both`,
          }}
        />

        <div className="relative">
          <p className="font-mono text-[8.5px] uppercase tracking-[0.3em] text-white/85">
            BridgeNow
          </p>
          <p className="mt-1 font-mono text-[7px] uppercase tracking-[0.26em] text-white/55">
            Creator Passport
          </p>

          {/* Chip — part of the header block, not a flex child of its own,
              or `justify-between` drops it on top of the stamp. */}
          <span
            aria-hidden
            className="mt-5 block h-8 w-11 rounded-[5px]"
            style={{
              background: "linear-gradient(135deg,#FFE9A8,#C9961F 55%,#FFF3CC)",
              boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,0.25)",
            }}
          />
        </div>

        <div className="relative">
          <p
            className="display text-[16px] leading-tight text-white"
            style={{ animation: `bn-wc-fade 500ms ease-out ${T.name}ms both` }}
          >
            {name.toUpperCase()}
          </p>
          <p
            className="mt-1 font-mono text-[7.5px] uppercase tracking-[0.2em] text-white/70"
            style={{ animation: `bn-wc-fade 500ms ease-out ${T.name + 120}ms both` }}
          >
            {tier}
          </p>
        </div>

        <span
          aria-hidden
          className="absolute left-1/2 top-[46%] grid h-[112px] w-[112px] place-items-center rounded-full border-[3px] border-lime"
          style={{
            background: "rgba(26,5,32,0.35)",
            boxShadow: "0 0 34px -6px rgba(215,255,62,0.75)",
            animation: `bn-wc-stamp 520ms cubic-bezier(0.16,1,0.3,1) ${T.land}ms both`,
          }}
        >
          <span className="display text-center text-[11px] leading-tight tracking-[0.16em] text-lime">
            VERI
            <br />
            FIED
          </span>
        </span>
      </div>
    </div>
  );
}

// ── Brand: scattered creators converging ─────────────────────────────

function MatchGraphic() {
  const SIZE = 320;
  const C = SIZE / 2;

  // Creators fly in from off-stage and *stay*, forming a ring wired to the
  // centre — a shortlist that locked, rather than dots that disappeared.
  const dots = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
        const r = 124;
        const far = r + 170 + ((i * 31) % 90);
        return {
          x: Math.cos(a) * r,
          y: Math.sin(a) * r,
          fx: Math.cos(a) * far,
          fy: Math.sin(a) * far,
          delay: T.object + (i % 6) * 40,
          colour: ["#FF2EC4", "#D7FF3E", "#9B4DFF", "#6FD2FF"][i % 4]!,
        };
      }),
    [],
  );

  return (
    <div className="relative" style={{ width: SIZE, height: SIZE }}>
      <svg aria-hidden width={SIZE} height={SIZE} className="absolute inset-0">
        {dots.map((d, i) => (
          <line
            key={i}
            x1={C}
            y1={C}
            x2={C + d.x}
            y2={C + d.y}
            stroke="rgba(255,138,207,0.5)"
            strokeWidth="1"
            style={{ animation: `bn-wc-fade 450ms ease-out ${T.land + 180}ms both` }}
          />
        ))}
      </svg>

      {dots.map((d, i) => (
        <span
          key={i}
          className="absolute left-1/2 top-1/2 h-2.5 w-2.5 rounded-full"
          style={{
            background: d.colour,
            boxShadow: `0 0 14px -2px ${d.colour}`,
            ["--fx" as string]: `${d.fx}px`,
            ["--fy" as string]: `${d.fy}px`,
            ["--tx" as string]: `${d.x}px`,
            ["--ty" as string]: `${d.y}px`,
            animation: `bn-wc-fly 650ms cubic-bezier(0.16,1,0.3,1) ${d.delay}ms both`,
          }}
        />
      ))}

      <span
        className="absolute left-1/2 top-1/2 grid h-24 w-24 place-items-center rounded-3xl"
        style={{
          background: "linear-gradient(135deg,#FF2EC4,#9B4DFF)",
          animation: `bn-wc-lock 600ms cubic-bezier(0.16,1,0.3,1) ${T.land - 160}ms both`,
        }}
      >
        <span className="display text-[15px] lowercase text-white">bn</span>
      </span>
    </div>
  );
}
