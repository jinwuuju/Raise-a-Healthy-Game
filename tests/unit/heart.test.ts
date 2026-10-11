import { describe, expect, it } from 'vitest';
import content from '../../data/content/heart-interior.v0.1.json';
import { EV, REAL_CYCLE, SLOW, coronaryFlowFactor, ecg, openness, passable, phaseAt, phases, secondsUntilOpen, soundBetween } from '../../src/domain/cardiac';
import { discover, discovered, discoveries, discoveryIds, hxKey } from '../../src/domain/heart';
import { newState, type GameState } from '../../src/domain/state';
import { canStand, doorAt } from '../../src/world/collision';
import { heartRoute } from '../../src/world/heart-rooms';
import { findPath } from '../../src/world/path';
import { rooms } from '../../src/world/rooms';
import { heartRoomIds, type RoomId } from '../../src/world/types';

const step = 0.001;
const sample = (fn: (t: number) => boolean) => { let n = 0; for (let t = 0; t < REAL_CYCLE; t += step) if (fn(t)) n++; return n * step; };

describe('cardiac cycle (textbook resting example, 75/min)', () => {
  it('one beat is 0.8 s: systole about 0.3 s, diastole about 0.5 s, atrial systole about 0.1 s', () => {
    expect(REAL_CYCLE).toBeCloseTo(0.8, 6);
    expect(EV.s2 - EV.s1).toBeCloseTo(0.3, 6);
    expect(REAL_CYCLE - (EV.s2 - EV.s1)).toBeCloseTo(0.5, 6);
    expect(EV.s1 - EV.atrial).toBeCloseTo(0.11, 2);
  });
  it('phases cover the whole beat without gaps or overlaps', () => {
    const sorted = [...phases].sort((a, b) => a.from - b.from);
    expect(sorted[0]!.from).toBe(0);
    for (let i = 1; i < sorted.length; i++) expect(sorted[i]!.from).toBeCloseTo(sorted[i - 1]!.to, 9);
    expect(sorted[sorted.length - 1]!.to).toBeCloseTo(REAL_CYCLE, 9);
  });
  it('AV (tricuspid, mitral) and semilunar (pulmonary, aortic) valves are never open together', () => {
    expect(sample(t => openness('av', t) > 0 && openness('sl', t) > 0)).toBe(0);
  });
  it('isovolumetric phases keep all four valves shut', () => {
    for (const id of ['ivc', 'ivr'] as const) {
      const p = phases.find(q => q.id === id)!;
      for (let t = p.from + 0.002; t < p.to - 0.002; t += step) expect([openness('av', t), openness('sl', t)], id + t).toEqual([0, 0]);
    }
  });
  it('the first sound comes with AV closure, the second with semilunar closure', () => {
    expect(openness('av', EV.s1 - 0.005)).toBeGreaterThan(0);
    expect(openness('av', EV.s1 + 0.001)).toBe(0);
    expect(openness('sl', EV.s2 - 0.005)).toBeGreaterThan(0);
    expect(openness('sl', EV.s2 + 0.001)).toBe(0);
    expect(soundBetween(EV.s1 - 0.01, EV.s1 + 0.01)).toBe('S1');
    expect(soundBetween(EV.s2 - 0.01, EV.s2 + 0.01)).toBe('S2');
    expect(soundBetween(0.3, 0.31)).toBeNull();
  });
  it('electrical events come before the mechanical ones (P before atrial squeeze, R before S1)', () => {
    let rPeak = 0, rT = 0, pPeak = 0, pT = 0;
    for (let t = 0; t < REAL_CYCLE; t += step) { const v = ecg(t); if (v > rPeak) { rPeak = v; rT = t; } if (t < 0.1 && v > pPeak) { pPeak = v; pT = t; } }
    expect(pT).toBeLessThan(EV.atrial);
    expect(rT).toBeLessThan(EV.s1);
    expect(rT).toBeGreaterThan(EV.atrial);
  });
  it('the Bodyscope slows the beat so a valve stays passable long enough to walk through', () => {
    expect(sample(t => passable('sl', t)) * SLOW).toBeGreaterThan(1.2);
    expect(sample(t => passable('av', t)) * SLOW).toBeGreaterThan(2.4);
    expect(secondsUntilOpen('sl', (EV.slOpen + EV.s2) / 2)).toBe(0);
    const wait = secondsUntilOpen('sl', EV.s2 + 0.01);
    expect(wait).toBeGreaterThan(0);
    expect(passable('sl', EV.s2 + 0.01 + wait / SLOW + 0.006)).toBe(true);
    expect(phaseAt(0.3).id).toBe('eject');
  });
});

describe('heart rooms follow the real path of blood', () => {
  it('doors chain right atrium → right ventricle → lungs → left atrium → left ventricle → aorta → (body) → right atrium', () => {
    expect(heartRoute).toEqual(['heart', 'rv', 'lung', 'la', 'lv', 'aorta']);
    for (let i = 0; i < heartRoute.length; i++) {
      const from = rooms[heartRoute[i]!], next = heartRoute[(i + 1) % heartRoute.length]!;
      expect(from.doors.map(d => d.to), from.id).toEqual([next]);
      const d = from.doors[0]!;
      expect(canStand(next, d.arrive), from.id).toBe(true);
      expect(d.arrive, from.id).toEqual(rooms[next].spawn);
    }
  });
  it('every structure, door and return pad can be reached on foot from where the reporter arrives', () => {
    for (const id of heartRoomIds) {
      const r = rooms[id];
      expect(canStand(id, r.spawn), id).toBe(true);
      for (const t of r.targets) expect(findPath(id, r.spawn, { x: t.x, y: t.y }).length > 0 || Math.hypot(t.x - r.spawn.x, t.y - r.spawn.y) <= t.r, id + '/' + t.id).toBe(true);
      for (const d of r.doors) expect(findPath(id, r.spawn, { x: d.zone.x + d.zone.w / 2, y: d.zone.y + d.zone.h / 2 }).length, id + '/' + d.id).toBeGreaterThan(0);
      expect(r.targets.some(t => t.id === 'return-pad'), id).toBe(true);
    }
  });
  it('the way out crosses the outflow valve; reporter backtracking through the inflow valve is blocked', () => {
    const expected: Record<string, [string | null, string | null]> = {
      heart: [null, 'tricuspid'], rv: ['tricuspid', 'pulmonary'], lung: [null, null], la: [null, 'mitral'], lv: ['mitral', 'aortic'], aorta: ['aortic', null],
    };
    for (const id of heartRoomIds) {
      const o = rooms[id].organ!, [inflow, outflow] = expected[id]!;
      expect(o.valves.filter(v => !v.pass).map(v => v.kind)[0] ?? null, id).toBe(inflow);
      expect(o.valves.filter(v => v.pass).map(v => v.kind)[0] ?? null, id).toBe(outflow);
      for (const v of o.valves.filter(q => !q.pass)) expect(canStand(id, { x: v.x + v.w / 2, y: v.y }), id).toBe(false);
      for (const v of o.valves.filter(q => q.pass)) {
        const door = rooms[id].doors[0]!, mid = { x: v.x + v.w / 2, y: v.y };
        expect(canStand(id, mid), id).toBe(true);
        expect(Math.sign(door.zone.y + door.zone.h / 2 - v.y), id).toBe(v.toward);
      }
    }
  });
  it('blood colour matches the side: oxygen-poor on the right, oxygen-rich on the left, changing in the lung', () => {
    const blood = (id: RoomId) => [...new Set(rooms[id].organ!.lanes.map(l => l.blood))];
    expect(blood('heart')).toEqual(['venous']); expect(blood('rv')).toEqual(['venous']);
    expect(blood('lung')).toEqual(['mix']);
    expect(blood('la')).toEqual(['arterial']); expect(blood('lv')).toEqual(['arterial']); expect(blood('aorta')).toEqual(['arterial']);
  });
  it('the left ventricle wall is drawn about three times thicker than the right ventricle free wall', () => {
    const lv = rooms.lv.organ!.wall(440, 330), rv = rooms.rv.organ!.wall(60, 300);
    expect(lv / rv).toBeGreaterThan(2);
    expect(lv / rv).toBeLessThan(3.5);
  });
  it('the reporter enters through the superior vena cava, not on a door', () => {
    expect(doorAt('heart', rooms.heart.spawn)).toBeUndefined();
    expect(rooms.heart.spawn.y).toBeLessThan(60);
  });
  it('the coronary sinus opening is superior and medial to the IVC opening in the anterior projection', () => {
    const [ivc, cs] = rooms.heart.organ!.features.filter(f => f.kind === 'rim');
    if (ivc?.kind !== 'rim' || cs?.kind !== 'rim') throw new Error('Missing vein openings');
    expect(cs.y).toBeLessThan(ivc.y);
    expect(cs.x).toBeGreaterThan(ivc.x); // screen-right is medial in the right atrium
    expect(rooms.heart.targets.find(t => t.id === 'hx-avnode')!.y).toBeLessThan(cs.y);
    const stream = rooms.heart.organ!.lanes[2]!;
    expect(stream.pts[0]).toEqual({ x: cs.x, y: cs.y });
    const target = rooms.heart.targets.find(t => t.id === 'hx-cs')!;
    expect(Math.hypot(target.x - cs.x, target.y - cs.y)).toBeLessThan(target.r + cs.r);
  });
  it('each left ventricular papillary group sends chordae to both mitral leaflets', () => {
    expect(rooms.lv.organ!.cords).toHaveLength(2);
    for (const cord of rooms.lv.organ!.cords) {
      expect(cord.valve).toBe('mv');
      expect(cord.slots.some(s => s < 0.56)).toBe(true);
      expect(cord.slots.some(s => s > 0.56)).toBe(true);
    }
  });
  it('coronary streams continue in systole, with stronger left suppression independent of aortic valve closure', () => {
    const streams = rooms.aorta.organ!.lanes.slice(1);
    expect(streams.map(s => s.when)).toEqual(['coronary-right', 'coronary-left']);
    for (const t of [EV.s1 + 0.01, EV.slOpen + 0.05]) { // closed valve in IVC, open valve in ejection
      expect(coronaryFlowFactor('left', t)).toBeGreaterThan(0);
      expect(coronaryFlowFactor('right', t)).toBeGreaterThan(coronaryFlowFactor('left', t));
      for (const side of ['left', 'right'] as const) expect(coronaryFlowFactor(side, t)).toBeLessThan(coronaryFlowFactor(side, EV.avOpen + 0.05));
    }
  });
});

describe('heart exploration record', () => {
  const at = (room: RoomId): GameState => ({ ...newState(), started: true, at: { room, x: rooms[room].spawn.x, y: rooms[room].spawn.y, facing: 'down' } });
  it('every recorded structure has a target in its room, and every hx target has text', () => {
    for (const id of discoveryIds) expect(rooms[discoveries[id]!.room].targets.some(t => t.id === id), id).toBe(true);
    for (const r of heartRoomIds) for (const t of rooms[r].targets) if (t.id.startsWith('hx-')) expect(discoveries[t.id]?.room, t.id).toBe(r);
  });
  it('records once, only in the right room, and pays no XP or gold', () => {
    const s = at('rv');
    expect(() => discover(s, 'hx-svc')).toThrow();
    expect(() => discover(s, 'nope')).toThrow();
    const a = discover(s, 'hx-moderator'), b = discover(a, 'hx-moderator');
    expect(b).toBe(a);
    expect(discovered(a)).toEqual(['hx-moderator']);
    expect(a.inspected).toContain(hxKey('hx-moderator'));
    expect([a.totalXp, a.gold]).toEqual([0, 0]);
  });
  it('content stays a labelled, unreviewed draft with a source for every record', () => {
    expect(content.status).toBe('draft_unreviewed');
    expect(content.review).toBeNull();
    expect(content.disclaimer).toContain('검수 전 모형');
    const ids = new Set(content.sources.map(x => x.id));
    for (const [id, d] of Object.entries(discoveries)) { expect(d.src.length, id).toBeGreaterThan(0); for (const s of d.src) expect(ids.has(s), id + '/' + s).toBe(true); }
    for (const s of content.sources) expect(s.url.startsWith('https://')).toBe(true);
  });
});
