import { add, cone, cross, dot, ellipsoid, gradient, len, lerp3, mul, norm, project, rng, smax, smin, ssub, sub, union, type Field, type V3 } from './sdf';

/*
 * D118 Bodyscope 3D outer model, anatomy in numbers (draft, not medically reviewed; no three.js here so it can be tested).
 * Centimetres, x = the person's left, y = up, z = forward; the origin sits in the chest near the heart.
 * Sources (data/content/body3d.v0.1.json): OpenStax Anatomy and Physiology 2e 7.5 (thoracic cage), 19.1 (heart),
 * 20.5 (aortic arch branches), 22.1-22.3 (airway, lungs, diaphragm). Sizes and positions are simplified averages.
 */

// ---------------------------------------------------------------- heart (outer surface)

/** Base (top, back, right) and apex (bottom, front, left): the long axis of the heart. */
export const HEART_BASE: V3 = [0.5, 2.5, 0];
export const HEART_APEX: V3 = [7.0, -6.6, 5.4];
const D = norm(sub(HEART_APEX, HEART_BASE));
/** Forward (anterior) direction square to the long axis, and the person's right square to both. */
const ANT = norm(sub([0, 0, 1], mul(D, dot([0, 0, 1], D))));
const RIGHT = norm(cross(D, ANT));
const along = (s: number): V3 => add(HEART_BASE, mul(D, s));

export type Chamber = 'lv' | 'rv' | 'ra' | 'la' | 'rau' | 'lau';
export const CHAMBERS: Record<Chamber, Field> = {
  lv: ellipsoid(add(along(6.3), [0.6, -0.2, -1.0]), [5.6, 3.3, 3.5], D, ANT),
  rv: ellipsoid(add(add(along(5.0), mul(ANT, 2.0)), mul(RIGHT, 1.2)), [4.6, 2.3, 3.8], D, ANT),
  ra: ellipsoid([-2.6, 2.6, 1.2], [2.5, 3.0, 2.6], [0.94, 0.2, -0.28], [0, 1, 0]),
  la: ellipsoid([1.4, 3.4, -2.4], [3.0, 2.1, 2.2]),
  rau: ellipsoid([-0.9, 5.0, 3.2], [1.8, 1.0, 1.2], [0.75, 0.25, 0.6], [0, 1, 0]),
  lau: ellipsoid([3.9, 4.4, 1.4], [1.9, 0.9, 1.1], [-0.42, 0.18, 0.89], [0, 1, 0]),
};
const ventricles = union(0.6, CHAMBERS.lv, CHAMBERS.rv);
const atria = union(0.8, CHAMBERS.ra, CHAMBERS.la);
export const heartField: Field = (x, y, z) => smin(smin(ventricles(x, y, z), atria(x, y, z), 0.9), smin(CHAMBERS.rau(x, y, z), CHAMBERS.lau(x, y, z), 0), 0.6);
export const HEART_BOX: [V3, V3] = [[-6.5, -9.5, -6], [11.5, 7.5, 10.5]];
/** The chamber a surface point belongs to (nearest chamber field). */
export function chamberAt(p: V3): Chamber {
  let best: Chamber = 'lv', d = Infinity;
  for (const k of Object.keys(CHAMBERS) as Chamber[]) { const v = CHAMBERS[k](p[0], p[1], p[2]); if (v < d) { d = v; best = k; } }
  return best;
}
export const CHAMBER_COLOUR: Record<Chamber, V3> = {
  lv: [0.6, 0.12, 0.14], rv: [0.72, 0.21, 0.23], ra: [0.5, 0.13, 0.22], la: [0.56, 0.15, 0.2], rau: [0.62, 0.2, 0.28], lau: [0.66, 0.22, 0.28],
};

/** Outermost surface point of f on a ray from o along dir (null if the ray never leaves the shape). */
function rim(f: Field, o: V3, dir: V3, reach = 10): V3 | null {
  let last: V3 | null = null, prev = f(o[0], o[1], o[2]);
  for (let r = 0.1; r <= reach; r += 0.1) {
    const p = add(o, mul(dir, r)), v = f(p[0], p[1], p[2]);
    if (prev < 0 && v >= 0) last = add(o, mul(dir, r - 0.1 * (v / (v - prev || 1))));
    prev = v;
  }
  return last;
}

/**
 * Coronary arteries lie in the grooves between chambers (OpenStax 19.1): the anterior interventricular artery between
 * the two ventricles on the front, the right coronary and the circumflex in the groove between atria and ventricles.
 * Each groove is found on the model itself: the surface point where the two neighbouring shapes are equally near.
 */
function groove(fa: Field, fb: Field, samples: { o: V3; dirs: V3[] }[]): V3[] {
  const out: V3[] = [];
  for (const { o, dirs } of samples) {
    let best: V3 | null = null, score = Infinity;
    for (const dir of dirs) {
      const p = rim(heartField, o, dir); if (!p) continue;
      const s = Math.abs(fa(p[0], p[1], p[2]) - fb(p[0], p[1], p[2]));
      if (s < score) { score = s; best = p; }
    }
    if (best) out.push(best);
  }
  return smooth(out, 2);
}
const fan = (from: number, to: number, n: number, a: V3, b: V3): V3[] => Array.from({ length: n }, (_, i) => { const t = from + (to - from) * i / (n - 1); return norm(add(mul(a, Math.cos(t)), mul(b, Math.sin(t)))); });
function smooth(p: V3[], passes: number): V3[] {
  let q = p;
  for (let k = 0; k < passes; k++) q = q.map((v, i) => (i === 0 || i === q.length - 1 ? v : mul(add(add(q[i - 1]!, q[i + 1]!), mul(v, 2)), 0.25)));
  return q;
}
const deg = Math.PI / 180;
/** Anterior interventricular groove: along the long axis on the front, between the left and the right ventricle. */
export function ladPath(): V3[] {
  const samples = Array.from({ length: 14 }, (_, i) => ({ o: along(2.2 + i * 0.72), dirs: fan(-75 * deg, 30 * deg, 36, ANT, RIGHT) }));
  return groove(CHAMBERS.lv, CHAMBERS.rv, samples);
}
/** Atrioventricular (coronary) groove around the base: the right part carries the right coronary, the left the circumflex. */
export function avGroove(side: 'right' | 'left'): V3[] {
  const o = along(1.2), axis = D;
  const angles = side === 'right' ? Array.from({ length: 14 }, (_, i) => (15 + i * 13) * deg) : Array.from({ length: 11 }, (_, i) => -(25 + i * 13) * deg);
  const atrial: Field = (x, y, z) => Math.min(atria(x, y, z), CHAMBERS.rau(x, y, z), CHAMBERS.lau(x, y, z));
  const out: V3[] = [];
  for (const a of angles) {
    const dir = norm(add(mul(ANT, Math.cos(a)), mul(RIGHT, Math.sin(a))));
    let best: V3 | null = null, score = Infinity;
    for (let s = -1.6; s <= 2.6; s += 0.2) {
      const p = rim(heartField, add(o, mul(axis, s)), dir); if (!p) continue;
      const v = Math.abs(atrial(p[0], p[1], p[2]) - ventricles(p[0], p[1], p[2]));
      if (v < score) { score = v; best = p; }
    }
    if (best) out.push(best);
  }
  return smooth(out, 2);
}

// ---------------------------------------------------------------- great vessels (tubes along centre lines)

export type VesselKind = 'artery' | 'vein' | 'pulmonaryArtery' | 'pulmonaryVein';
export type Vessel = { id: string; spot: string; kind: VesselKind; pts: V3[]; r: [number, number] };
export const VESSELS: Vessel[] = [
  { id: 'aorta', spot: 'aorta', kind: 'artery', r: [1.35, 1.1], pts: [[0.6, 3.0, 1.0], [0.5, 6.0, 1.6], [0.6, 9.4, 1.7], [1.5, 12.0, 0.8], [3.0, 12.6, -1.6], [3.8, 11.0, -4.2], [3.5, 7.5, -5.6], [2.8, 0, -6.3], [2.0, -10, -6.3], [1.4, -20, -5.8]] },
  { id: 'brachiocephalic', spot: 'arch-branches', kind: 'artery', r: [0.65, 0.6], pts: [[1.0, 12.0, 0.9], [-0.6, 14.5, 1.3], [-1.9, 16.6, 1.3]] },
  { id: 'r-carotid', spot: 'arch-branches', kind: 'artery', r: [0.45, 0.42], pts: [[-1.9, 16.4, 1.3], [-2.3, 20, 0.9], [-2.4, 27, 0.8]] },
  { id: 'r-subclavian', spot: 'arch-branches', kind: 'artery', r: [0.48, 0.42], pts: [[-1.9, 16.4, 1.2], [-4.5, 18.2, 0.4], [-8, 18.8, -0.6], [-13, 18.4, -1.2]] },
  { id: 'l-carotid', spot: 'arch-branches', kind: 'artery', r: [0.45, 0.42], pts: [[2.2, 12.6, -0.4], [2.5, 18, 0.3], [2.5, 27, 0.8]] },
  { id: 'l-subclavian', spot: 'arch-branches', kind: 'artery', r: [0.5, 0.42], pts: [[3.4, 12.3, -2.4], [4.3, 16.0, -2.0], [7.5, 18.6, -1.0], [13, 18.4, -1.2]] },
  { id: 'pulmonary-trunk', spot: 'pulmonary-trunk', kind: 'pulmonaryArtery', r: [1.2, 1.15], pts: [[1.4, 2.8, 3.6], [2.3, 5.0, 3.8], [2.9, 6.6, 2.8], [2.8, 7.8, 0.6]] },
  { id: 'rpa', spot: 'pulmonary-trunk', kind: 'pulmonaryArtery', r: [0.85, 0.75], pts: [[2.8, 7.8, 0.6], [1.6, 7.9, -0.5], [0.6, 7.6, -0.8], [-2.0, 7.3, -1.2], [-4.6, 6.4, -1.0], [-6.2, 6.0, -1.0]] },
  { id: 'lpa', spot: 'pulmonary-trunk', kind: 'pulmonaryArtery', r: [0.85, 0.75], pts: [[2.8, 7.8, 0.6], [3.8, 8.8, -0.6], [5.4, 9.0, -2.0], [6.8, 8.6, -3.0]] },
  { id: 'svc', spot: 'svc', kind: 'vein', r: [1.0, 1.0], pts: [[-2.2, 16.4, 1.1], [-2.7, 12, 1.1], [-2.8, 8, 0.9], [-2.8, 4.4, 0.9]] },
  { id: 'l-brachiocephalic-vein', spot: 'svc', kind: 'vein', r: [0.6, 0.65], pts: [[6.5, 17.6, 0.4], [4.0, 16.6, 2.0], [1.0, 16.0, 2.6], [-2.2, 16.4, 1.2]] },
  { id: 'r-brachiocephalic-vein', spot: 'svc', kind: 'vein', r: [0.65, 0.7], pts: [[-6.5, 17.8, 0.0], [-4.2, 17.2, 0.8], [-2.2, 16.4, 1.1]] },
  { id: 'ivc', spot: 'ivc', kind: 'vein', r: [1.1, 1.1], pts: [[-2.0, -14, -1.6], [-2.2, -8, -1.0], [-2.4, -3, -0.4], [-2.6, 0.4, 0.4]] },
  { id: 'pv-rs', spot: 'pulmonary-veins', kind: 'pulmonaryVein', r: [0.6, 0.6], pts: [[-5.6, 5.0, -0.6], [-3.4, 4.4, -1.0], [-0.6, 3.6, -2.0]] },
  { id: 'pv-ri', spot: 'pulmonary-veins', kind: 'pulmonaryVein', r: [0.6, 0.6], pts: [[-5.4, 1.8, -0.8], [-3.0, 2.0, -1.4], [-0.4, 2.8, -2.4]] },
  { id: 'pv-ls', spot: 'pulmonary-veins', kind: 'pulmonaryVein', r: [0.6, 0.6], pts: [[6.0, 5.4, -1.0], [4.2, 4.6, -1.4], [2.6, 4.0, -2.0]] },
  { id: 'pv-li', spot: 'pulmonary-veins', kind: 'pulmonaryVein', r: [0.6, 0.6], pts: [[5.6, 2.4, -1.8], [4.0, 2.8, -2.2], [2.4, 3.2, -2.6]] },
];
export const VESSEL_COLOUR: Record<VesselKind, string> = { artery: '#c8323e', vein: '#3a5cc4', pulmonaryArtery: '#4f72d6', pulmonaryVein: '#d9454f' };

/** Distance to a polyline tube (used to keep the lungs clear of the big vessels). */
export function tubeField(pts: V3[], r: number): Field {
  const segs = pts.slice(1).map((p, i) => cone(pts[i]!, p, r, r));
  return union(0, ...segs);
}

// ---------------------------------------------------------------- airway

export const TRACHEA_TOP: V3 = [0, 22.0, -1.7];
export const CARINA: V3 = [0, 8.8, -2.6];
export const TRACHEA_R = 1.0;
/** C-shaped rings: open at the back where the trachea touches the oesophagus (OpenStax 22.1). */
export const RINGS = Array.from({ length: 18 }, (_, i) => lerp3(TRACHEA_TOP, CARINA, (i + 0.5) / 18.6));
export const OESOPHAGUS: V3[] = [[0, 25.0, -3.8], [0.2, 20, -4.1], [0.5, 12, -4.6], [0.8, 4, -4.9], [1.4, -6, -4.4], [2.4, -14, -2.2]];
export const PHARYNX: V3[] = [[0, 38.0, 0.8], [0, 36.6, -1.6], [0, 33, -2.8], [0, 28.5, -3.0], [0, 25.2, -3.4]];

export type Airway = { id: string; spot: string; pts: V3[]; r: [number, number] };
/** Main and lobar bronchi: the right main is short, wide and steep; the left main longer and more slanted, under the aortic arch. */
export const BRONCHI: Airway[] = [
  { id: 'r-main', spot: 'right-main', r: [0.78, 0.72], pts: [CARINA, [-0.9, 7.6, -2.65], [-1.7, 6.3, -2.7]] },
  { id: 'r-upper', spot: 'bronchial-tree', r: [0.5, 0.45], pts: [[-1.6, 6.5, -2.7], [-3.0, 7.1, -2.6], [-4.6, 7.6, -2.4]] },
  { id: 'r-intermediate', spot: 'bronchial-tree', r: [0.62, 0.58], pts: [[-1.7, 6.3, -2.7], [-2.4, 5.0, -2.6], [-3.0, 3.6, -2.4]] },
  { id: 'r-middle', spot: 'bronchial-tree', r: [0.42, 0.38], pts: [[-3.0, 3.8, -2.3], [-4.0, 3.2, -1.0], [-5.0, 2.6, 0.4]] },
  { id: 'r-lower', spot: 'bronchial-tree', r: [0.55, 0.5], pts: [[-3.0, 3.6, -2.4], [-3.6, 1.9, -3.0], [-4.2, 0.2, -3.6]] },
  { id: 'l-main', spot: 'left-main', r: [0.7, 0.62], pts: [CARINA, [1.6, 8.1, -2.8], [3.2, 7.0, -3.0], [4.6, 6.0, -3.2]] },
  { id: 'l-upper', spot: 'bronchial-tree', r: [0.5, 0.45], pts: [[4.6, 6.0, -3.2], [5.5, 6.6, -2.5], [6.4, 7.0, -1.8]] },
  { id: 'l-lingula', spot: 'bronchial-tree', r: [0.38, 0.34], pts: [[5.6, 6.5, -2.4], [6.4, 5.0, -0.6], [7.0, 3.6, 1.0]] },
  { id: 'l-lower', spot: 'bronchial-tree', r: [0.52, 0.48], pts: [[4.6, 6.0, -3.2], [5.4, 4.2, -3.6], [6.2, 2.4, -4.0]] },
];

// ---------------------------------------------------------------- diaphragm and lungs

/** Height of the diaphragm under (x, z): two domes and the central tendon where the heart rests (OpenStax 22.3). */
export function diaphragmY(x: number, z: number): number {
  const r = -6.5 - 0.055 * ((x + 7) ** 2 + 1.3 * (z + 0.5) ** 2);
  const l = -7.5 - 0.055 * ((x - 7) ** 2 + 1.3 * (z + 0.5) ** 2);
  const c = -8.2 - 0.02 * ((x - 1.5) ** 2 + (z - 1) ** 2);
  return smax(smax(r, l, 2), c, 2);
}
export const DIAPHRAGM_EDGE = { x: 14.5, zFront: 9, zBack: 10 };

/** A boxy, apex-tapered lung shape (superellipse across, ellipse up and down). */
function lungShape(c: V3, r: V3): Field {
  return (x, y, z) => {
    const ty = (y - c[1]) / r[1], taper = 1 - 0.5 * Math.max(0, Math.min(1, (ty - 0.25) / 0.75)) ** 1.4;
    const ax = Math.abs((x - c[0]) / (r[0] * taper)), az = Math.abs((z - c[2]) / (r[2] * taper)), n = 3;
    const q = Math.pow(ax ** n + az ** n, 1 / n);
    return (Math.hypot(q, ty) - 1) * Math.min(r[0], r[2]) * taper;
  };
}
const aortaClear = tubeField(VESSELS[0]!.pts, 2.0);
const svcClear = tubeField(VESSELS[9]!.pts, 1.7);
const notch = ellipsoid([5.0, -3.6, 6.6], [3.2, 4.6, 3.3]);
export const LUNG: Record<'right' | 'left', Field> = {
  right: (x, y, z) => {
    let f = lungShape([-8.3, 2.4, -1.2], [6.3, 15.2, 8.8])(x, y, z);
    f = smax(f, x + 2.2, 1.6);
    f = smax(f, diaphragmY(x, z) + 0.4 - y, 1.0);
    f = ssub(f, heartField(x, y, z) - 0.7, 1.2);
    f = ssub(f, svcClear(x, y, z), 0.8);
    return f;
  },
  left: (x, y, z) => {
    let f = lungShape([8.0, 2.6, -1.2], [6.0, 15.0, 8.6])(x, y, z);
    f = smax(f, 2.4 - x, 1.6);
    f = smax(f, diaphragmY(x, z) + 0.4 - y, 1.0);
    f = ssub(f, heartField(x, y, z) - 1.1, 1.4);
    f = ssub(f, notch(x, y, z), 1.2);
    f = ssub(f, aortaClear(x, y, z), 0.8);
    return f;
  },
};
export const LUNG_BOX: Record<'right' | 'left', [V3, V3]> = { right: [[-15.5, -16, -11.5], [-1.5, 18.5, 8.5]], left: [[1.5, -16.5, -11.5], [15, 18.5, 8.5]] };

/**
 * Lobes (OpenStax 22.2): the oblique fissure runs from high at the back to low at the front in both lungs; the right
 * lung also has the horizontal fissure, which separates the middle lobe at the front.
 */
const OBLIQUE_N: V3 = norm([0, 14, 19]);
export const HORIZONTAL_Y = 4.0;
export type Lobe = 'rUpper' | 'rMiddle' | 'rLower' | 'lUpper' | 'lLower';
export const oblique = (side: 'right' | 'left', p: V3): number => dot(OBLIQUE_N, sub(p, [0, side === 'right' ? 1.0 : 1.6, -1.0]));
export function lobeAt(side: 'right' | 'left', p: V3): Lobe {
  if (oblique(side, p) < 0) return side === 'right' ? 'rLower' : 'lLower';
  if (side === 'left') return 'lUpper';
  return p[1] < HORIZONTAL_Y ? 'rMiddle' : 'rUpper';
}
export const LOBE_COLOUR: Record<Lobe, V3> = {
  rUpper: [0.93, 0.6, 0.64], rMiddle: [0.97, 0.75, 0.6], rLower: [0.82, 0.52, 0.66], lUpper: [0.93, 0.6, 0.64], lLower: [0.82, 0.52, 0.66],
};
/** Vertex colour of a lung surface: the lobe, darker along the fissures so they read as lines. */
export function lungColour(side: 'right' | 'left', p: V3): V3 {
  const lobe = lobeAt(side, p), c = LOBE_COLOUR[lobe];
  const o = Math.abs(oblique(side, p)), h = side === 'right' && oblique(side, p) > 0 ? Math.abs(p[1] - HORIZONTAL_Y) : 99;
  return Math.min(o, h) < 0.45 ? mul(c, 0.5) : c;
}

export type Segment = { a: V3; b: V3; ra: number; rb: number };
/**
 * The smaller bronchi: each lobar bronchus keeps splitting in two towards the parts of its lobe it serves, narrowing at
 * each split (seeded, the same on every device). Only the first several generations are drawn.
 */
export function bronchialTree(seed = 118): Segment[] {
  const rand = rng(seed), out: Segment[] = [];
  const lobes: { side: 'right' | 'left'; lobe: Lobe; from: Airway; keep?: (p: V3) => boolean; n: number }[] = [
    { side: 'right', lobe: 'rUpper', from: BRONCHI[1]!, n: 72 }, { side: 'right', lobe: 'rMiddle', from: BRONCHI[3]!, n: 40 }, { side: 'right', lobe: 'rLower', from: BRONCHI[4]!, n: 80 },
    { side: 'left', lobe: 'lUpper', from: BRONCHI[6]!, keep: p => p[1] >= 3.0, n: 64 }, { side: 'left', lobe: 'lUpper', from: BRONCHI[7]!, keep: p => p[1] < 3.0, n: 36 },
    { side: 'left', lobe: 'lLower', from: BRONCHI[8]!, n: 76 },
  ];
  for (const L of lobes) {
    const [lo, hi] = LUNG_BOX[L.side], f = LUNG[L.side], targets: V3[] = [];
    for (let tries = 0; targets.length < L.n && tries < 40000; tries++) {
      const p: V3 = [lo[0] + rand() * (hi[0] - lo[0]), lo[1] + rand() * (hi[1] - lo[1]), lo[2] + rand() * (hi[2] - lo[2])];
      if (f(p[0], p[1], p[2]) < -1.2 && lobeAt(L.side, p) === L.lobe && (!L.keep || L.keep(p))) targets.push(p);
    }
    const start = L.from.pts[L.from.pts.length - 1]!;
    grow(start, targets, L.from.r[1], 0);
  }
  function grow(start: V3, targets: V3[], r: number, depth: number): void {
    if (targets.length < 2 || depth >= 7 || r < 0.07) return;
    const centre = mul(targets.reduce((s, p) => add(s, p), [0, 0, 0] as V3), 1 / targets.length);
    let a = targets[0]!, b = targets[0]!;
    for (const p of targets) if (len(sub(p, centre)) > len(sub(a, centre))) a = p;
    for (const p of targets) if (len(sub(p, a)) > len(sub(b, a))) b = p;
    const groups: V3[][] = [[], []];
    for (const p of targets) groups[len(sub(p, a)) <= len(sub(p, b)) ? 0 : 1]!.push(p);
    for (const g of groups) {
      if (!g.length) continue;
      const c = mul(g.reduce((s, p) => add(s, p), [0, 0, 0] as V3), 1 / g.length);
      const end = add(start, mul(sub(c, start), depth < 2 ? 0.42 : 0.5));
      // Murray's law for branching tubes: each daughter of two is about 0.79 of the parent radius.
      const child = r * 0.79;
      out.push({ a: start, b: end, ra: r, rb: child });
      grow(end, g, child, depth + 1);
    }
  }
  return out;
}

// ---------------------------------------------------------------- skeleton of the chest and the spine

/** Spine centre line from the first neck vertebra to the sacrum (front of the bodies faces +z). */
export const SPINE: V3[] = [[0, 33.5, -3.4], [0, 27, -4.2], [0, 21, -5.6], [0, 15, -7.6], [0, 8, -9.8], [0, 0, -10.0], [0, -9, -8.8], [0, -15, -7.0], [0, -20, -6.2], [0, -25.5, -6.8], [0, -30, -9.0]];
export function spineAt(y: number): V3 {
  for (let i = 1; i < SPINE.length; i++) {
    const a = SPINE[i - 1]!, b = SPINE[i]!;
    if (y <= a[1] && y >= b[1]) return lerp3(a, b, (a[1] - y) / (a[1] - b[1]));
  }
  return y > SPINE[0]![1] ? SPINE[0]! : SPINE[SPINE.length - 1]!;
}
/** Vertebrae: seven neck, twelve chest, five lower back (heights and widths grow downwards). */
export const VERTEBRAE = (() => {
  const out: { y: number; r: number; h: number; region: 'cervical' | 'thoracic' | 'lumbar' }[] = [];
  const run = (n: number, top: number, bottom: number, r0: number, r1: number, region: 'cervical' | 'thoracic' | 'lumbar') => {
    for (let i = 0; i < n; i++) { const t = i / (n - 1), step = (top - bottom) / n; out.push({ y: top - step * (i + 0.5), r: r0 + (r1 - r0) * t, h: step * 0.74, region }); }
  };
  run(7, 33.6, 20.6, 0.9, 1.15, 'cervical'); run(12, 20.4, -9.6, 1.25, 1.8, 'thoracic'); run(5, -9.8, -27.0, 2.0, 2.3, 'lumbar');
  return out;
})();
export const thoracicY = (k: number): number => VERTEBRAE[6 + k]!.y;

export type Rib = { k: number; side: 1 | -1; bone: V3[]; cartilage: V3[] };
/** Ribs one to twelve on both sides: true ribs reach the breastbone by cartilage, eleven and twelve float (OpenStax 7.5). */
export function ribs(): Rib[] {
  const ax = [6.4, 9.6, 11.8, 13.2, 14.2, 15.0, 15.4, 15.6, 15.5, 15.2, 13.6, 11.0];
  const az = [6.8, 8.2, 9.2, 10.0, 10.4, 10.6, 10.6, 10.5, 10.3, 10.1, 9.6, 9.0];
  const drop = [5.0, 6.0, 6.6, 7.2, 7.4, 8.0, 8.6, 8.8, 8.6, 8.4, 5.0, 4.0];
  const out: Rib[] = [];
  for (let k = 1; k <= 12; k++) for (const side of [1, -1] as const) {
    const i = k - 1, head = thoracicY(k), sp = spineAt(head), zc = sp[2] + az[i]! - 2.6; // the back of each rib curves behind the vertebral body
    const at = (phi: number, lift = 0): V3 => {
      const t = Math.max(0, Math.min(1, (phi / Math.PI - 0.08) / 0.92));
      const y = head + 0.6 * Math.sin(Math.min(phi, 1.2) * 1.3) - drop[i]! * (t * t * (3 - 2 * t)) + lift;
      return [side * (1.4 + (ax[i]! - 1.4) * Math.sin(phi)), y, zc - az[i]! * Math.cos(phi)];
    };
    const endBone = k <= 10 ? 2.25 : k === 11 ? 1.9 : 1.55;
    const bone = Array.from({ length: 24 }, (_, j) => at(0.1 + (endBone - 0.1) * j / 23));
    let cartilage: V3[] = [];
    if (k <= 10) {
      const end = Math.PI - Math.asin(Math.min(0.99, ((k <= 7 ? 2.0 : 3.6) - 1.4) / (ax[i]! - 1.4)));
      cartilage = Array.from({ length: 8 }, (_, j) => at(endBone + (end - endBone) * j / 7, k <= 7 ? 0 : (k - 7) * 1.2 * (j / 7)));
    }
    out.push({ k, side, bone, cartilage });
  }
  return out;
}
/** Breastbone outline (front view), from the top of the handle to the tip of the xiphoid. */
export const STERNUM: V3[] = [[-2.6, 14.6, 6.6], [2.6, 14.6, 6.6], [1.6, 11.0, 7.6], [1.7, -3.2, 9.2], [0.8, -6.4, 9.0], [-0.8, -6.4, 9.0], [-1.7, -3.2, 9.2], [-1.6, 11.0, 7.6]];
export const CLAVICLE = (s: 1 | -1): V3[] => [[s * 2.0, 15.2, 6.4], [s * 5, 16.4, 6.9], [s * 9, 17.4, 5.6], [s * 13, 18.6, 2.6], [s * 16, 19.6, -0.6]];

// ---------------------------------------------------------------- larynx and nose

export const THYROID_LAMINA = (s: 1 | -1): V3[] => [[0, 24.0, 0.5], [0, 28.0, 1.3], [s * 0.9, 28.8, 0.6], [s * 2.1, 28.6, -2.2], [s * 2.1, 23.6, -2.4], [s * 1.0, 23.6, -0.6]];
export const EPIGLOTTIS: V3[] = [[0, 27.4, -0.9], [0.7, 29.0, -1.2], [1.0, 30.6, -1.9], [0, 31.4, -2.4], [-1.0, 30.6, -1.9], [-0.7, 29.0, -1.2]];
export const HYOID: V3[] = [[-2.2, 30.6, -1.8], [-1.6, 30.4, 0.4], [0, 30.3, 1.2], [1.6, 30.4, 0.4], [2.2, 30.6, -1.8]];
export const CRICOID = { y: 22.7, r: 1.15, back: [[-1.0, 22.4, -2.6], [1.0, 22.4, -2.6], [1.0, 24.4, -2.6], [-1.0, 24.4, -2.6]] as V3[] };
export const LARYNX_LUMEN: V3[] = [[0, 29.0, -1.9], [0, 26, -1.5], [0, 22.0, -1.7]];
/** Nasal cavity: a tall narrow room behind the nostrils, split by the septum; three shelves (conchae) on each outer wall. */
export const NASAL: Field = (x, y, z) => {
  const qx = Math.abs(x) - 1.5, qy = Math.abs(y - 37.2) - 2.5, qz = Math.abs(z - 4.8) - 4.4;
  const box = Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - 0.5;
  return smin(box, smin(cone([0.8, 34.7, 9.5], [0.9, 35.6, 7.8], 0.55, 0.8)(x, y, z), cone([-0.8, 34.7, 9.5], [-0.9, 35.6, 7.8], 0.55, 0.8)(x, y, z), 0), 0.6);
};
export const CONCHAE: { name: 'inferior' | 'middle' | 'superior'; c: V3; r: V3 }[] = [
  { name: 'inferior', c: [1.25, 35.7, 4.6], r: [0.35, 0.5, 3.4] }, { name: 'middle', c: [1.25, 37.1, 4.0], r: [0.35, 0.42, 2.8] }, { name: 'superior', c: [1.15, 38.5, 3.0], r: [0.3, 0.32, 1.6] },
];

// ---------------------------------------------------------------- the body outline (skin)

export const BODY: Field = (() => {
  const s = [1, -1] as const;
  const head = union(2.6,
    ellipsoid([0, 37.6, 0.6], [7.6, 10.6, 9.6]), cone([0, 39.6, 9.4], [0, 35.4, 10.9], 0.9, 1.3), ellipsoid([0, 30.6, 4.0], [5.4, 3.6, 5.2]),
    cone([0, 22.0, -0.6], [0, 31, -0.4], 5.6, 5.0));
  const torso = union(5,
    (x, y, z) => { const ty = (y - 6.5) / 16.5, ax = Math.abs(x / 17.2), az = Math.abs(z / 11.6); return (Math.hypot(Math.pow(ax ** 2.5 + az ** 2.5, 1 / 2.5), ty) - 1) * 11.6; },
    ellipsoid([0, -15, 0.4], [15.4, 15, 11]), ellipsoid([0, -29, -0.8], [17, 9.5, 11]), cone([-17.5, 18.4, -0.8], [17.5, 18.4, -0.8], 6.0, 6.0));
  const limbs = s.flatMap(k => [
    union(2.2, cone([k * 19.6, 16.6, -0.8], [k * 22.8, -11, -1.6], 4.6, 3.8), cone([k * 22.8, -11, -1.6], [k * 25, -35, 0.5], 3.7, 2.6), ellipsoid([k * 25.6, -43, 1.2], [1.5, 5.4, 3.2])),
    union(2.5, cone([k * 9, -33, 0], [k * 9.6, -77, 0.6], 8.4, 5.4), cone([k * 9.6, -77, 0.6], [k * 9.8, -115, -1.4], 5.4, 3.2), ellipsoid([k * 9.8, -119.6, 3.6], [4.2, 2.6, 11])),
  ]);
  return (x, y, z) => { let d = smin(head(x, y, z), torso(x, y, z), 3.5); for (const l of limbs) d = smin(d, l(x, y, z), 3.0); return d; };
})();
export const BODY_BOX: [V3, V3] = [[-31, -124, -14.5], [31, 50, 16.5]];

// ---------------------------------------------------------------- hotspot positions

/** Where each hotspot marker sits (on the surface of its structure); ids match data/content/body3d.v0.1.json. */
export function anchors(): Record<string, V3> {
  const onHeart = (p: V3) => project(heartField, p, 0.3);
  const at = (pts: V3[], t: number): V3 => { const n = pts.length - 1, i = Math.min(n - 1, Math.floor(t * n)); return lerp3(pts[i]!, pts[i + 1]!, t * n - i); };
  const lad = ladPath(), rca = avGroove('right'), lcx = avGroove('left');
  const onLung = (side: 'right' | 'left', p: V3) => project(LUNG[side], p, 0.2);
  return {
    heart: onHeart([3.0, -1.0, 9.0]),
    ra: onHeart([-6.5, 2.4, 2.4]), rv: onHeart([1.4, -1.6, 9.0]), la: onHeart([1.6, 4.6, -7.0]), lv: onHeart([9.5, -2.6, 0.6]),
    apex: onHeart([9.4, -8.6, 7.4]), auricle: project(CHAMBERS.rau, [-1.6, 6.2, 5.0], 0.25),
    aorta: add(at(VESSELS[0]!.pts, 0.38), [0, 1.4, 0]), 'arch-branches': [2.4, 16.4, -0.1],
    'pulmonary-trunk': add(at(VESSELS[6]!.pts, 0.5), [0.4, 0, 1.2]), svc: add(at(VESSELS[9]!.pts, 0.3), [-1.0, 0, 0.3]), ivc: add(at(VESSELS[12]!.pts, 0.45), [-1.1, 0, 0]),
    'pulmonary-veins': add(VESSELS[15]!.pts[1]!, [0, 0.8, 0.3]),
    rca: add(rca[Math.floor(rca.length * 0.35)]!, [0, 0, 0.3]), lad: add(lad[Math.floor(lad.length * 0.45)]!, [0, 0, 0.3]), lcx: add(lcx[Math.floor(lcx.length * 0.4)]!, [0.3, 0, 0]),
    nose: [0, 36.6, 8.4], conchae: [1.7, 35.8, 5.2], pharynx: [0, 33, -1.2], epiglottis: [0, 31.2, -2.0], 'thyroid-cartilage': [0, 27.4, 1.6], cricoid: [0, 22.7, 0.0],
    trachea: [0, 18, -0.6], rings: [0.9, 14, -1.2], oesophagus: [0.6, 16, -5.4], carina: add(CARINA, [0, -0.2, 1.0]),
    'right-main': [-0.9, 7.6, -1.75], 'left-main': [3.2, 7.0, -2.2], 'bronchial-tree': [-5.6, 1.0, -3.0],
    'right-lung': onLung('right', [-16, 4, 2]), 'left-lung': onLung('left', [16, 2, 2]), 'airway-locked': onLung('right', [-16, 4, 2]), hyoid: [0, 30.3, 1.6],
    fissures: onLung('right', [-14, 1.2, 6]), 'lung-vessels': [-9.0, 3.0, -2.0], hilum: [-6.4, 5.0, -1.4], 'lung-apex': onLung('right', [-6, 19, -1]), 'cardiac-notch': onLung('left', [5.6, -2.2, 9]),
    diaphragm: [-7, diaphragmY(-7, 3) + 0.3, 3], ribs: [-12.6, 2, 5.6], sternum: [0, 4, 10.4], spine: [0, -2, -8.0],
  };
}
export const gradientAt = gradient;
