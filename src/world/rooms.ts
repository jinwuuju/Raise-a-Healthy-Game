import { TILE, type Dir, type Point, type Rect, type RoomId } from './types';
import type { Look } from '../domain/appearance';
import { footprint, homeSize, newHome, placementRect, type HomeState } from '../domain/life';

/*
 * Map geometry only (no rendering). Distances are game pixels, 1 tile = 16px.
 * The street keeps the observed relationships of the first prototype: Euro Plaza on the
 * narrow Nonhyeon-ro 159-gil, the wide Nonhyeon-ro beside it, the intersection with
 * crosswalks, the cafe across the narrow road and the Apgujeong-station direction north.
 * It is a compressed game map, not a survey.
 */

export const T = {
  VOID: 0, PAVE: 1, ROAD: 2, LANE: 3, CROSS: 4, GRASS: 5, GRAVEL: 6, PARKING: 7, DRIVE: 8,
  PLAZA: 9, TURF: 10, TACTILE: 11, WOOD: 12, MARBLE: 13, HERRING: 14, WALL: 15, FLESH: 16, VESSEL: 17, BRIDGE: 18,
} as const;
const BLOCKED = new Set<number>([T.VOID, T.ROAD, T.WALL, T.VESSEL]);
export function walkableTile(t: number): boolean { return !BLOCKED.has(t); }

export type BuildingKind = 'europlaza' | 'b2bc' | 'shop' | 'office' | 'hotel' | 'hospital';
export type Building = { id: string; kind: BuildingKind; x: number; y: number; w: number; d: number; h: number; v: number };

export type PropKind =
  | 'ginkgo' | 'parktree' | 'lamp' | 'bench' | 'planter' | 'bollard' | 'signal' | 'kiosk' | 'signpost' | 'hydrant'
  | 'scooter' | 'bikes' | 'vending' | 'bin' | 'flowerbed' | 'fountain' | 'parkedcar' | 'booth'
  | 'desk' | 'editordesk' | 'chair' | 'bookshelf' | 'bodyscope' | 'sofa' | 'lowtable' | 'printer' | 'water' | 'plant'
  | 'reception' | 'counter' | 'roundtable' | 'cafechair' | 'bar' | 'stool' | 'loungechair'
  | 'pedsignal' | 'heartcore' | 'robot' | 'pad' | 'terminal' | 'observation' | 'heartanatomy' | 'valve' | 'lungs' | 'muscle' | 'signalnode' | 'recordboard' | 'homeentry' | 'clothesrack' | 'mirror';
export type Prop = { kind: PropKind; x: number; y: number; v: number; solid: Rect | null };

export type NpcSpec = { id: string; name: string; x: number; y: number; facing: Dir; look: Look; route: Point[] | null; speed: number };
export type Target = { id: string; label: string; verb: string; x: number; y: number; r: number; npc: string | null };
export type Door = { id: string; zone: Rect; to: RoomId; arrive: Point; facing: Dir; label: string };
export type Marking = { kind: 'crossV' | 'crossH' | 'dashV' | 'dashH' | 'centerV' | 'centerH' | 'stop' | 'slow30' | 'stall'; x: number; y: number; w: number; h: number };
export type WallDecor = { kind: 'window' | 'whiteboard' | 'clock' | 'elevator' | 'sign' | 'notice' | 'menu' | 'shelf' | 'poster' | 'mailbox' | 'neon'; x: number; w: number; text: string };
export type Interior = { wall: 'office' | 'lobby' | 'cafe' | 'heart'; decor: WallDecor[]; bottom: 'wall' | 'glass'; door: [number, number]; pendants: Point[]; rugs: Rect[] };

/** Road part of a crosswalk. People may enter it only while the pedestrian light for `road` is green. */
export type Crossing = { id: string; rect: Rect; road: 'NS' | 'EW' };
export type ModelStream = { path: Point[]; tone: 'delivery' | 'return' | 'signal'; speed: number };
export type WorldLabel = { text: string; x: number; y: number; tone?: 'warm' | 'cool' | 'neutral' };
export type Furnishing = { id: string; x: number; y: number; w: number; h: number; rotated: boolean };

export type Room = {
  id: RoomId; title: string; cols: number; rows: number; tiles: Uint8Array;
  buildings: Building[]; props: Prop[]; npcs: NpcSpec[]; targets: Target[]; doors: Door[];
  solids: Rect[]; markings: Marking[]; interior: Interior | null; spawn: Point; spawnFacing: Dir;
  crossings: Crossing[];
  /** Closed loop followed by the moving flow markers in model rooms, and spots where they pass under a bridge. */
  flow: Point[] | null; flowHidden: Rect[];
  streams: ModelStream[]; labels: WorldLabel[]; modelIndex: number | null;
  furnishings: Furnishing[]; homeArea: Rect | null;
};

function grid(cols: number, rows: number, base: number) {
  const tiles = new Uint8Array(cols * rows).fill(base);
  const fill = (x0: number, y0: number, x1: number, y1: number, v: number) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (x >= 0 && y >= 0 && x < cols && y < rows) tiles[y * cols + x] = v;
  };
  return { tiles, fill };
}

function solidFor(kind: PropKind, x: number, y: number): Rect | null {
  const r = (w: number, h: number): Rect => ({ x: x - w / 2, y: y - h, w, h });
  switch (kind) {
    case 'ginkgo': case 'parktree': return r(6, 4);
    case 'lamp': case 'signal': case 'signpost': return r(3, 3);
    case 'bench': return r(20, 5);
    case 'planter': return r(14, 8);
    case 'kiosk': return r(14, 4);
    case 'hydrant': case 'bin': return r(6, 3);
    case 'scooter': return r(16, 5);
    case 'bikes': return r(30, 5);
    case 'vending': return r(14, 6);
    case 'flowerbed': return r(16, 6);
    case 'fountain': return r(38, 16);
    case 'parkedcar': return r(16, 26);
    case 'booth': return r(20, 10);
    case 'desk': return r(48, 14);
    case 'editordesk': return r(64, 16);
    case 'bookshelf': return r(32, 8);
    case 'bodyscope': return r(44, 18);
    case 'sofa': return r(48, 12);
    case 'lowtable': return r(28, 7);
    case 'printer': return r(24, 10);
    case 'water': return r(10, 6);
    case 'plant': return r(12, 5);
    case 'reception': return r(64, 14);
    case 'counter': return r(128, 16);
    case 'roundtable': return r(16, 6);
    case 'bar': return r(88, 6);
    case 'loungechair': return r(20, 8);
    case 'pedsignal': return r(3, 3);
    case 'heartcore': return r(56, 20);
    case 'robot': return r(12, 5);
    case 'terminal': return r(20, 9);
    case 'heartanatomy': return r(104, 36);
    case 'valve': return r(42, 12);
    case 'lungs': return r(48, 14);
    case 'muscle': return r(48, 14);
    case 'signalnode': return r(12, 5);
    case 'recordboard': return r(40, 8);
    case 'clothesrack': return r(48, 9);
    case 'mirror': return r(16, 6);
    default: return null;
  }
}
const P = (kind: PropKind, x: number, y: number, v = 0): Prop => ({ kind, x, y, v, solid: solidFor(kind, x, y) });
const B = (id: string, kind: BuildingKind, tx: number, ty: number, tw: number, td: number, h: number, v = 0): Building =>
  ({ id, kind, x: tx * TILE, y: ty * TILE, w: tw * TILE, d: td * TILE, h, v });
const npc = (id: string, name: string, x: number, y: number, facing: Dir, look: Look, route: Point[] | null = null, speed = 0): NpcSpec =>
  ({ id, name, x, y, facing, look, route, speed });
const target = (id: string, label: string, verb: string, x: number, y: number, r = 20, npcId: string | null = null): Target =>
  ({ id, label, verb, x, y, r, npc: npcId });

type RoomDefaults = 'crossings' | 'flow' | 'flowHidden' | 'streams' | 'labels' | 'modelIndex' | 'furnishings' | 'homeArea';
type RoomSpec = Omit<Room, 'solids' | RoomDefaults> & Partial<Pick<Room, RoomDefaults>>;
function finish(spec: RoomSpec): Room {
  const room = { crossings: [], flow: null, flowHidden: [], streams: [], labels: [], modelIndex: null, furnishings: [], homeArea: null, ...spec };
  const solids: Rect[] = [];
  for (const b of room.buildings) if (b.y + b.d <= room.rows * TILE) solids.push({ x: b.x, y: b.y, w: b.w, h: b.d });
  for (const p of room.props) if (p.solid) solids.push(p.solid);
  for (const n of room.npcs) if (!n.route) solids.push({ x: n.x - 5, y: n.y - 4, w: 10, h: 5 });
  for (const f of room.furnishings) if (f.id !== 'rug') solids.push({ x: f.x, y: f.y, w: f.w, h: f.h });
  return { ...room, solids };
}

const walkerLooks: Look[] = [
  { build: 'm', hair: 'shadow', face: 'calm', shape: 'round', skin: 'tan', hairColor: 'brown', outfit: 'casual' },
  { build: 'f', hair: 'layered', face: 'smile', shape: 'oval', skin: 'peach', hairColor: 'ink', outfit: 'coat' },
  { build: 'f', hair: 'hush', face: 'bright', shape: 'round', skin: 'honey', hairColor: 'ash', outfit: 'knit' },
  { build: 'm', hair: 'messy', face: 'smile', shape: 'round', skin: 'deep', hairColor: 'ink', outfit: 'hoodie' },
  { build: 'f', hair: 'hime', face: 'cat', shape: 'vline', skin: 'fair', hairColor: 'ink', outfit: 'casual' },
  { build: 'm', hair: 'part', face: 'cool', shape: 'oval', skin: 'peach', hairColor: 'chestnut', outfit: 'suit' },
];

function street(): Room {
  const cols = 40, rows = 40;
  const { tiles, fill } = grid(cols, rows, T.PAVE);
  fill(24, 0, 29, 39, T.ROAD);            // Nonhyeon-ro (wide, north-south)
  fill(0, 28, 39, 33, T.ROAD);            // Dosan-daero (wide, east-west)
  fill(0, 16, 23, 17, T.LANE);            // Nonhyeon-ro 159-gil (narrow, in front of Euro Plaza)
  fill(24, 26, 29, 27, T.CROSS); fill(24, 34, 29, 35, T.CROSS); fill(21, 28, 22, 33, T.CROSS); fill(31, 28, 32, 33, T.CROSS);
  fill(23, 26, 23, 27, T.TACTILE); fill(30, 26, 30, 27, T.TACTILE); fill(23, 34, 23, 35, T.TACTILE); fill(30, 34, 30, 35, T.TACTILE);
  fill(21, 27, 22, 27, T.TACTILE); fill(21, 34, 22, 34, T.TACTILE); fill(31, 27, 32, 27, T.TACTILE); fill(31, 34, 32, 34, T.TACTILE);
  fill(12, 15, 19, 15, T.PLAZA);          // Euro Plaza front
  fill(20, 10, 20, 15, T.DRIVE);          // parking ramp beside Euro Plaza
  fill(9, 19, 18, 23, T.GRASS);           // pocket park
  fill(9, 21, 18, 21, T.GRAVEL); fill(13, 19, 14, 23, T.GRAVEL);
  fill(3, 25, 6, 25, T.TURF);             // artificial turf strip at the cafe
  fill(33, 10, 39, 14, T.PARKING);
  fill(33, 15, 39, 20, T.GRASS);
  fill(0, 37, 20, 39, T.VOID); fill(33, 37, 39, 39, T.VOID);

  const buildings: Building[] = [
    B('europlaza', 'europlaza', 12, 10, 8, 5, 88),
    B('b2bc', 'b2bc', 3, 22, 5, 3, 58),
    B('clinic', 'shop', 2, 10, 5, 5, 64, 3),
    B('mart', 'shop', 11, 3, 5, 5, 60, 0),
    B('tower', 'office', 16, 2, 5, 6, 92),
    B('bakery', 'shop', 1, 3, 5, 5, 52, 1),
    B('flower', 'shop', 6, 3, 4, 5, 70, 2),
    B('orbit', 'shop', 8, 10, 3, 5, 54, 6),
    B('books', 'shop', 0, 22, 3, 3, 44, 4),
    B('hotel', 'hotel', 34, 3, 6, 6, 110),
    B('hospital', 'hospital', 33, 21, 7, 4, 96),
    // South side of Dosan-daero: only the rooftops are inside the map edge.
    { id: 'south-a', kind: 'shop', x: 0, y: 652, w: 160, d: 48, h: 60, v: 5 },
    { id: 'south-b', kind: 'shop', x: 160, y: 652, w: 176, d: 48, h: 60, v: 4 },
    { id: 'south-c', kind: 'shop', x: 528, y: 652, w: 112, d: 48, h: 60, v: 0 },
  ];

  const props: Prop[] = [];
  for (const y of [40, 120, 200, 312, 392]) props.push(P('ginkgo', 356, y, y % 3));
  for (const y of [40, 120, 200, 280, 360]) props.push(P('ginkgo', 508, y, (y / 40) % 3));
  for (const x of [24, 184, 264, 552, 616]) props.push(P('ginkgo', x, 424, x % 3));
  for (const x of [40, 120, 200, 280, 552, 616]) props.push(P('ginkgo', x, 586, (x / 8) % 3));
  props.push(P('parktree', 160, 316), P('parktree', 296, 316, 1), P('parktree', 160, 376, 1), P('parktree', 296, 376), P('parktree', 128, 186, 1));
  props.push(P('lamp', 356, 160), P('lamp', 356, 360), P('lamp', 508, 160), P('lamp', 508, 320), P('lamp', 72, 412), P('lamp', 312, 412), P('lamp', 584, 412), P('lamp', 72, 586), P('lamp', 312, 586));
  props.push(P('planter', 204, 252), P('planter', 236, 252), P('planter', 152, 236), P('planter', 90, 412));
  props.push(P('bench', 186, 318), P('bench', 262, 318), P('bench', 184, 252));
  props.push(P('fountain', 224, 350));
  props.push(P('flowerbed', 264, 364), P('flowerbed', 184, 364, 1), P('flowerbed', 176, 302, 2), P('flowerbed', 272, 302));
  props.push(P('signal', 378, 444), P('signal', 490, 444, 1), P('signal', 378, 554, 1), P('signal', 490, 554));
  // Pedestrian lights at both ends of every crosswalk (v: 0 = crossing Nonhyeon-ro, 1 = crossing Dosan-daero).
  props.push(P('pedsignal', 372, 414), P('pedsignal', 492, 414), P('pedsignal', 372, 588), P('pedsignal', 492, 588));
  props.push(P('pedsignal', 330, 444, 1), P('pedsignal', 330, 558, 1), P('pedsignal', 536, 444, 1), P('pedsignal', 536, 558, 1));
  props.push(P('kiosk', 344, 236), P('signpost', 376, 28), P('hydrant', 344, 300), P('scooter', 240, 152), P('bikes', 330, 300));
  props.push(P('vending', 528, 156), P('bin', 40, 250), P('bin', 528, 412), P('booth', 624, 176));
  props.push(P('parkedcar', 552, 234, 1), P('parkedcar', 584, 234, 4), P('parkedcar', 616, 234, 2));
  props.push(P('homeentry', 292, 132));
  for (let y = 8; y < 400; y += 24) props.push(P('bollard', 432, y));
  for (let y = 600; y < 640; y += 24) props.push(P('bollard', 432, y));

  const markings: Marking[] = [
    { kind: 'crossV', x: 384, y: 416, w: 96, h: 32 }, { kind: 'crossV', x: 384, y: 544, w: 96, h: 32 },
    { kind: 'crossH', x: 336, y: 448, w: 32, h: 96 }, { kind: 'crossH', x: 496, y: 448, w: 32, h: 96 },
    { kind: 'centerV', x: 430, y: 0, w: 5, h: 412 }, { kind: 'centerV', x: 430, y: 580, w: 5, h: 60 },
    { kind: 'centerH', x: 0, y: 494, w: 332, h: 5 }, { kind: 'centerH', x: 534, y: 494, w: 106, h: 5 },
    { kind: 'dashV', x: 407, y: 0, w: 2, h: 412 }, { kind: 'dashV', x: 455, y: 0, w: 2, h: 412 },
    { kind: 'dashV', x: 407, y: 580, w: 2, h: 60 }, { kind: 'dashV', x: 455, y: 580, w: 2, h: 60 },
    { kind: 'dashH', x: 0, y: 471, w: 332, h: 2 }, { kind: 'dashH', x: 0, y: 519, w: 332, h: 2 },
    { kind: 'dashH', x: 534, y: 471, w: 106, h: 2 }, { kind: 'dashH', x: 534, y: 519, w: 106, h: 2 },
    { kind: 'stop', x: 384, y: 411, w: 46, h: 2 }, { kind: 'stop', x: 434, y: 579, w: 46, h: 2 },
    { kind: 'stop', x: 331, y: 497, w: 2, h: 47 }, { kind: 'stop', x: 531, y: 448, w: 2, h: 46 },
    { kind: 'slow30', x: 120, y: 272, w: 0, h: 0 }, { kind: 'slow30', x: 300, y: 272, w: 0, h: 0 },
    { kind: 'stall', x: 536, y: 168, w: 32, h: 72 }, { kind: 'stall', x: 568, y: 168, w: 32, h: 72 }, { kind: 'stall', x: 600, y: 168, w: 32, h: 72 },
  ];

  const npcs: NpcSpec[] = [
    npc('w1', '', 372, 16, 'down', walkerLooks[0]!, [{ x: 372, y: 16 }, { x: 372, y: 396 }], 26),
    npc('w2', '', 16, 440, 'right', walkerLooks[1]!, [{ x: 16, y: 440 }, { x: 624, y: 440 }], 22),
    npc('w3', '', 498, 300, 'up', walkerLooks[2]!, [{ x: 498, y: 380 }, { x: 498, y: 16 }], 24),
    npc('w4', '', 600, 566, 'left', walkerLooks[3]!, [{ x: 624, y: 566 }, { x: 16, y: 566 }], 28),
    npc('w5', '', 150, 344, 'right', walkerLooks[4]!, [{ x: 150, y: 344 }, { x: 196, y: 344 }, { x: 196, y: 362 }, { x: 252, y: 362 }, { x: 252, y: 344 }, { x: 300, y: 344 }], 18),
    npc('w6', '', 40, 268, 'right', walkerLooks[5]!, [{ x: 24, y: 268 }, { x: 360, y: 268 }], 25),
  ];

  return finish({
    id: 'street', title: '논현로 · 을지병원 사거리', cols, rows, tiles, buildings, props, npcs, markings, interior: null,
    crossings: [
      { id: 'cross-n', rect: { x: 384, y: 416, w: 96, h: 32 }, road: 'NS' }, { id: 'cross-s', rect: { x: 384, y: 544, w: 96, h: 32 }, road: 'NS' },
      { id: 'cross-w', rect: { x: 336, y: 448, w: 32, h: 96 }, road: 'EW' }, { id: 'cross-e', rect: { x: 496, y: 448, w: 32, h: 96 }, road: 'EW' },
    ],
    spawn: { x: 292, y: 254 }, spawnFacing: 'down',
    targets: [
      target('street-notice', '거리 안내판', '보기', 344, 242, 18),
      target('station', '압구정역 방향', '보기', 376, 34, 18),
      target('park-bench', '쉼터 벤치', '쉬기', 186, 326, 16),
      target('fountain', '작은 분수', '보기', 224, 358, 20),
    ],
    doors: [
      { id: 'euro-door', zone: { x: 284, y: 240, w: 17, h: 7 }, to: 'lobby', arrive: { x: 160, y: 168 }, facing: 'up', label: '유로프라자 로비' },
      { id: 'cafe-door', zone: { x: 108, y: 400, w: 17, h: 7 }, to: 'cafe', arrive: { x: 240, y: 168 }, facing: 'up', label: '비투비씨 카페' },
      { id: 'orbit-door', zone: { x: 158, y: 240, w: 12, h: 7 }, to: 'store', arrive: { x: 208, y: 258 }, facing: 'up', label: '오비트 테일러' },
      { id: 'reporter-home', zone: { x: 282, y: 132, w: 20, h: 9 }, to: 'home', arrive: { x: 208, y: 258 }, facing: 'up', label: '기자 숙소' },
    ],
  });
}

function interiorGrid(cols: number, rows: number, floor: number, door: [number, number]) {
  const g = grid(cols, rows, floor);
  g.fill(0, 0, cols - 1, 2, T.WALL);
  g.fill(0, rows - 1, cols - 1, rows - 1, T.WALL);
  g.fill(0, 0, 0, rows - 1, T.WALL);
  g.fill(cols - 1, 0, cols - 1, rows - 1, T.WALL);
  g.fill(door[0], rows - 1, door[1], rows - 1, floor);
  return g;
}

export const editorLook: Look = { build: 'm', hair: 'short', face: 'calm', shape: 'oval', skin: 'honey', hairColor: 'silver', outfit: 'suit', glasses: true };
export const seniorLook: Look = { build: 'f', hair: 'ponytail', face: 'bright', shape: 'oval', skin: 'peach', hairColor: 'chestnut', outfit: 'reporter' };
export const guardLook: Look = { build: 'm', hair: 'buzz', face: 'smile', shape: 'round', skin: 'tan', hairColor: 'ink', outfit: 'uniform' };
export const baristaLook: Look = { build: 'f', hair: 'bob', face: 'doe', shape: 'round', skin: 'fair', hairColor: 'brown', outfit: 'apron' };

function newsroom(): Room {
  const cols = 24, rows = 15;
  const { tiles } = interiorGrid(cols, rows, T.WOOD, [-1, -1]);
  return finish({
    id: 'newsroom', title: '유로프라자 3층 · 메디컬 데스크 편집국', cols, rows, tiles, buildings: [], markings: [],
    props: [
      P('editordesk', 88, 104), P('bookshelf', 152, 58), P('bookshelf', 186, 58, 1),
      P('desk', 184, 136), P('desk', 240, 136, 1), P('chair', 184, 148), P('chair', 240, 148),
      P('bodyscope', 308, 120), P('sofa', 56, 196), P('lowtable', 56, 214), P('printer', 340, 204),
      P('water', 360, 62), P('plant', 26, 62), P('plant', 292, 214, 1), P('plant', 124, 62, 1),
    ],
    npcs: [npc('editor', '편집장', 88, 86, 'down', editorLook), npc('senior', '선배 기자', 262, 158, 'up', seniorLook)],
    targets: [
      target('editor', '편집장', '대화', 88, 108, 22, 'editor'),
      target('senior', '선배 기자', '대화', 262, 160, 18, 'senior'),
      target('my-desk', '내 자리', '살펴보기', 184, 142, 14),
      target('device', '바디스코프', '살펴보기', 308, 126, 22),
      target('shelf', '자료 책장', '살펴보기', 168, 64, 18),
    ],
    doors: [{ id: 'elevator', zone: { x: 324, y: 48, w: 24, h: 8 }, to: 'lobby', arrive: { x: 160, y: 70 }, facing: 'down', label: '엘리베이터' }],
    interior: {
      wall: 'office', bottom: 'wall', door: [-1, -1], pendants: [], rugs: [{ x: 24, y: 172, w: 72, h: 50 }, { x: 150, y: 100, w: 124, h: 64 }],
      decor: [
        { kind: 'window', x: 22, w: 46, text: '' }, { kind: 'window', x: 76, w: 46, text: '' },
        { kind: 'poster', x: 214, w: 16, text: '' }, { kind: 'sign', x: 234, w: 56, text: 'MEDICAL DESK' },
        { kind: 'whiteboard', x: 236, w: 52, text: '' }, { kind: 'clock', x: 300, w: 10, text: '' },
        { kind: 'elevator', x: 320, w: 32, text: '3' },
      ],
    },
    spawn: { x: 212, y: 176 }, spawnFacing: 'down',
  });
}

function lobby(): Room {
  const cols = 20, rows = 12;
  const { tiles } = interiorGrid(cols, rows, T.MARBLE, [9, 10]);
  return finish({
    id: 'lobby', title: '유로프라자 · 1층 로비', cols, rows, tiles, buildings: [], markings: [],
    props: [
      P('reception', 72, 104), P('loungechair', 236, 132), P('loungechair', 284, 132, 1), P('lowtable', 260, 148),
      P('plant', 26, 62), P('plant', 294, 62, 1), P('plant', 26, 168, 1), P('plant', 294, 168),
    ],
    npcs: [npc('guard', '안내 데스크', 72, 86, 'down', guardLook)],
    targets: [
      target('guard', '안내 데스크', '대화', 72, 108, 22, 'guard'),
      target('notice', '소식 게시판', '보기', 236, 56, 18),
    ],
    doors: [
      { id: 'elevator', zone: { x: 148, y: 48, w: 24, h: 8 }, to: 'newsroom', arrive: { x: 336, y: 68 }, facing: 'down', label: '엘리베이터' },
      { id: 'front', zone: { x: 146, y: 181, w: 28, h: 11 }, to: 'street', arrive: { x: 292, y: 254 }, facing: 'down', label: '논현로' },
    ],
    interior: {
      wall: 'lobby', bottom: 'glass', door: [144, 176], pendants: [], rugs: [{ x: 136, y: 150, w: 48, h: 26 }],
      decor: [
        { kind: 'mailbox', x: 28, w: 40, text: '' }, { kind: 'sign', x: 120, w: 80, text: 'EURO PLAZA' },
        { kind: 'elevator', x: 144, w: 32, text: '1' }, { kind: 'notice', x: 218, w: 36, text: '' }, { kind: 'poster', x: 268, w: 16, text: '' },
      ],
    },
    spawn: { x: 160, y: 168 }, spawnFacing: 'up',
  });
}

function cafe(): Room {
  const cols = 18, rows = 12;
  const { tiles } = interiorGrid(cols, rows, T.HERRING, [14, 15]);
  return finish({
    id: 'cafe', title: '비투비씨 · 카페', cols, rows, tiles, buildings: [], markings: [],
    props: [
      P('counter', 112, 84), P('roundtable', 204, 112), P('cafechair', 190, 114), P('cafechair', 218, 114, 1),
      P('roundtable', 244, 142, 1), P('cafechair', 230, 144), P('cafechair', 258, 144, 1),
      P('bar', 80, 166), P('stool', 52, 174), P('stool', 80, 174), P('stool', 108, 174),
      P('plant', 264, 62), P('plant', 24, 120, 1),
    ],
    npcs: [npc('barista', '바리스타', 112, 62, 'down', baristaLook)],
    targets: [
      target('barista', '바리스타', '주문', 112, 90, 22, 'barista'),
      target('window-seat', '창가 자리', '앉기', 80, 156, 18),
    ],
    doors: [{ id: 'exit', zone: { x: 226, y: 181, w: 28, h: 11 }, to: 'street', arrive: { x: 116, y: 414 }, facing: 'down', label: '도산대로 쪽 거리' }],
    interior: {
      wall: 'cafe', bottom: 'glass', door: [224, 256], pendants: [{ x: 76, y: 30 }, { x: 148, y: 30 }, { x: 204, y: 84 }, { x: 244, y: 112 }], rugs: [],
      decor: [
        { kind: 'shelf', x: 22, w: 44, text: '' }, { kind: 'menu', x: 80, w: 64, text: 'MENU' },
        { kind: 'neon', x: 172, w: 44, text: 'COFFEE' }, { kind: 'poster', x: 236, w: 16, text: '' },
      ],
    },
    spawn: { x: 240, y: 168 }, spawnFacing: 'up',
  });
}


/*
 * Bodyscope model room for Q001 (draft, not medically reviewed). One loop stands for the whole circulation:
 * markers leave the heart on the right, travel round the room and come back on the left. Real anatomy
 * (four chambers, two circuits, vessel lengths) is deliberately simplified and introduced in later quests.
 */
function heart(): Room {
  const cols = 28, rows = 18;
  const { tiles, fill } = interiorGrid(cols, rows, T.FLESH, [-1, -1]);
  fill(5, 5, 22, 5, T.VESSEL); fill(5, 14, 22, 14, T.VESSEL); fill(5, 5, 5, 14, T.VESSEL); fill(22, 5, 22, 14, T.VESSEL);
  fill(13, 14, 14, 14, T.BRIDGE);
  return finish({
    id: 'heart', title: '바디스코프 · 심장 모형 입구', cols, rows, tiles, buildings: [], markings: [], npcs: [],
    props: [P('heartcore', 224, 100), P('robot', 256, 190), P('pad', 120, 258), P('terminal', 336, 192)],
    targets: [
      target('heart-out', '내보내는 문', '관찰', 272, 116, 20),
      target('heart-in', '돌아오는 문', '관찰', 176, 116, 20),
      target('guide', '안내 로봇 바디', '대화', 256, 198, 22),
      target('return-pad', '귀환 장치', '귀환', 120, 258, 18),
      target('terminal', '배달 길 연결 장치', '모형 조작', 336, 192, 22),
      target('heart-map', '심장 구조와 탐사 지도', '지도', 56, 258, 20),
    ],
    doors: [],
    modelIndex: 0,
    labels: [{ text: '온몸으로 나가는 길', x: 332, y: 68, tone: 'warm' }, { text: '심장으로 돌아오는 길', x: 112, y: 68, tone: 'cool' }],
    flow: [{ x: 224, y: 88 }, { x: 360, y: 88 }, { x: 360, y: 232 }, { x: 88, y: 232 }, { x: 88, y: 88 }, { x: 224, y: 88 }],
    flowHidden: [{ x: 208, y: 224, w: 32, h: 16 }],
    interior: {
      wall: 'heart', bottom: 'wall', door: [-1, -1], pendants: [], rugs: [],
      decor: [{ kind: 'neon', x: 40, w: 72, text: 'BODYSCOPE' }, { kind: 'sign', x: 168, w: 112, text: 'HEART MODEL' }, { kind: 'neon', x: 336, w: 72, text: 'LOOP' }],
    },
    spawn: { x: 224, y: 258 }, spawnFacing: 'up',
  });
}

/** Detail districts of one explorer. Travel corridors are not blood vessels. */
function modelRoom(id: RoomId, index: number, title: string): Room {
  const cols = 28, rows = 18, { tiles, fill } = interiorGrid(cols, rows, T.FLESH, [-1, -1]);
  const props: Prop[] = [P('robot', 256, 238), P('pad', 120, 258), P('terminal', 360, 240), P('recordboard', 56, 264, 1)];
  const labels: WorldLabel[] = [], streams: ModelStream[] = [];
  const a = { x: 96, y: 164 }, b = { x: 304, y: 216 };
  if (index === 1) {
    props.push(P('heartanatomy', 224, 194, 1), P('observation', a.x, a.y, 0), P('observation', b.x, b.y, 1));
    labels.push({ text: '해부학적 오른쪽', x: 160, y: 62, tone: 'cool' }, { text: '해부학적 왼쪽', x: 284, y: 62, tone: 'warm' }, { text: '중격 · 좌심실의 두꺼운 벽', x: 224, y: 206 });
  } else if (index === 2) {
    fill(4, 7, 23, 7, T.VESSEL); fill(12, 7, 14, 7, T.BRIDGE);
    props.push(P('valve', 112, 128, 0), P('valve', 304, 128, 1), P('heartanatomy', 208, 202, 2));
    labels.push({ text: '삼첨판 · 우심방 → 우심실', x: 112, y: 78, tone: 'cool' }, { text: '승모판 · 좌심방 → 좌심실', x: 314, y: 78, tone: 'warm' });
    streams.push({ path: [{ x: 64, y: 120 }, { x: 384, y: 120 }], tone: 'delivery', speed: 24 });
  } else if (index === 3) {
    props.push(P('lungs', 104, 132), P('muscle', 344, 136, 1), P('heartanatomy', 224, 208, 3));
    labels.push({ text: '폐 쪽 경로', x: 104, y: 70, tone: 'cool' }, { text: '온몸 쪽 경로', x: 344, y: 74, tone: 'warm' });
    streams.push({ path: [{ x: 184, y: 176 }, { x: 64, y: 176 }, { x: 64, y: 104 }, { x: 148, y: 104 }, { x: 148, y: 160 }, { x: 248, y: 160 }], tone: 'return', speed: 24 }, { path: [{ x: 272, y: 176 }, { x: 384, y: 176 }, { x: 384, y: 104 }, { x: 304, y: 104 }, { x: 304, y: 152 }, { x: 184, y: 152 }], tone: 'delivery', speed: 24 });
  } else if (index === 4) {
    props.push(P('heartanatomy', 224, 208, 4));
    for (const [x, y, v] of [[80, 104, 0], [136, 136, 1], [312, 144, 2], [360, 184, 3]]) props.push(P('signalnode', x!, y!, v!));
    labels.push({ text: '동방결절', x: 80, y: 78 }, { text: '방실결절', x: 136, y: 111 }, { text: '히스속 · 푸르키네 섬유', x: 328, y: 120 });
    streams.push({ path: [{ x: 80, y: 100 }, { x: 136, y: 132 }, { x: 312, y: 140 }, { x: 360, y: 180 }], tone: 'signal', speed: 44 });
  } else if (index === 5) {
    props.push(P('heartanatomy', 184, 192, 5), P('muscle', 320, 128, 0));
    labels.push({ text: '대동맥 뿌리 → 관상동맥', x: 164, y: 70, tone: 'warm' }, { text: '심장근육에 공급하는 가지', x: 326, y: 78, tone: 'warm' });
    streams.push({ path: [{ x: 222, y: 110 }, { x: 256, y: 110 }, { x: 256, y: 152 }, { x: 344, y: 152 }], tone: 'delivery', speed: 24 });
  } else {
    props.push(P('recordboard', 112, 124, 0), P('recordboard', 304, 124, 1), P('valve', 208, 192, 2));
    labels.push({ text: '같은 조건에서 관찰하기', x: 112, y: 76 }, { text: '조건과 한계를 함께 기록', x: 304, y: 76 }, { text: '가상 통로 · 실제 진단 수치 아님', x: 224, y: 202 });
    streams.push({ path: [{ x: 72, y: 168 }, { x: 344, y: 168 }], tone: 'delivery', speed: 24 });
  }
  // Distinct low evidence beacons stay outside the structures and can be touched from every side.
  if (index !== 1) props.push(P('observation', a.x, a.y, 0), P('observation', b.x, b.y, 1));
  return finish({ id, title, cols, rows, tiles, buildings: [], markings: [], npcs: [], props, labels, streams, modelIndex: index,
    targets: [target('investigation-a', '첫 관찰 지점', '관찰', a.x, a.y, 22), target('investigation-b', '둘째 관찰 지점', '관찰', b.x, b.y, 22), target('terminal', '취재 모형 연결 장치', '모형 조작', 360, 240, 22), target('guide', '안내 로봇 바디', '대화', 256, 246, 22), target('return-pad', '귀환 장치', '귀환', 120, 258, 18), target('heart-map', '심장 구조와 탐사 지도', '지도', 56, 264, 20)], doors: [],
    interior: { wall: 'heart', bottom: 'wall', door: [-1, -1], pendants: [], rugs: [], decor: [{ kind: 'neon', x: 32, w: 92, text: 'BODYSCOPE' }, { kind: 'sign', x: 136, w: 176, text: ['','CHAMBERS','VALVES','CIRCULATION','SIGNAL','CORONARY','RECORDS'][index]! }] }, spawn: { x: 224, y: 258 }, spawnFacing: 'up' });
}

function lifeRoom(id: 'home' | 'store'): Room {
  const cols = 26, rows = 18, { tiles } = interiorGrid(cols, rows, id === 'home' ? T.WOOD : T.MARBLE, [12, 13]);
  const isHome = id === 'home';
  return finish({ id, title: isHome ? '기자 숙소 · 내 공간' : '오비트 테일러 · 취재 준비실', cols, rows, tiles, buildings: [], markings: [],
    props: isHome ? [P('plant', 40, 96), P('mirror', 336, 104), P('recordboard', 336, 176, 2), P('plant', 360, 240, 1)] : [P('desk', 112, 100, 1), P('clothesrack', 264, 104), P('clothesrack', 340, 104, 1), P('mirror', 368, 184), P('sofa', 72, 204), P('lowtable', 72, 240), P('bookshelf', 312, 200), P('plant', 40, 70)],
    npcs: [], labels: isHome ? [{ text: '옷장 · 외형 꾸미기', x: 336, y: 66 }, { text: '가구와 공간', x: 336, y: 134 }] : [{ text: '옷과 취재 준비물', x: 288, y: 62 }, { text: '선택 구매 · 취재는 무료', x: 112, y: 134 }],
    targets: isHome ? [target('home-edit', '가구와 공간 꾸미기', '꾸미기', 336, 184, 22), target('wardrobe', '옷장과 외형 거울', '외형', 336, 112, 22)] : [target('shop-catalog', '옷·준비물·가구 진열', '구매', 112, 116, 22)],
    doors: [{ id: 'exit', zone: { x: 194, y: 277, w: 28, h: 11 }, to: 'street', arrive: isHome ? { x: 292, y: 148 } : { x: 164, y: 254 }, facing: 'down', label: '논현로 거리' }],
    interior: { wall: 'office', bottom: 'wall', door: [192, 224], pendants: isHome ? [] : [{ x: 264, y: 48 }, { x: 340, y: 48 }], rugs: isHome ? [] : [{ x: 40, y: 170, w: 80, h: 84 }], decor: [{ kind: 'window', x: 28, w: 64, text: '' }, { kind: 'sign', x: 128, w: 160, text: isHome ? 'REPORTER HOME' : 'ORBIT TAILOR' }, { kind: 'notice', x: 320, w: 64, text: '' }] }, spawn: { x: 208, y: 258 }, spawnFacing: 'up' });
}

/** Read-only view of validated application state. A fresh room object invalidates geometry caches. */
export function projectHomeRoom(home: HomeState): Room {
  const base = lifeRoom('home'), size = homeSize(home.kind);
  const furnishings = home.placements.map(p => { const f = footprint(p), r = placementRect(p); return { id: p.id, x: r.x, y: r.y, w: f.w * TILE, h: f.h * TILE, rotated: p.rotated }; });
  return { ...base, title: home.kind === 'house' ? '작은 내 집 · 기자의 작업실' : base.title, furnishings, homeArea: { x: 96, y: 64, w: size.w * TILE, h: size.h * TILE }, solids: [...base.solids, ...furnishings.filter(f => f.id !== 'rug').map(f => ({ x: f.x, y: f.y, w: f.w, h: f.h }))] };
}

export const rooms: Record<RoomId, Room> = { newsroom: newsroom(), lobby: lobby(), street: street(), cafe: cafe(), heart: heart(), 'heart-chambers': modelRoom('heart-chambers', 1, '심장 안 · 네 방과 중격'), 'heart-valves': modelRoom('heart-valves', 2, '심장 안 · 네 판막'), 'heart-circulation': modelRoom('heart-circulation', 3, '심장 안 · 폐와 온몸으로 이어지는 길'), 'heart-signal': modelRoom('heart-signal', 4, '심장 안 · 박동을 전하는 신호'), 'heart-supply': modelRoom('heart-supply', 5, '심장 안 · 심장근육과 관상동맥'), 'heart-conditions': modelRoom('heart-conditions', 6, '심장 안 · 조건과 취재 기록'), home: projectHomeRoom(newHome()), store: lifeRoom('store') };

// Neighboring districts are explored on foot. Unlock decisions remain in application/UI commands.
const heartDistricts: RoomId[] = ['heart', 'heart-chambers', 'heart-valves', 'heart-circulation', 'heart-signal', 'heart-supply', 'heart-conditions'];
for (let i = 0; i < heartDistricts.length; i++) {
  const room = rooms[heartDistricts[i]!];
  for (const direction of [-1, 1]) {
    const neighbor = heartDistricts[i + direction]; if (!neighbor) continue;
    const left = direction < 0, x = left ? 0 : (room.cols - 1) * TILE;
    room.tiles[13 * room.cols + (left ? 0 : room.cols - 1)] = T.FLESH;
    room.doors.push({ id: 'model-link:' + neighbor, zone: { x: x + (left ? 2 : 0), y: 210, w: 14, h: 10 }, to: neighbor, arrive: { x: left ? 408 : 40, y: 216 }, facing: left ? 'left' : 'right', label: rooms[neighbor].title });
  }
}
export function tileAt(room: Room, tx: number, ty: number): number {
  if (tx < 0 || ty < 0 || tx >= room.cols || ty >= room.rows) return T.VOID;
  return room.tiles[ty * room.cols + tx] ?? T.VOID;
}
