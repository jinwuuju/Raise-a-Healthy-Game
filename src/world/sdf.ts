/*
 * Signed-distance shapes in game pixels (negative = inside). Organ rooms use them for smooth,
 * organic walls and for collision that matches what is drawn. Pure functions, no DOM.
 */
export type Sdf = (x: number, y: number) => number;

export const circle = (cx: number, cy: number, r: number): Sdf => (x, y) => Math.hypot(x - cx, y - cy) - r;

/** Approximate ellipse distance (exact on the axes); good enough for walls a few pixels thick. */
export const ellipse = (cx: number, cy: number, rx: number, ry: number): Sdf => (x, y) => {
  const k = Math.hypot((x - cx) / rx, (y - cy) / ry);
  return (k - 1) * Math.min(rx, ry);
};

/** Segment with a radius that changes from r1 to r2 along its length. */
export const cone = (x1: number, y1: number, r1: number, x2: number, y2: number, r2: number): Sdf => (x, y) => {
  const dx = x2 - x1, dy = y2 - y1, l = dx * dx + dy * dy;
  const t = l ? Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / l)) : 0;
  return Math.hypot(x - x1 - dx * t, y - y1 - dy * t) - (r1 + (r2 - r1) * t);
};

export const capsule = (x1: number, y1: number, x2: number, y2: number, r: number): Sdf => cone(x1, y1, r, x2, y2, r);

export const box = (x: number, y: number, w: number, h: number, r = 0): Sdf => (px, py) => {
  const qx = Math.abs(px - (x + w / 2)) - w / 2 + r, qy = Math.abs(py - (y + h / 2)) - h / 2 + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
};

export const union = (...s: Sdf[]): Sdf => (x, y) => {
  let d = Infinity;
  for (const f of s) { const v = f(x, y); if (v < d) d = v; }
  return d;
};

/** Union with rounded joins of width k (organic blending between chambers and vessels). */
export const blend = (k: number, ...s: Sdf[]): Sdf => (x, y) => {
  let d = Infinity;
  for (const f of s) {
    const b = f(x, y);
    if (d === Infinity) { d = b; continue; }
    const h = Math.max(k - Math.abs(d - b), 0) / k;
    d = Math.min(d, b) - h * h * k * 0.25;
  }
  return d;
};

export const cut = (a: Sdf, ...b: Sdf[]): Sdf => (x, y) => {
  let d = a(x, y);
  for (const f of b) d = Math.max(d, -f(x, y));
  return d;
};

export const nothing: Sdf = () => Infinity;

function hash(x: number, y: number, s: number): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth value noise in 0..1. */
export function noise(x: number, y: number, seed = 0): number {
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash(x0, y0, seed), b = hash(x0 + 1, y0, seed), c = hash(x0, y0 + 1, seed), d = hash(x0 + 1, y0 + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

/** Adds a soft irregular edge (amp pixels) so walls do not look machine-made. */
export const wobble = (s: Sdf, amp: number, scale: number, seed: number): Sdf => (x, y) =>
  s(x, y) + (noise(x / scale, y / scale, seed) - 0.5) * 2 * amp;
