export type RoomId = 'district' | 'lounge' | 'lifthall' | 'lift1' | 'lift4' | 'floor4' | 'outeroffice' | 'newsroom' | 'lobby' | 'street' | 'cafe' | 'jinu' | 'tailor' | 'heart' | 'rv' | 'lung' | 'la' | 'lv' | 'aorta' | AirwayRoomId;
/** D111 Bodyscope airway (design 20): nose -> pharynx -> larynx -> trachea -> bronchial tree -> alveoli (air side). */
export type AirwayRoomId = 'nose' | 'pharynx' | 'larynx' | 'trachea' | 'bronchi' | 'alveoli';
export type Dir = 'down' | 'up' | 'left' | 'right';
export type Point = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };
export const TILE = 16;
export const roomIds: RoomId[] = ['district', 'lounge', 'lifthall', 'lift1', 'lift4', 'floor4', 'outeroffice', 'newsroom', 'lobby', 'street', 'cafe', 'jinu', 'tailor', 'heart', 'rv', 'lung', 'la', 'lv', 'aorta', 'nose', 'pharynx', 'larynx', 'trachea', 'bronchi', 'alveoli'];
/** Bodyscope heart: 'heart' is the right atrium (kept as the id of the old entry room so saves stay valid). */
export const heartRoomIds: RoomId[] = ['heart', 'rv', 'lung', 'la', 'lv', 'aorta'];
export const isHeartRoom = (r: RoomId): boolean => heartRoomIds.includes(r);
/** Airway rooms in the order air passes through them on the way in. */
export const airwayRoomIds: AirwayRoomId[] = ['nose', 'pharynx', 'larynx', 'trachea', 'bronchi', 'alveoli'];
export const isAirwayRoom = (r: RoomId): r is AirwayRoomId => (airwayRoomIds as RoomId[]).includes(r);
/** Inside the body through the Bodyscope (heart or airway): no walking out, the return pad leads back. */
export const isBodyRoom = (r: RoomId): boolean => isHeartRoom(r) || isAirwayRoom(r);

export function inRect(p: Point, r: Rect): boolean {
  return p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h;
}
export function overlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
