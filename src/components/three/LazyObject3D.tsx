"use client";

import dynamic from "next/dynamic";

import type { SceneName, SceneOptions } from "./scenes";

/**
 * Three.js is ~150 KB gzipped. Loading it in the initial bundle would slow the
 * first paint of a page whose hero is mostly type — so the objects load after
 * hydration, with `ssr: false` because WebGL needs a real canvas.
 *
 * Until it arrives the slot renders as a soft gradient blob, which reads as
 * intentional rather than as a gap.
 */
// Kick the chunk off at module-evaluation time rather than waiting for the
// component to mount. next/dynamic alone starts the fetch only once the
// component renders, which on a slow connection left the slots empty for a
// noticeable beat. Holding the promise here means the download overlaps
// hydration instead of following it.
const objectChunk = import("./Object3D");

const Object3D = dynamic(() => objectChunk.then((m) => m.Object3D), {
  ssr: false,
  // A soft glow stands in while the chunk arrives — shaped and coloured like
  // the object it replaces, so the layout never jumps and the gap reads as
  // part of the design.
  loading: () => (
    <div
      aria-hidden
      className="h-full w-full animate-pulse rounded-full opacity-70 blur-3xl
                 bg-[radial-gradient(circle,rgba(255,46,196,0.6),rgba(124,92,255,0.25)_45%,transparent_72%)]"
    />
  ),
});

export function LazyObject3D(props: {
  scene: SceneName;
  world?: "sky" | "plum" | "light";
  className?: string;
  spin?: number;
  parallax?: boolean;
  options?: SceneOptions;
}) {
  return <Object3D {...props} />;
}
