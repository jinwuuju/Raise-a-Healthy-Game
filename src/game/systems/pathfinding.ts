import { canStand, rooms, type Point, type RoomId } from '../../domain/world';
const cell = 16;
export function findWalkPath(room: RoomId, from: Point, to: Point): Point[] {
  const cols = Math.ceil(rooms[room].width / cell), rows = Math.ceil(rooms[room].height / cell);
  const index = (p: Point) => Math.round(p.y / cell) * cols + Math.round(p.x / cell);
  const point = (i: number): Point => ({ x: i % cols * cell, y: Math.floor(i / cols) * cell });
  const start = index(from), end = index(to);
  if (!canStand(room, to)) return [];
  const queue = [start], parents = new Map<number, number>([[start, -1]]);
  for (let head = 0; head < queue.length && head < cols * rows; head++) {
    const current = queue[head]!;
    if (current === end) {
      const route: Point[] = []; let node = end;
      while (node !== start) { route.unshift(point(node)); node = parents.get(node)!; }
      route.push(to); return route;
    }
    const p = point(current);
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const next = { x: p.x + dx! * cell, y: p.y + dy! * cell };
      if (next.x < 0 || next.y < 0 || next.x >= cols * cell || next.y >= rows * cell || !canStand(room, next)) continue;
      const id = index(next);
      if (!parents.has(id)) { parents.set(id, current); queue.push(id); }
    }
  }
  return [];
}
