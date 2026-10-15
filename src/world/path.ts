import { rooms, type Room } from './rooms';
import { canStand } from './collision';
import { TILE, type Point, type RoomId } from './types';

const CELL = 8;
// Room geometry is constructed once and stays fixed during play. Reuse collision samples.
const navigation = new WeakMap<Room, { cells: Int8Array; edges: Int8Array }>();

/** A* on an 8px grid, followed by line-of-sight smoothing. Returns waypoints after the start. */
export function findPath(roomId: RoomId, from: Point, to: Point, maxNodes = rooms[roomId].cols > 100 ? 90000 : 9000): Point[] {
  if (!canStand(roomId, from) || !Number.isFinite(to.x) || !Number.isFinite(to.y)) return [];
  // Most local taps have an unobstructed route: skip grid allocation and A* entirely.
  if (canStand(roomId, to) && clearLine(roomId, from, to)) return [{ ...to }];
  const room = rooms[roomId];
  const fullCols = Math.ceil(room.cols * TILE / CELL), fullRows = Math.ceil(room.rows * TILE / CELL);
  // Big maps (the 1 km district, D098) search a window around both ends instead of allocating the whole map.
  const big = fullCols * fullRows > 250000, M = 110;
  const wx = big ? Math.max(0, Math.floor(Math.min(from.x, to.x) / CELL) - M) : 0, wy = big ? Math.max(0, Math.floor(Math.min(from.y, to.y) / CELL) - M) : 0;
  const cols = big ? Math.min(fullCols, Math.ceil(Math.max(from.x, to.x) / CELL) + M) - wx : fullCols;
  const rows = big ? Math.min(fullRows, Math.ceil(Math.max(from.y, to.y) / CELL) + M) - wy : fullRows;
  let grid = big ? undefined : navigation.get(room);
  if (!grid) { grid = { cells: new Int8Array(cols * rows), edges: new Int8Array(cols * rows * 9) }; if (!big) navigation.set(room, grid); }
  const cache = grid.cells, edges = grid.edges;
  const wpt = (cx: number, cy: number): Point => ({ x: (cx + wx) * CELL + CELL / 2, y: (cy + wy) * CELL + CELL / 2 });
  const ok = (cx: number, cy: number): boolean => {
    if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) return false;
    const i = cy * cols + cx;
    if (cache[i] === 0) cache[i] = canStand(roomId, wpt(cx, cy)) ? 1 : 2;
    return cache[i] === 1;
  };
  const nearest = (p: Point, connect: boolean): [number, number] | null => {
    const bx = Math.floor(p.x / CELL) - wx, by = Math.floor(p.y / CELL) - wy;
    for (let r = 0; r <= 4; r++) {
      let best: [number, number] | null = null, bestD = Infinity;
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r || !ok(bx + dx, by + dy)) continue;
        const q = wpt(bx + dx, by + dy);
        if (connect && !clearLine(roomId, p, q)) continue;
        const d = Math.hypot(q.x - p.x, q.y - p.y);
        if (d < bestD) { bestD = d; best = [bx + dx, by + dy]; }
      }
      if (best) return best;
    }
    return null;
  };
  const s = nearest(from, true), g = nearest(to, canStand(roomId, to));
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
      const edge = cur * 9 + (dy + 1) * 3 + dx + 1;
      if (!edges[edge]) edges[edge] = clearLine(roomId, wpt(cx, cy), wpt(nx, ny)) ? 1 : 2;
      if (edges[edge] !== 1) continue;
      const ni = ny * cols + nx; if (closed[ni]) continue;
      const cost = gScore[cur]! + (dx && dy ? 1.414 : 1);
      if (cost < gScore[ni]!) { gScore[ni] = cost; came[ni] = cur; push(ni, cost + h(ni)); }
    }
  }
  if (!found) return [];
  const cells: Point[] = [];
  for (let i = goal; i !== -1 && i !== start; i = came[i]!) cells.push(wpt(i % cols, Math.floor(i / cols)));
  cells.reverse();
  cells.unshift(wpt(s[0], s[1]));
  if (canStand(roomId, to)) cells.push({ ...to });
  return smooth(roomId, from, cells);
}

export function clearLine(roomId: RoomId, a: Point, b: Point): boolean {
  if (!canStand(roomId, a) || !canStand(roomId, b)) return false;
  const d = Math.hypot(b.x - a.x, b.y - a.y), n = Math.ceil(d / 1.5);
  for (let i = 1; i <= n; i++) { const t = i / n; if (!canStand(roomId, { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })) return false; }
  return true;
}

function smooth(roomId: RoomId, from: Point, pts: Point[]): Point[] {
  const out: Point[] = []; let anchor = from, i = 0;
  while (i < pts.length) {
    let j = pts.length - 1;
    while (j > i && !clearLine(roomId, anchor, pts[j]!)) j--;
    if (!clearLine(roomId, anchor, pts[j]!)) return [];
    out.push(pts[j]!); anchor = pts[j]!; i = j + 1;
  }
  return out;
}
