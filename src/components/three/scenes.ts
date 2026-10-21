import * as THREE from "three";

/**
 * Procedural 3D objects, in the spirit of the reference pages' rendered art.
 *
 * Everything here is generated from code — no model files, no textures to
 * download. The look comes from `MeshPhysicalMaterial` with a clearcoat layer
 * over a saturated base, lit by the procedural studio environment in `env.ts`.
 * That combination is what reads as "glossy injection-moulded plastic" rather
 * than "flat shaded polygon".
 */

export type SceneName =
  | "cameraRig"
  | "clapper"
  | "crown"
  | "blob"
  | "paper"
  | "likeBadge"
  | "ribbon"
  | "asterisk"
  | "tag"
  | "coins"
  | "orb"
  | "pin"
  | "phone"
  | "trophy"
  | "rocket"
  | "heart";

export interface BuiltScene {
  /** Added to the scene; spun by the runner. */
  group: THREE.Group;
  /** Distance the camera sits back. Tuned per object. */
  cameraZ: number;
  /** Per-frame hook for anything the default spin can't express. */
  tick?: (t: number) => void;
}

// ── Shared material helpers ──────────────────────────────────────────

/** Ridged surface detail — the fine extruded lines on the reference ribbons. */
function ribbedBump(lines = 64): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 32;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, c.width, c.height);
  const step = c.width / lines;
  for (let i = 0; i < lines; i++) {
    const x = i * step;
    const g = ctx.createLinearGradient(x, 0, x + step, 0);
    g.addColorStop(0, "#2a2a2a");
    g.addColorStop(0.5, "#f0f0f0");
    g.addColorStop(1, "#2a2a2a");
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, step, c.height);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function glossy(color: string, opts: Partial<THREE.MeshPhysicalMaterialParameters> = {}) {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color),
    roughness: 0.18,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    reflectivity: 0.85,
    sheen: 0.4,
    sheenColor: new THREE.Color("#ffffff"),
    ...opts,
  });
}

function chrome(tint = "#E8E6F2") {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(tint),
    roughness: 0.04,
    metalness: 1,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
  });
}

/**
 * A craggy rock.
 *
 * A bare icosahedron reads as a geometric solid, not stone. Subdividing once
 * and then pushing every vertex along its own normal by a pseudo-random amount
 * breaks the regularity, and flat shading turns the result into facets that
 * catch light like fractured rock. The displacement is deterministic (seeded
 * from the vertex position) so a rock looks the same on every render.
 */
export function rockGeometry(detail = 1, rough = 0.34): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(1, detail);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    // Cheap deterministic hash of the vertex position.
    const n =
      Math.sin(v.x * 12.9898 + v.y * 78.233 + v.z * 37.719) * 43758.5453;
    const jitter = (n - Math.floor(n)) - 0.5;
    // A second, lower-frequency term gives broad lumps under the fine chips.
    const broad = Math.sin(v.x * 2.1) * Math.cos(v.y * 1.7) * Math.sin(v.z * 2.4);
    v.multiplyScalar(1 + jitter * rough + broad * rough * 0.5);
    pos.setXYZ(i, v.x, v.y, v.z);
  }

  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/** Rounded rectangle as a THREE.Shape, for extruding tags and cards. */
function roundedRect(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

// ── 1. Ribbon coil ───────────────────────────────────────────────────

function buildRibbon(detail: number, opts: SceneOptions = {}): BuiltScene {
  const group = new THREE.Group();

  // A loose spiral that doubles back on itself — reads as a ribbon dropped
  // into a coil rather than a tidy mathematical helix.
  const pts: THREE.Vector3[] = [];
  const turns = 2.6;
  const steps = 160;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = t * Math.PI * 2 * turns;
    const radius = 1.25 + Math.sin(t * Math.PI) * 0.55;
    pts.push(
      new THREE.Vector3(
        Math.cos(a) * radius,
        (t - 0.5) * 2.4 + Math.sin(a * 1.5) * 0.18,
        Math.sin(a) * radius * 0.72,
      ),
    );
  }

  const curve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.4);
  const geo = new THREE.TubeGeometry(curve, detail > 1 ? 320 : 160, 0.3, detail > 1 ? 24 : 12, false);

  const bump = ribbedBump(90);
  bump.repeat.set(1, 26);

  const mat = glossy(opts.tint ?? "#FF2EC4", {
    bumpMap: bump,
    bumpScale: 0.06,
    roughness: 0.14,
  });

  const mesh = new THREE.Mesh(geo, mat);
  group.add(mesh);

  // A second, thinner strand in lime for contrast — the reference ribbons
  // almost always have a companion colour threaded through.
  const geo2 = new THREE.TubeGeometry(curve, detail > 1 ? 240 : 120, 0.085, 10, false);
  const mesh2 = new THREE.Mesh(geo2, glossy(opts.tint2 ?? "#D7FF3E", { roughness: 0.22 }));
  mesh2.position.set(0.1, 0.1, 0.42);
  mesh2.rotation.z = 0.2;
  group.add(mesh2);

  group.rotation.set(0.4, 0.2, -0.25);
  return { group, cameraZ: 6.2 };
}

// ── 2. Chrome asterisk ───────────────────────────────────────────────

function buildAsterisk(detail: number): BuiltScene {
  const group = new THREE.Group();

  // Six rounded petals radiating from a hub.
  const petals = 6;
  const petalShape = roundedRect(0.44, 1.9, 0.22);
  const extrude = new THREE.ExtrudeGeometry(petalShape, {
    depth: 0.3,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.1,
    bevelSegments: detail > 1 ? 8 : 3,
    curveSegments: detail > 1 ? 16 : 6,
  });
  extrude.center();

  // Brighter than a neutral chrome: the plum/sky environment tints reflections,
  // so a pure grey base renders purple. Starting near-white corrects for it.
  const mat = chrome("#FFFFFF");
  for (let i = 0; i < petals; i++) {
    const m = new THREE.Mesh(extrude, mat);
    m.rotation.z = (i / petals) * Math.PI * 2;
    group.add(m);
  }

  const hub = new THREE.Mesh(
    new THREE.SphereGeometry(0.46, detail > 1 ? 48 : 20, detail > 1 ? 32 : 14),
    chrome("#FFFFFF"),
  );
  group.add(hub);

  group.rotation.set(0.3, 0.3, 0);
  return { group, cameraZ: 4.6 };
}

// ── 3. Tag and charm ─────────────────────────────────────────────────

function buildTag(detail: number): BuiltScene {
  const group = new THREE.Group();
  const seg = detail > 1 ? 10 : 4;

  const tagGeo = new THREE.ExtrudeGeometry(roundedRect(1.7, 2.5, 0.42), {
    depth: 0.34,
    bevelEnabled: true,
    bevelThickness: 0.11,
    bevelSize: 0.11,
    bevelSegments: seg,
    curveSegments: detail > 1 ? 20 : 8,
  });
  tagGeo.center();
  const tag = new THREE.Mesh(tagGeo, glossy("#FF2EC4"));
  tag.position.y = -0.35;
  group.add(tag);

  // Hole through the tag's top, suggested by a ring rather than a boolean cut
  // (CSG would need another dependency for a detail nobody will inspect).
  const hole = new THREE.Mesh(
    new THREE.TorusGeometry(0.26, 0.085, detail > 1 ? 20 : 8, detail > 1 ? 40 : 16),
    glossy("#C80092"),
  );
  hole.position.set(0, 0.62, 0);
  group.add(hole);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.075, detail > 1 ? 20 : 8, detail > 1 ? 40 : 16),
    chrome("#DCD9EA"),
  );
  ring.position.set(0, 1.14, 0);
  ring.rotation.x = 0.4;
  group.add(ring);

  // Flower charm hanging off the ring.
  const charm = new THREE.Group();
  const petalGeo = new THREE.SphereGeometry(0.2, detail > 1 ? 24 : 10, detail > 1 ? 16 : 8);
  const charmMat = glossy("#D7FF3E", { roughness: 0.2 });
  for (let i = 0; i < 6; i++) {
    const p = new THREE.Mesh(petalGeo, charmMat);
    const a = (i / 6) * Math.PI * 2;
    p.position.set(Math.cos(a) * 0.26, Math.sin(a) * 0.26, 0);
    p.scale.set(1, 1, 0.55);
    charm.add(p);
  }
  const centre = new THREE.Mesh(new THREE.SphereGeometry(0.14, 20, 14), chrome("#FFFFFF"));
  charm.add(centre);
  charm.position.set(0, 1.74, 0.05);
  group.add(charm);

  group.rotation.set(0.1, -0.35, 0.12);
  return {
    group,
    cameraZ: 6.4,
    tick: (t) => {
      charm.rotation.z = Math.sin(t * 0.8) * 0.4;
    },
  };
}

// ── 4. Coin stack ────────────────────────────────────────────────────

function buildCoins(detail: number): BuiltScene {
  const group = new THREE.Group();
  const geo = new THREE.CylinderGeometry(0.95, 0.95, 0.22, detail > 1 ? 64 : 24);
  const mats = [glossy("#D7FF3E"), glossy("#FF2EC4"), glossy("#2F6BFF")];

  const coins: THREE.Mesh[] = [];
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(geo, mats[i % mats.length]!);
    m.position.y = i * 0.3 - 0.6;
    m.rotation.set(0.12, (i / 5) * Math.PI, 0.08 * (i % 2 ? 1 : -1));
    group.add(m);
    coins.push(m);
  }

  group.rotation.set(0.25, 0.3, 0);
  return {
    group,
    cameraZ: 6,
    tick: (t) => {
      coins.forEach((c, i) => {
        c.position.y = i * 0.3 - 0.6 + Math.sin(t * 1.2 + i * 0.5) * 0.06;
      });
    },
  };
}

// ── 5. Glossy orb cluster ────────────────────────────────────────────

function buildOrb(detail: number): BuiltScene {
  const group = new THREE.Group();
  const big = new THREE.Mesh(
    new THREE.SphereGeometry(1.5, detail > 1 ? 64 : 24, detail > 1 ? 48 : 18),
    new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#FF2EC4"),
      roughness: 0.05,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      transmission: 0.35,
      thickness: 1.4,
      ior: 1.45,
    }),
  );
  group.add(big);

  const small: THREE.Mesh[] = [];
  const smallGeo = new THREE.SphereGeometry(0.4, detail > 1 ? 40 : 16, detail > 1 ? 28 : 12);
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(smallGeo, chrome(i === 1 ? "#D7FF3E" : "#FFFFFF"));
    group.add(m);
    small.push(m);
  }

  return {
    group,
    cameraZ: 6,
    tick: (t) => {
      small.forEach((m, i) => {
        const a = t * 0.6 + (i / 3) * Math.PI * 2;
        m.position.set(Math.cos(a) * 2.05, Math.sin(a * 1.3) * 1.1, Math.sin(a) * 1.5);
      });
    },
  };
}

// ── 6. Map pin ───────────────────────────────────────────────────────

function buildPin(detail: number): BuiltScene {
  const group = new THREE.Group();

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(1, detail > 1 ? 48 : 20, detail > 1 ? 32 : 14),
    glossy("#2F6BFF"),
  );
  head.position.y = 0.55;
  group.add(head);

  const tip = new THREE.Mesh(
    new THREE.ConeGeometry(0.78, 1.6, detail > 1 ? 48 : 20),
    glossy("#1B3FE0"),
  );
  tip.position.y = -0.75;
  tip.rotation.x = Math.PI;
  group.add(tip);

  const dot = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, detail > 1 ? 32 : 14, detail > 1 ? 24 : 10),
    glossy("#D7FF3E"),
  );
  dot.position.set(0, 0.62, 0.78);
  group.add(dot);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.7, 0.08, detail > 1 ? 16 : 8, detail > 1 ? 56 : 24),
    chrome("#FF6BD8"),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -1.4;
  group.add(ring);

  group.rotation.set(0.12, 0.2, 0);
  return {
    group,
    cameraZ: 6.4,
    tick: (t) => {
      ring.scale.setScalar(1 + Math.sin(t * 1.4) * 0.08);
    },
  };
}


// ── 7. Phone cradled in rock ─────────────────────────────────────────

export interface SceneOptions {
  /** Lines painted onto the phone's screen. */
  screen?: { eyebrow: string; big: string; rows: [string, string][]; cta: string };
  /** Overrides a scene's primary colour. The landing page runs violet. */
  tint?: string;
  /** Overrides the companion strand threaded through the ribbon. */
  tint2?: string;
}

/** Paints a BridgeNow app screen onto a canvas for the phone's display. */
function screenTexture(opts: SceneOptions["screen"]): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 420;
  c.height = 880;
  const x = c.getContext("2d")!;

  const bg = x.createLinearGradient(0, 0, 0, c.height);
  bg.addColorStop(0, "#241033");
  bg.addColorStop(1, "#0E0516");
  x.fillStyle = bg;
  x.fillRect(0, 0, c.width, c.height);

  const o = opts ?? {
    eyebrow: "CREATOR PLUS",
    big: "₹48,200",
    rows: [["Brand deals", "6 live"], ["This month", "₹12,000"], ["Next debit", "19 Nov"]] as [string, string][],
    cta: "View deals",
  };

  // Status bar
  x.fillStyle = "rgba(255,255,255,0.55)";
  x.font = "600 18px system-ui, sans-serif";
  x.fillText("9:41", 28, 46);

  // Wordmark
  x.fillStyle = "#FFFFFF";
  x.font = "800 30px system-ui, sans-serif";
  x.fillText("bridge", 28, 124);
  const w = x.measureText("bridge").width;
  x.fillStyle = "#FF4DB8";
  x.fillText("now", 28 + w, 124);

  // Headline figure
  x.fillStyle = "rgba(255,255,255,0.5)";
  x.font = "600 17px system-ui, sans-serif";
  x.letterSpacing = "4px";
  x.fillText(o.eyebrow, 28, 190);

  x.fillStyle = "#FFFFFF";
  x.font = "800 62px system-ui, sans-serif";
  x.letterSpacing = "-2px";
  x.fillText(o.big, 28, 258);

  // Rows
  let y = 330;
  for (const [k, v] of o.rows) {
    x.fillStyle = "rgba(255,255,255,0.07)";
    x.beginPath();
    x.roundRect(24, y, c.width - 48, 72, 18);
    x.fill();

    x.fillStyle = "rgba(255,255,255,0.72)";
    x.font = "500 20px system-ui, sans-serif";
    x.letterSpacing = "0px";
    x.fillText(k, 44, y + 44);

    x.fillStyle = "#FF8ACF";
    x.font = "700 20px system-ui, sans-serif";
    const vw = x.measureText(v).width;
    x.fillText(v, c.width - 44 - vw, y + 44);
    y += 86;
  }

  // CTA
  const cta = x.createLinearGradient(24, 0, c.width - 24, 0);
  cta.addColorStop(0, "#FF2EC4");
  cta.addColorStop(1, "#9B4DFF");
  x.fillStyle = cta;
  x.beginPath();
  x.roundRect(24, c.height - 150, c.width - 48, 76, 38);
  x.fill();
  x.fillStyle = "#FFFFFF";
  x.font = "700 24px system-ui, sans-serif";
  const cw = x.measureText(o.cta).width;
  x.fillText(o.cta, (c.width - cw) / 2, c.height - 102);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildPhone(detail: number, opts?: SceneOptions): BuiltScene {
  const group = new THREE.Group();
  const seg = detail > 1 ? 6 : 2;

  // Body
  const bodyGeo = new THREE.ExtrudeGeometry(roundedRect(1.5, 3.1, 0.28), {
    depth: 0.17,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.05,
    bevelSegments: seg,
    curveSegments: detail > 1 ? 16 : 6,
  });
  bodyGeo.center();
  const body = new THREE.Mesh(
    bodyGeo,
    new THREE.MeshPhysicalMaterial({
      color: "#1B1622",
      roughness: 0.28,
      metalness: 0.85,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
    }),
  );
  group.add(body);

  // Screen sits just PROUD of the body's front face.
  //
  // ExtrudeGeometry's total depth is `depth + 2 * bevelThickness` — 0.27 here —
  // so after centring the front face is at z = 0.135. Anything nearer than
  // that is buried inside the body and renders black.
  const BODY_FRONT = (0.17 + 2 * 0.05) / 2;
  const tex = screenTexture(opts?.screen);
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(1.3, 2.84),
    new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }),
  );
  screen.position.z = BODY_FRONT + 0.004;
  group.add(screen);

  // Screen bounce, as a radial sprite. A plane with a flat colour showed its
  // own rectangular edges — the falloff has to be in the texture.
  const glowCanvas = document.createElement("canvas");
  glowCanvas.width = glowCanvas.height = 128;
  {
    const g = glowCanvas.getContext("2d")!;
    const rad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    rad.addColorStop(0, "rgba(255,46,196,0.55)");
    rad.addColorStop(0.45, "rgba(255,46,196,0.18)");
    rad.addColorStop(1, "rgba(255,46,196,0)");
    g.fillStyle = rad;
    g.fillRect(0, 0, 128, 128);
  }
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(glowCanvas),
      transparent: true,
      depthWrite: false,
    }),
  );
  glow.scale.set(5.2, 5.6, 1);
  glow.position.z = -0.9;
  group.add(glow);

  // Rock cradle — the phone looks held, not floating
  const rGeo = rockGeometry(detail > 1 ? 2 : 1, 0.38);
  const rMat = new THREE.MeshStandardMaterial({
    color: "#4F4258",
    roughness: 0.95,
    metalness: 0.05,
    flatShading: true,
  });
  // Rocks sit low and wide so the phone looks wedged into them rather than
  // balanced on a pebble, and none of them cross in front of the screen.
  const placements: [number, number, number, number][] = [
    [-1.08, -1.46, 0.34, 0.92],
    [1.12, -1.52, 0.26, 0.8],
    [0.05, -1.86, -0.34, 1.12],
    [-0.62, -1.78, -0.5, 0.66],
    [0.72, -1.72, -0.46, 0.58],
  ];
  for (const [px, py, pz, sc] of placements) {
    const r = new THREE.Mesh(rGeo, rMat);
    r.position.set(px, py, pz);
    r.scale.setScalar(sc);
    r.rotation.set(px * 3, py * 2, pz * 4);
    group.add(r);
  }

  group.position.y = 0.42;
  group.rotation.set(0.06, -0.16, 0.03);
  return { group, cameraZ: 7.4 };
}

// ── 8. Trophy ────────────────────────────────────────────────────────

function buildTrophy(detail: number): BuiltScene {
  const group = new THREE.Group();
  const gold = new THREE.MeshPhysicalMaterial({
    color: "#F0C46A",
    roughness: 0.16,
    metalness: 1,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
  });

  const cup = new THREE.Mesh(
    new THREE.LatheGeometry(
      [
        new THREE.Vector2(0.02, -0.9),
        new THREE.Vector2(0.52, -0.9),
        new THREE.Vector2(0.5, -0.74),
        new THREE.Vector2(0.16, -0.62),
        new THREE.Vector2(0.14, -0.1),
        new THREE.Vector2(0.62, 0.12),
        new THREE.Vector2(0.86, 0.92),
        new THREE.Vector2(0.84, 0.98),
        new THREE.Vector2(0, 0.98),
      ],
      detail > 1 ? 56 : 22,
    ),
    gold,
  );
  group.add(cup);

  const handles: THREE.Mesh[] = [];
  for (const sign of [-1, 1]) {
    const h = new THREE.Mesh(
      new THREE.TorusGeometry(0.3, 0.07, detail > 1 ? 18 : 8, detail > 1 ? 36 : 14, Math.PI * 1.2),
      gold,
    );
    h.position.set(sign * 0.82, 0.56, 0);
    h.rotation.z = sign > 0 ? -0.5 : Math.PI + 0.5;
    group.add(h);
    handles.push(h);
  }

  group.rotation.set(0.1, 0.3, 0);
  return { group, cameraZ: 5.2 };
}

// ── 9. Rocket ────────────────────────────────────────────────────────

function buildRocket(detail: number): BuiltScene {
  const group = new THREE.Group();

  const bodyMesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.44, 1.5, detail > 1 ? 12 : 4, detail > 1 ? 32 : 12),
    glossy("#FFFFFF", { roughness: 0.14 }),
  );
  group.add(bodyMesh);

  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(0.44, 0.78, detail > 1 ? 32 : 12),
    glossy("#FF2EC4"),
  );
  nose.position.y = 1.5;
  group.add(nose);

  const window1 = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, detail > 1 ? 28 : 12, detail > 1 ? 20 : 8),
    chrome("#8FD8FF"),
  );
  window1.position.set(0, 0.56, 0.4);
  window1.scale.z = 0.45;
  group.add(window1);

  for (let i = 0; i < 3; i++) {
    const fin = new THREE.Mesh(
      new THREE.ConeGeometry(0.3, 0.72, 4),
      glossy("#D7FF3E"),
    );
    const a = (i / 3) * Math.PI * 2;
    fin.position.set(Math.cos(a) * 0.46, -0.92, Math.sin(a) * 0.46);
    fin.rotation.set(Math.PI, a, 0.36);
    group.add(fin);
  }

  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.3, 0.9, detail > 1 ? 24 : 10),
    new THREE.MeshBasicMaterial({ color: "#FFB25E", transparent: true, opacity: 0.85 }),
  );
  flame.position.y = -1.7;
  flame.rotation.x = Math.PI;
  group.add(flame);

  group.rotation.set(0.1, 0.4, 0.14);
  return {
    group,
    cameraZ: 6.2,
    tick: (t) => {
      const p = 1 + Math.sin(t * 9) * 0.16;
      flame.scale.set(p, 1 + Math.sin(t * 7) * 0.22, p);
    },
  };
}

// ── 10. Heart ────────────────────────────────────────────────────────

function buildHeart(detail: number): BuiltScene {
  const group = new THREE.Group();

  const shape = new THREE.Shape();
  shape.moveTo(0, 0.5);
  shape.bezierCurveTo(0, 0.8, -0.3, 1.1, -0.65, 1.1);
  shape.bezierCurveTo(-1.2, 1.1, -1.2, 0.4, -1.2, 0.4);
  shape.bezierCurveTo(-1.2, 0, -0.75, -0.5, 0, -1.05);
  shape.bezierCurveTo(0.75, -0.5, 1.2, 0, 1.2, 0.4);
  shape.bezierCurveTo(1.2, 0.4, 1.2, 1.1, 0.65, 1.1);
  shape.bezierCurveTo(0.3, 1.1, 0, 0.8, 0, 0.5);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.5,
    bevelEnabled: true,
    bevelThickness: 0.2,
    bevelSize: 0.2,
    bevelSegments: detail > 1 ? 10 : 3,
    curveSegments: detail > 1 ? 20 : 8,
  });
  geo.center();

  const mesh = new THREE.Mesh(geo, glossy("#FF2EC4", { roughness: 0.1 }));
  group.add(mesh);
  group.rotation.set(0.1, 0.2, 0);

  return {
    group,
    cameraZ: 5.6,
    tick: (t) => {
      const beat = 1 + Math.max(0, Math.sin(t * 3)) * 0.07;
      mesh.scale.setScalar(beat);
    },
  };
}

// ── Registry ─────────────────────────────────────────────────────────


export function buildScene(name: SceneName, detail: number, opts?: SceneOptions): BuiltScene {
  switch (name) {
    case "cameraRig": return buildCameraRig(detail, opts);
    case "clapper": return buildClapper(detail, opts);
    case "crown": return buildCrown(detail, opts);
    case "blob": return buildBlob(detail, opts);
    case "paper": return buildPaper(detail, opts);
    case "likeBadge": return buildLikeBadge(detail, opts);
    case "ribbon": return buildRibbon(detail, opts);
    case "asterisk": return buildAsterisk(detail);
    case "tag": return buildTag(detail);
    case "coins": return buildCoins(detail);
    case "orb": return buildOrb(detail);
    case "pin": return buildPin(detail);
    case "phone": return buildPhone(detail, opts);
    case "trophy": return buildTrophy(detail);
    case "rocket": return buildRocket(detail);
    case "heart": return buildHeart(detail);
  }
}

/** Walks a group and frees everything the GPU is holding. */
export function disposeGroup(group: THREE.Object3D) {
  group.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (!mat) return;
    const list = Array.isArray(mat) ? mat : [mat];
    for (const m of list) {
      for (const key of Object.keys(m)) {
        const value = (m as unknown as Record<string, unknown>)[key];
        if (value && typeof value === "object" && "isTexture" in value) {
          (value as THREE.Texture).dispose();
        }
      }
      m.dispose();
    }
  });
}


// ── 11. Crown ────────────────────────────────────────────────────────
//
// From the mockup: a violet band with five tapering points, each capped with
// a ball. Built rather than modelled so it takes the page's own lighting and
// stays sharp at any size.

function buildCrown(detail: number, opts: SceneOptions = {}): BuiltScene {
  const group = new THREE.Group();
  const tint = opts.tint ?? "#A855F7";
  const seg = detail > 1 ? 56 : 28;

  const body = glossy(tint, { roughness: 0.13, clearcoatRoughness: 0.04 });

  // Band — slightly flared, open at the top so the points read as part of it.
  // Open-ended, so the inside is visible and needs its own double-sided
  // material — spreading the shared one would copy fields, not behaviour.
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(1.02, 0.9, 0.78, seg, 1, true),
    glossy(tint, { roughness: 0.13, clearcoatRoughness: 0.04, side: THREE.DoubleSide }),
  );
  band.position.y = -0.5;
  group.add(band);

  // Rim torus top and bottom, which is what gives it the moulded edge.
  const rimTop = new THREE.Mesh(new THREE.TorusGeometry(1.02, 0.075, 12, seg), body);
  rimTop.rotation.x = Math.PI / 2;
  rimTop.position.y = -0.11;
  group.add(rimTop);

  const rimBottom = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.085, 12, seg), body);
  rimBottom.rotation.x = Math.PI / 2;
  rimBottom.position.y = -0.89;
  group.add(rimBottom);

  // Five points around the front arc, each with a ball on top.
  const points = 5;
  for (let i = 0; i < points; i++) {
    const a = (i / (points - 1)) * Math.PI * 1.08 - Math.PI * 0.04;
    const x = Math.cos(a) * 1.0;
    const z = Math.sin(a) * 1.0;
    // Outer points sit lower, like the reference.
    const mid = 1 - Math.abs(i - (points - 1) / 2) / ((points - 1) / 2);
    const h = 0.72 + mid * 0.5;

    const spike = new THREE.Mesh(
      new THREE.ConeGeometry(0.2, h, detail > 1 ? 20 : 10),
      body,
    );
    spike.position.set(x, -0.11 + h / 2, z);
    group.add(spike);

    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.165, detail > 1 ? 24 : 12, detail > 1 ? 18 : 10),
      body,
    );
    ball.position.set(x, -0.11 + h + 0.1, z);
    group.add(ball);
  }

  group.rotation.set(0.18, -0.35, 0.1);
  return { group, cameraZ: 4.6 };
}

// ── 12. Soft blob ────────────────────────────────────────────────────
// The little marshmallow-ish cube drifting near the hero.

function buildBlob(detail: number, opts: SceneOptions = {}): BuiltScene {
  const group = new THREE.Group();
  const shape = roundedRect(1.5, 1.5, 0.62);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.7,
    bevelEnabled: true,
    bevelThickness: 0.34,
    bevelSize: 0.34,
    bevelSegments: detail > 1 ? 12 : 5,
    curveSegments: detail > 1 ? 20 : 8,
  });
  geo.center();

  group.add(
    new THREE.Mesh(
      geo,
      glossy(opts.tint ?? "#F4F2EE", { roughness: 0.4, clearcoat: 0.6, sheen: 0.7 }),
    ),
  );
  group.rotation.set(0.5, 0.7, 0.2);
  return { group, cameraZ: 4.4 };
}

// ── 13. Folded paper ─────────────────────────────────────────────────
// A curled sheet. A flat plane read as a glitch, so the vertices are bent
// on two axes and it is drawn double-sided.

function buildPaper(detail: number, opts: SceneOptions = {}): BuiltScene {
  const group = new THREE.Group();
  const n = detail > 1 ? 40 : 18;
  const geo = new THREE.PlaneGeometry(2.1, 2.1, n, n);

  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    pos.setZ(i, Math.sin(x * 1.15) * 0.42 + Math.cos(y * 0.95) * 0.3 + x * y * 0.06);
  }
  geo.computeVertexNormals();

  group.add(
    new THREE.Mesh(
      geo,
      glossy(opts.tint ?? "#EFEDE7", {
        roughness: 0.42,
        clearcoat: 0.5,
        side: THREE.DoubleSide,
      }),
    ),
  );
  group.rotation.set(-0.5, 0.35, 0.5);
  return { group, cameraZ: 4.2 };
}

// ── 14. Like badge ───────────────────────────────────────────────────
// The pink heart-in-a-bubble that floats beside the phone.

function buildLikeBadge(detail: number, opts: SceneOptions = {}): BuiltScene {
  const group = new THREE.Group();
  const tint = opts.tint ?? "#F72798";

  const bubbleGeo = new THREE.ExtrudeGeometry(roundedRect(1.9, 1.6, 0.52), {
    depth: 0.5,
    bevelEnabled: true,
    bevelThickness: 0.17,
    bevelSize: 0.17,
    bevelSegments: detail > 1 ? 10 : 4,
    curveSegments: detail > 1 ? 18 : 7,
  });
  bubbleGeo.center();
  const bubble = new THREE.Mesh(bubbleGeo, glossy(tint, { roughness: 0.14 }));
  group.add(bubble);

  // Tail
  const tail = new THREE.Mesh(
    new THREE.ConeGeometry(0.3, 0.55, 4),
    glossy(tint, { roughness: 0.14 }),
  );
  tail.position.set(-0.42, -0.92, 0.1);
  tail.rotation.set(0, Math.PI / 4, 0.5);
  group.add(tail);

  // Heart, from two spheres and a cone — cheaper than a shape extrusion and
  // rounder than one at this size.
  const white = glossy("#FFFFFF", { roughness: 0.3, clearcoat: 0.8 });
  const lobe = new THREE.SphereGeometry(0.3, detail > 1 ? 22 : 10, detail > 1 ? 16 : 8);
  for (const dx of [-0.24, 0.24]) {
    const m = new THREE.Mesh(lobe, white);
    m.position.set(dx, 0.2, 0.42);
    group.add(m);
  }
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.44, 0.66, detail > 1 ? 22 : 10), white);
  tip.position.set(0, -0.26, 0.42);
  tip.rotation.z = Math.PI;
  group.add(tip);

  group.rotation.set(0.12, -0.3, -0.12);
  return { group, cameraZ: 5 };
}


// ── Shared bits for the hero rigs ────────────────────────────────────

/** The acid-lime glow that wraps both hero objects. */
function limeGlow() {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color("#D7FF3E"),
    emissive: new THREE.Color("#9ED400"),
    emissiveIntensity: 1.5,
    roughness: 0.35,
    metalness: 0,
  });
}

/**
 * Matte near-black with a violet sheen — the body colour of both rigs.
 *
 * NOT `glossy()`: that helper runs reflectivity 0.85 with a full clearcoat,
 * which mirrors the environment so hard that a near-black body came out
 * bright blue. Gear is dark because it absorbs light, so this keeps
 * reflectivity low and leans on the sheen for the violet edge instead.
 */
function gearBody(tint = "#15102B") {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(tint),
    roughness: 0.52,
    metalness: 0.25,
    reflectivity: 0.2,
    clearcoat: 0.45,
    clearcoatRoughness: 0.35,
    sheen: 1,
    sheenRoughness: 0.5,
    sheenColor: new THREE.Color("#8B45E8"),
  });
}

/**
 * A tilted loop of light threading around an object. Built as a tube along a
 * closed curve so it reads as one continuous ribbon from any angle, rather
 * than a torus that flattens as soon as the camera moves.
 */
function glowLoop(
  detail: number,
  rx: number,
  ry: number,
  rz: number,
  thickness = 0.07,
  yOffset = 0,
): THREE.Mesh {
  const pts: THREE.Vector3[] = [];
  const steps = detail > 1 ? 120 : 60;
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    pts.push(
      new THREE.Vector3(
        Math.cos(a) * rx,
        Math.sin(a * 2) * ry + yOffset,
        Math.sin(a) * rz,
      ),
    );
  }
  const curve = new THREE.CatmullRomCurve3(pts, true, "catmullrom", 0.5);
  return new THREE.Mesh(
    new THREE.TubeGeometry(curve, detail > 1 ? 220 : 110, thickness, detail > 1 ? 14 : 8, true),
    limeGlow(),
  );
}

// ── 15. Camera on a tripod ───────────────────────────────────────────

function buildCameraRig(detail: number, opts: SceneOptions = {}): BuiltScene {
  const group = new THREE.Group();
  const body = gearBody(opts.tint ?? "#15102B");
  const seg = detail > 1 ? 36 : 16;

  // ── Tripod ──
  const legMat = gearBody("#120D24");
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.06, 2.6, 12), legMat);
    leg.position.set(Math.cos(a) * 0.72, -2.2, Math.sin(a) * 0.72);
    leg.rotation.set(Math.sin(a) * 0.58, 0, -Math.cos(a) * 0.58);
    group.add(leg);
  }
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 1.5, 14), legMat);
  column.position.y = -1.55;
  group.add(column);

  const head = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.22, 0.3, 14),
    gearBody("#2B2050"),
  );
  head.position.y = -0.82;
  group.add(head);

  // ── Camera body ──
  const shell = new THREE.ExtrudeGeometry(roundedRect(2.15, 1.42, 0.28), {
    depth: 1.0,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.1,
    bevelSegments: detail > 1 ? 8 : 3,
    curveSegments: detail > 1 ? 16 : 6,
  });
  shell.center();
  group.add(new THREE.Mesh(shell, body));

  // Grip on the right
  const grip = new THREE.ExtrudeGeometry(roundedRect(0.6, 1.5, 0.22), {
    depth: 0.92,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.1,
    bevelSegments: detail > 1 ? 6 : 3,
    curveSegments: detail > 1 ? 12 : 5,
  });
  grip.center();
  const gripMesh = new THREE.Mesh(grip, gearBody("#1D1536"));
  gripMesh.position.set(1.18, -0.04, 0);
  group.add(gripMesh);

  // Pentaprism hump
  const hump = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.38, 0.8), gearBody("#1D1536"));
  hump.position.set(-0.25, 0.83, 0);
  group.add(hump);

  // ── Lens, pointing at the viewer ──
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.74, 0.78, 0.95, seg),
    gearBody("#171030"),
  );
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(-0.22, -0.04, 0.92);
  group.add(barrel);

  const hood = new THREE.Mesh(
    new THREE.CylinderGeometry(0.88, 0.76, 0.34, seg),
    gearBody("#2B2050"),
  );
  hood.rotation.x = Math.PI / 2;
  hood.position.set(-0.22, -0.04, 1.5);
  group.add(hood);

  // The lime ring is the signature of this object.
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.79, 0.07, 12, seg), limeGlow());
  ring.position.set(-0.22, -0.04, 1.32);
  group.add(ring);

  // Glass: dark and slightly domed, with a highlight so it does not read flat.
  // A shallow cap, not a half-sphere: a deep dome read as a loose ball stuck
  // to the side of the camera rather than as glass set into the barrel.
  const glass = new THREE.Mesh(
    new THREE.SphereGeometry(0.7, seg, seg, 0, Math.PI * 2, 0, Math.PI / 5),
    glossy("#1A1140", { roughness: 0.06, clearcoat: 1, reflectivity: 1 }),
  );
  glass.rotation.x = Math.PI / 2;
  glass.position.set(-0.22, -0.04, 1.38);
  group.add(glass);

  const spark = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 12, 10),
    new THREE.MeshBasicMaterial({ color: "#B9A8FF" }),
  );
  spark.position.set(-0.52, 0.24, 1.68);
  group.add(spark);

  // ── Shotgun mic on top ──
  const mic = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.15, 1.35, seg),
    gearBody("#140E28"),
  );
  mic.rotation.x = Math.PI / 2;
  mic.position.set(-0.25, 1.2, 0.3);
  group.add(mic);

  const micTip = new THREE.Mesh(new THREE.SphereGeometry(0.17, seg, 14), limeGlow());
  micTip.position.set(-0.25, 1.2, 1.0);
  group.add(micTip);

  const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), gearBody("#2B2050"));
  shoe.position.set(-0.25, 1.0, 0.1);
  group.add(shoe);

  // ── The ribbon of light ──
  group.add(glowLoop(detail, 2.0, 0.42, 1.55, 0.07, -0.1));

  group.rotation.set(0.08, -0.62, 0.03);
  return { group, cameraZ: 8.2 };
}

// ── 16. Clapperboard ─────────────────────────────────────────────────

/** Diagonal stripes for the clapper arm. */
function stripeTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 96;
  const x = c.getContext("2d")!;
  x.fillStyle = "#14102A";
  x.fillRect(0, 0, c.width, c.height);
  const n = 7;
  const w = c.width / n;
  for (let i = 0; i < n; i++) {
    x.fillStyle = i % 2 === 0 ? "#F2EDFF" : "#C9B6F5";
    x.beginPath();
    x.moveTo(i * w, 0);
    x.lineTo(i * w + w * 0.52, 0);
    x.lineTo(i * w + w * 0.2, c.height);
    x.lineTo(i * w - w * 0.32, c.height);
    x.closePath();
    x.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildClapper(detail: number, opts: SceneOptions = {}): BuiltScene {
  const group = new THREE.Group();
  const body = gearBody(opts.tint ?? "#161029");

  // Slate
  const slate = new THREE.ExtrudeGeometry(roundedRect(2.6, 1.85, 0.12), {
    depth: 0.2,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.05,
    bevelSegments: detail > 1 ? 6 : 2,
    curveSegments: detail > 1 ? 12 : 5,
  });
  slate.center();
  const slateMesh = new THREE.Mesh(slate, body);
  slateMesh.position.y = -0.5;
  group.add(slateMesh);

  // Faint rule lines on the slate face
  for (let i = 0; i < 3; i++) {
    const line = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 0.035, 0.02),
      new THREE.MeshBasicMaterial({ color: "#4A3C75" }),
    );
    line.position.set(0, -0.15 - i * 0.42, 0.13);
    group.add(line);
  }

  // The striped top bar, fixed to the slate
  const barGeo = new THREE.BoxGeometry(2.6, 0.34, 0.22);
  const stripes = stripeTexture();
  const barMat = new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.4 });
  const bar = new THREE.Mesh(barGeo, barMat);
  bar.position.set(0, 0.46, 0);
  group.add(bar);

  // The hinged arm, caught mid-open. Rotated about its LEFT end rather than
  // its centre, or it swings through the slate instead of off it.
  const arm = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.34, 0.22), barMat);
  const pivot = new THREE.Group();
  arm.position.x = 1.3;
  pivot.add(arm);
  pivot.position.set(-1.3, 0.62, 0);
  pivot.rotation.z = 0.42;
  group.add(pivot);

  const hinge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 0.3, 12),
    gearBody("#2B2050"),
  );
  hinge.rotation.x = Math.PI / 2;
  hinge.position.set(-1.3, 0.56, 0);
  group.add(hinge);

  group.add(glowLoop(detail, 2.05, 0.4, 1.3, 0.065, -0.3));

  group.rotation.set(0.1, 0.38, -0.06);
  return { group, cameraZ: 7.4 };
}
