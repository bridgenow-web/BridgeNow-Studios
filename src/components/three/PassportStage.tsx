"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

import { PLUM_ENV, makeStudioEnv } from "./env";
import { rockGeometry } from "./scenes";

/**
 * The scroll-driven Passport stage — the "super slicer" moment.
 *
 * A real 3D scene: a displaced rock landscape under magenta fog, with the
 * BridgeNow Passport standing in it. Scroll drives the card up out of the
 * ground while the camera settles and the fog thins.
 *
 * Progress arrives through a ref rather than a prop so scrolling never
 * triggers a React render — the rAF loop reads the current value each frame.
 * Driving this through state would re-render the tree sixty times a second.
 */
export function PassportStage({
  progressRef,
  holder,
  tier,
  className = "",
}: {
  progressRef: React.MutableRefObject<number>;
  holder: string;
  tier: string;
  className?: string;
}) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cores = navigator.hardwareConcurrency ?? 4;
    const low = window.innerWidth < 900 || cores <= 4;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: !low });
    } catch {
      return;
    }

    const rect = el.getBoundingClientRect();
    let w = Math.max(1, rect.width);
    let h = Math.max(1, rect.height);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, low ? 1.25 : 1.75));
    renderer.setSize(w, h, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x2a0836, 0.055);

    const envMap = makeStudioEnv(renderer, PLUM_ENV);
    scene.environment = envMap;

    const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 160);

    // ── Terrain ────────────────────────────────────────────────────
    // A plane displaced by layered sine waves. Cheaper than noise, and at
    // this fog density the difference is invisible.
    const segs = low ? 60 : 130;
    const groundGeo = new THREE.PlaneGeometry(90, 90, segs, segs);
    const pos = groundGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const d = Math.sqrt(x * x + y * y);
      // Flatten a bowl in the middle so the card has somewhere to stand.
      const bowl = Math.min(1, Math.max(0, (d - 4.5) / 9));
      const ridge =
        Math.sin(x * 0.28) * 1.5 +
        Math.cos(y * 0.33) * 1.3 +
        Math.sin((x + y) * 0.16) * 2.1 +
        Math.cos(x * 0.09 - y * 0.12) * 2.6;
      pos.setZ(i, ridge * bowl);
    }
    groundGeo.computeVertexNormals();

    const ground = new THREE.Mesh(
      groundGeo,
      new THREE.MeshStandardMaterial({
        color: 0x5d3570,
        roughness: 0.88,
        metalness: 0.08,
        flatShading: true,
      }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2.2;
    scene.add(ground);

    // ── Rocks ──────────────────────────────────────────────────────
    // Rocks get per-instance colour. A single flat tone read as a silhouette;
    // mixing cool slate with magenta-lit faces makes the terrain look lit
    // rather than cut out, and it costs nothing — instanceColor is one extra
    // attribute on a mesh that still draws in a single call.
    // Subdivided and displaced — a plain icosahedron read as a crystal.
    const rockGeo = rockGeometry(low ? 1 : 2, 0.36);
    const rockMat = new THREE.MeshStandardMaterial({
      roughness: 0.94,
      metalness: 0.04,
      flatShading: true,
    });
    const ROCK_COLOURS = [
      0x6e5a86, // lit slate
      0x4a3560, // mid slate
      0x8c5fa8, // magenta-washed
      0x332043, // deep shadow
      0xa06bb8, // highlight face
      0x2a1838, // near-black
    ];
    const rocks = new THREE.InstancedMesh(rockGeo, rockMat, low ? 18 : 38);
    const dummy = new THREE.Object3D();
    const tint = new THREE.Color();
    for (let i = 0; i < rocks.count; i++) {
      const a = (i / rocks.count) * Math.PI * 2 + (i % 3) * 0.7;
      // Keep rocks out of the camera's path — a near one clipped into frame.
      const r = 8.5 + (i % 5) * 3.4;
      dummy.position.set(Math.cos(a) * r, -2.6 + ((i * 37) % 9) * 0.12, Math.sin(a) * r - 7);
      dummy.rotation.set(i * 0.7, i * 1.3, i * 0.4);
      const sc = 0.55 + ((i * 13) % 7) * 0.26;
      dummy.scale.set(sc, sc * 0.72, sc);
      dummy.updateMatrix();
      rocks.setMatrixAt(i, dummy.matrix);

      // Nearer rocks catch more of the magenta key light.
      const lit = 1 - Math.min(1, r / 20);
      tint.setHex(ROCK_COLOURS[i % ROCK_COLOURS.length]!);
      tint.lerp(new THREE.Color(0xff2ec4), lit * 0.22);
      rocks.setColorAt(i, tint);
    }
    rocks.instanceMatrix.needsUpdate = true;
    if (rocks.instanceColor) rocks.instanceColor.needsUpdate = true;
    scene.add(rocks);

    // ── The Passport ───────────────────────────────────────────────
    const CARD_W = 2.3;
    const CARD_H = 3.6;
    const cardShape = new THREE.Shape();
    {
      const cw = CARD_W;
      const ch = CARD_H;
      const r = 0.22;
      const x = -cw / 2;
      const y = -ch / 2;
      cardShape.moveTo(x + r, y);
      cardShape.lineTo(x + cw - r, y);
      cardShape.quadraticCurveTo(x + cw, y, x + cw, y + r);
      cardShape.lineTo(x + cw, y + ch - r);
      cardShape.quadraticCurveTo(x + cw, y + ch, x + cw - r, y + ch);
      cardShape.lineTo(x + r, y + ch);
      cardShape.quadraticCurveTo(x, y + ch, x, y + ch - r);
      cardShape.lineTo(x, y + r);
      cardShape.quadraticCurveTo(x, y, x + r, y);
    }
    const cardGeo = new THREE.ExtrudeGeometry(cardShape, {
      depth: 0.1,
      bevelEnabled: true,
      bevelThickness: 0.035,
      bevelSize: 0.035,
      bevelSegments: low ? 2 : 5,
      curveSegments: low ? 6 : 14,
    });
    cardGeo.center();

    // The holder's details are painted into the card's own texture rather than
    // laid over the canvas in HTML — on the reference the name is part of the
    // card, and an HTML overlay would slide across it as the card moves.
    const faceCanvas = document.createElement("canvas");
    faceCanvas.width = 760;
    faceCanvas.height = Math.round((760 * CARD_H) / CARD_W);
    {
      const c = faceCanvas.getContext("2d")!;
      const W = faceCanvas.width;
      const H = faceCanvas.height;

      // Deep base. A near-black plum reads as a premium card; saturated pink
      // across the whole face reads as plastic.
      const base = c.createLinearGradient(0, 0, W, H);
      base.addColorStop(0, "#2B0B36");
      base.addColorStop(0.45, "#4A0F4E");
      base.addColorStop(1, "#1A0520");
      c.fillStyle = base;
      c.fillRect(0, 0, W, H);

      // Guilloché — the fine engraved lattice on a passport or banknote. It is
      // the single cheapest cue that something is an issued document.
      c.save();
      c.strokeStyle = "rgba(255,120,210,0.16)";
      c.lineWidth = 1;
      for (let i = 0; i < 46; i++) {
        c.beginPath();
        for (let x = 0; x <= W; x += 6) {
          const y =
            H * 0.5 +
            Math.sin(x * 0.012 + i * 0.38) * (40 + i * 5) +
            Math.cos(x * 0.021 - i * 0.22) * 26;
          x === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
        }
        c.stroke();
      }
      c.restore();

      // Foil corner sweep.
      const foil = c.createLinearGradient(W * 0.45, 0, W, H * 0.42);
      foil.addColorStop(0, "rgba(255,46,196,0)");
      foil.addColorStop(0.55, "rgba(255,138,220,0.5)");
      foil.addColorStop(0.75, "rgba(255,235,190,0.65)");
      foil.addColorStop(1, "rgba(255,46,196,0)");
      c.fillStyle = foil;
      c.beginPath();
      c.moveTo(W, 0);
      c.lineTo(W, H * 0.46);
      c.lineTo(W * 0.42, 0);
      c.closePath();
      c.fill();

      // Masthead
      c.fillStyle = "rgba(255,214,245,0.95)";
      c.font = "700 34px system-ui, sans-serif";
      c.letterSpacing = "13px";
      c.fillText("BRIDGENOW", 62, 112);

      c.fillStyle = "rgba(255,255,255,0.55)";
      c.font = "600 22px system-ui, sans-serif";
      c.letterSpacing = "9px";
      c.fillText("CREATOR PASSPORT", 62, 152);

      // Hairline rule under the masthead
      c.strokeStyle = "rgba(255,255,255,0.22)";
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(62, 186);
      c.lineTo(W - 62, 186);
      c.stroke();

      // Holder block — gold, because the name is the point of the document
      c.fillStyle = "rgba(255,255,255,0.45)";
      c.font = "600 19px system-ui, sans-serif";
      c.letterSpacing = "6px";
      c.fillText("HOLDER", 62, H * 0.68);

      const gold = c.createLinearGradient(62, H * 0.7, W - 62, H * 0.86);
      gold.addColorStop(0, "#F6D77A");
      gold.addColorStop(0.45, "#FFF6DA");
      gold.addColorStop(1, "#D8A33C");
      c.fillStyle = gold;
      c.font = "800 76px system-ui, sans-serif";
      c.letterSpacing = "-2px";
      const words = holder.split(" ").slice(0, 2);
      words.forEach((word, i) => c.fillText(word, 62, H * 0.76 + i * 82));

      c.fillStyle = "rgba(255,255,255,0.72)";
      c.font = "600 24px system-ui, sans-serif";
      c.letterSpacing = "4px";
      c.fillText(tier, 62, H * 0.79 + words.length * 82);

      // Micro-serial along the bottom edge
      c.fillStyle = "rgba(255,255,255,0.3)";
      c.font = "500 15px ui-monospace, monospace";
      c.letterSpacing = "3px";
      c.fillText("BN · VERIFIED · 2026", 62, H - 34);
    }

    const faceTex = new THREE.CanvasTexture(faceCanvas);
    faceTex.colorSpace = THREE.SRGBColorSpace;
    // ExtrudeGeometry's default UV generator emits WORLD coordinates, not a
    // normalised 0–1 range — so without this the texture samples a small patch
    // in the middle of the card. The shape is CARD_W × CARD_H centred on the
    // origin, so scaling by its inverse and shifting by a half maps the
    // artwork exactly once across the face.
    faceTex.repeat.set(1 / CARD_W, 1 / CARD_H);
    faceTex.offset.set(0.5, 0.5);

    const card = new THREE.Mesh(cardGeo, [
      // Face: metallic base under an iridescent clearcoat. The iridescence is
      // what gives the colour shift across the card as it turns — the thing
      // that separates a metal card from a printed one.
      new THREE.MeshPhysicalMaterial({
        map: faceTex,
        emissiveMap: faceTex,
        emissive: 0xffffff,
        emissiveIntensity: 0.22,
        roughness: 0.16,
        metalness: 0.65,
        clearcoat: 1,
        clearcoatRoughness: 0.04,
        iridescence: 0.5,
        iridescenceIOR: 1.6,
        iridescenceThicknessRange: [120, 420],
      }),
      // Edge: brushed rose-gold, so the card has a machined rim rather than a
      // flat extruded side.
      new THREE.MeshPhysicalMaterial({
        color: 0xe8b98a,
        roughness: 0.3,
        metalness: 1,
        clearcoat: 1,
        clearcoatRoughness: 0.12,
      }),
    ]);
    scene.add(card);

    // Chip
    const chip = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.32, 0.028),
      new THREE.MeshPhysicalMaterial({
        color: 0xe4c87a,
        roughness: 0.28,
        metalness: 1,
        clearcoat: 1,
        emissive: 0x3a2d14,
        emissiveIntensity: 0.45,
      }),
    );
    chip.position.set(-0.66, 0.34, 0.078);
    card.add(chip);

    // ── Lights ─────────────────────────────────────────────────────
    const key = new THREE.SpotLight(0xff6bd8, 130, 48, 0.6, 0.8, 1.6);
    key.position.set(-9, 13, 4);
    scene.add(key);

    const rim = new THREE.DirectionalLight(0xff2ec4, 2.6);
    rim.position.set(7, 3, -8);
    scene.add(rim);

    const floor = new THREE.PointLight(0xff2ec4, 90, 34, 2);
    floor.position.set(0, -1.6, 2.5);
    scene.add(floor);

        // A cool neutral fill. Without it every surface is lit magenta and the
    // card's gold foil reads pink.
    const fill = new THREE.DirectionalLight(0xdfe4ff, 1.1);
    fill.position.set(2, 5, 7);
    scene.add(fill);

    scene.add(new THREE.AmbientLight(0x6a2b84, 0.6));

    // ── Loop ───────────────────────────────────────────────────────
    let raf = 0;
    let running = false;
    const start = performance.now();
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

    function render() {
      const p = reduced ? 0.62 : clamp01(progressRef.current);
      const t = (performance.now() - start) / 1000;

      // The card climbs out of the ground, overshoots slightly, settles.
      const rise = p < 0.6 ? lerp(-2.9, 0.42, p / 0.6) : lerp(0.42, 0.1, (p - 0.6) / 0.4);
      card.position.y = rise + (reduced ? 0 : Math.sin(t * 0.8) * 0.06);
      card.rotation.y = lerp(-0.85, 0.32, p) + (reduced ? 0 : Math.sin(t * 0.45) * 0.05);
      card.rotation.z = lerp(0.14, -0.02, p);
      card.rotation.x = lerp(0.1, -0.02, p);

      // Camera pulls back and lifts as the card arrives.
      camera.position.set(
        lerp(1.6, 0, p),
        lerp(-0.4, 1.25, p),
        lerp(7.4, 9.4, p),
      );
      camera.lookAt(0, lerp(-0.9, 0.35, p), 0);

      // Fog thins so the terrain reveals itself behind the card.
      (scene.fog as THREE.FogExp2).density = lerp(0.085, 0.034, p);
      floor.intensity = lerp(30, 85, p);

      renderer.render(scene, camera);
    }

    function frame() {
      if (!running) return;
      render();
      raf = requestAnimationFrame(frame);
    }

    render();

    const io = new IntersectionObserver(
      ([entry]) => {
        const visible = !!entry?.isIntersecting && !document.hidden;
        if (visible === running) return;
        running = visible;
        if (running) raf = requestAnimationFrame(frame);
        else cancelAnimationFrame(raf);
      },
      { threshold: 0 },
    );
    io.observe(el);

    const onVis = () => {
      running = !document.hidden;
      if (running) raf = requestAnimationFrame(frame);
      else cancelAnimationFrame(raf);
    };
    document.addEventListener("visibilitychange", onVis);

    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      w = Math.max(1, r.width);
      h = Math.max(1, r.height);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      render();
    });
    ro.observe(el);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      groundGeo.dispose();
      rockGeo.dispose();
      rockMat.dispose();
      cardGeo.dispose();
      faceTex.dispose();
      (card.material as THREE.Material[]).forEach((m) => m.dispose());
      chip.geometry.dispose();
      (chip.material as THREE.Material).dispose();
      (ground.material as THREE.Material).dispose();
      envMap.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement);
    };
  }, [progressRef, holder, tier]);

  return <div ref={host} aria-hidden="true" className={className} />;
}
