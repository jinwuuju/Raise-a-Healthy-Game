import { overlap, type Point, type Rect } from './types';
/** Exact walkable envelope/solid footprints of the pre-D092 lobby, for old saves only. */
export function wasLegacyLobbyPosition(p: Point): boolean {
  if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return false;
  const f: Rect = { x: p.x - 4, y: p.y - 3, w: 8, h: 4 };
  if (f.x < 16 || f.x + f.w > 304 || f.y < 48 || f.y + f.h > 192) return false;
  if (f.y + f.h > 176 && (f.x < 144 || f.x + f.w > 176)) return false;
  const oldSolids: Rect[] = [
    { x: 40, y: 90, w: 64, h: 14 }, { x: 226, y: 124, w: 20, h: 8 }, { x: 274, y: 124, w: 20, h: 8 },
    { x: 246, y: 141, w: 28, h: 7 }, { x: 67, y: 82, w: 10, h: 5 },
    ...[26, 294].flatMap(x => [62, 168].map(y => ({ x: x - 6, y: y - 5, w: 12, h: 5 }))),
  ];
  return !oldSolids.some(s => overlap(f, s));
}
