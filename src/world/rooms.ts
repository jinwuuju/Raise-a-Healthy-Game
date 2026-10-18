import { TILE, type Dir, type Point, type Rect, type RoomId } from './types';
import type { Look } from '../domain/appearance';
import { heartRooms } from './heart-rooms';
import type { Organ } from './organ-types';
import { DISTRICT_SIZE, anchors, buildMask, maskBlocked, type CollisionMask, crossroads, crosswalks, dblocks, districtLoaded, droads, dstations, exits, offset, pointAt, polyline, underpasses, zebras } from './district';

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
  PLAZA: 9, TURF: 10, TACTILE: 11, WOOD: 12, MARBLE: 13, HERRING: 14, WALL: 15, FLESH: 16, VESSEL: 17, BRIDGE: 18, OFFICE: 19,
} as const;
const BLOCKED = new Set<number>([T.VOID, T.ROAD, T.WALL]);
export function walkableTile(t: number): boolean { return !BLOCKED.has(t); }

export type BuildingKind = 'europlaza' | 'b2bc' | 'shop' | 'office' | 'hotel' | 'hospital' | 'jinu' | 'granite' | 'brickcorner' | 'small' | 'apartment' | 'tailor';
/** `block`: the whole drawn mass (roof + front, y - h .. y + d) is solid ground, used across narrow lanes so a tall front never hides the lane. */
export type Building = { id: string; kind: BuildingKind; x: number; y: number; w: number; d: number; h: number; v: number; block?: boolean;
  /** Shop sign text; '' = no sign (district buildings until the user names them). */ label?: string };

export type PropKind =
  | 'ginkgo' | 'parktree' | 'lamp' | 'bench' | 'planter' | 'bollard' | 'signal' | 'kiosk' | 'signpost' | 'hydrant'
  | 'scooter' | 'bikes' | 'vending' | 'bin' | 'flowerbed' | 'fountain' | 'parkedcar' | 'booth'
  | 'desk' | 'editordesk' | 'chair' | 'bookshelf' | 'bodyscope' | 'sofa' | 'lowtable' | 'printer' | 'water' | 'plant'
  | 'benchdesk' | 'shortbench' | 'editorbench' | 'lobbytable' | 'lobbyplant' | 'lobbysofa' | 'longbench' | 'meettable' | 'meetchair' | 'sidescreen'
  | 'windowdesk' | 'sidechair' | 'walldesk' | 'bigtable' | 'counterbar' | 'bigsofa' | 'loungetable'
  | 'reception-side' | 'sofa-side' | 'eurodesk' | 'euroeditor' | 'cabinet' | 'greysofa' | 'whitetable' | 'longtable' | 'tallchair' | 'pantry' | 'officechair'
  | 'reception' | 'counter' | 'roundtable' | 'cafechair' | 'bar' | 'stool' | 'loungechair'
  | 'pedsignal' | 'robot' | 'pad' | 'papillary'
  | 'cypress' | 'crates' | 'goods' | 'aboard' | 'streetsign' | 'repairbooth'
  | 'storeshelf' | 'fridge' | 'storecounter' | 'rack' | 'mannequin' | 'mirror' | 'tailorcounter';
export type Prop = { kind: PropKind; x: number; y: number; v: number; solid: Rect | null };

export type NpcSpec = { id: string; name: string; x: number; y: number; facing: Dir; look: Look; route: Point[] | null; speed: number };
export type Target = { id: string; label: string; verb: string; x: number; y: number; r: number; npc: string | null };
export type Door = { id: string; zone: Rect; to: RoomId; arrive: Point; facing: Dir; label: string; card?: string | null;
  /** Toast after arriving (D105 underpasses). */ note?: string };
export type Marking = { kind: 'crossV' | 'crossH' | 'dashV' | 'dashH' | 'centerV' | 'centerH' | 'stop' | 'slow30' | 'stall' | 'edgeH' | 'edgeV'; x: number; y: number; w: number; h: number };
export type WallDecor = { kind: 'window' | 'whiteboard' | 'clock' | 'elevator' | 'sign' | 'notice' | 'menu' | 'shelf' | 'poster' | 'mailbox' | 'neon' | 'jinu' | 'curtain'; x: number; w: number; text: string };
export type Interior = { reference?: 'lobby' | 'lifthall' | 'floor4' | 'office' | 'lift' | 'lounge'; openings?: Rect[];
  /** Translucent glass wall faces: drawn sorted with people at their base line (y + h), over what stands behind them. */
  glass?: Rect[]; wall: 'office' | 'lobby' | 'cafe' | 'store' | 'boutique'; decor: WallDecor[]; bottom: 'wall' | 'glass'; door: [number, number]; pendants: Point[]; rugs: Rect[] };

/** Road part of a crosswalk. People may enter it only while the pedestrian light for `road` is green. */
export type Crossing = { id: string; rect: Rect; road: 'NS' | 'EW'; /** Exact crosswalk band when the road is not axis-aligned (district). */ poly?: Point[] };

export type Room = {
  id: RoomId; title: string; cols: number; rows: number; tiles: Uint8Array;
  buildings: Building[]; props: Prop[]; npcs: NpcSpec[]; targets: Target[]; doors: Door[];
  solids: Rect[]; markings: Marking[]; interior: Interior | null; spawn: Point; spawnFacing: Dir;
  crossings: Crossing[];
  /** Bodyscope organ rooms (heart chambers, vessels, lung): smooth walls, valves, blood flow. */
  organ: Organ | null;
  /** Fine collision mask (1 = blocked) replacing tile walkability for the real-scale district. */
  mask?: CollisionMask;
};

function grid(cols: number, rows: number, base: number) {
  const tiles = new Uint8Array(cols * rows).fill(base);
  const fill = (x0: number, y0: number, x1: number, y1: number, v: number) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (x >= 0 && y >= 0 && x < cols && y < rows) tiles[y * cols + x] = v;
  };
  return { tiles, fill };
}

function solidFor(kind: PropKind, x: number, y: number, v = 0): Rect | null {
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
    case 'eurodesk': case 'desk': return r(48, 14);
    case 'euroeditor': case 'editordesk': return r(64, 16);
    case 'bookshelf': return r(32, 8);
    case 'bodyscope': return r(44, 18);
    case 'greysofa': case 'sofa': return r(48, 12);
    case 'lowtable': return r(28, 7);
    case 'printer': return r(24, 10);
    case 'water': return r(10, 6);
    case 'plant': return r(12, 5);
    case 'reception': return r(64, 14);
    case 'counter': return r(128, 16);
    case 'benchdesk': return r(136, 38);
    case 'editorbench': return r(136, 30);
    case 'shortbench': return r(72, 38);
    case 'longbench': return r(196, 38);
    case 'meettable': return r(108, 20);
    case 'sidescreen': return r(10, 34);
    case 'windowdesk': return r(28, 62);
    case 'walldesk': return r(24, 92);
    case 'bigtable': return r(184, 28);
    case 'counterbar': return r(232, 16);
    case 'bigsofa': return v === 1 ? r(96, 18) : r(28, 60);
    case 'loungetable': return r(44, 12);
    case 'lobbytable': return r(58, 22);
    case 'lobbyplant': return r(24, 12);
    case 'lobbysofa': return r(52, 14);
    case 'reception-side': return r(24, 80);
    case 'sofa-side': return r(18, 48);
    case 'cabinet': return r(48, 10);
    case 'whitetable': return r(36, 12);
    case 'longtable': return r(88, 28);
    case 'pantry': return r(88, 12);
    case 'tallchair': return r(10, 5);
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
    case 'storeshelf': return r(64, 10);
    case 'fridge': return r(48, 10);
    case 'storecounter': return r(66, 14);
    case 'rack': return r(50, 6);
    case 'mannequin': return r(10, 4);
    case 'mirror': return r(14, 4);
    case 'tailorcounter': return r(50, 12);
    default: return null;
  }
}
const P = (kind: PropKind, x: number, y: number, v = 0): Prop => ({ kind, x, y, v, solid: solidFor(kind, x, y, v) });
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
    if (b.block) solids.push({ x: b.x, y: b.y - b.h, w: b.w, h: b.d + b.h });
    else if (b.y + b.d <= room.rows * TILE) solids.push({ x: b.x, y: b.y, w: b.w, h: b.d });
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
  fill(3, 25, 6, 25, T.TURF);             // artificial turf strip at the cafe
  fill(33, 10, 39, 14, T.PARKING);
  fill(33, 15, 39, 20, T.GRASS);
  fill(0, 37, 20, 39, T.VOID); fill(33, 37, 39, 39, T.VOID);
  const buildings: Building[] = [
    B('europlaza', 'europlaza', 12, 10, 8, 5, 112),
    B('b2bc', 'b2bc', 3, 22, 5, 3, 58),
    // Directly across the lane, facing Euro Plaza (user photos 2-4, 6): the Jin-U brick block and the granite office,
    // with Nonhyeon-ro 151-gil between them. Whole blocks are solid so their fronts never hide the lane.
    { id: 'jinu', kind: 'jinu', x: 144, y: 380, w: 80, d: 20, h: 68, v: 0, block: true },
    { id: 'granite', kind: 'granite', x: 256, y: 380, w: 96, d: 20, h: 76, v: 0, block: true },
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
  props.push(P('crates', 152, 307), P('crates', 166, 307, 1), P('goods', 184, 308), P('aboard', 208, 307), P('streetsign', 222, 309));
  props.push(P('repairbooth', 282, 302));
  props.push(P('signal', 378, 444), P('signal', 490, 444, 1), P('signal', 378, 554, 1), P('signal', 490, 554));
  // Pedestrian lights at both ends of every crosswalk (v: 0 = crossing Nonhyeon-ro, 1 = crossing Dosan-daero).
  props.push(P('pedsignal', 372, 414), P('pedsignal', 492, 414), P('pedsignal', 372, 588), P('pedsignal', 492, 588));
  props.push(P('pedsignal', 330, 444, 1), P('pedsignal', 330, 558, 1), P('pedsignal', 536, 444, 1), P('pedsignal', 536, 558, 1));
  props.push(P('kiosk', 344, 236), P('signpost', 376, 28), P('hydrant', 344, 300), P('scooter', 240, 152), P('bikes', 330, 300));
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
      target('jinu-store', '진U 편의점', '보기', 188, 294, 18),
      target('alley-151', '논현로151길', '보기', 226, 296, 16),
      target('shoe-repair', '구두 수선대', '보기', 282, 290, 16),
    ],
    doors: [
      { id: 'euro-door', zone: { x: 284, y: 240, w: 17, h: 7 }, to: 'lobby', arrive: { x: 240, y: 324 }, facing: 'up', label: '유로프라자 로비' },
      { id: 'cafe-door', zone: { x: 108, y: 400, w: 17, h: 7 }, to: 'cafe', arrive: { x: 240, y: 168 }, facing: 'up', label: '비투비씨 카페' },
    ],
  });
}

/**
 * D096-D098: the real-scale district around Euro Plaza (OpenStreetMap geometry, 1 tile = 3 m, 1 km radius), replacing
 * the compressed 'street'. Euro Plaza keeps its approved art; every other building is a tidy block (D097). Built on
 * first use, after loadDistrict() has fetched the map chunk.
 */
function district(): Room {
  const size = DISTRICT_SIZE, cols = size / TILE, rows = cols;
  const tiles = new Uint8Array(cols * rows).fill(T.PAVE);
  const A = anchors, euro: Building = { id: 'europlaza', kind: 'europlaza', ...A.euro, h: 112, v: 0 };
  const euroDoor = A.euroDoor, euroOut = A.euroOut, jinuFront = A.jinuFront, graniteFront = A.graniteFront;
  // D097: every other building is a tidy block drawn with the street building art; no invented names on signs.
  const ids: Record<string, string> = { cafe: 'b2bc', jinu: 'jinu', granite: 'granite' };
  // D103: one small block west of Jin-U becomes the fictional Orbit Tailor clothes shop (game assignment, see exits.tailorId).
  const blocks: Building[] = dblocks.filter(b => b.special !== 'europlaza').map(b => ({ id: b.id === exits.tailorId ? 'tailor' : (b.special && ids[b.special]) || 'b' + b.id,
    kind: (b.id === exits.tailorId ? 'tailor' : b.kind) as BuildingKind, x: b.x, y: b.y, w: b.w, d: b.d, h: b.h, v: b.v, label: '' }));
  // Occupancy at 8 px for quick placement tests (blocks + a little margin).
  const occN = Math.ceil(size / 8), occ = new Uint8Array(occN * occN);
  for (const b of [euro, ...blocks]) for (let y = Math.max(0, Math.floor((b.y - 4) / 8)); y <= Math.min(occN - 1, Math.floor((b.y + b.d + 4) / 8)); y++)
    for (let x = Math.max(0, Math.floor((b.x - 4) / 8)); x <= Math.min(occN - 1, Math.floor((b.x + b.w + 4) / 8)); x++) occ[y * occN + x] = 1;
  const mask = buildMask();
  const free = (p: Point) => p.x > 8 && p.y > 8 && p.x < size - 8 && p.y < size - 8 && !maskBlocked(mask, p.x, p.y) && occ[Math.floor(p.y / 8) * occN + Math.floor(p.x / 8)] === 0;
  const nearCrossing = (p: Point) => Math.hypot(p.x - crossroads.x, p.y - crossroads.y) < 150 || zebras.some(z => Math.hypot(p.x - (z.ends[0].x + z.ends[1].x) / 2, p.y - (z.ends[0].y + z.ends[1].y) / 2) < 70)
    || underpasses.some(u => u.ends.some(e => Math.hypot(p.x - e.x, p.y - e.y) < 40));
  // Ginkgo trees and street lamps along the outer kerbs of every big road (one-way carriageways: their outer side only).
  const props: Prop[] = [];
  for (const r of droads) {
    if (r.kind !== 0 || r.bridge) continue;
    for (const side of r.oneway ? [1] : [1, -1]) {
      const line = polyline(offset(r.pts, side * (r.w / 2 + 9)));
      for (let s = 20; s < line.len; s += 64) {
        const { p } = pointAt(line, s);
        if (nearCrossing(p) || !free(p)) continue;
        const k = Math.round((p.x + p.y) / 64) % 3;
        props.push(P(k === 0 ? 'lamp' : 'ginkgo', Math.round(p.x), Math.round(p.y), Math.abs(k)));
      }
    }
  }
  for (const c of crosswalks) {
    const a = c.poly[0]!, d = c.poly[3]!, u = { x: (d.x - a.x) / 22, y: (d.y - a.y) / 22 };
    for (const e of c.ends) props.push(P('pedsignal', Math.round(e.x + u.x * 17), Math.round(e.y + u.y * 17), c.road === 'NS' ? 0 : 1));
  }
  props.push(P('crates', jinuFront.x - 18, jinuFront.y + 2), P('goods', jinuFront.x + 2, jinuFront.y + 2), P('aboard', jinuFront.x - 36, jinuFront.y + 2));
  props.push(P('repairbooth', graniteFront.x + 26, graniteFront.y + 6));
  props.push(P('cypress', euro.x + 70, euro.y + euro.d + 10), P('cypress', euro.x + 130, euro.y + euro.d + 10, 1));
  const alley = { x: Math.round(euroDoor.x - 70), y: Math.round(euroDoor.y + 64) };
  props.push(P('streetsign', alley.x, alley.y));
  const safeProps = props.filter(p => !p.solid || (free({ x: p.solid.x, y: p.solid.y }) && free({ x: p.solid.x + p.solid.w, y: p.solid.y + p.solid.h })) || p.kind !== 'ginkgo' && p.kind !== 'lamp');
  // Pedestrians on the sidewalks of the big roads (a few per road, deterministic).
  const npcs: NpcSpec[] = [];
  let k = 0;
  for (const r of droads) {
    if (r.kind !== 0 || r.bridge || r.sw <= 0 || npcs.length >= 24) continue;
    const line = polyline(offset(r.pts, r.w / 2 + r.sw / 2)); if (line.len < 400) continue;
    const a = pointAt(line, line.len * 0.2).p, b = pointAt(line, line.len * 0.7).p, route = [a, b].map(p => ({ x: Math.round(p.x), y: Math.round(p.y) }));
    if (!route.every(free)) continue;
    npcs.push(npc('w' + (++k), '', route[0]!.x, route[0]!.y, 'down', walkerLooks[k % walkerLooks.length]!, route, 22 + (k % 6)));
  }
  const snapFree = (p: Point): Point => { for (let r = 0; r < 120; r += 4) for (let a = 0; a < 16; a++) { const q = { x: Math.round(p.x + Math.cos(a * Math.PI / 8) * r), y: Math.round(p.y + Math.sin(a * Math.PI / 8) * r) }; if (free(q)) return q; } return p; };
  // D105: a pedestrian underpass (나들목) under an expressway is a pair of stair entrances; stepping in comes out on the far side.
  const face = (v: Point): Dir => Math.abs(v.x) > Math.abs(v.y) ? (v.x > 0 ? 'right' : 'left') : (v.y > 0 ? 'down' : 'up');
  const underDoors: Door[] = underpasses.flatMap((u, i) => ([0, 1] as const).map(k => {
    // out: direction away from the road on the far side; the stair's own zone sits a little back from the kerb (at - out).
    const at = u.ends[k], far = u.ends[1 - k]!, out = k === 0 ? u.dir : { x: -u.dir.x, y: -u.dir.y };
    return { id: 'under-' + i + '-' + k, zone: { x: Math.round(at.x - out.x * 5 - 8), y: Math.round(at.y - out.y * 5 - 7), w: 16, h: 14 }, to: 'district' as RoomId,
      arrive: snapFree({ x: far.x + out.x * 20, y: far.y + out.y * 20 }), facing: face(out), label: '나들목 지하보도', note: '나들목 지하보도로 길을 건넜어요.' };
  }));
  const apgu = dstations.find(s => s.name === '압구정'), station = snapFree(apgu ?? { x: crossroads.x, y: 60 });
  return finish({
    id: 'district', title: '신사·압구정 일대 · 유로프라자 반경 1km (실제 축척)', cols, rows, tiles, buildings: [euro, ...blocks], props: safeProps, npcs, markings: [], interior: null,
    mask,
    crossings: crosswalks.map(c => ({ id: c.id, road: c.road, poly: c.core, rect: bbox(c.core) })),
    spawn: euroOut, spawnFacing: 'down',
    targets: [
      target('street-notice', '거리 안내판', '보기', euro.x + 44, euro.y + euro.d + 18, 18),
      target('station', '압구정역', '보기', station.x, station.y, 18),
      target('jinu-store', '진U 편의점', '보기', jinuFront.x - 18, jinuFront.y, 16),
      target('alley-151', '논현로151길', '보기', alley.x, alley.y - 4, 16),
      target('shoe-repair', '구두 수선대', '보기', graniteFront.x + 26, graniteFront.y - 2, 16),
    ],
    doors: [
      { id: 'euro-door', zone: euroDoor, to: 'lobby', arrive: { x: 240, y: 324 }, facing: 'up', label: '유로프라자 로비' },
      { id: 'cafe-door', zone: { x: A.cafeDoor.x - 8, y: A.cafeDoor.y - 6, w: 17, h: 12 }, to: 'cafe', arrive: { x: 240, y: 168 }, facing: 'up', label: '비투비씨 카페' },
      { id: 'jinu-door', zone: A.jinuDoor, to: 'jinu', arrive: { x: 128, y: 152 }, facing: 'up', label: '진U 편의점' },
      { id: 'tailor-door', zone: A.tailorDoor, to: 'tailor', arrive: { x: 128, y: 168 }, facing: 'up', label: '오비트 테일러' },
      ...underDoors,
    ],
  });
}
const bbox = (pts: Point[]): Rect => { const xs = pts.map(p => p.x), ys = pts.map(p => p.y), x = Math.min(...xs), y = Math.min(...ys); return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }; };

function interiorGrid(cols: number, rows: number, floor: number, door: [number, number]) {
  const g = grid(cols, rows, floor);
  g.fill(0, 0, cols - 1, 2, T.WALL);
  g.fill(0, rows - 1, cols - 1, rows - 1, T.WALL);
  g.fill(0, 0, 0, rows - 1, T.WALL);
  g.fill(cols - 1, 0, cols - 1, rows - 1, T.WALL);
  g.fill(door[0], rows - 1, door[1], rows - 1, floor);
  return g;
}

export const ceoLook: Look = { build: 'f', hair: 'long', face: 'calm', shape: 'oval', skin: 'fair', hairColor: 'ink', outfit: 'suit' };
export const editorLook: Look = { build: 'f', hair: 'bob', face: 'calm', shape: 'oval', skin: 'honey', hairColor: 'brown', outfit: 'suit', glasses: true };
export const seniorLook: Look = { build: 'f', hair: 'ponytail', face: 'bright', shape: 'oval', skin: 'peach', hairColor: 'chestnut', outfit: 'reporter' };
export const guardLook: Look = { build: 'm', hair: 'buzz', face: 'smile', shape: 'round', skin: 'tan', hairColor: 'ink', outfit: 'uniform' };
export const baristaLook: Look = { build: 'f', hair: 'bob', face: 'doe', shape: 'round', skin: 'fair', hairColor: 'brown', outfit: 'apron' };
export const jinuClerkLook: Look = { build: 'm', hair: 'part', face: 'smile', shape: 'round', skin: 'peach', hairColor: 'brown', outfit: 'apron' };
export const tailorLook: Look = { build: 'f', hair: 'layered', face: 'calm', shape: 'oval', skin: 'honey', hairColor: 'lavender', outfit: 'coat', glasses: true };

/** D095 (user): three rows. Top: the CEO's desk at the far left, the editor-in-chief alone at the long desk in the middle,
 * the Bodyscope at the far right end. Below: the facing desk islands, now two identical rows. Cabinets along the back. */
function newsroom(): Room {
  const cols = 32, rows = 28;
  const { tiles } = interiorGrid(cols, rows, T.OFFICE, [20, 21]);
  const islands = (y: number) => [
    ...[112, 280].flatMap(x => [P('benchdesk', x, y), ...[-48, 0, 48].flatMap(dx => [P('officechair', x + dx, y - 50, 1), P('officechair', x + dx, y + 17)])]),
    P('shortbench', 432, y), P('officechair', 416, y - 50, 1), P('officechair', 448, y - 50, 1), P('officechair', 416, y + 17), P('officechair', 448, y + 17),
  ];
  return finish({
    id: 'newsroom', title: '유로프라자 4층 · 안쪽 사무실 · 메디컬 데스크', cols, rows, tiles, buildings: [], markings: [],
    props: [
      P('euroeditor', 88, 104), P('editorbench', 256, 120), P('bodyscope', 464, 120),
      ...islands(230), ...islands(350),
      ...[56, 112, 168, 224, 280, 392].map(x => P('cabinet', x, 428)), P('printer', 452, 424),
    ],
    npcs: [npc('ceo', '대표', 88, 86, 'down', ceoLook), npc('editor', '편집장', 256, 84, 'down', editorLook), npc('senior', '선배 기자', 112, 178, 'down', seniorLook)],
    targets: [
      target('ceo', '대표', '대화', 88, 108, 22, 'ceo'), target('editor', '편집장', '대화', 256, 128, 22, 'editor'),
      target('senior', '선배 기자', '대화', 112, 182, 18, 'senior'),
      target('my-desk', '내 자리', '살펴보기', 160, 176, 18), target('device', '바디스코프', '살펴보기', 464, 126, 22),
      target('shelf', '뒤쪽 자료 캐비닛', '살펴보기', 168, 412, 18),
    ],
    doors: [{ id: 'office-exit', zone: { x: 322, y: 437, w: 28, h: 11 }, to: 'floor4', arrive: { x: 416, y: 72 }, facing: 'down', label: '4층 복도 · 엘리베이터 방향' }],
    interior: {
      reference: 'office', wall: 'office', bottom: 'wall', door: [320, 352], pendants: [], rugs: [],
      decor: [22, 76, 140, 340, 390, 440].map(x => ({ kind: 'window' as const, x, w: 46, text: '' })),
    },
    // D100: new reporters (and every new session) start just in front of the editor's desk, facing the editor.
    spawn: { x: 256, y: 152 }, spawnFacing: 'up',
  });
}

function lobby(): Room {
  // User floor sketch, 2026-10-14 16:29 (approved look kept). D094: lift hall behind the divider (separate map).
  // D095: one column narrower on the left (the recess was mostly empty), everything else shifted with it.
  const cols = 23, rows = 22;
  const g = interiorGrid(cols, rows, T.MARBLE, [14, 15]);
  g.fill(0, 16, 7, 21, T.WALL); // Large lower-left wall, with TV/sofa on its right face.
  g.fill(7, 3, 7, 10, T.WALL); // Divider behind the vertical reception desk; go around its bottom.
  g.fill(2, 2, 4, 2, T.MARBLE); // Opening into the lift hall, inside the left recess.
  return finish({
    id: 'lobby', title: '유로프라자 · 1층 로비', cols, rows, tiles: g.tiles, buildings: [], markings: [],
    props: [
      P('lobbysofa', 158, 292), P('reception-side', 176, 148), P('lobbytable', 272, 176),
      P('loungechair', 228, 224, 2), P('loungechair', 320, 218, 2), P('lobbyplant', 328, 302),
    ],
    npcs: [npc('guard', '안내 데스크', 148, 110, 'right', guardLook)],
    targets: [target('guard', '안내 데스크', '대화', 148, 132, 22, 'guard'), target('notice', '입주 안내', '보기', 152, 58, 18), target('lobby-tv', '로비 TV와 소파', '보기', 160, 278, 20)],
    doors: [
      { id: 'elevator', zone: { x: 36, y: 32, w: 40, h: 11 }, to: 'lifthall', arrive: { x: 72, y: 166 }, facing: 'up', label: '엘리베이터 통로' },
      { id: 'front', zone: { x: 226, y: 341, w: 28, h: 11 }, to: 'district', arrive: exits.euroOut, facing: 'down', label: '논현로151길' },
    ],
    interior: {
      reference: 'lobby', wall: 'lobby', bottom: 'wall', door: [224, 256], pendants: [], rugs: [],
      decor: [{ kind: 'notice', x: 136, w: 32, text: '' }],
    },
    spawn: { x: 240, y: 324 }, spawnFacing: 'up',
  });
}

/** D094: the passage to the lift, its own map so that the lift doors are seen head-on on the back wall. */
function lifthall(): Room {
  const cols = 12, rows = 12, g = grid(cols, rows, T.WALL);
  g.fill(1, 5, 10, 10, T.MARBLE);
  g.fill(3, 11, 5, 11, T.MARBLE); // opening back to the lobby
  return finish({
    id: 'lifthall', title: '유로프라자 · 1층 엘리베이터 통로', cols, rows, tiles: g.tiles, buildings: [], markings: [], npcs: [],
    props: [],
    targets: [target('lift-call', '엘리베이터 · 호출 버튼', '보기', 142, 92, 16)],
    doors: [
      { id: 'lift', zone: { x: 70, y: 80, w: 52, h: 8 }, to: 'lift1', arrive: { x: 80, y: 128 }, facing: 'up', label: '엘리베이터 타기' },
      { id: 'lobby', zone: { x: 52, y: 181, w: 40, h: 11 }, to: 'lobby', arrive: { x: 56, y: 68 }, facing: 'down', label: '1층 로비' },
    ],
    interior: { reference: 'lifthall', wall: 'lobby', bottom: 'wall', door: [48, 96], pendants: [], rugs: [], decor: [] },
    spawn: { x: 72, y: 166 }, spawnFacing: 'up',
  });
}

/** The cabin is saved at its current floor, so reload and cancellation keep the exit unambiguous. */
function lift(floor: 1 | 4): Room {
  const cols = 10, rows = 10;
  const { tiles } = interiorGrid(cols, rows, T.MARBLE, [4, 5]);
  return finish({
    id: floor === 1 ? 'lift1' : 'lift4', title: `유로프라자 · 엘리베이터 · ${floor}층`, cols, rows, tiles,
    props: [], npcs: [], buildings: [], markings: [],
    targets: [target('lift-panel', '층 선택 · 1층 / 4층', '누르기', 132, 84, 24)],
    doors: [{ id: 'lift-exit', zone: { x: 66, y: 149, w: 28, h: 11 }, to: floor === 1 ? 'lifthall' : 'floor4',
      arrive: floor === 1 ? { x: 96, y: 100 } : { x: 416, y: 488 }, facing: floor === 1 ? 'down' : 'up', label: floor === 1 ? '1층 엘리베이터 통로' : '4층 입구' }],
    interior: { reference: 'lift', wall: 'lobby', bottom: 'wall', door: [64, 96], pendants: [], rugs: [], decor: [{ kind: 'sign', x: 56, w: 48, text: String(floor) + 'F' }] },
    spawn: { x: 80, y: 112 }, spawnFacing: 'up',
  });
}

/**
 * D094 4th floor (one map): lift landing at the bottom, corridor up the right side to the inner office, the lounge door on
 * the corridor's right wall near the landing, and on the left a doorless open office: two long shared desk islands
 * (6 facing seats per side each), windows along its left wall and two glass meeting rooms along its back wall.
 */
export const FLOOR4 = {
  // D095: islands moved toward the corridor; two window desks (2 seats each) face the left-wall windows.
  islands: [280, 400] as const, islandX: 232, seatXs: [152, 184, 216, 248, 280, 312] as const,
  windowDesks: [290, 400] as const,
  // Meeting rooms: the display is flush on the room's left wall and the table's end touches it.
  meeting: [{ id: 'meeting-a', x0: 16, x1: 176, door: [128, 160] as const, table: 86, screen: 22 },
    { id: 'meeting-b', x0: 192, x1: 352, door: [304, 336] as const, table: 262, screen: 198 }] as const,
  glassY: 160, officeRight: 384,
};
function floor4(): Room {
  const cols = 30, rows = 33, g = grid(cols, rows, T.WALL);
  g.fill(1, 11, 22, 27, T.OFFICE);    // open office
  g.fill(23, 11, 23, 27, T.OFFICE);   // doorless edge to the corridor
  g.fill(1, 3, 10, 9, T.OFFICE);      // meeting room A
  g.fill(12, 3, 21, 9, T.OFFICE);     // meeting room B
  g.fill(8, 10, 9, 10, T.OFFICE); g.fill(19, 10, 20, 10, T.OFFICE); // meeting room openings in the glass front
  g.fill(24, 3, 28, 28, T.OFFICE);    // corridor
  g.fill(19, 29, 28, 31, T.OFFICE);   // lift landing
  g.fill(25, 32, 26, 32, T.OFFICE);   // lift doors
  g.fill(29, 25, 29, 26, T.OFFICE);   // lounge doorway (threshold only)
  const chairs = (y: number, v: number) => FLOOR4.seatXs.map(x => P('officechair', x, y, v));
  const meet = FLOOR4.meeting.flatMap(m => [P('meettable', m.table, 124), P('sidescreen', m.screen, 134),
    ...[-42, -14, 14, 42].flatMap((dx, i) => [P('meetchair', m.table + dx, 96, i % 2), P('meetchair', m.table + dx, 146, 2 + ((i + 1) % 2))])]);
  const windowDesks = FLOOR4.windowDesks.flatMap(y => [P('windowdesk', 31, y), P('sidechair', 60, y - 50), P('sidechair', 60, y - 18)]);
  return finish({
    id: 'floor4', title: '유로프라자 4층 · 입구 · 복도와 열린 사무실', cols, rows, tiles: g.tiles,
    buildings: [], markings: [], npcs: [],
    props: [
      ...FLOOR4.islands.flatMap(y => [P('longbench', FLOOR4.islandX, y), ...chairs(y - 50, 1), ...chairs(y + 17, 0)]),
      ...meet, ...windowDesks,
      P('cabinet', 304, 446), P('cabinet', 352, 446),
      P('whitetable', 344, 492), P('loungechair', 380, 498, 2),
    ],
    targets: [
      target('closed-glass', '닫힌 유리문', '보기', 316, 488, 18),
      target('outer-desks', '열린 바깥 사무실', '보기', 360, 312, 22),
      target('window-desks', '창가 자리', '보기', 84, 312, 18),
      target('meeting-a', '회의실 1', '보기', 144, 154, 16),
      target('meeting-b', '회의실 2', '보기', 320, 154, 16),
      target('corridor-guide', '사무실 안내', '보기', 450, 232, 18),
    ],
    doors: [
      { id: 'lift', zone: { x: 402, y: 517, w: 28, h: 11 }, to: 'lift4', arrive: { x: 80, y: 128 }, facing: 'up', label: '엘리베이터 · 4층' },
      { id: 'lounge', zone: { x: 471, y: 404, w: 9, h: 24 }, to: 'lounge', arrive: { x: 36, y: 176 }, facing: 'right', label: '라운지 들어가기' },
      { id: 'inner', zone: { x: 404, y: 48, w: 24, h: 8 }, to: 'newsroom', arrive: { x: 336, y: 416 }, facing: 'up', label: '안쪽 사무실 · 내 자리' },
    ],
    interior: {
      reference: 'floor4', wall: 'office', bottom: 'wall', door: [400, 432], pendants: [], rugs: [], decor: [],
      // Translucent glass fronts of the two meeting rooms (drawn over what is behind them, under people in front).
      glass: [{ x: 16, y: 132, w: 112, h: 44 }, { x: 160, y: 132, w: 32, h: 44 }, { x: 192, y: 132, w: 112, h: 44 }, { x: 336, y: 132, w: 16, h: 44 }],
    },
    spawn: { x: 416, y: 488 }, spawnFacing: 'up',
  });
}

function lounge(): Room {
  // Separate room entered from the corridor's right wall. D095 (user): dining table twice as long with twice the chairs,
  // a longer and deeper counter in front, no sink or plant, a one-row desk with chairs on the left wall, two larger sofas
  // against the walls next to the door and a larger low table beside them.
  const cols = 24, rows = 18, g = interiorGrid(cols, rows, T.OFFICE, [-1, -1]);
  g.fill(0, 10, 0, 11, T.OFFICE);
  return finish({
    id: 'lounge', title: '유로프라자 4층 · 라운지', cols, rows, tiles: g.tiles, buildings: [], markings: [], npcs: [],
    props: [
      P('bigtable', 226, 120), ...[-80, -48, -16, 16, 48, 80].flatMap(dx => [P('tallchair', 226 + dx, 88), P('tallchair', 226 + dx, 138)]),
      P('walldesk', 30, 152), ...[80, 112, 144].map(y => P('sidechair', 56, y, 1)),
      P('counterbar', 236, 214),
      P('bigsofa', 32, 270, 0), P('bigsofa', 112, 271, 1), P('loungetable', 192, 266),
    ],
    targets: [target('lounge-table', '4층 라운지', '보기', 226, 160, 20)],
    doors: [{ id: 'corridor', zone: { x: 0, y: 164, w: 9, h: 24 }, to: 'floor4', arrive: { x: 448, y: 416 }, facing: 'left', label: '4층 복도' }],
    interior: { reference: 'lounge', wall: 'office', bottom: 'wall', door: [-1, -1], openings: [{ x: 0, y: 160, w: 16, h: 32 }],
      pendants: [{ x: 178, y: 64 }, { x: 226, y: 64 }, { x: 274, y: 64 }], rugs: [],
      decor: [{ kind: 'window', x: 240, w: 96, text: '' }] },
    spawn: { x: 36, y: 176 }, spawnFacing: 'right',
  });
}

/* D093 geometry, kept only to recognise positions in older saves (src/domain/state.ts). Never routed to. */
function lobbyD093(): Room {
  // User floor sketch, 2026-10-14 16:29. Bottom entrance; lift in the left recess.
  const cols = 24, rows = 22;
  const g = interiorGrid(cols, rows, T.MARBLE, [15, 16]);
  g.fill(0, 16, 8, 21, T.WALL); // Large lower-left wall, with TV/sofa on its right face.
  g.fill(8, 3, 8, 10, T.WALL); // Divider behind the vertical reception desk; go around its bottom.
  g.fill(0, 5, 0, 6, T.MARBLE); // Lift on the left-facing wall.
  return finish({
    id: 'lobby', title: '유로프라자 · 1층 로비', cols, rows, tiles: g.tiles, buildings: [], markings: [],
    props: [
      P('lobbysofa', 174, 292), P('reception-side', 192, 148), P('lobbytable', 288, 176),
      P('loungechair', 244, 224, 2), P('loungechair', 336, 218, 2), P('lobbyplant', 344, 302),
    ],
    npcs: [npc('guard', '안내 데스크', 164, 110, 'right', guardLook)],
    targets: [target('guard', '안내 데스크', '대화', 164, 132, 22, 'guard'), target('notice', '입주 안내', '보기', 72, 58, 18), target('lobby-tv', '로비 TV와 소파', '보기', 176, 278, 20)],
    doors: [
      { id: 'elevator', zone: { x: 0, y: 84, w: 9, h: 24 }, to: 'lift1', arrive: { x: 80, y: 128 }, facing: 'up', label: '엘리베이터 · 1층' },
      { id: 'front', zone: { x: 242, y: 341, w: 28, h: 11 }, to: 'street', arrive: { x: 292, y: 254 }, facing: 'down', label: '논현로' },
    ],
    interior: {
      reference: 'lobby', wall: 'lobby', bottom: 'wall', door: [240, 272], pendants: [], rugs: [],
      openings: [{ x: 0, y: 80, w: 16, h: 32 }], decor: [{ kind: 'notice', x: 52, w: 32, text: '' }],
    },
    spawn: { x: 256, y: 324 }, spawnFacing: 'up',
  });
}

function floor4D093(): Room {
  const cols = 24, rows = 28, g = grid(cols, rows, T.WALL);
  g.fill(16, 3, 20, 25, T.OFFICE);
  g.fill(7, 24, 20, 26, T.OFFICE);
  g.fill(17, 27, 18, 27, T.OFFICE);
  g.fill(16, 24, 16, 24, T.WALL); g.fill(19, 24, 20, 24, T.WALL);
  // Open-plan outer office: a wide, doorless connection, on this same map.
  g.fill(1, 3, 14, 13, T.OFFICE); g.fill(15, 4, 15, 13, T.OFFICE);
  // Only a threshold is visible here; lounge furniture belongs to a separate room.
  g.fill(15, 20, 15, 21, T.OFFICE);
  return finish({
    id: 'floor4', title: '유로프라자 4층 · 입구 · 복도와 열린 사무실', cols, rows, tiles: g.tiles,
    buildings: [], markings: [], npcs: [],
    props: [
      P('benchdesk', 120, 152), ...[72, 120, 168].flatMap(x => [P('officechair', x, 102, 1), P('officechair', x, 169)]),
      P('cabinet', 64, 212), P('cabinet', 120, 212),
      P('whitetable', 178, 420), P('loungechair', 140, 426, 2),
    ],
    targets: [
      target('closed-glass', '닫힌 유리문', '보기', 116, 406, 18),
      target('outer-desks', '열린 바깥 사무실', '보기', 208, 176, 20),
      target('corridor-guide', '사무실 안내', '보기', 322, 208, 20),
    ],
    doors: [
      { id: 'lift', zone: { x: 274, y: 437, w: 28, h: 11 }, to: 'lift4', arrive: { x: 80, y: 128 }, facing: 'up', label: '엘리베이터 · 4층' },
      { id: 'lounge', zone: { x: 240, y: 324, w: 8, h: 24 }, to: 'lounge', arrive: { x: 348, y: 176 }, facing: 'left', label: '라운지 들어가기' },
      { id: 'inner', zone: { x: 276, y: 48, w: 24, h: 8 }, to: 'newsroom', arrive: { x: 336, y: 352 }, facing: 'up', label: '안쪽 사무실 · 내 자리' },
    ],
    interior: { reference: 'floor4', wall: 'office', bottom: 'wall', door: [272, 304], pendants: [], rugs: [], decor: [] },
    spawn: { x: 288, y: 416 }, spawnFacing: 'up',
  });
}

function loungeD093(): Room {
  const cols = 24, rows = 16, g = interiorGrid(cols, rows, T.OFFICE, [-1, -1]);
  g.fill(23, 10, 23, 11, T.OFFICE);
  return finish({
    id: 'lounge', title: '유로프라자 4층 · 라운지', cols, rows, tiles: g.tiles, buildings: [], markings: [], npcs: [],
    props: [P('longtable', 156, 148), ...[124, 156, 188].flatMap(x => [P('tallchair', x, 116), P('tallchair', x, 166)]),
      P('pantry', 80, 72), P('roundtable', 284, 120, 2), P('loungechair', 274, 148, 2),
      P('bar', 128, 222), P('plant', 306, 222, 1)],
    targets: [target('lounge-table', '4층 라운지', '보기', 156, 184, 20)],
    doors: [{ id: 'corridor', zone: { x: 375, y: 164, w: 9, h: 24 }, to: 'floor4', arrive: { x: 272, y: 336 }, facing: 'right', label: '4층 복도' }],
    interior: { reference: 'lounge', wall: 'office', bottom: 'wall', door: [-1, -1], openings: [{ x: 368, y: 160, w: 16, h: 32 }],
      pendants: [{ x: 124, y: 88 }, { x: 156, y: 88 }, { x: 188, y: 88 }], rugs: [],
      decor: [{ kind: 'window', x: 240, w: 96, text: '' }] },
    spawn: { x: 348, y: 176 }, spawnFacing: 'left',
  });
}

/* D094 geometry (2026-10-15 first preview), kept only to recognise positions in older saves. */
const FLOOR4_D094 = {
  islands: [280, 400] as const, islandX: 168, seatXs: [88, 120, 152, 184, 216, 248] as const,
  meeting: [{ id: 'meeting-a', x0: 16, x1: 176, door: [128, 160] as const, table: 112, screen: 26 },
    { id: 'meeting-b', x0: 192, x1: 352, door: [304, 336] as const, table: 288, screen: 202 }] as const,
  glassY: 160, officeRight: 384,
};
function lobbyD094(): Room {
  // User floor sketch, 2026-10-14 16:29 (D092/D093 approved look kept). D094: the lift is no longer a small side
  // opening here; behind the divider an opening in the back wall leads to a separate lift hall that faces the doors.
  const cols = 24, rows = 22;
  const g = interiorGrid(cols, rows, T.MARBLE, [15, 16]);
  g.fill(0, 16, 8, 21, T.WALL); // Large lower-left wall, with TV/sofa on its right face.
  g.fill(8, 3, 8, 10, T.WALL); // Divider behind the vertical reception desk; go around its bottom.
  g.fill(2, 2, 4, 2, T.MARBLE); // Opening into the lift hall, inside the left recess.
  return finish({
    id: 'lobby', title: '유로프라자 · 1층 로비', cols, rows, tiles: g.tiles, buildings: [], markings: [],
    props: [
      P('lobbysofa', 174, 292), P('reception-side', 192, 148), P('lobbytable', 288, 176),
      P('loungechair', 244, 224, 2), P('loungechair', 336, 218, 2), P('lobbyplant', 344, 302),
    ],
    npcs: [npc('guard', '안내 데스크', 164, 110, 'right', guardLook)],
    targets: [target('guard', '안내 데스크', '대화', 164, 132, 22, 'guard'), target('notice', '입주 안내', '보기', 112, 58, 18), target('lobby-tv', '로비 TV와 소파', '보기', 176, 278, 20)],
    doors: [
      { id: 'elevator', zone: { x: 36, y: 32, w: 40, h: 11 }, to: 'lifthall', arrive: { x: 72, y: 166 }, facing: 'up', label: '엘리베이터 통로' },
      { id: 'front', zone: { x: 242, y: 341, w: 28, h: 11 }, to: 'street', arrive: { x: 292, y: 254 }, facing: 'down', label: '논현로' },
    ],
    interior: {
      reference: 'lobby', wall: 'lobby', bottom: 'wall', door: [240, 272], pendants: [], rugs: [],
      decor: [{ kind: 'notice', x: 100, w: 24, text: '' }],
    },
    spawn: { x: 256, y: 324 }, spawnFacing: 'up',
  });
}

function floor4D094(): Room {
  const cols = 30, rows = 33, g = grid(cols, rows, T.WALL);
  g.fill(1, 11, 22, 27, T.OFFICE);    // open office
  g.fill(23, 11, 23, 27, T.OFFICE);   // doorless edge to the corridor
  g.fill(1, 3, 10, 9, T.OFFICE);      // meeting room A
  g.fill(12, 3, 21, 9, T.OFFICE);     // meeting room B
  g.fill(8, 10, 9, 10, T.OFFICE); g.fill(19, 10, 20, 10, T.OFFICE); // meeting room openings in the glass front
  g.fill(24, 3, 28, 28, T.OFFICE);    // corridor
  g.fill(19, 29, 28, 31, T.OFFICE);   // lift landing
  g.fill(25, 32, 26, 32, T.OFFICE);   // lift doors
  g.fill(29, 25, 29, 26, T.OFFICE);   // lounge doorway (threshold only)
  const chairs = (y: number, v: number) => FLOOR4_D094.seatXs.map(x => P('officechair', x, y, v));
  const meet = FLOOR4_D094.meeting.flatMap(m => [P('meettable', m.table, 124), P('sidescreen', m.screen, 134),
    ...[-42, -14, 14, 42].flatMap((dx, i) => [P('meetchair', m.table + dx, 96, i % 2), P('meetchair', m.table + dx, 146, 2 + ((i + 1) % 2))])]);
  return finish({
    id: 'floor4', title: '유로프라자 4층 · 입구 · 복도와 열린 사무실', cols, rows, tiles: g.tiles,
    buildings: [], markings: [], npcs: [],
    props: [
      ...FLOOR4_D094.islands.flatMap(y => [P('longbench', FLOOR4_D094.islandX, y), ...chairs(y - 50, 1), ...chairs(y + 17, 0)]),
      ...meet,
      P('cabinet', 304, 446), P('cabinet', 352, 446),
      P('whitetable', 344, 492), P('loungechair', 380, 498, 2),
    ],
    targets: [
      target('closed-glass', '닫힌 유리문', '보기', 316, 488, 18),
      target('outer-desks', '열린 바깥 사무실', '보기', 300, 300, 22),
      target('meeting-a', '회의실 1', '보기', 144, 154, 16),
      target('meeting-b', '회의실 2', '보기', 320, 154, 16),
      target('corridor-guide', '사무실 안내', '보기', 450, 232, 18),
    ],
    doors: [
      { id: 'lift', zone: { x: 402, y: 517, w: 28, h: 11 }, to: 'lift4', arrive: { x: 80, y: 128 }, facing: 'up', label: '엘리베이터 · 4층' },
      { id: 'lounge', zone: { x: 471, y: 404, w: 9, h: 24 }, to: 'lounge', arrive: { x: 36, y: 176 }, facing: 'right', label: '라운지 들어가기' },
      { id: 'inner', zone: { x: 404, y: 48, w: 24, h: 8 }, to: 'newsroom', arrive: { x: 336, y: 352 }, facing: 'up', label: '안쪽 사무실 · 내 자리' },
    ],
    interior: {
      reference: 'floor4', wall: 'office', bottom: 'wall', door: [400, 432], pendants: [], rugs: [], decor: [],
      // Translucent glass fronts of the two meeting rooms (drawn over what is behind them, under people in front).
      glass: [{ x: 16, y: 132, w: 112, h: 44 }, { x: 160, y: 132, w: 32, h: 44 }, { x: 192, y: 132, w: 112, h: 44 }, { x: 336, y: 132, w: 16, h: 44 }],
    },
    spawn: { x: 416, y: 488 }, spawnFacing: 'up',
  });
}

function loungeD094(): Room {
  // Separate room entered from the corridor's right wall (D094 moved the corridor to the right of the open office).
  const cols = 24, rows = 16, g = interiorGrid(cols, rows, T.OFFICE, [-1, -1]);
  g.fill(0, 10, 0, 11, T.OFFICE);
  return finish({
    id: 'lounge', title: '유로프라자 4층 · 라운지', cols, rows, tiles: g.tiles, buildings: [], markings: [], npcs: [],
    props: [P('longtable', 156, 148), ...[124, 156, 188].flatMap(x => [P('tallchair', x, 116), P('tallchair', x, 166)]),
      P('pantry', 80, 72), P('roundtable', 284, 120, 2), P('loungechair', 274, 148, 2),
      P('bar', 128, 222), P('plant', 306, 222, 1)],
    targets: [target('lounge-table', '4층 라운지', '보기', 156, 184, 20)],
    doors: [{ id: 'corridor', zone: { x: 0, y: 164, w: 9, h: 24 }, to: 'floor4', arrive: { x: 448, y: 416 }, facing: 'left', label: '4층 복도' }],
    interior: { reference: 'lounge', wall: 'office', bottom: 'wall', door: [-1, -1], openings: [{ x: 0, y: 160, w: 16, h: 32 }],
      pendants: [{ x: 124, y: 88 }, { x: 156, y: 88 }, { x: 188, y: 88 }], rugs: [],
      decor: [{ kind: 'window', x: 240, w: 96, text: '' }] },
    spawn: { x: 36, y: 176 }, spawnFacing: 'right',
  });
}

function newsroomD094(): Room {
  const cols = 32, rows = 24;
  const { tiles } = interiorGrid(cols, rows, T.OFFICE, [20, 21]);
  return finish({
    id: 'newsroom', title: '유로프라자 4층 · 안쪽 사무실 · 메디컬 데스크', cols, rows, tiles, buildings: [], markings: [],
    props: [
      P('euroeditor', 88, 104), P('editorbench', 208, 142),
      P('officechair', 184, 157), P('officechair', 232, 157),
      P('bodyscope', 308, 120),
      ...[112, 280].flatMap(x => [P('benchdesk', x, 256),
        ...[-48, 0, 48].flatMap(dx => [P('officechair', x + dx, 206, 1), P('officechair', x + dx, 273)])]),
      P('shortbench', 432, 256), P('officechair', 416, 206, 1), P('officechair', 448, 206, 1),
      P('officechair', 416, 273), P('officechair', 448, 273),
      ...[56, 112, 168, 224, 280, 392, 448].map(x => P('cabinet', x, 350)),
      P('printer', 448, 344),
    ],
    npcs: [npc('editor', '여성 대표 · 편집장', 88, 86, 'down', editorLook), npc('senior', '선배 기자', 262, 158, 'up', seniorLook)],
    targets: [
      target('editor', '대표 · 편집장', '대화', 88, 108, 22, 'editor'), target('senior', '선배 기자', '대화', 262, 160, 18, 'senior'),
      target('my-desk', '내 자리', '살펴보기', 184, 150, 18), target('device', '바디스코프', '살펴보기', 308, 126, 22),
      target('shelf', '뒤쪽 자료 캐비닛', '살펴보기', 168, 356, 18),
    ],
    doors: [{ id: 'office-exit', zone: { x: 322, y: 373, w: 28, h: 11 }, to: 'floor4', arrive: { x: 416, y: 72 }, facing: 'down', label: '4층 복도 · 엘리베이터 방향' }],
    interior: {
      reference: 'office', wall: 'office', bottom: 'wall', door: [320, 352], pendants: [], rugs: [],
      decor: [22, 76, 230, 290, 390, 448].map(x => ({ kind: 'window' as const, x, w: 46, text: '' })),
    },
    spawn: { x: 212, y: 176 }, spawnFacing: 'down',
  });
}

function outeroffice(): Room {
  const cols = 24, rows = 15, g = interiorGrid(cols, rows, T.OFFICE, [-1, -1]);
  g.fill(23, 10, 23, 11, T.OFFICE);
  return finish({
    id: 'outeroffice', title: '유로프라자 4층 · 바깥 사무실', cols, rows, tiles: g.tiles, buildings: [], markings: [], npcs: [],
    props: [...[80, 144, 208].flatMap(x => [100, 166].flatMap(y => [P('eurodesk', x, y), P('officechair', x, y + 14)])),
      ...[280].flatMap(x => [104, 156, 208].map(y => P('cabinet', x, y))), P('plant', 32, 210, 1)],
    targets: [target('outer-desks', '바깥 사무실', '보기', 244, 188, 20)],
    doors: [{ id: 'corridor', zone: { x: 375, y: 164, w: 9, h: 24 }, to: 'floor4', arrive: { x: 416, y: 300 }, facing: 'right', label: '4층 복도 · 안쪽 사무실 방향' }],
    interior: { reference: 'office', wall: 'office', bottom: 'wall', door: [-1, -1], openings: [{ x: 368, y: 160, w: 16, h: 32 }], pendants: [], rugs: [],
      decor: [24, 88, 152, 216, 280].map(x => ({ kind: 'window' as const, x, w: 48, text: '' })) },
    spawn: { x: 348, y: 176 }, spawnFacing: 'left',
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
    doors: [{ id: 'exit', zone: { x: 226, y: 181, w: 28, h: 11 }, to: 'district', arrive: exits.cafeOut, facing: exits.cafeFacing, label: '도산대로25길' }],
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


/** D103 (user): inside the fictional Jin-U convenience store. Drink coolers on the back wall, two snack gondolas, the till. */
function jinuStore(): Room {
  const cols = 16, rows = 11;
  const { tiles } = interiorGrid(cols, rows, T.OFFICE, [7, 8]);
  return finish({
    id: 'jinu', title: '진U · 편의점', cols, rows, tiles, buildings: [], markings: [],
    props: [
      P('fridge', 52, 64), P('fridge', 102, 64, 1),
      P('storeshelf', 70, 106), P('storeshelf', 70, 140, 1),
      P('storecounter', 196, 112),
    ],
    npcs: [npc('jinu-clerk', '진U 점원', 196, 88, 'down', jinuClerkLook)],
    targets: [
      target('jinu-clerk', '진U 점원', '계산', 196, 124, 22, 'jinu-clerk'),
      target('jinu-fridge', '음료 냉장고', '보기', 78, 74, 18),
      target('jinu-shelf', '과자·생활용품 진열대', '보기', 70, 118, 16),
    ],
    doors: [{ id: 'exit', zone: { x: 114, y: 165, w: 28, h: 11 }, to: 'district', arrive: exits.jinuOut, facing: 'down', label: '논현로151길' }],
    interior: {
      wall: 'store', bottom: 'glass', door: [112, 144], pendants: [], rugs: [],
      decor: [{ kind: 'jinu', x: 140, w: 44, text: '' }, { kind: 'notice', x: 200, w: 32, text: '' }],
    },
    spawn: { x: 128, y: 152 }, spawnFacing: 'up',
  });
}

/** D103 (user): the fictional clothes shop ‘Orbit Tailor’ (design 11, section 4) near Euro Plaza: racks, mannequins, mirror, till. */
function tailorShop(): Room {
  const cols = 16, rows = 12;
  const { tiles } = interiorGrid(cols, rows, T.WOOD, [7, 8]);
  return finish({
    id: 'tailor', title: '오비트 테일러 · 옷가게', cols, rows, tiles, buildings: [], markings: [],
    props: [
      P('mannequin', 116, 72), P('mannequin', 140, 72, 1), P('mannequin', 164, 72, 2),
      P('tailorcounter', 214, 96),
      P('rack', 54, 100), P('rack', 54, 146, 1),
      P('mirror', 226, 152), P('plant', 90, 172),
    ],
    npcs: [npc('tailor', '오비트 테일러 주인', 214, 72, 'down', tailorLook)],
    targets: [
      target('tailor', '오비트 테일러 주인', '옷 고르기', 214, 110, 22, 'tailor'),
      target('tailor-mirror', '전신 거울', '외형 꾸미기', 226, 164, 18),
      target('tailor-rack', '옷걸이', '보기', 54, 122, 18),
      target('tailor-mannequin', '마네킹', '보기', 140, 84, 16),
    ],
    doors: [{ id: 'exit', zone: { x: 114, y: 181, w: 28, h: 11 }, to: 'district', arrive: exits.tailorOut, facing: 'down', label: '유로프라자 쪽 골목' }],
    interior: {
      wall: 'boutique', bottom: 'glass', door: [112, 144], pendants: [{ x: 96, y: 30 }, { x: 176, y: 30 }], rugs: [{ x: 96, y: 112, w: 80, h: 40 }],
      decor: [{ kind: 'curtain', x: 22, w: 30, text: '' }, { kind: 'sign', x: 92, w: 96, text: 'ORBIT TAILOR' }, { kind: 'poster', x: 204, w: 16, text: '' }],
    },
    spawn: { x: 128, y: 168 }, spawnFacing: 'up',
  });
}

export const rooms: Record<RoomId, Room> = { lounge: lounge(), lifthall: lifthall(), district: null as unknown as Room, lift1: lift(1), lift4: lift(4), floor4: floor4(), outeroffice: outeroffice(), newsroom: newsroom(), lobby: lobby(), street: street(), cafe: cafe(), jinu: jinuStore(), tailor: tailorShop(), ...heartRooms() };
// The district needs the separately loaded map chunk: build it on first use (after loadDistrict()).
let districtRoom: Room | null = null;
Object.defineProperty(rooms, 'district', { enumerable: true, get: () => {
  if (!districtRoom && !districtLoaded()) throw new Error('동네 지도를 아직 불러오는 중이에요. 잠시 후 다시 시도해 주세요.');
  return districtRoom ??= district();
} });
/** D093 rooms as they were, for save migration only. */
export const roomsD093 = { lobby: lobbyD093(), floor4: floor4D093(), lounge: loungeD093() } as const;
/** D094 first-preview rooms, for save migration only. */
export const roomsD094 = { lobby: lobbyD094(), floor4: floor4D094(), lounge: loungeD094(), newsroom: newsroomD094() } as const;

export function tileAt(room: Room, tx: number, ty: number): number {
  if (tx < 0 || ty < 0 || tx >= room.cols || ty >= room.rows) return T.VOID;
  return room.tiles[ty * room.cols + tx] ?? T.VOID;
}
