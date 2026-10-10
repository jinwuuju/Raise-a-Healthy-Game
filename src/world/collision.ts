import { rooms, tileAt, walkableTile, type Crossing, type Door, type Target } from './rooms';
import { TILE, inRect, overlap, type Point, type Rect, type RoomId } from './types';

/** Feet box: the character only collides with a small footprint, never with its head. */
export function footRect(p: Point): Rect { return { x: p.x - 4, y: p.y - 3, w: 8, h: 4 }; }

export function canStand(roomId: RoomId, p: Point): boolean {
  const room = rooms[roomId];
  if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return false;
  const f = footRect(p);
  if (f.x < 0 || f.y < 0 || f.x + f.w > room.cols * TILE || f.y + f.h > room.rows * TILE) return false;
  const xs = [f.x, f.x + f.w - 0.01], ys = [f.y, f.y + f.h - 0.01];
  for (const x of xs) for (const y of ys) if (!walkableTile(tileAt(room, Math.floor(x / TILE), Math.floor(y / TILE)))) return false;
  for (const s of room.solids) if (overlap(f, s)) return false;
  return true;
}

export function doorAt(roomId: RoomId, p: Point): Door | undefined {
  return rooms[roomId].doors.find(d => inRect(p, d.zone));
}

export function nearestTarget(roomId: RoomId, p: Point): Target | undefined {
  let best: Target | undefined; let bestD = Infinity;
  for (const t of rooms[roomId].targets) {
    const d = Math.hypot(t.x - p.x, t.y - p.y);
    if (d <= t.r && d < bestD) { best = t; bestD = d; }
  }
  return best;
}

export type MoveResult = { x: number; y: number; blockedX: boolean; blockedY: boolean };

/** Moves with small sub-steps, sliding along walls and nudging around corners. */
export function moveWithCollision(roomId: RoomId, from: Point, dx: number, dy: number): MoveResult {
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 1.5));
  let x = from.x, y = from.y, blockedX = false, blockedY = false;
  for (let i = 0; i < steps; i++) {
    const sx = dx / steps, sy = dy / steps;
    if (sx !== 0) {
      if (canStand(roomId, { x: x + sx, y })) x += sx;
      else {
        blockedX = true;
        if (sy === 0) { const n = nudge(roomId, x + sx, y, 'y'); if (n !== null) { y = n; x += sx; blockedX = false; } }
      }
    }
    if (sy !== 0) {
      if (canStand(roomId, { x, y: y + sy })) y += sy;
      else {
        blockedY = true;
        if (sx === 0) { const n = nudge(roomId, x, y + sy, 'x'); if (n !== null) { x = n; y += sy; blockedY = false; } }
      }
    }
  }
  return { x, y, blockedX, blockedY };
}

function nudge(roomId: RoomId, x: number, y: number, axis: 'x' | 'y'): number | null {
  for (let k = 1; k <= 4; k++) for (const s of [k, -k]) {
    const p = axis === 'x' ? { x: x + s, y } : { x, y: y + s };
    if (canStand(roomId, p)) return (axis === 'x' ? x : y) + Math.sign(s) * Math.min(1, Math.abs(s));
  }
  return null;
}

/** The crosswalk (road part) under a foot point, if any. */
export function crossingAt(roomId: RoomId, p: Point): Crossing | undefined {
  return rooms[roomId].crossings.find(c => inRect(p, c.rect));
}
