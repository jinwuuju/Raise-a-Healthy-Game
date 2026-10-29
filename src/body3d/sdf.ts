/*
 * D118 Bodyscope 3D outer model: signed distance fields and a surface-nets mesher (no three.js, no DOM, testable).
 * Organs are written as smooth unions of simple shapes in centimetres (x = the person's left, y = up, z = forward),
 * then turned into a triangle mesh with smooth normals. Distances are approximate (good enough to mesh and shade).
 */
export type V3 = [number, number, number];
export type Field = (x: number, y: number, z: number) => number;

export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = (a: V3): number => Math.hypot(a[0], a[1], a[2]);
export const norm = (a: V3): V3 => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** Polynomial smooth minimum: joins two shapes with a fillet of size k (k = 0 is a hard union). */
export function smin(a: number, b: number, k: number): number {
  if (k <= 0) return Math.min(a, b);
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}
/** Smooth maximum (intersection) and smooth subtraction (a minus b). */
export const smax = (a: number, b: number, k: number): number => -smin(-a, -b, k);
export const ssub = (a: number, b: number, k: number): number => smax(a, -b, k);

export const sphere = (c: V3, r: number): Field => (x, y, z) => Math.hypot(x - c[0], y - c[1], z - c[2]) - r;

/** An ellipsoid with its own axes: u along the first radius, v along the second, w = u x v. */
export function ellipsoid(c: V3, r: V3, u: V3 = [1, 0, 0], v: V3 = [0, 1, 0]): Field {
  const U = norm(u), W = norm(cross(U, v)), Vv = cross(W, U);
  return (x, y, z) => {
    const p: V3 = [x - c[0], y - c[1], z - c[2]];
    const a = dot(p, U) / r[0], b = dot(p, Vv) / r[1], d = dot(p, W) / r[2];
    const k0 = Math.hypot(a, b, d), k1 = Math.hypot(a / r[0], b / r[1], d / r[2]);
    return k1 === 0 ? -Math.min(r[0], r[1], r[2]) : (k0 * (k0 - 1)) / k1;
  };
}

/** A capsule whose radius changes from ra at a to rb at b. */
export function cone(a: V3, b: V3, ra: number, rb: number): Field {
  const ab = sub(b, a), l2 = dot(ab, ab);
  return (x, y, z) => {
    const ap: V3 = [x - a[0], y - a[1], z - a[2]];
    const t = Math.max(0, Math.min(1, dot(ap, ab) / l2));
    const q = sub(ap, mul(ab, t));
    return len(q) - (ra + (rb - ra) * t);
  };
}

export const union = (k: number, ...fs: Field[]): Field => (x, y, z) => {
  let d = fs[0]!(x, y, z);
  for (let i = 1; i < fs.length; i++) d = smin(d, fs[i]!(x, y, z), k);
  return d;
};

export function gradient(f: Field, p: V3, h = 0.05): V3 {
  return norm([
    f(p[0] + h, p[1], p[2]) - f(p[0] - h, p[1], p[2]),
    f(p[0], p[1] + h, p[2]) - f(p[0], p[1] - h, p[2]),
    f(p[0], p[1], p[2] + h) - f(p[0], p[1], p[2] - h),
  ]);
}

/** Moves a point onto the surface of f (a few Newton steps along the gradient), then out by offset. */
export function project(f: Field, p: V3, offset = 0): V3 {
  let q: V3 = [p[0], p[1], p[2]];
  for (let i = 0; i < 8; i++) { const d = f(q[0], q[1], q[2]); q = sub(q, mul(gradient(f, q), d)); }
  return add(q, mul(gradient(f, q), offset));
}

export type MeshData = { positions: Float32Array; normals: Float32Array; colors: Float32Array | null; indices: Uint32Array };

/**
 * Naive surface nets: one vertex per grid cell the surface passes through (the mean of its edge crossings, then
 * pulled onto the surface), one quad per crossed grid edge. Closed and watertight inside the box; normals from the
 * field's gradient, so lighting is smooth. `color` paints each vertex (e.g. the lobes of a lung).
 */
export function surfaceNets(f: Field, min: V3, max: V3, step: number, color?: (p: V3) => V3): MeshData {
  const nx = Math.ceil((max[0] - min[0]) / step) + 1, ny = Math.ceil((max[1] - min[1]) / step) + 1, nz = Math.ceil((max[2] - min[2]) / step) + 1;
  const v = new Float32Array(nx * ny * nz);
  const at = (i: number, j: number, k: number) => i + nx * (j + ny * k);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) v[at(i, j, k)] = f(min[0] + i * step, min[1] + j * step, min[2] + k * step);
  const cell = new Int32Array(nx * ny * nz).fill(-1);
  const pos: number[] = [], nor: number[] = [], col: number[] = [], idx: number[] = [];
  const corners: [number, number, number][] = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const edges: [number, number][] = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const c = corners.map(([a, b, d]) => v[at(i + a, j + b, k + d)]!);
    let inside = 0; for (const x of c) if (x < 0) inside++;
    if (inside === 0 || inside === 8) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [a, b] of edges) {
      const va = c[a]!, vb = c[b]!;
      if ((va < 0) === (vb < 0)) continue;
      const t = va / (va - vb), A = corners[a]!, B = corners[b]!;
      sx += A[0] + (B[0] - A[0]) * t; sy += A[1] + (B[1] - A[1]) * t; sz += A[2] + (B[2] - A[2]) * t; n++;
    }
    let p: V3 = [min[0] + (i + sx / n) * step, min[1] + (j + sy / n) * step, min[2] + (k + sz / n) * step];
    // One Newton step towards the true surface, kept inside the cell so the net stays tidy.
    const g = gradient(f, p, step * 0.25), d = f(p[0], p[1], p[2]);
    const q = sub(p, mul(g, Math.max(-step * 0.5, Math.min(step * 0.5, d))));
    p = q;
    cell[at(i, j, k)] = pos.length / 3;
    pos.push(p[0], p[1], p[2]);
    const nn = gradient(f, p, step * 0.25); nor.push(nn[0], nn[1], nn[2]);
    if (color) { const cc = color(p); col.push(cc[0], cc[1], cc[2]); }
  }
  const quad = (a: number, b: number, c: number, d: number, flip: boolean) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (flip) idx.push(a, c, b, a, d, c); else idx.push(a, b, c, a, c, d);
  };
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const v0 = v[at(i, j, k)]! < 0;
    if (i < nx - 1 && j > 0 && k > 0 && v0 !== (v[at(i + 1, j, k)]! < 0)) quad(cell[at(i, j - 1, k - 1)]!, cell[at(i, j, k - 1)]!, cell[at(i, j, k)]!, cell[at(i, j - 1, k)]!, !v0);
    if (j < ny - 1 && i > 0 && k > 0 && v0 !== (v[at(i, j + 1, k)]! < 0)) quad(cell[at(i - 1, j, k - 1)]!, cell[at(i - 1, j, k)]!, cell[at(i, j, k)]!, cell[at(i, j, k - 1)]!, !v0);
    if (k < nz - 1 && i > 0 && j > 0 && v0 !== (v[at(i, j, k + 1)]! < 0)) quad(cell[at(i - 1, j - 1, k)]!, cell[at(i, j - 1, k)]!, cell[at(i, j, k)]!, cell[at(i - 1, j, k)]!, !v0);
  }
  return { positions: new Float32Array(pos), normals: new Float32Array(nor), colors: color ? new Float32Array(col) : null, indices: new Uint32Array(idx) };
}

/** Outward-facing check: the summed signed volume of a closed mesh is positive when triangles wind counter-clockwise outside. */
export function signedVolume(m: MeshData): number {
  let vol = 0; const P = m.positions, I = m.indices;
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t]! * 3, b = I[t + 1]! * 3, c = I[t + 2]! * 3;
    vol += (P[a]! * (P[b + 1]! * P[c + 2]! - P[b + 2]! * P[c + 1]!) - P[a + 1]! * (P[b]! * P[c + 2]! - P[b + 2]! * P[c]!) + P[a + 2]! * (P[b]! * P[c + 1]! - P[b + 1]! * P[c]!)) / 6;
  }
  return vol;
}

/** Seeded random numbers so the model is the same on every device. */
export function rng(seed: number): () => number {
  let s = seed % 2147483647; if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
