# 3D objects

The glossy objects on this site are **real-time 3D**, written in Three.js —
not images, not AI renders. Nothing to generate, nothing to download, no
asset pipeline.

## Where they live

```
src/components/three/
  env.ts             Procedural studio environment (the thing gloss reflects)
  scenes.ts          The objects: ribbon, asterisk, tag, coins, orb, pin
  Object3D.tsx       Mounts one object into a transparent canvas
  LazyObject3D.tsx   Defers the Three.js bundle until after hydration
  PassportStage.tsx  The scroll-driven Passport scene on /app
```

## How the look is made

Glossy plastic needs two things: a `MeshPhysicalMaterial` with a `clearcoat`
layer over a saturated base, and **something to reflect**. Without an
environment, clearcoat renders as flat colour.

Rather than ship an HDRI (1–4 MB), `env.ts` paints a studio gradient onto a
canvas — bright ceiling, soft horizon, two strip lights, a wash of brand
colour — and runs it through `PMREMGenerator`. That gives real reflections for
a few kilobytes of code, and the strip lights are what become the long
highlights along a ribbon's edge.

Two palettes, matching the two worlds: `SKY_ENV` for the blue landing page,
`PLUM_ENV` for the signed-in app.

## Adding an object

1. Write a builder in `scenes.ts` returning `{ group, cameraZ, tick? }`
2. Add its name to the `SceneName` union
3. Drop `<LazyObject3D scene="yourName" className="h-64 w-64" />` wherever it goes

Use `glossy()` for plastic and `chrome()` for metal — both are tuned to the
environment already.

## Performance

Several canvases share a page, so each instance:

- caps device pixel ratio at 1.75 (1.25 on low-end)
- drops geometry detail on screens under 900px or 4-core machines
- **stops its rAF loop entirely** when off-screen or the tab is hidden
- renders one static frame under `prefers-reduced-motion`, then stops
- disposes every geometry, material and texture on unmount

Three.js (~150 KB gzipped) loads via `next/dynamic` with `ssr: false`, so it is
not in the initial bundle. Until it arrives each slot shows a soft gradient
blob rather than a gap.

If a device has no WebGL, the canvas is skipped and the section still reads —
the objects are decoration, never content.

## Still worth having

An **Open Graph image** (1200×630). Links to the site currently preview as a
blank card. Screenshot the hero, or build it in Figma in ten minutes.
