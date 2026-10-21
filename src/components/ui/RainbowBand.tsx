"use client";

/**
 * A slow-moving rainbow band.
 *
 * Two counter-rotating conic gradients under a moderate blur — enough to read
 * as liquid light, not so much that the colours grey out into mud. It is pure
 * CSS, so it costs nothing beyond compositing and can sit at the foot of a
 * page without competing with the WebGL canvases for frame budget.
 *
 * Gradients are inline styles rather than styled-jsx selectors: `nth-child`
 * rules are fragile once a conditional child (the label) enters the tree.
 */
const SPECTRUM_A =
  "conic-gradient(from 0deg, #FF2EC4, #FF6B3D, #D7FF3E, #3DDC84, #2F6BFF, #9B4DFF, #FF2EC4)";
const SPECTRUM_B =
  "conic-gradient(from 180deg, #2F6BFF, #9B4DFF, #FF2EC4, #FF8A3D, #D7FF3E, #3DDC84, #2F6BFF)";

export function RainbowBand({
  height = "h-40",
  label,
}: {
  height?: string;
  label?: string;
}) {
  return (
    <div className={`relative w-full overflow-hidden ${height}`} aria-hidden={!label}>
      <div
        className="absolute left-1/2 top-1/2 aspect-square w-[180%] -translate-x-1/2 -translate-y-1/2
                   animate-[bn-rainbow-cw_16s_linear_infinite] blur-[26px]"
        style={{ background: SPECTRUM_A }}
      />
      <div
        className="absolute left-1/2 top-1/2 aspect-square w-[150%] -translate-x-1/2 -translate-y-1/2
                   animate-[bn-rainbow-ccw_23s_linear_infinite] opacity-60 blur-[38px]"
        style={{ background: SPECTRUM_B, mixBlendMode: "screen" }}
      />

      {label && (
        <div className="relative flex h-full items-center justify-center px-6">
          <p className="display text-center text-[clamp(1rem,2.4vw,1.7rem)] text-white drop-shadow-[0_2px_20px_rgba(0,0,0,0.6)]">
            {label}
          </p>
        </div>
      )}

      <style jsx global>{`
        @keyframes bn-rainbow-cw {
          from {
            transform: translate(-50%, -50%) rotate(0deg);
          }
          to {
            transform: translate(-50%, -50%) rotate(360deg);
          }
        }
        @keyframes bn-rainbow-ccw {
          from {
            transform: translate(-50%, -50%) rotate(360deg);
          }
          to {
            transform: translate(-50%, -50%) rotate(0deg);
          }
        }
      `}</style>
    </div>
  );
}
