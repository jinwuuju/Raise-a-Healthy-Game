import { rooms } from './rooms';
import { canStand } from './collision';
import { TILE, type Point, type RoomId } from './types';

const CELL = 8;

/** A* on an 8px grid, followed by line-of-sight smoothing. Returns waypoints after the start. */
export function findPath(roomId: RoomId, from: Point, to: Point, maxNodes = 9000): Point[] {
  const room = rooms[roomId];
  const cols = Math.ceil(room.cols * TILE / CELL), rows = Math.ceil(room.rows * TILE / CELL);
  const cache = new Int8Array(cols * rows);
  const ok = (cx: number, cy: number): boolean => {
    if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) return false;
    const i = cy * cols + cx;
    if (cache[i] === 0) cache[i] = canStand(roomId, { x: cx * CELL + CELL / 2, y: cy * CELL + CELL / 2 }) ? 1 : 2;
    return cache[i] === 1;
  };
  const nearest = (p: Point): [number, number] | null => {
    const bx = Math.floor(p.x / CELL), by = Math.floor(p.y / CELL);
    for (let r = 0; r <= 4; r++) {
      let best: [number, number] | null = null, bestD = Infinity;
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r || !ok(bx + dx, by + dy)) continue;
        const d = Math.hypot((bx + dx) * CELL + 4 - p.x, (by + dy) * CELL + 4 - p.y);
        if (d < bestD) { bestD = d; best = [bx + dx, by + dy]; }
      }
      if (best) return best;
    }
    return null;
  };
  const s = nearest(from), g = nearest(to);
  if (!s || !g) return [];
  const start = s[1] * cols + s[0], goal = g[1] * cols + g[0];
  const gScore = new Float32Array(cols * rows).fill(Infinity);
  const came = new Int32Array(cols * rows).fill(-1);
  const closed = new Uint8Array(cols * rows);
  const heap: number[] = [], fval: number[] = [];
  const push = (i: number, f: number) => {
    heap.push(i); fval.push(f); let k = heap.length - 1;
    while (k > 0) { const p = (k - 1) >> 1; if (fval[p]! <= fval[k]!) break; [heap[p], heap[k]] = [heap[k]!, heap[p]!]; [fval[p], fval[k]] = [fval[k]!, fval[p]!]; k = p; }
  };
  const pop = (): number => {
    const top = heap[0]!; const lastI = heap.pop()!, lastF = fval.pop()!;
    if (heap.length) {
      heap[0] = lastI; fval[0] = lastF; let k = 0;
      for (;;) { const l = k * 2 + 1, r = l + 1; let m = k;
        if (l < heap.length && fval[l]! < fval[m]!) m = l; if (r < heap.length && fval[r]! < fval[m]!) m = r;
        if (m === k) break; [heap[m], heap[k]] = [heap[k]!, heap[m]!]; [fval[m], fval[k]] = [fval[k]!, fval[m]!]; k = m; }
    }
    return top;
  };
  const h = (i: number) => { const dx = Math.abs((i % cols) - g[0]), dy = Math.abs(Math.floor(i / cols) - g[1]); return Math.max(dx, dy) + 0.414 * Math.min(dx, dy); };
  gScore[start] = 0; push(start, h(start));
  let expanded = 0, found = start === goal;
  while (heap.length && !found && expanded < maxNodes) {
    const cur = pop(); if (closed[cur]) continue; closed[cur] = 1; expanded++;
    if (cur === goal) { found = true; break; }
    const cx = cur % cols, cy = Math.floor(cur / cols);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = cx + dx, ny = cy + dy;
      if (!ok(nx, ny)) continue;
      if (dx && dy && (!ok(cx + dx, cy) || !ok(cx, cy + dy))) continue;
      const ni = ny * cols + nx; if (closed[ni]) continue;
      const cost = gScore[cur]! + (dx && dy ? 1.414 : 1);
      if (cost < gScore[ni]!) { gScore[ni] = cost; came[ni] = cur; push(ni, cost + h(ni)); }
    }
  }
  if (!found) return [];
  const cells: Point[] = [];
  for (let i = goal; i !== -1 && i !== start; i = came[i]!) cells.push({ x: (i % cols) * CELL + CELL / 2, y: Math.floor(i / cols) * CELL + CELL / 2 });
  cells.reverse();
  if (canStand(roomId, to) && cells.length) cells[cells.length - 1] = { x: to.x, y: to.y };
  if (!cells.length && canStand(roomId, to)) cells.push({ x: to.x, y: to.y });
  return smooth(roomId, from, cells);
}

export function clearLine(roomId: RoomId, a: Point, b: Point): boolean {
  const d = Math.hypot(b.x - a.x, b.y - a.y), n = Math.ceil(d / 3);
  for (let i = 1; i <= n; i++) { const t = i / n; if (!canStand(roomId, { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })) return false; }
  return true;
}

function smooth(roomId: RoomId, from: Point, pts: Point[]): Point[] {
  const out: Point[] = []; let anchor = from, i = 0;
  while (i < pts.length) {
    let j = pts.length - 1;
    while (j > i && !clearLine(roomId, anchor, pts[j]!)) j--;
    out.push(pts[j]!); anchor = pts[j]!; i = j + 1;
  }
  return out;
}
