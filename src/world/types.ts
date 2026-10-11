export type RoomId = 'newsroom' | 'lobby' | 'street' | 'cafe' | 'heart' | 'heart-chambers' | 'heart-valves' | 'heart-circulation' | 'heart-signal' | 'heart-supply' | 'heart-conditions' | 'home' | 'store';
export type Dir = 'down' | 'up' | 'left' | 'right';
export type Point = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };
export const TILE = 16;
export const roomIds: RoomId[] = ['newsroom', 'lobby', 'street', 'cafe', 'heart','heart-chambers','heart-valves','heart-circulation','heart-signal','heart-supply','heart-conditions','home','store'];
export const isModelRoom = (id: RoomId): boolean => id.startsWith('heart');

export function inRect(p: Point, r: Rect): boolean {
  return p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h;
}
export function overlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
