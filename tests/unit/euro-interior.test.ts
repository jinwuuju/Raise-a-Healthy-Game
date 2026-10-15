import { describe, expect, it } from 'vitest';
import { FLOOR4, rooms, roomsD093, roomsD094 } from '../../src/world/rooms';
import { canStand, canStandIn, doorAt } from '../../src/world/collision';
import { findPath } from '../../src/world/path';
import { newState, validateState } from '../../src/domain/state';
import { wasLegacyLobbyPosition } from '../../src/world/legacy-lobby';
import type { RoomId } from '../../src/world/types';

const euro: RoomId[] = ['lobby', 'lifthall', 'lift1', 'lift4', 'floor4', 'lounge', 'newsroom'];
const reach = (room: RoomId, a: { x: number; y: number }, b: { x: number; y: number }) => findPath(room, a, b).length > 0;

describe('D094/D095 Euro Plaza interior', () => {
  it('connects lobby → lift hall → cabin → 4th floor both ways, arriving outside every door zone', () => {
    expect(rooms.lobby.doors.find(d => d.id === 'elevator')?.to).toBe('lifthall');
    expect(rooms.lifthall.doors.map(d => d.to).sort()).toEqual(['lift1', 'lobby']);
    expect(rooms.lift1.doors[0]?.to).toBe('lifthall');
    expect(rooms.lift4.doors[0]?.to).toBe('floor4');
    expect(rooms.floor4.doors.map(d => d.to)).toEqual(['lift4', 'lounge', 'newsroom']);
    expect(rooms.lounge.doors[0]?.to).toBe('floor4');
    expect(rooms.newsroom.doors[0]?.to).toBe('floor4');
    for (const id of euro) for (const d of rooms[id].doors) {
      expect(canStand(d.to, d.arrive), `${id}:${d.id} arrive`).toBe(true);
      expect(doorAt(d.to, d.arrive), `${id}:${d.id} lands in a door`).toBeUndefined();
      const zc = { x: d.zone.x + d.zone.w / 2, y: d.zone.y + d.zone.h / 2 };
      expect(reach(id, rooms[id].spawn, zc), `${id}:${d.id} reachable`).toBe(true);
    }
  });

  it('shows the lift doors head-on: centred in the back wall of a hall small enough to fit a phone screen', () => {
    const h = rooms.lifthall, lift = h.doors.find(d => d.to === 'lift1')!;
    expect(h.cols * 16).toBeLessThanOrEqual(195); expect(h.rows * 16).toBeLessThanOrEqual(195);
    expect(lift.zone.y).toBe(80); // first floor row under the back wall face
    expect(Math.abs(lift.zone.x + lift.zone.w / 2 - h.cols * 8)).toBeLessThanOrEqual(1);
    expect(lift.zone.w).toBeGreaterThanOrEqual(48);
    expect(h.spawnFacing).toBe('up'); expect(h.spawn.y).toBeGreaterThan(lift.zone.y + 60);
    // The old side opening in the lobby wall is gone.
    expect(canStand('lobby', { x: 6, y: 96 })).toBe(false);
  });

  it('has two long shared desk islands with six facing seats per side and aisles behind the chairs', () => {
    const f = rooms.floor4;
    const desks = f.props.filter(p => p.kind === 'longbench');
    expect(desks.map(d => d.y)).toEqual([...FLOOR4.islands]);
    for (const d of desks) {
      const top = f.props.filter(p => p.kind === 'officechair' && p.y === d.y - 50 && p.v === 1);
      const bottom = f.props.filter(p => p.kind === 'officechair' && p.y === d.y + 17 && p.v === 0);
      expect(top).toHaveLength(6); expect(bottom).toHaveLength(6);
      expect(top.map(c => c.x)).toEqual(bottom.map(c => c.x)); // seats face each other across the desk
    }
    // Walkable aisles: in front of the meeting rooms, between the islands, behind the back island, and both desk ends.
    for (const y of [190, 312]) for (const x of [40, 120, 200, 280, 360]) expect(canStand('floor4', { x, y }), `${x},${y}`).toBe(true);
    for (const x of [40, 120, 200, 256]) expect(canStand('floor4', { x, y: 436 }), `${x},436`).toBe(true); // cabinets stand right of the island
    for (const y of [260, 380]) for (const x of [96, 360]) expect(canStand('floor4', { x, y }), `${x},${y}`).toBe(true);
    expect(canStand('floor4', { x: FLOOR4.islandX, y: 262 })).toBe(false);
    // D095: the islands sit toward the corridor (right half of the office).
    expect(FLOOR4.islandX).toBeGreaterThan(FLOOR4.officeRight / 2);
    // Doorless: from the corridor straight into the office and to every seat row.
    for (const t of [{ x: 120, y: 312 }, { x: 60, y: 436 }, { x: 300, y: 190 }]) expect(reach('floor4', { x: 416, y: 300 }, t)).toBe(true);
  });

  it('puts two window desks (4 seats) facing the left-wall windows', () => {
    const f = rooms.floor4, desks = f.props.filter(p => p.kind === 'windowdesk');
    expect(desks).toHaveLength(2);
    const seats = f.props.filter(p => p.kind === 'sidechair');
    expect(seats).toHaveLength(4);
    for (const d of desks) { expect(d.solid!.x).toBeLessThanOrEqual(20); expect(seats.filter(c => c.y < d.y && c.y > d.y - 62)).toHaveLength(2); }
    for (const c of seats) { expect(c.x).toBeGreaterThan(48); expect(c.x).toBeLessThan(72); expect(canStand('floor4', { x: c.x + 6, y: c.y })).toBe(true); }
  });

  it('builds two separate glass meeting rooms on the back wall, windows on the left wall', () => {
    const f = rooms.floor4;
    for (const m of FLOOR4.meeting) {
      const inside = (x: number) => x > m.x0 && x < m.x1;
      expect(f.props.filter(p => p.kind === 'meettable' && inside(p.x))).toHaveLength(1);
      const chairs = f.props.filter(p => p.kind === 'meetchair' && inside(p.x));
      expect(chairs).toHaveLength(8);
      expect(chairs.filter(c => c.v % 2 === 0)).toHaveLength(4); // orange
      expect(chairs.filter(c => c.v % 2 === 1)).toHaveLength(4); // green
      const screen = f.props.find(p => p.kind === 'sidescreen' && inside(p.x))!;
      expect(screen.solid!.x - m.x0).toBeLessThanOrEqual(1); // flush on the room's left wall
      const table = f.props.find(p => p.kind === 'meettable' && inside(p.x))!;
      expect(table.solid!.x - (screen.solid!.x + screen.solid!.w)).toBeLessThanOrEqual(6); // the table end meets that wall
      // Glass front is solid except the opening; the room is reached only through it.
      expect(canStand('floor4', { x: m.x0 + 40, y: 168 })).toBe(false);
      const door = { x: (m.door[0] + m.door[1]) / 2, y: 168 };
      expect(canStand('floor4', door)).toBe(true);
      expect(reach('floor4', { x: 416, y: 300 }, { x: m.x0 + 24, y: 70 })).toBe(true);
      expect(f.targets.some(t => t.id === m.id)).toBe(true);
    }
    // The two rooms are divided by a glass partition.
    for (const y of [70, 120, 150]) expect(canStand('floor4', { x: 184, y })).toBe(false);
    expect(f.interior?.glass?.length).toBeGreaterThanOrEqual(3);
    // Left wall of the open office is the outer wall (windows drawn there), not walkable.
    expect(canStand('floor4', { x: 8, y: 300 })).toBe(false);
  });

  it('rebuilds the lounge as asked and keeps it a separate map', () => {
    const l = rooms.lounge, count = (k: string) => l.props.filter(p => p.kind === k).length;
    expect(rooms.floor4.props.some(p => p.kind === 'bigtable' || p.kind === 'pantry')).toBe(false);
    expect(count('pantry')).toBe(0); expect(count('plant')).toBe(0);
    expect(count('bigtable')).toBe(1); expect(count('tallchair')).toBe(12);
    expect(count('counterbar')).toBe(1); expect(count('walldesk')).toBe(1); expect(count('sidechair')).toBe(3);
    const door = l.doors[0]!.zone, sofas = l.props.filter(p => p.kind === 'bigsofa');
    expect(sofas).toHaveLength(2);
    for (const s of sofas) {
      const r = s.solid!;
      expect(Math.hypot(r.x - door.x, r.y - door.y)).toBeLessThan(130); // near the door
      expect(r.x <= 20 || r.y + r.h >= (l.rows - 1) * 16 - 2).toBe(true); // against a wall
    }
    const table = l.props.find(p => p.kind === 'loungetable')!.solid!, low = sofas.find(p => p.v === 1)!.solid!;
    expect(table.x).toBeGreaterThanOrEqual(low.x + low.w); expect(table.y + table.h).toBeGreaterThan(low.y); // beside, not behind
    expect(canStand('lounge', l.spawn)).toBe(true);
    for (const t of [{ x: 300, y: 176 }, { x: 70, y: 112 }, { x: 200, y: 236 }]) expect(reach('lounge', l.spawn, t), `${t.x},${t.y}`).toBe(true);
  });

  it('lays out the inner office in three rows: CEO left, editor-in-chief alone in the middle, Bodyscope far right', () => {
    const n = rooms.newsroom, W = n.cols * 16;
    expect(n.cols).toBe(32); expect(n.rows).toBe(28);
    expect(n.props.filter(p => p.kind === 'benchdesk')).toHaveLength(4);
    expect(n.props.filter(p => p.kind === 'shortbench')).toHaveLength(2);
    expect(new Set(n.props.filter(p => p.kind === 'benchdesk').map(p => p.y)).size).toBe(2);
    const ceo = n.npcs.find(x => x.id === 'ceo')!, editor = n.npcs.find(x => x.id === 'editor')!;
    expect(ceo.x).toBeLessThan(W / 4); expect(Math.abs(editor.x - W / 2)).toBeLessThan(24); expect(Math.abs(ceo.y - editor.y)).toBeLessThan(8);
    const desk = n.props.find(p => p.kind === 'editorbench')!;
    expect(Math.abs(desk.x - editor.x)).toBeLessThan(4);
    expect(n.props.filter(p => p.kind === 'officechair' && Math.abs(p.x - desk.x) < 72 && Math.abs(p.y - desk.y) < 40)).toHaveLength(0); // used alone
    const scope = n.props.find(p => p.kind === 'bodyscope')!;
    expect(scope.x).toBeGreaterThan(W - 64);
    expect(n.props.some(p => p.kind === 'bookshelf' || p.kind === 'plant')).toBe(false);
    for (const id of ['ceo', 'editor', 'my-desk', 'device', 'shelf', 'senior']) {
      const t = n.targets.find(x => x.id === id)!;
      expect(reach('newsroom', n.spawn, { x: t.x, y: t.y + 8 }) || reach('newsroom', n.spawn, { x: t.x, y: t.y - 8 }), id).toBe(true);
    }
  });

  it('keeps saved rooms and progress on reload, including the new lift hall', () => {
    for (const room of ['lifthall', 'lift1', 'lift4', 'floor4', 'lounge'] as const) {
      const base = newState();
      const s = validateState({ ...base, at: { room, ...rooms[room].spawn, facing: 'up' } });
      expect(s.at.room).toBe(room); expect(s.gold).toBe(base.gold); expect(s.ledger).toEqual(base.ledger);
    }
    // A position in the new open office stays where it is (it is not mistaken for an older lounge save).
    const kept = validateState({ ...newState(), at: { room: 'floor4', x: 60, y: 312, facing: 'up' } });
    expect(kept.at).toEqual({ room: 'floor4', x: 60, y: 312, facing: 'up' });
  });

  it('moves positions that were valid in D092/D093 but are now inside walls to a safe point, and still rejects nonsense', () => {
    const base = newState();
    const cases: [RoomId, number, number, RoomId][] = [
      ['outeroffice', 348, 176, 'floor4'], ['floor4', 200, 336, 'floor4'], ['floor4', 288, 176, 'floor4'],
      ['lounge', 372, 176, 'lounge'], ['lobby', 8, 96, 'lobby'], ['newsroom', 120, 240, 'newsroom'],
      ['lobby', 360, 200, 'lobby'], ['newsroom', 256, 110, 'newsroom'], ['lounge', 80, 96, 'lounge'],
    ];
    for (const [room, x, y, expected] of cases) {
      const result = validateState({ ...base, at: { room, x, y, facing: 'up' } });
      expect(result.at.room, `${room} ${x},${y}`).toBe(expected); expect(canStand(result.at.room, result.at)).toBe(true);
      expect(result.article).toEqual(base.article); expect(result.ledger).toEqual(base.ledger);
    }
    expect(canStandIn(roomsD093.floor4, { x: 288, y: 176 })).toBe(true);
    for (const [r, x, y] of [['lobby', 360, 200], ['newsroom', 256, 110]] as const) { expect(canStandIn(roomsD094[r], { x, y })).toBe(true); expect(canStand(r, { x, y })).toBe(false); }
    for (const [room, x, y] of [['outeroffice', 0, 0], ['floor4', 2, 2], ['lifthall', 8, 8], ['lounge', -5, 100]] as const)
      expect(() => validateState({ ...base, at: { room, x, y, facing: 'up' } })).toThrow();
  });

  it('relocates only formerly valid pre-D092 lobby positions covered by new furniture', () => {
    const base = newState(), p = { x: 176, y: 120 };
    expect(wasLegacyLobbyPosition(p)).toBe(true); expect(canStand('lobby', p)).toBe(false);
    const s = validateState({ ...base, at: { room: 'lobby', ...p, facing: 'down' } });
    expect(s.at).toEqual({ room: 'lobby', ...rooms.lobby.spawn, facing: 'up' });
    for (const q of [{ x: -1, y: 100 }, { x: 72, y: 100 }, { x: Infinity, y: 80 }]) expect(wasLegacyLobbyPosition(q)).toBe(false);
  });
});
