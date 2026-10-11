import content from '../../data/content/heart-interior.v0.1.json';
import type { Door, Prop, PropKind, Room, Target } from './rooms';
import { FACE, type Band, type Cord, type Feature, type Lane, type Organ, type OrganKind, type Signal, type TextureKind, type Valve } from './organ-types';
import { blend, box, capsule, circle, cone, cut, ellipse, nothing, union, wobble, type Sdf } from './sdf';
import { TILE, type Dir, type Point, type Rect, type RoomId } from './types';

/*
 * The Bodyscope heart (draft, not medically reviewed). Each room is one chamber or vessel seen as a frontal
 * section: screen-left is the person's right, up is towards the head, and the floor is the inner surface of
 * the chamber's back wall. Rooms connect only where blood really goes (valves and vessels), and the order is
 * the real one: right atrium -> tricuspid -> right ventricle -> pulmonary valve -> lungs -> pulmonary veins
 * -> left atrium -> mitral -> left ventricle -> aortic valve -> aorta -> (body) -> venae cavae -> right atrium.
 * Shapes are approximate (about 2 mm per tile); see data/content/heart-interior.v0.1.json for simplifications.
 */

type Spec = {
  id: RoomId; kind: OrganKind; cols: number; rows: number; floor: Sdf; holes?: Sdf;
  wall: (x: number, y: number) => number; texture: (x: number, y: number) => TextureKind | { kind: TextureKind; angle: number };
  squeeze: Organ['squeeze']; valves: Valve[]; lanes: Lane[]; cords?: Cord[]; bands?: Band[]; signals?: Signal[]; features?: Feature[];
  alveoli?: { x: number; y: number; r: number }[];
  props: Prop[]; targets: Target[]; doors: Door[]; spawn: Point; spawnFacing: Dir;
};

const names = content.discoveries as Record<string, { name: string; room: string }>;
const rt = content.rooms as Record<string, { title: string; card: string | null }>;

function solidFor(kind: PropKind, x: number, y: number): Rect | null {
  const r = (w: number, h: number): Rect => ({ x: x - w / 2, y: y - h, w, h });
  if (kind === 'papillary') return r(16, 7);
  if (kind === 'robot') return r(12, 5);
  return null;
}
const P = (kind: PropKind, x: number, y: number, v = 0): Prop => ({ kind, x, y, v, solid: solidFor(kind, x, y) });
const hx = (id: string, x: number, y: number, r = 20): Target => ({ id, label: names[id]?.name ?? id, verb: '살펴보기', x, y, r, npc: null });
const obs = (id: string, label: string, x: number, y: number, r = 22): Target => ({ id, label, verb: '관찰', x, y, r, npc: null });
const pad = (x: number, y: number): Target => ({ id: 'return-pad', label: '귀환 장치', verb: '귀환', x, y: y + 6, r: 18, npc: null });
const lane = (pts: [number, number][], when: Lane['when'], blood: Lane['blood'], valve: string | null, n: number, speed: number, width: number): Lane =>
  ({ pts: pts.map(([x, y]) => ({ x, y })), when, blood, n, speed, width, valve });
const pts = (a: [number, number][]): Point[] => a.map(([x, y]) => ({ x, y }));
const sig = (kind: Signal['kind'], p: [number, number][], from: number, to: number, r = 0): Signal => ({ kind, pts: pts(p), from, to, r });

function build(s: Spec): Room {
  const holes = s.holes ?? nothing;
  const tex = (x: number, y: number) => { const t = s.texture(x, y); return typeof t === 'string' ? { kind: t, angle: 0 } : t; };
  const walk = (x: number, y: number) => s.floor(x, y) < -1.5 && s.floor(x, y - FACE) < 0 && holes(x, y) > 2.5;
  const organ: Organ = {
    kind: s.kind, floor: s.floor, holes, wall: s.wall, texture: tex, walk, squeeze: s.squeeze,
    valves: s.valves, lanes: s.lanes, cords: s.cords ?? [], bands: s.bands ?? [], signals: s.signals ?? [], features: s.features ?? [], alveoli: s.alveoli ?? [],
  };
  const tiles = new Uint8Array(s.cols * s.rows);
  for (let ty = 0; ty < s.rows; ty++) for (let tx = 0; tx < s.cols; tx++) tiles[ty * s.cols + tx] = walk(tx * TILE + 8, ty * TILE + 8) ? 16 : 0;
  const solids: Rect[] = [];
  for (const p of s.props) if (p.solid) solids.push(p.solid);
  // Block reporter backtracking, not valve opening: inflow valves still open during filling.
  for (const v of s.valves) if (!v.pass) solids.push(v.toward === 1 ? { x: v.x - 4, y: v.y - 14, w: v.w + 8, h: 46 } : { x: v.x - 4, y: v.y - 32, w: v.w + 8, h: 46 });
  return {
    id: s.id, title: rt[s.id]?.title ?? s.id, cols: s.cols, rows: s.rows, tiles, buildings: [], props: s.props, npcs: [], targets: s.targets,
    doors: s.doors, solids, markings: [], interior: null, spawn: s.spawn, spawnFacing: s.spawnFacing, crossings: [], organ,
  };
}

const door = (id: string, zone: Rect, to: RoomId, arrive: Point, facing: Dir, label: string): Door => ({ id, zone, to, arrive, facing, label, card: rt[to]?.card ?? null });

/** Polyline x at height y (for the crista terminalis boundary). */
function xAt(line: Point[], y: number): number {
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]!, b = line[i]!;
    if ((y >= a.y && y <= b.y) || (y <= a.y && y >= b.y)) return a.x + (b.x - a.x) * ((y - a.y) / (b.y - a.y || 1));
  }
  return y < line[0]!.y ? line[0]!.x : line[line.length - 1]!.x;
}

// ---------------------------------------------------------------- Right atrium
export const RA_SPAWN: Point = { x: 180, y: 40 };
function rightAtrium(): Room {
  const body = ellipse(232, 225, 168, 130);
  const auricle = cone(300, 122, 44, 374, 46, 24);
  const floor = wobble(blend(18, body, capsule(178, -40, 182, 120, 46), auricle, capsule(300, 300, 300, 480, 40)), 3, 26, 11);
  const holes = union(circle(138, 300, 26), circle(210, 270, 10));
  const crista = pts([[150, 116], [124, 160], [108, 210], [110, 252], [124, 276]]);
  return build({
    id: 'heart', kind: 'ra', cols: 30, rows: 27, floor, holes, squeeze: 'atria',
    wall: (x) => (x > 392 ? 34 : 24),
    texture: (x, y) => {
      if (auricle(x, y) < 0) return { kind: 'pect', angle: -0.9 };
      if (y > 110 && y < 290 && x < xAt(crista, y) - 4) return { kind: 'pect', angle: 0.25 };
      return 'smooth';
    },
    valves: [{ id: 'tv', kind: 'tricuspid', x: 260, y: 372, w: 80, toward: 1, pass: true }],
    lanes: [
      lane([[182, -12], [186, 120], [238, 232], [294, 330], [300, 440]], 'av', 'venous', 'tv', 34, 52, 60),
      lane([[138, 300], [200, 302], [270, 332], [300, 440]], 'av', 'venous', 'tv', 16, 46, 26),
      lane([[210, 270], [276, 350], [300, 440]], 'av', 'venous', 'tv', 5, 40, 8),
    ],
    signals: [
      sig('glow', [[140, 104]], 0, 0.05, 16),
      sig('ripple', [[140, 104]], 0, 0.08, 420),
      sig('line', [[140, 104], [214, 196], [300, 240], [322, 254]], 0.01, 0.07),
      sig('glow', [[322, 254]], 0.07, 0.15, 10),
    ],
    features: [
      { kind: 'crista', pts: crista },
      { kind: 'fossa', x: 372, y: 230, rx: 22, ry: 30, flap: false },
      { kind: 'rim', x: 138, y: 300, r: 26, a0: -1.9, a1: 0.5 },
      { kind: 'rim', x: 210, y: 270, r: 10, a0: -2.4, a1: -0.2 },
      { kind: 'tendon', pts: pts([[166, 286], [240, 256], [316, 250]]) },
    ],
    props: [P('robot', 206, 152), P('pad', 280, 128)],
    targets: [
      { id: 'guide', label: '안내 로봇 바디', verb: '대화', x: 206, y: 160, r: 22, npc: null }, pad(280, 128),
      obs('heart-in', '하대정맥 입구', 150, 262),
      hx('hx-svc', 182, 92), hx('hx-crista', 114, 200), hx('hx-pectinate', 90, 246), hx('hx-auricle', 338, 92),
      hx('hx-sa', 150, 116, 18), hx('hx-fossa', 366, 232), hx('hx-cs', 214, 246), hx('hx-avnode', 316, 250), hx('hx-tricuspid', 248, 350, 18),
    ],
    doors: [door('tricuspid', { x: 262, y: 400, w: 76, h: 24 }, 'rv', { x: 150, y: 92 }, 'down', '삼첨판 → 우심실')],
    spawn: RA_SPAWN, spawnFacing: 'down',
  });
}

// ---------------------------------------------------------------- Right ventricle
function rightVentricle(): Room {
  const outflow = union(capsule(330, 320, 386, 110, 44), capsule(386, 110, 388, -40, 40));
  const inflow = capsule(150, -40, 160, 130, 46);
  const floor = cut(wobble(blend(20, inflow, ellipse(206, 300, 140, 185), cone(214, 420, 70, 232, 524, 16), outflow), 3, 30, 21), ellipse(270, 66, 64, 122));
  return build({
    id: 'rv', kind: 'rv', cols: 32, rows: 35, floor, squeeze: 'ventricles',
    wall: (x, y) => (x > 300 && y > 250 ? 76 : 34),
    texture: (x, y) => (outflow(x, y) < 6 || inflow(x, y) < 0 ? 'smooth' : y > 236 ? { kind: 'trab', angle: 0 } : 'smooth'),
    valves: [
      { id: 'tv', kind: 'tricuspid', x: 104, y: 40, w: 92, toward: 1, pass: false },
      { id: 'pv', kind: 'pulmonary', x: 344, y: 64, w: 88, toward: -1, pass: true },
    ],
    lanes: [
      lane([[150, -20], [152, 120], [176, 300], [214, 470]], 'av', 'venous', 'tv', 30, 50, 50),
      lane([[214, 470], [300, 380], [352, 260], [384, 100], [388, -20]], 'sl', 'venous', 'pv', 34, 60, 46),
    ],
    cords: [
      { x: 96, y: 266, valve: 'tv', slots: [0.12, 0.26, 0.4] },
      { x: 170, y: 388, valve: 'tv', slots: [0.44, 0.56, 0.66] },
      { x: 262, y: 190, valve: 'tv', slots: [0.76, 0.88] },
    ],
    bands: [{ x1: 322, y1: 352, x2: 106, y2: 306, lift: 16, thick: 7, signal: [0.152, 0.168] }],
    signals: [
      sig('glow', [[300, 150]], 0.13, 0.16, 8),
      sig('line', [[300, 150], [318, 240], [322, 352]], 0.14, 0.158),
      sig('ripple', [[214, 470]], 0.156, 0.19, 300),
    ],
    props: [P('papillary', 96, 300, 0), P('papillary', 170, 420, 1), P('papillary', 262, 210, 2), P('pad', 250, 430)],
    targets: [
      pad(250, 430), obs('heart-out', '폐동맥판', 388, 100),
      hx('hx-tv-below', 150, 118), hx('hx-papillary-rv', 120, 318), hx('hx-moderator', 214, 352, 22), hx('hx-trabeculae', 196, 456),
      hx('hx-crest', 298, 222), hx('hx-infundibulum', 372, 168), hx('hx-rvwall', 104, 196),
    ],
    doors: [door('pulmonary', { x: 346, y: 0, w: 84, h: 30 }, 'lung', { x: 26, y: 176 }, 'right', '폐동맥판 → 폐')],
    spawn: { x: 150, y: 92 }, spawnFacing: 'down',
  });
}

// ---------------------------------------------------------------- Lung (alveolar capillaries, magnified)
const ALVEOLI = [
  { x: 110, y: 88, r: 46 }, { x: 236, y: 88, r: 46 }, { x: 362, y: 88, r: 46 }, { x: 488, y: 88, r: 46 },
  { x: 172, y: 266, r: 46 }, { x: 298, y: 266, r: 46 }, { x: 424, y: 266, r: 46 }, { x: 548, y: 270, r: 40 },
  { x: 236, y: 178, r: 18 }, { x: 424, y: 176, r: 18 },
];
function lung(): Room {
  const air = union(...ALVEOLI.map(a => circle(a.x, a.y, a.r)));
  const floor = wobble(cut(box(-40, 12, 680, 328, 8), air), 1.5, 16, 61);
  return build({
    id: 'lung', kind: 'lung', cols: 35, rows: 22, floor, squeeze: 'none',
    wall: () => 8, texture: () => 'lung', alveoli: ALVEOLI,
    valves: [],
    lanes: [
      lane([[-10, 176], [120, 178], [200, 196], [300, 194], [380, 160], [470, 180], [580, 176]], 'always', 'mix', null, 44, 38, 30),
      lane([[-10, 156], [140, 150], [173, 120], [173, 30], [236, 24], [299, 36], [299, 130], [362, 150], [425, 128], [425, 30], [520, 24], [560, 60], [580, 150]], 'always', 'mix', null, 40, 34, 10),
      lane([[-10, 200], [100, 212], [110, 250], [110, 330], [172, 334], [235, 320], [235, 220], [298, 214], [361, 226], [361, 330], [424, 334], [486, 320], [486, 210], [580, 196]], 'always', 'mix', null, 40, 34, 10),
    ],
    props: [P('pad', 62, 214)],
    targets: [
      pad(62, 214),
      hx('hx-pa-branch', 40, 150, 22), hx('hx-alveolus', 236, 150, 22), hx('hx-capillary', 173, 104), hx('hx-exchange', 330, 190, 24), hx('hx-pv-start', 516, 178, 22),
    ],
    doors: [door('pulmonary-vein', { x: 536, y: 140, w: 24, h: 72 }, 'la', { x: 300, y: 178 }, 'left', '폐정맥 → 좌심방')],
    spawn: { x: 26, y: 176 }, spawnFacing: 'right',
  });
}

// ---------------------------------------------------------------- Left atrium
function leftAtrium(): Room {
  const appendage = cone(330, 92, 24, 432, 34, 13);
  const floor = wobble(blend(16, ellipse(242, 186, 172, 122), appendage, capsule(270, 260, 272, 470, 42)), 3, 26, 31);
  const veins = [[136, 124], [130, 228], [360, 146], [358, 232]] as [number, number][];
  return build({
    id: 'la', kind: 'la', cols: 30, rows: 25, floor, holes: union(...veins.map(([x, y]) => circle(x, y, 15))), squeeze: 'atria',
    wall: (x) => (x < 90 ? 28 : 22),
    texture: (x, y) => (appendage(x, y) < 0 ? { kind: 'pect', angle: -0.5 } : 'smooth'),
    valves: [{ id: 'mv', kind: 'mitral', x: 230, y: 330, w: 82, toward: 1, pass: true }],
    lanes: veins.map(([x, y]) => lane([[x, y], [(x + 270) / 2, (y + 300) / 2], [270, 300], [272, 420]], 'av', 'arterial', 'mv', 12, 48, 18)),
    signals: [
      sig('line', [[96, 76], [190, 86], [290, 104], [380, 126]], 0.015, 0.05),
      sig('ripple', [[110, 80]], 0.02, 0.09, 380),
    ],
    features: [
      { kind: 'fossa', x: 102, y: 180, rx: 18, ry: 26, flap: true },
      ...veins.map(([x, y]): Feature => ({ kind: 'rim', x, y, r: 15, a0: -3.1, a1: 0 })),
    ],
    props: [P('pad', 236, 120)],
    targets: [
      pad(236, 120),
      hx('hx-pv', 324, 150, 22), hx('hx-laa', 352, 96), hx('hx-flap', 110, 184, 22), hx('hx-mitral', 226, 300), hx('hx-bachmann', 160, 94),
    ],
    doors: [door('mitral', { x: 232, y: 360, w: 78, h: 24 }, 'lv', { x: 368, y: 98 }, 'down', '승모판 → 좌심실')],
    spawn: { x: 300, y: 178 }, spawnFacing: 'left',
  });
}

// ---------------------------------------------------------------- Left ventricle
function leftVentricle(): Room {
  const floor = cut(wobble(blend(22,
    capsule(370, -40, 366, 130, 46), ellipse(300, 330, 142, 226), cone(296, 470, 84, 304, 612, 18),
    capsule(234, 270, 196, 100, 40), capsule(196, 100, 190, -40, 36),
  ), 3, 30, 41), box(232, -60, 92, 128, 18));
  return build({
    id: 'lv', kind: 'lv', cols: 34, rows: 41, floor, squeeze: 'ventricles',
    wall: (x) => (x < 212 ? 92 : 80),
    texture: (_x, y) => (y > 440 ? { kind: 'fine', angle: 0 } : 'smooth'),
    valves: [
      { id: 'mv', kind: 'mitral', x: 324, y: 44, w: 92, toward: 1, pass: false },
      { id: 'av', kind: 'aortic', x: 154, y: 52, w: 76, toward: -1, pass: true },
    ],
    lanes: [
      lane([[368, -20], [366, 120], [340, 330], [300, 560]], 'av', 'arterial', 'mv', 36, 50, 60),
      lane([[300, 560], [250, 380], [212, 200], [192, 60], [190, -20]], 'sl', 'arterial', 'av', 40, 64, 50),
    ],
    cords: [
      // Each papillary group supports BOTH mitral leaflets (split at slot 0.56).
      { x: 410, y: 296, valve: 'mv', slots: [0.26, 0.44, 0.72] },
      { x: 262, y: 376, valve: 'mv', slots: [0.08, 0.64, 0.9] },
    ],
    signals: [
      sig('glow', [[214, 100]], 0.13, 0.16, 8),
      sig('line', [[214, 100], [180, 250], [190, 380], [250, 520]], 0.14, 0.16),
      sig('ripple', [[296, 560]], 0.155, 0.19, 440),
    ],
    features: [{ kind: 'fan', x: 182, y: 140, len: 300 }, { kind: 'ridge', pts: pts([[232, 70], [278, 76], [324, 70]]), w: 4 }],
    props: [P('papillary', 410, 330, 0), P('papillary', 262, 410, 0), P('pad', 330, 470)],
    targets: [
      pad(330, 470),
      hx('hx-mv-below', 392, 120), hx('hx-continuity', 226, 120, 22), hx('hx-papillary-lv', 390, 352, 22), hx('hx-lbb', 190, 300, 22),
      hx('hx-apex', 300, 588, 22), hx('hx-lvwall', 414, 230), hx('hx-av-below', 192, 98, 22),
    ],
    doors: [door('aortic', { x: 156, y: 0, w: 72, h: 28 }, 'aorta', { x: 208, y: 336 }, 'up', '대동맥판 → 대동맥')],
    spawn: { x: 368, y: 98 }, spawnFacing: 'down',
  });
}

// ---------------------------------------------------------------- Aortic root
function aorta(): Room {
  const floor = wobble(blend(24, capsule(208, 480, 208, -40, 66), circle(130, 316, 54), circle(286, 316, 54), circle(208, 296, 50)), 2, 30, 51);
  return build({
    id: 'aorta', kind: 'aorta', cols: 26, rows: 27, floor, holes: union(circle(98, 292, 9), circle(318, 292, 10)), squeeze: 'none',
    wall: () => 30, texture: () => 'intima',
    valves: [{ id: 'av', kind: 'aortic', x: 150, y: 384, w: 116, toward: -1, pass: false }],
    lanes: [
      lane([[208, 440], [208, 300], [208, -20]], 'sl', 'arterial', null, 40, 120, 92),
      lane([[176, 372], [124, 330], [98, 292]], 'coronary-right', 'arterial', null, 8, 22, 10),
      lane([[240, 372], [294, 330], [318, 292]], 'coronary-left', 'arterial', null, 10, 22, 12),
    ],
    features: [
      { kind: 'ridge', pts: pts([[146, 246], [208, 240], [270, 246]]), w: 4 },
      { kind: 'rim', x: 98, y: 292, r: 9, a0: -3.1, a1: 0 }, { kind: 'rim', x: 318, y: 292, r: 10, a0: -3.1, a1: 0 },
    ],
    props: [P('pad', 248, 168)],
    targets: [
      pad(248, 168),
      hx('hx-sinus', 208, 298, 22), hx('hx-rca', 116, 308), hx('hx-lca', 300, 308), hx('hx-stj', 170, 232), hx('hx-ascending', 208, 104, 24),
    ],
    doors: [door('body', { x: 144, y: 0, w: 128, h: 22 }, 'heart', RA_SPAWN, 'down', '오름대동맥 → 온몸')],
    spawn: { x: 208, y: 336 }, spawnFacing: 'up',
  });
}

export function heartRooms(): Record<'heart' | 'rv' | 'lung' | 'la' | 'lv' | 'aorta', Room> {
  return { heart: rightAtrium(), rv: rightVentricle(), lung: lung(), la: leftAtrium(), lv: leftVentricle(), aorta: aorta() };
}

/** Rooms in the order blood passes through them. */
export const heartRoute: RoomId[] = ['heart', 'rv', 'lung', 'la', 'lv', 'aorta'];
