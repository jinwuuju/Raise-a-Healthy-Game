import content from '../../data/content/respiratory-interior.v0.1.json';
import space from '../../data/content/respiratory-space.v0.1.json';
import type { Door, Prop, Room, Target } from './rooms';
import type { AirFeature, AirLane, AirPart, AirTexture, Airway, Gate, MucusPath } from './airway-types';
import { FACE } from './organ-types';
import { blend, capsule, circle, cone, ellipse, nothing, union, wobble, type Sdf } from './sdf';
import { TILE, type AirwayRoomId, type Dir, type Point } from './types';

/*
 * D111 Bodyscope airway (design 20 section 2, draft, not medically reviewed). Six walkable rooms in the order air comes
 * in: nose -> pharynx -> larynx -> trachea -> bronchial tree -> alveoli (air side). Doors go both ways because air
 * does; the only doors that close are the swallow gates (soft palate, epiglottis). The oesophagus is an opening that
 * is never walked into. Views: the nose and pharynx are side sections (screen-left = the face, up = the head); the
 * larynx, trachea, bronchi and alveoli are front sections (screen-left = the person's right, up = the head), the floor
 * being the back wall. See data/content/respiratory-interior.v0.1.json for the simplifications.
 */
type Spec = {
  id: AirwayRoomId; cols: number; rows: number; floor: Sdf; holes?: Sdf; solid?: Sdf;
  wall: (x: number, y: number) => number; texture: (x: number, y: number) => AirTexture;
  gates?: Gate[]; lanes: AirLane[]; mucus?: MucusPath[]; features?: AirFeature[]; parts?: AirPart[]; alveoli?: { x: number; y: number; r: number }[];
  props: Prop[]; targets: Target[]; doors: Door[]; spawn: Point; spawnFacing: Dir;
};

const names = content.discoveries as Record<string, { name: string; room: string }>;
const titles = Object.fromEntries(content.rooms.map(r => [r.id, r.name])) as Record<AirwayRoomId, string>;
const doorCards = space.doors as Record<string, string>;
const pts = (a: [number, number][]): Point[] => a.map(([x, y]) => ({ x, y }));
const P = (x: number, y: number): Prop => ({ kind: 'pad', x, y, v: 0, solid: null });
const rx = (id: string, x: number, y: number, r = 20): Target => ({ id, label: names[id]?.name ?? id, verb: '살펴보기', x, y, r, npc: null });
const spot = (id: string, label: string, x: number, y: number, r = 18): Target => ({ id, label, verb: '살펴보기', x, y, r, npc: null });
const pad = (x: number, y: number): Target => ({ id: 'return-pad', label: '귀환 장치', verb: '귀환', x, y: y + 6, r: 18, npc: null });
const lane = (p: [number, number][], n: number, width: number, speed: number): AirLane => ({ pts: pts(p), n, width, speed });
const mucus = (p: [number, number][], n: number, width: number): MucusPath => ({ pts: pts(p), n, width });
const door = (id: string, zone: Door['zone'], to: AirwayRoomId, arrive: Point, facing: Dir): Door => ({ id, zone, to, arrive, facing, label: doorCards[id] ?? titles[to], card: doorCards[id] ?? null });

function build(s: Spec): Room {
  const holes = s.holes ?? nothing, solid = s.solid ?? nothing;
  const walk = (x: number, y: number) => s.floor(x, y) < -1.5 && s.floor(x, y - FACE) < 0 && holes(x, y) > 2.5 && solid(x, y) > 2.5;
  const airway: Airway = {
    kind: s.id, floor: s.floor, holes, solid, wall: s.wall, texture: s.texture, walk,
    gates: s.gates ?? [], lanes: s.lanes, mucus: s.mucus ?? [], features: s.features ?? [], parts: s.parts ?? [], alveoli: s.alveoli ?? [],
  };
  const tiles = new Uint8Array(s.cols * s.rows);
  for (let ty = 0; ty < s.rows; ty++) for (let tx = 0; tx < s.cols; tx++) tiles[ty * s.cols + tx] = walk(tx * TILE + 8, ty * TILE + 8) ? 16 : 0;
  return {
    id: s.id, title: titles[s.id], cols: s.cols, rows: s.rows, tiles, buildings: [], props: s.props, npcs: [], targets: s.targets,
    doors: s.doors, solids: [], markings: [], interior: null, spawn: s.spawn, spawnFacing: s.spawnFacing, crossings: [], organ: null, airway,
  };
}

// ---------------------------------------------------------------- Nasal cavity (side section)
/** Three shelves on the outer wall: inferior (largest), middle, superior (smallest). */
export const CONCHAE = { inferior: { x: 330, y: 248, rx: 178, ry: 18 }, middle: { x: 370, y: 176, rx: 142, ry: 15 }, superior: { x: 430, y: 120, rx: 78, ry: 11 } };
function nose(): Room {
  const c = CONCHAE;
  const floor = wobble(blend(18, capsule(-30, 300, 70, 296, 28), ellipse(340, 206, 250, 128), capsule(90, 300, 560, 296, 36), capsule(540, 252, 720, 252, 46)), 2, 24, 71);
  const solid = union(ellipse(c.inferior.x, c.inferior.y, c.inferior.rx, c.inferior.ry), ellipse(c.middle.x, c.middle.y, c.middle.rx, c.middle.ry), ellipse(c.superior.x, c.superior.y, c.superior.rx, c.superior.ry));
  return build({
    id: 'nose', cols: 42, rows: 24, floor, solid, holes: circle(420, 210, 5),
    wall: () => 26,
    texture: (x, y) => (x < 95 ? 'skin' : y < 104 && x > 330 && x < 530 ? 'olfactory' : 'mucosa'),
    lanes: [
      lane([[-10, 300], [80, 298], [200, 302], [400, 300], [560, 272], [690, 252]], 26, 24, 70),
      lane([[-10, 296], [90, 288], [180, 214], [300, 208], [480, 210], [560, 238], [690, 250]], 16, 12, 64),
      lane([[-10, 292], [100, 280], [220, 150], [330, 140], [420, 98], [520, 110], [600, 200], [690, 248]], 8, 6, 56),
    ],
    mucus: [mucus([[110, 326], [300, 330], [500, 326], [600, 292], [690, 262]], 14, 10), mucus([[200, 214], [480, 214], [580, 246], [690, 256]], 8, 6)],
    features: [
      { kind: 'hairs', x: 0, y: 270, w: 96, h: 56 },
      { kind: 'septum', pts: pts([[100, 150], [200, 92], [340, 80], [480, 88], [560, 130]]) },
      { kind: 'orifice', x: 420, y: 210, r: 5, rim: false },
      { kind: 'concha', ...c.inferior }, { kind: 'concha', ...c.middle }, { kind: 'concha', ...c.superior },
    ],
    props: [P(150, 316)],
    targets: [
      pad(150, 316),
      rx('rx-nostril', 30, 298), rx('rx-vestibule', 76, 288), rx('rx-septum', 190, 128, 22), rx('rx-inferior-concha', 330, 274, 22),
      rx('rx-middle-concha', 290, 200), rx('rx-superior-concha', 380, 142, 22), rx('rx-meatus', 240, 300), rx('rx-mucosa', 440, 298),
      rx('rx-cilia-nose', 560, 294), rx('rx-olfactory', 360, 100, 24), rx('rx-sinus', 420, 214, 18), rx('rx-choana', 620, 252, 22),
    ],
    doors: [door('nose-pharynx', { x: 648, y: 210, w: 24, h: 84 }, 'pharynx', { x: 40, y: 120 }, 'right')],
    spawn: { x: 30, y: 298 }, spawnFacing: 'right',
  });
}

// ---------------------------------------------------------------- Pharynx (side section)
function pharynx(): Room {
  const floor = wobble(blend(16,
    capsule(-30, 120, 120, 120, 42), ellipse(232, 146, 128, 88), capsule(290, 200, 286, 560, 70), capsule(30, 392, 230, 392, 44),
    capsule(282, 520, 200, 700, 50), capsule(286, 560, 330, 640, 34)), 2, 26, 73);
  const solid = union(cone(150, 246, 16, 250, 292, 9), ellipse(318, 86, 56, 18), ellipse(220, 392, 12, 26));
  const holes = union(capsule(10, 392, 196, 392, 36), ellipse(318, 612, 26, 16), circle(214, 126, 10));
  return build({
    id: 'pharynx', cols: 30, rows: 42, floor, solid, holes,
    wall: () => 30,
    texture: (_x, y) => (y < 250 ? 'ciliated' : 'squamous'),
    gates: [{ id: 'palate', kind: 'palate', x: 200, y: 268, w: 170 }],
    lanes: [lane([[-10, 120], [110, 124], [230, 170], [300, 240], [300, 330], [285, 460], [250, 560], [215, 690]], 40, 40, 64)],
    mucus: [mucus([[120, 110], [250, 150], [320, 250], [330, 420], [318, 600]], 14, 12)],
    features: [
      { kind: 'lymph', x: 318, y: 86, rx: 56, ry: 18 }, { kind: 'lymph', x: 220, y: 392, rx: 12, ry: 26 },
      { kind: 'orifice', x: 214, y: 126, r: 10, rim: true },
    ],
    parts: [{ kind: 'palate', root: { x: 150, y: 246 }, tip: { x: 250, y: 292 }, lifted: { x: 336, y: 250 }, width: 16 }, { kind: 'esophagus', x: 292, y: 612, w: 52 }],
    props: [P(310, 470)],
    targets: [
      pad(310, 470),
      rx('rx-adenoid', 318, 112), rx('rx-eustachian', 214, 128, 24), rx('rx-soft-palate', 272, 302, 22), rx('rx-palatine-tonsil', 252, 392, 22),
      rx('rx-oropharynx', 310, 400, 22), rx('rx-fork', 268, 540, 22), rx('rx-esophagus', 318, 590, 22),
      spot('mouth', '입 쪽 문', 246, 440, 20),
    ],
    doors: [
      door('pharynx-nose', { x: 0, y: 84, w: 18, h: 72 }, 'nose', { x: 628, y: 252 }, 'left'),
      door('pharynx-larynx', { x: 150, y: 650, w: 112, h: 22 }, 'larynx', { x: 208, y: 36 }, 'down'),
    ],
    spawn: { x: 40, y: 120 }, spawnFacing: 'right',
  });
}

// ---------------------------------------------------------------- Larynx (front section)
export const FOLDS = { y: 321, x0: 140, x1: 276, gap: 22, vestibular: 238 };
function larynx(): Room {
  const floor = wobble(blend(14, capsule(208, -40, 208, 96, 58), ellipse(208, 196, 96, 92), capsule(208, 250, 208, 640, 60)), 2, 22, 75);
  const solid = union(capsule(100, 232, 176, 244, 10), capsule(316, 232, 240, 244, 10), cone(130, 316, 15, 186, 326, 6), cone(286, 316, 15, 230, 326, 6));
  return build({
    id: 'larynx', cols: 26, rows: 36, floor, solid,
    wall: () => 40,
    texture: (_x, y) => (y < 100 ? 'squamous' : 'ciliated'),
    gates: [{ id: 'epiglottis', kind: 'epiglottis', x: 140, y: 86, w: 136 }],
    lanes: [lane([[208, -10], [208, 120], [208, 240], [208, 330], [208, 590]], 36, 26, 80)],
    mucus: [mucus([[180, 570], [196, 400], [204, 344]], 8, 8), mucus([[206, 300], [200, 200], [208, 60], [208, -10]], 10, 8)],
    features: [
      { kind: 'cartilage', x: 40, y: 110, w: 90, h: 220 }, { kind: 'cartilage', x: 286, y: 110, w: 90, h: 220 },
      { kind: 'cartilage', x: 70, y: 392, w: 80, h: 70 }, { kind: 'cartilage', x: 266, y: 392, w: 80, h: 70 },
    ],
    parts: [{ kind: 'epiglottis', base: { x: 208, y: 100 }, tip: { x: 208, y: 26 }, width: 74, inlet: { x: 150, y: 84, w: 116 } }, { kind: 'folds', ...FOLDS }],
    props: [P(250, 500)],
    targets: [
      pad(250, 500),
      rx('rx-epiglottis', 208, 62, 22), rx('rx-vestibular-fold', 160, 258, 22), rx('rx-glottis', 208, 300), rx('rx-vocal-fold', 160, 346, 22),
      rx('rx-thyroid-cartilage', 128, 180, 24), rx('rx-cricoid', 164, 430, 22),
    ],
    doors: [
      door('larynx-pharynx', { x: 150, y: 0, w: 116, h: 18 }, 'pharynx', { x: 215, y: 628 }, 'up'),
      door('larynx-trachea', { x: 150, y: 556, w: 116, h: 20 }, 'trachea', { x: 192, y: 40 }, 'down'),
    ],
    spawn: { x: 208, y: 36 }, spawnFacing: 'down',
  });
}

// ---------------------------------------------------------------- Trachea (front section, floor = the back wall)
export const TRACHEA = { x0: 124, x1: 260, mid: 192, open: 76, ringStep: 30 };
function trachea(): Room {
  const floor = wobble(blend(16, capsule(192, -40, 192, 600, 68), cone(180, 590, 58, 120, 760, 44), cone(204, 590, 52, 286, 760, 38)), 2, 26, 77);
  return build({
    id: 'trachea', cols: 24, rows: 46, floor, solid: cone(192, 646, 2, 192, 760, 36),
    wall: () => 34,
    texture: (x, y) => (Math.abs(x - TRACHEA.mid) < TRACHEA.open / 2 && y < 600 ? 'trachealis' : 'ciliated'),
    lanes: [
      lane([[192, -10], [192, 300], [192, 560], [150, 640], [126, 740]], 30, 50, 74),
      lane([[192, -10], [196, 300], [200, 560], [240, 640], [278, 740]], 22, 40, 70),
    ],
    mucus: [mucus([[140, 700], [150, 560], [150, -10]], 18, 10), mucus([[192, 600], [192, -10]], 18, 10), mucus([[234, 560], [234, -10]], 18, 10)],
    features: [
      { kind: 'rings', x0: TRACHEA.x0, x1: TRACHEA.x1, y0: 16, y1: 590, step: TRACHEA.ringStep, open: TRACHEA.open },
      { kind: 'goblets', x: 130, y: 40, w: 124, h: 540, n: 60 },
      { kind: 'ridge', pts: pts([[192, 650], [192, 736]]), w: 3 },
    ],
    props: [P(192, 120)],
    targets: [
      pad(192, 120),
      rx('rx-c-ring', 138, 170, 22), rx('rx-trachealis', 192, 260, 22), rx('rx-escalator', 230, 380, 22), rx('rx-goblet', 156, 480, 22), rx('rx-carina', 192, 628, 24),
    ],
    doors: [
      door('trachea-larynx', { x: 124, y: 0, w: 136, h: 18 }, 'larynx', { x: 208, y: 530 }, 'up'),
      door('trachea-bronchi-right', { x: 84, y: 716, w: 82, h: 20 }, 'bronchi', { x: 300, y: 30 }, 'down'),
      door('trachea-bronchi-left', { x: 236, y: 716, w: 76, h: 20 }, 'bronchi', { x: 472, y: 30 }, 'down'),
    ],
    spawn: { x: 192, y: 40 }, spawnFacing: 'down',
  });
}

// ---------------------------------------------------------------- Bronchial tree (front section)
/** Main bronchi (centre lines and radii): the right is shorter, wider and steeper than the left. */
export const MAIN_BRONCHI = {
  right: { from: { x: 300, y: 0 }, to: { x: 240, y: 170 }, r: [36, 32] as [number, number] },
  left: { from: { x: 440, y: 0 }, to: { x: 600, y: 200 }, r: [28, 24] as [number, number] },
};
/** Lobar bronchi: three on the right (upper, middle, lower), two on the left (upper, lower). */
export const LOBAR = { right: ['upper', 'middle', 'lower'], left: ['upper', 'lower'] } as const;
function bronchi(): Room {
  const R = MAIN_BRONCHI.right, L = MAIN_BRONCHI.left;
  const segs = [
    cone(R.from.x, R.from.y - 30, R.r[0], R.to.x, R.to.y, R.r[1]), cone(L.from.x, L.from.y - 30, L.r[0], L.to.x, L.to.y, L.r[1]),
    cone(266, 90, 20, 110, 50, 16), capsule(240, 170, 232, 300, 26), cone(234, 250, 18, 100, 340, 14),
    cone(232, 300, 22, 270, 470, 18), cone(270, 470, 16, 300, 600, 13), cone(300, 600, 12, 306, 730, 11),
    cone(590, 190, 18, 700, 110, 14), cone(598, 200, 20, 620, 420, 15),
  ];
  const floor = wobble(blend(12, ...segs), 1.5, 22, 79);
  const holes = union(circle(112, 51, 10), circle(102, 339, 9), circle(698, 112, 9), circle(620, 418, 10));
  const deep = (x: number, y: number) => y > 460 && x > 240 && x < 340;
  return build({
    id: 'bronchi', cols: 46, rows: 44, floor, holes,
    wall: () => 22,
    texture: (x, y) => (deep(x, y) ? 'bronchiole' : 'ciliated'),
    lanes: [
      lane([[300, -10], [268, 90], [240, 170], [234, 300], [270, 470], [300, 600], [306, 714]], 34, 22, 60),
      lane([[300, -10], [266, 90], [180, 70], [118, 54]], 8, 10, 48), lane([[300, -10], [240, 170], [234, 250], [160, 300], [108, 336]], 8, 10, 48),
      lane([[440, -10], [520, 90], [600, 200], [692, 116]], 10, 12, 50), lane([[440, -10], [520, 90], [600, 200], [618, 412]], 10, 12, 50),
    ],
    mucus: [
      mucus([[306, 700], [300, 600], [270, 470], [232, 300], [240, 170], [300, -10]], 22, 8), mucus([[618, 410], [600, 200], [440, -10]], 12, 6),
      mucus([[110, 334], [234, 250]], 4, 4), mucus([[120, 54], [266, 90]], 4, 4), mucus([[690, 116], [600, 200]], 4, 4),
    ],
    features: [
      { kind: 'plates', pts: pts([[300, 0], [240, 170], [232, 300], [262, 440]]), r: 30 },
      { kind: 'plates', pts: pts([[440, 0], [600, 200], [618, 400]]), r: 22 },
      { kind: 'plates', pts: pts([[266, 90], [120, 52]]), r: 16 }, { kind: 'plates', pts: pts([[234, 250], [108, 336]]), r: 14 },
      { kind: 'plates', pts: pts([[600, 196], [692, 116]]), r: 14 },
      { kind: 'muscle', pts: pts([[270, 470], [300, 600], [306, 704]]), r: 15 },
    ],
    props: [P(236, 206)],
    targets: [
      pad(236, 206),
      rx('rx-right-main', 282, 72, 22), rx('rx-left-main', 500, 88, 22), rx('rx-lobar', 228, 262, 22), rx('rx-cartilage-plate', 250, 380, 22),
      rx('rx-bronchiole', 288, 540, 20), rx('rx-terminal', 304, 650, 20),
      spot('deadend-ru', '더 깊은 가지', 140, 60), spot('deadend-rm', '더 깊은 가지', 128, 326), spot('deadend-lu', '더 깊은 가지', 674, 126), spot('deadend-ll', '더 깊은 가지', 616, 388),
    ],
    doors: [
      door('bronchi-trachea', { x: 266, y: 0, w: 66, h: 16 }, 'trachea', { x: 128, y: 690 }, 'up'),
      { ...door('bronchi-trachea', { x: 444, y: 0, w: 50, h: 16 }, 'trachea', { x: 262, y: 690 }, 'up'), id: 'bronchi-trachea-left' },
      door('bronchi-alveoli', { x: 290, y: 690, w: 32, h: 14 }, 'alveoli', { x: 40, y: 84 }, 'right'),
    ],
    spawn: { x: 300, y: 30 }, spawnFacing: 'down',
  });
}

// ---------------------------------------------------------------- Alveoli, air side (front section, magnified)
const SAC = { x: 480, y: 340, r: 40, d: 74, ar: 40, angles: [281, 341, 41, 101, 161] };
const sacAlveoli = SAC.angles.map(a => ({ x: Math.round(SAC.x + Math.cos((a * Math.PI) / 180) * SAC.d), y: Math.round(SAC.y + Math.sin((a * Math.PI) / 180) * SAC.d), r: SAC.ar }));
const ductAlveoli = [{ x: 204, y: 206, r: 28 }, { x: 254, y: 124, r: 28 }, { x: 285, y: 255, r: 28 }, { x: 334, y: 172, r: 28 }];
const buds = [{ x: 70, y: 56, r: 18 }, { x: 124, y: 138, r: 16 }];
/** Every air sac drawn with capillaries in the thin walls between them. */
export const ALVEOLI_AIR = [...buds, ...ductAlveoli, ...sacAlveoli];
function alveoli(): Room {
  const pores = sacAlveoli.map((a, i) => {
    const b = sacAlveoli[(i + 1) % sacAlveoli.length]!, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, l = Math.hypot(b.x - a.x, b.y - a.y), ux = (b.x - a.x) / l, uy = (b.y - a.y) / l;
    return { x: mx, y: my, sdf: capsule(mx - ux * 10, my - uy * 10, mx + ux * 10, my + uy * 10, 6) };
  }).slice(0, 4);
  const floor = wobble(blend(6,
    cone(-30, 60, 20, 160, 124, 22), capsule(160, 124, 446, 306, 26), circle(SAC.x, SAC.y, SAC.r),
    ...ALVEOLI_AIR.map(a => circle(a.x, a.y, a.r)), ...pores.map(p => p.sdf)), 1, 18, 81);
  return build({
    id: 'alveoli', cols: 40, rows: 30, floor,
    wall: () => 9,
    texture: (x) => (x < 60 ? 'bronchiole' : 'alveolar'),
    alveoli: ALVEOLI_AIR,
    lanes: [
      lane([[-10, 60], [160, 124], [446, 306], [480, 340]], 24, 18, 34),
      ...sacAlveoli.map(a => lane([[SAC.x, SAC.y], [a.x, a.y]], 4, 14, 24)),
      ...ductAlveoli.map(a => lane([[(a.x + 300) / 2, (a.y + 215) / 2], [a.x, a.y]], 3, 10, 20)),
    ],
    features: [],
    props: [P(250, 181)],
    targets: [
      pad(250, 181),
      rx('rx-respiratory-bronchiole', 72, 92, 22), rx('rx-alveolar-duct', 310, 212, 22), rx('rx-alveolar-sac', SAC.x, SAC.y, 24),
      rx('rx-type1', sacAlveoli[2]!.x, sacAlveoli[2]!.y, 22), rx('rx-type2', sacAlveoli[3]!.x, sacAlveoli[3]!.y + 8, 22), rx('rx-macrophage', sacAlveoli[1]!.x, sacAlveoli[1]!.y, 24),
      rx('rx-pore', Math.round(pores[0]!.x), Math.round(pores[0]!.y), 18), rx('rx-membrane', sacAlveoli[4]!.x, sacAlveoli[4]!.y, 22),
    ],
    doors: [door('alveoli-bronchi', { x: 0, y: 40, w: 14, h: 44 }, 'bronchi', { x: 304, y: 660 }, 'up')],
    spawn: { x: 40, y: 84 }, spawnFacing: 'right',
  });
}

export function airwayRooms(): Record<AirwayRoomId, Room> {
  return { nose: nose(), pharynx: pharynx(), larynx: larynx(), trachea: trachea(), bronchi: bronchi(), alveoli: alveoli() };
}
