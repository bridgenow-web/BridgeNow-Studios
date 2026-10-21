"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

import { PLUM_ENV, SKY_ENV, LIGHT_ENV, makeStudioEnv } from "./env";
import { buildScene, disposeGroup, type SceneName, type SceneOptions } from "./scenes";

/**
 * Mounts one procedural 3D object into a transparent canvas.
 *
 * Performance rules, because this runs several times per page:
 *   • one renderer per instance, disposed on unmount
 *   • DPR capped at 1.75 — past that the gloss costs more than it shows
 *   • geometry detail drops on small screens and on low core counts
 *   • rAF stops entirely when the canvas is off-screen or the tab is hidden
 *   • `prefers-reduced-motion` renders a single static frame and stops
 *
 * The canvas is transparent, so the object sits over whatever gradient the
 * section already has rather than carrying its own background.
 */
export function Object3D({
  scene: sceneName,
  world = "sky",
  className = "",
  spin = 0.25,
  parallax = true,
  options,
}: {
  scene: SceneName;
  world?: "sky" | "plum" | "light";
  className?: string;
  /** Radians per second of idle rotation. */
  spin?: number;
  parallax?: boolean;
  /** Scene-specific configuration — e.g. the phone's screen copy. */
  options?: SceneOptions;
}) {
  const host = useRef<HTMLDivElement>(null);

  /**
   * Each object owns a WebGL context, and browsers cap how many can be live at
   * once (~16 in Chrome; fewer under software rendering). A page with ten
   * objects created them all on mount, and the oldest contexts were dropped —
   * which shows up as objects that silently never appear.
   *
   * So setup waits until the element is near the viewport. Objects far down
   * the page hold no context until you scroll toward them, which also keeps
   * them off the critical path for first paint.
   */
  const [live, setLive] = useState(false);

  useEffect(() => {
    const el = host.current;
    if (!el || live) return;

    if (typeof IntersectionObserver === "undefined") {
      setLive(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setLive(true);
          io.disconnect();
        }
      },
      { rootMargin: "500px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [live]);

  useEffect(() => {
    const el = host.current;
    if (!el || !live) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Detail budget: 2 = full, 1 = reduced. Phones and low-core machines get 1.
    const cores = navigator.hardwareConcurrency ?? 4;
    const detail = window.innerWidth < 900 || cores <= 4 ? 1 : 2;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: detail > 1,
        powerPreference: "high-performance",
      });
    } catch {
      return; // no WebGL — the section still reads without the object
    }

    const rect = el.getBoundingClientRect();
    let w = Math.max(1, rect.width);
    let h = Math.max(1, rect.height);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, detail > 1 ? 1.75 : 1.25));
    renderer.setSize(w, h, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";

    const scene = new THREE.Scene();
    const envMap = makeStudioEnv(
      renderer,
      world === "plum" ? PLUM_ENV : world === "light" ? LIGHT_ENV : SKY_ENV,
    );
    scene.environment = envMap;

    const camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 100);

    const built = buildScene(sceneName, detail, options);
    scene.add(built.group);
    camera.position.set(0, 0, built.cameraZ);

    // A key light for the terminator, plus a rim to separate the object from
    // the gradient behind it. The environment does most of the work.
    const key = new THREE.DirectionalLight(0xffffff, 2.1);
    key.position.set(-3, 4, 5);
    scene.add(key);

    const rim = new THREE.DirectionalLight(
      world === "plum" ? 0xff2ec4 : world === "light" ? 0xffffff : 0xd7ff3e,
      world === "light" ? 1.1 : 1.5,
    );
    rim.position.set(4, -2, -3);
    scene.add(rim);

    scene.add(new THREE.AmbientLight(0xffffff, 0.35));

    // ── Loop ───────────────────────────────────────────────────────
    const baseRot = built.group.rotation.clone();
    const pointer = { x: 0, y: 0 };
    const eased = { x: 0, y: 0 };
    let raf = 0;
    let running = false;
    const start = performance.now();

    function frame() {
      if (!running) return;
      const t = (performance.now() - start) / 1000;

      eased.x += (pointer.x - eased.x) * 0.06;
      eased.y += (pointer.y - eased.y) * 0.06;

      // spin === 0 means "sway", not "stand still". An object whose face
      // matters — the phone, with its screen — must never turn edge-on, so it
      // oscillates around its resting angle instead of rotating through.
      built.group.rotation.y =
        spin === 0
          ? baseRot.y + Math.sin(t * 0.45) * 0.26 + eased.x * 0.3
          : baseRot.y + t * spin + eased.x * 0.5;
      built.group.rotation.x =
        spin === 0
          ? baseRot.x + Math.sin(t * 0.33) * 0.07 + eased.y * 0.2
          : baseRot.x + eased.y * 0.35;
      built.group.position.y = Math.sin(t * 0.7) * 0.12;

      built.tick?.(t);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    }

    function startLoop() {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(frame);
    }
    function stopLoop() {
      running = false;
      cancelAnimationFrame(raf);
    }

    // Always paint one frame, so a still object is visible even if the loop
    // never runs (reduced motion, or the element starting off-screen).
    renderer.render(scene, camera);

    if (!reduced) {
      const io = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting && !document.hidden) startLoop();
          else stopLoop();
        },
        { threshold: 0 },
      );
      io.observe(el);

      const onVis = () => (document.hidden ? stopLoop() : startLoop());
      document.addEventListener("visibilitychange", onVis);

      const onPointer = (e: PointerEvent) => {
        if (!parallax) return;
        pointer.x = (e.clientX / window.innerWidth - 0.5) * 2;
        pointer.y = (e.clientY / window.innerHeight - 0.5) * 2;
      };
      if (parallax) window.addEventListener("pointermove", onPointer, { passive: true });

      const ro = new ResizeObserver(() => {
        const r = el.getBoundingClientRect();
        w = Math.max(1, r.width);
        h = Math.max(1, r.height);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
        if (!running) renderer.render(scene, camera);
      });
      ro.observe(el);

      return () => {
        stopLoop();
        io.disconnect();
        ro.disconnect();
        document.removeEventListener("visibilitychange", onVis);
        if (parallax) window.removeEventListener("pointermove", onPointer);
        disposeGroup(built.group);
        envMap.dispose();
        renderer.dispose();
        el.removeChild(renderer.domElement);
      };
    }

    return () => {
      disposeGroup(built.group);
      envMap.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement);
    };
  }, [live, sceneName, world, spin, parallax, options]);

  return <div ref={host} aria-hidden="true" className={`pointer-events-none ${className}`} />;
}
