import * as THREE from "three";

/**
 * A procedural environment map.
 *
 * Glossy plastic and chrome only look right when there is something for them
 * to reflect — without an environment, a clearcoat material renders as flat
 * colour. Rather than ship an HDRI file (1–4 MB), this paints a studio
 * gradient onto a canvas and runs it through PMREMGenerator, which gives real
 * reflections for a few kilobytes of code.
 *
 * The bands are deliberate: a bright ceiling, a soft horizon, a darker floor,
 * plus two hot spots that read as studio strip lights in the specular.
 */
export function makeStudioEnv(
  renderer: THREE.WebGLRenderer,
  palette: { top: string; horizon: string; bottom: string; accent: string },
): THREE.Texture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size / 2;
  const ctx = canvas.getContext("2d")!;

  // Vertical studio gradient.
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, palette.top);
  grad.addColorStop(0.45, palette.horizon);
  grad.addColorStop(1, palette.bottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Two soft strip lights — these become the long highlights on glossy edges.
  const strip = (cx: number, cy: number, rx: number, ry: number, alpha: number) => {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
    g.addColorStop(0, `rgba(255,255,255,${alpha})`);
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(rx / Math.max(rx, ry), ry / Math.max(rx, ry));
    ctx.translate(-cx, -cy);
    ctx.fillStyle = g;
    ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);
    ctx.restore();
  };

  strip(size * 0.22, canvas.height * 0.26, size * 0.3, canvas.height * 0.2, 0.95);
  strip(size * 0.78, canvas.height * 0.34, size * 0.22, canvas.height * 0.14, 0.6);

  // A wash of the brand accent so reflections pick up the page's colour.
  const accentGlow = ctx.createRadialGradient(
    size * 0.6,
    canvas.height * 0.8,
    0,
    size * 0.6,
    canvas.height * 0.8,
    size * 0.45,
  );
  accentGlow.addColorStop(0, palette.accent);
  accentGlow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = accentGlow;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromEquirectangular(tex);
  tex.dispose();
  pmrem.dispose();

  return envRT.texture;
}

/** The two palettes, matching the two worlds of the site. */
export const SKY_ENV = {
  top: "#EAF7FF",
  horizon: "#7FC4FF",
  bottom: "#1B3FE0",
  accent: "rgba(255,46,196,0.9)",
};

/**
 * The landing page's studio. SKY_ENV bottoms out in electric blue with a
 * magenta accent, which rendered the chrome asterisk purple; this keeps the
 * reflections neutral so silver stays silver.
 */
export const LIGHT_ENV = {
  top: "#FFFFFF",
  horizon: "#DCE8FA",
  bottom: "#AEB8CC",
  accent: "rgba(168,85,247,0.55)",
};

export const PLUM_ENV = {
  top: "#8E3BA8",
  horizon: "#55196B",
  bottom: "#12031A",
  accent: "rgba(255,46,196,1)",
};
