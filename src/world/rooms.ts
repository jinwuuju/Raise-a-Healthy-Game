import { TILE, type Dir, type Point, type Rect, type RoomId } from './types';
import type { Look } from '../domain/appearance';
import { heartRooms } from './heart-rooms';
import type { Organ } from './organ-types';

/*
 * Map geometry only (no rendering). Distances are game pixels, 1 tile = 16px.
 * The street keeps the observed relationships of the first prototype: Euro Plaza on the
 * narrow Nonhyeon-ro 159-gil, the wide Nonhyeon-ro beside it, the intersection with
 * crosswalks and the Apgujeong-station direction north. Since the user's street photos (2026-10-14,
 * D088) the lane is lined on its south side by buildings that face Euro Plaza (the fictional Jin-U
 * convenience store block and a granite office) with Nonhyeon-ro 151-gil between them leading to
 * Dosan-daero, and a side street runs north along Euro Plaza's tower end.
 * It is a compressed game map, not a survey.
 */

export const T = {
  VOID: 0, PAVE: 1, ROAD: 2, LANE: 3, CROSS: 4, GRASS: 5, GRAVEL: 6, PARKING: 7, DRIVE: 8,
  PLAZA: 9, TURF: 10, TACTILE: 11, WOOD: 12, MARBLE: 13, HERRING: 14, WALL: 15, FLESH: 16, VESSEL: 17, BRIDGE: 18,
} as const;
const BLOCKED = new Set<number>([T.VOID, T.ROAD, T.WALL]);
export function walkableTile(t: number): boolean { return !BLOCKED.has(t); }

export type BuildingKind = 'europlaza' | 'b2bc' | 'shop' | 'office' | 'hotel' | 'hospital' | 'jinu' | 'granite' | 'brickcorner';
export type Building = { id: string; kind: BuildingKind; x: number; y: number; w: number; d: number; h: number; v: number };

export type PropKind =
  | 'ginkgo' | 'parktree' | 'lamp' | 'bench' | 'planter' | 'bollard' | 'signal' | 'kiosk' | 'signpost' | 'hydrant'
  | 'scooter' | 'bikes' | 'vending' | 'bin' | 'flowerbed' | 'fountain' | 'parkedcar' | 'booth'
  | 'desk' | 'editordesk' | 'chair' | 'bookshelf' | 'bodyscope' | 'sofa' | 'lowtable' | 'printer' | 'water' | 'plant'
  | 'reception' | 'counter' | 'roundtable' | 'cafechair' | 'bar' | 'stool' | 'loungechair'
  | 'pedsignal' | 'robot' | 'pad' | 'papillary'
  | 'cypress' | 'crates' | 'goods' | 'aboard' | 'streetsign' | 'repairbooth';
export type Prop = { kind: PropKind; x: number; y: number; v: number; solid: Rect | null };

export type NpcSpec = { id: string; name: string; x: number; y: number; facing: Dir; look: Look; route: Point[] | null; speed: number };
export type Target = { id: string; label: string; verb: string; x: number; y: number; r: number; npc: string | null };
export type Door = { id: string; zone: Rect; to: RoomId; arrive: Point; facing: Dir; label: string; card?: string | null };
export type Marking = { kind: 'crossV' | 'crossH' | 'dashV' | 'dashH' | 'centerV' | 'centerH' | 'stop' | 'slow30' | 'stall' | 'edgeH' | 'edgeV'; x: number; y: number; w: number; h: number };
export type WallDecor = { kind: 'window' | 'whiteboard' | 'clock' | 'elevator' | 'sign' | 'notice' | 'menu' | 'shelf' | 'poster' | 'mailbox' | 'neon'; x: number; w: number; text: string };
export type Interior = { wall: 'office' | 'lobby' | 'cafe'; decor: WallDecor[]; bottom: 'wall' | 'glass'; door: [number, number]; pendants: Point[]; rugs: Rect[] };

/** Road part of a crosswalk. People may enter it only while the pedestrian light for `road` is green. */
export type Crossing = { id: string; rect: Rect; road: 'NS' | 'EW' };

export type Room = {
  id: RoomId; title: string; cols: number; rows: number; tiles: Uint8Array;
  buildings: Building[]; props: Prop[]; npcs: NpcSpec[]; targets: Target[]; doors: Door[];
  solids: Rect[]; markings: Marking[]; interior: Interior | null; spawn: Point; spawnFacing: Dir;
  crossings: Crossing[];
  /** Bodyscope organ rooms (heart chambers, vessels, lung): smooth walls, valves, blood flow. */
  organ: Organ | null;
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
    case 'robot': return r(12, 5);
    case 'cypress': return r(6, 3);
    case 'crates': return r(14, 4);
    case 'goods': return r(18, 5);
    case 'aboard': return r(10, 3);
    case 'streetsign': return r(3, 3);
    case 'repairbooth': return r(22, 10);
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

type RoomSpec = Omit<Room, 'solids' | 'crossings' | 'organ'> & Partial<Pick<Room, 'crossings'>>;
function finish(spec: RoomSpec): Room {
  const room = { crossings: [], organ: null, ...spec };
  const solids: Rect[] = [];
  for (const b of room.buildings) {
    if (b.y + b.d <= room.rows * TILE) solids.push({ x: b.x, y: b.y, w: b.w, h: b.d });
  }
  for (const p of room.props) if (p.solid) solids.push(p.solid);
  for (const n of room.npcs) if (!n.route) solids.push({ x: n.x - 5, y: n.y - 4, w: 10, h: 5 });
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
  fill(10, 0, 11, 15, T.LANE);            // side street along Euro Plaza's tower (west) side, user photo 5
  fill(14, 18, 15, 25, T.LANE);           // Nonhyeon-ro 151-gil between Jin-U and the granite block, down to Dosan-daero
  fill(24, 26, 29, 27, T.CROSS); fill(24, 34, 29, 35, T.CROSS); fill(21, 28, 22, 33, T.CROSS); fill(31, 28, 32, 33, T.CROSS);
  fill(23, 26, 23, 27, T.TACTILE); fill(30, 26, 30, 27, T.TACTILE); fill(23, 34, 23, 35, T.TACTILE); fill(30, 34, 30, 35, T.TACTILE);
  fill(21, 27, 22, 27, T.TACTILE); fill(21, 34, 22, 34, T.TACTILE); fill(31, 27, 32, 27, T.TACTILE); fill(31, 34, 32, 34, T.TACTILE);
  fill(12, 15, 19, 15, T.PLAZA);          // Euro Plaza front
  fill(20, 10, 20, 15, T.DRIVE);          // parking ramp beside Euro Plaza

  fill(33, 10, 39, 14, T.PARKING);
  fill(33, 15, 39, 20, T.GRASS);
  fill(0, 37, 20, 39, T.VOID); fill(33, 37, 39, 39, T.VOID);
  const buildings: Building[] = [
    B('europlaza', 'europlaza', 12, 10, 8, 5, 112),
    // Directly across the lane, facing Euro Plaza (user photos 2-4, 6; D090): the B2BC cafe, the Jin-U brick block and
    // the granite office, with Nonhyeon-ro 151-gil between the last two. Their fronts (sign, entrance) face north, on
    // the pavement at y = 380; seen from the 3/4 camera that pavement lies behind the buildings, so the world draws
    // the front separately and the body see-through while the reporter is on the north side (art/buildings.ts).
    { id: 'b2bc', kind: 'b2bc', x: 48, y: 380, w: 80, d: 20, h: 76, v: 0 },
    { id: 'jinu', kind: 'jinu', x: 144, y: 380, w: 80, d: 20, h: 76, v: 0 },
    { id: 'granite', kind: 'granite', x: 256, y: 380, w: 96, d: 20, h: 76, v: 0 },
    B('corner', 'brickcorner', 5, 10, 5, 5, 72),
    B('clinic', 'shop', 0, 10, 5, 5, 64, 3),
    B('mart', 'shop', 12, 3, 4, 5, 60, 5),
    B('tower', 'office', 16, 2, 5, 6, 92),
    B('bakery', 'shop', 1, 3, 4, 5, 52, 1),
    B('flower', 'shop', 5, 3, 4, 5, 70, 2),
    B('books', 'shop', 0, 22, 3, 3, 44, 4),
    B('hotel', 'hotel', 34, 3, 6, 6, 110),
    B('hospital', 'hospital', 33, 21, 7, 4, 96),
    // South side of Dosan-daero: only the rooftops are inside the map edge.
    { id: 'south-a', kind: 'shop', x: 0, y: 652, w: 160, d: 48, h: 60, v: 5 },
    { id: 'south-b', kind: 'shop', x: 160, y: 652, w: 176, d: 48, h: 60, v: 4 },
    { id: 'south-c', kind: 'shop', x: 528, y: 652, w: 112, d: 48, h: 60, v: 0 },
  ];
  const props: Prop[] = [];
  for (const y of [40, 120, 200]) props.push(P('ginkgo', 356, y, y % 3));
  for (const y of [312, 392]) props.push(P('ginkgo', 368, y, y % 3));
  for (const y of [40, 120, 200, 280, 360]) props.push(P('ginkgo', 508, y, (y / 40) % 3));
  for (const x of [24, 184, 264, 552, 616]) props.push(P('ginkgo', x, 424, x % 3));
  for (const x of [40, 120, 200, 280, 552, 616]) props.push(P('ginkgo', x, 586, (x / 8) % 3));
  props.push(P('lamp', 356, 160), P('lamp', 368, 360), P('lamp', 508, 160), P('lamp', 508, 320), P('lamp', 72, 412), P('lamp', 312, 412), P('lamp', 584, 412), P('lamp', 72, 586), P('lamp', 312, 586));
  props.push(P('planter', 204, 252), P('planter', 236, 252), P('planter', 90, 412));
  props.push(P('cypress', 308, 251), P('cypress', 318, 251, 1));
  // Jin-U storefront on the lane side: crate stacks, packs on a rack, an A-frame sign and the 151-gil road-name sign.
  props.push(P('crates', 154, 378), P('aboard', 166, 378), P('goods', 206, 378), P('streetsign', 222, 303));
  props.push(P('repairbooth', 334, 378), P('planter', 140, 378, 1));
  props.push(P('signal', 378, 444), P('signal', 490, 444, 1), P('signal', 378, 554, 1), P('signal', 490, 554));
  // Pedestrian lights at both ends of every crosswalk (v: 0 = crossing Nonhyeon-ro, 1 = crossing Dosan-daero).
  props.push(P('pedsignal', 372, 414), P('pedsignal', 492, 414), P('pedsignal', 372, 588), P('pedsignal', 492, 588));
  props.push(P('pedsignal', 330, 444, 1), P('pedsignal', 330, 558, 1), P('pedsignal', 536, 444, 1), P('pedsignal', 536, 558, 1));
  props.push(P('kiosk', 344, 236), P('signpost', 376, 28), P('hydrant', 349, 300), P('scooter', 240, 152), P('bikes', 270, 378));
  props.push(P('vending', 528, 156), P('bin', 40, 250), P('bin', 528, 412), P('booth', 624, 176));
  props.push(P('parkedcar', 552, 234, 1), P('parkedcar', 584, 234, 4), P('parkedcar', 616, 234, 2));
  for (let y = 8; y < 400; y += 24) props.push(P('bollard', 432, y));
  for (let y = 600; y < 640; y += 24) props.push(P('bollard', 432, y));
  const markings: Marking[] = [
    { kind: 'crossV', x: 384, y: 416, w: 96, h: 32 }, { kind: 'crossV', x: 384, y: 544, w: 96, h: 32 },
    { kind: 'crossH', x: 336, y: 448, w: 32, h: 96 }, { kind: 'crossH', x: 496, y: 448, w: 32, h: 96 },
    { kind: 'crossV', x: 160, y: 232, w: 32, h: 16 }, { kind: 'crossV', x: 224, y: 288, w: 32, h: 16 },
    { kind: 'centerV', x: 430, y: 0, w: 5, h: 412 }, { kind: 'centerV', x: 430, y: 580, w: 5, h: 60 },
    { kind: 'centerH', x: 0, y: 494, w: 332, h: 5 }, { kind: 'centerH', x: 534, y: 494, w: 106, h: 5 },
    { kind: 'dashV', x: 407, y: 0, w: 2, h: 412 }, { kind: 'dashV', x: 455, y: 0, w: 2, h: 412 },
    { kind: 'dashV', x: 407, y: 580, w: 2, h: 60 }, { kind: 'dashV', x: 455, y: 580, w: 2, h: 60 },
    { kind: 'dashH', x: 0, y: 471, w: 332, h: 2 }, { kind: 'dashH', x: 0, y: 519, w: 332, h: 2 },
    { kind: 'dashH', x: 534, y: 471, w: 106, h: 2 }, { kind: 'dashH', x: 534, y: 519, w: 106, h: 2 },
    { kind: 'stop', x: 384, y: 411, w: 46, h: 2 }, { kind: 'stop', x: 434, y: 579, w: 46, h: 2 },
    { kind: 'stop', x: 331, y: 497, w: 2, h: 47 }, { kind: 'stop', x: 531, y: 448, w: 2, h: 46 },
    { kind: 'slow30', x: 120, y: 272, w: 0, h: 0 }, { kind: 'slow30', x: 300, y: 272, w: 0, h: 0 }, { kind: 'slow30', x: 240, y: 352, w: 0, h: 0 },
    // Yellow edge lines along the narrow streets (no stopping), broken where side streets join.
    { kind: 'edgeH', x: 0, y: 258, w: 160, h: 1 }, { kind: 'edgeH', x: 192, y: 258, w: 192, h: 1 },
    { kind: 'edgeH', x: 0, y: 285, w: 224, h: 1 }, { kind: 'edgeH', x: 256, y: 285, w: 128, h: 1 },
    { kind: 'edgeV', x: 162, y: 0, w: 1, h: 230 }, { kind: 'edgeV', x: 189, y: 0, w: 1, h: 230 },
    { kind: 'edgeV', x: 226, y: 304, w: 1, h: 112 }, { kind: 'edgeV', x: 253, y: 304, w: 1, h: 112 },
    { kind: 'stall', x: 536, y: 168, w: 32, h: 72 }, { kind: 'stall', x: 568, y: 168, w: 32, h: 72 }, { kind: 'stall', x: 600, y: 168, w: 32, h: 72 },
  ];
  const npcs: NpcSpec[] = [
    npc('w1', '', 372, 16, 'down', walkerLooks[0]!, [{ x: 372, y: 16 }, { x: 372, y: 396 }], 26),
    npc('w2', '', 16, 440, 'right', walkerLooks[1]!, [{ x: 16, y: 440 }, { x: 624, y: 440 }], 22),
    npc('w3', '', 498, 300, 'up', walkerLooks[2]!, [{ x: 498, y: 380 }, { x: 498, y: 16 }], 24),
    npc('w4', '', 600, 566, 'left', walkerLooks[3]!, [{ x: 624, y: 566 }, { x: 16, y: 566 }], 28),
    npc('w5', '', 240, 296, 'down', walkerLooks[4]!, [{ x: 240, y: 296 }, { x: 240, y: 420 }], 18),
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
      target('jinu-store', '진U 편의점', '보기', 183, 368, 16),
      target('alley-151', '논현로151길', '보기', 226, 296, 16),
      target('shoe-repair', '구두 수선대', '보기', 334, 362, 16),
    ],
    doors: [
      { id: 'euro-door', zone: { x: 284, y: 240, w: 17, h: 7 }, to: 'lobby', arrive: { x: 160, y: 168 }, facing: 'up', label: '유로프라자 로비' },
      { id: 'cafe-door', zone: { x: 108, y: 372, w: 17, h: 7 }, to: 'cafe', arrive: { x: 240, y: 168 }, facing: 'up', label: '비투비씨 카페' },
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
    doors: [{ id: 'exit', zone: { x: 226, y: 181, w: 28, h: 11 }, to: 'street', arrive: { x: 116, y: 360 }, facing: 'up', label: '논현로159길' }],
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


export const rooms: Record<RoomId, Room> = { newsroom: newsroom(), lobby: lobby(), street: street(), cafe: cafe(), ...heartRooms() };
export function tileAt(room: Room, tx: number, ty: number): number {
  if (tx < 0 || ty < 0 || tx >= room.cols || ty >= room.rows) return T.VOID;
  return room.tiles[ty * room.cols + tx] ?? T.VOID;
}
