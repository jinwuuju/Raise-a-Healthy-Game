import { describe, expect, it } from 'vitest';
import content from '../../data/content/respiratory-interior.v0.1.json';
import { BREATH, SWALLOW, airflow, breathPhase, epiglottisDown, gateShut, inflation, palateLift, secondsUntilGateOpen, swallowing } from '../../src/domain/breath';
import { canEnterAirway, discoverRx, rxCore, rxDiscoveries, rxIds, rxKey, rxTotalStars } from '../../src/domain/airway';
import { answerQuiz, makeQuestion, totalStars } from '../../src/domain/mastery';
import { validateState } from '../../src/domain/state';
import { CONCHAE, LOBAR, MAIN_BRONCHI, TRACHEA } from '../../src/world/airway-rooms';
import { canStand } from '../../src/world/collision';
import { rooms } from '../../src/world/rooms';
import { airwayRoomIds } from '../../src/world/types';
import { q11Fixture } from '../helpers/q011-fixture';

/* D111 airway space (design 20 section 7 step 2): the RESPIRATORY-INTERIOR accuracy contract as checks. */
describe('airway rooms follow the air path', () => {
  it('rooms are the content air path, each joined to the next both ways', () => {
    expect(airwayRoomIds).toEqual(content.airPath);
    for (let i = 0; i + 1 < airwayRoomIds.length; i++) {
      const a = airwayRoomIds[i]!, b = airwayRoomIds[i + 1]!;
      expect(rooms[a].doors.some(d => d.to === b)).toBe(true);
      expect(rooms[b].doors.some(d => d.to === a)).toBe(true);
    }
    for (const id of airwayRoomIds) for (const d of rooms[id].doors) {
      const j = airwayRoomIds.indexOf(d.to as never);
      expect(Math.abs(j - airwayRoomIds.indexOf(id))).toBe(1); // no shortcuts, no doors out of the airway
    }
  });
  it('the oesophagus is an opening behind the air way that is never walked into', () => {
    const ph = rooms.pharynx, a = ph.airway!;
    expect(a.holes(318, 612)).toBeLessThan(0);
    expect(canStand('pharynx', { x: 318, y: 612 })).toBe(false);
    const toLarynx = ph.doors.find(d => d.to === 'larynx')!;
    expect(toLarynx.zone.x + toLarynx.zone.w / 2).toBeLessThan(318); // larynx in front (screen-left = face), oesophagus behind
  });
  it('swallow gates sit across the way: soft palate between nose and throat, epiglottis over the laryngeal inlet', () => {
    const palate = rooms.pharynx.airway!.gates.find(g => g.kind === 'palate')!;
    expect(rooms.nose.doors[0]!.arrive.y).toBeLessThan(palate.y);
    expect(rooms.pharynx.doors.find(d => d.to === 'larynx')!.zone.y).toBeGreaterThan(palate.y);
    const lid = rooms.larynx.airway!.gates.find(g => g.kind === 'epiglottis')!;
    expect(rooms.pharynx.doors.find(d => d.to === 'larynx')!.arrive.y).toBeLessThan(lid.y);
    const folds = rooms.larynx.airway!.parts.find(p => p.kind === 'folds');
    expect(folds && folds.kind === 'folds' && folds.y > lid.y).toBe(true);
  });
});

describe('breathing and swallowing', () => {
  it('air goes in, then out, and stands still while swallowing; the same amount leaves as came in', () => {
    let net = 0;
    for (let t = 0; t < BREATH.period; t += 0.001) net += airflow(t) * 0.001;
    expect(Math.abs(net)).toBeLessThan(0.01);
    expect(airflow(BREATH.period * BREATH.inhale * 0.5)).toBeGreaterThan(0.9);
    expect(airflow(BREATH.period * (BREATH.inhale + (1 - BREATH.inhale) / 2))).toBeLessThan(-0.5);
    const mid = SWALLOW.at + SWALLOW.length / 2;
    expect(swallowing(mid)).toBe(true);
    expect(airflow(mid)).toBe(0);
    for (let t = 0; t < 40; t += 0.37) { expect(inflation(t)).toBeGreaterThanOrEqual(0); expect(inflation(t)).toBeLessThanOrEqual(1); }
  });
  it('breathing pauses during the swallow and resumes breathing out', () => {
    expect(breathPhase(SWALLOW.at - 0.01)).toBeGreaterThan(BREATH.inhale);
    expect(breathPhase(SWALLOW.at + SWALLOW.length + 0.05)).toBeGreaterThan(BREATH.inhale);
  });
  it('palate and epiglottis close only while swallowing, and reopen', () => {
    for (let t = 0; t < 60; t += 0.05) {
      if (!swallowing(t)) { expect(palateLift(t)).toBe(0); expect(epiglottisDown(t)).toBe(0); expect(gateShut('palate', t)).toBe(false); }
    }
    const mid = SWALLOW.at + SWALLOW.length / 2;
    expect(gateShut('palate', mid) && gateShut('epiglottis', mid)).toBe(true);
    expect(secondsUntilGateOpen('epiglottis', mid)).toBeGreaterThan(0);
    expect(secondsUntilGateOpen('epiglottis', mid)).toBeLessThanOrEqual(SWALLOW.length);
    expect(secondsUntilGateOpen('palate', 1)).toBe(0);
  });
  it('mucus goes one way: back in the nose, down to the oesophagus in the throat, up in the trachea and bronchi, none in the alveoli', () => {
    const ends = (id: 'nose' | 'pharynx' | 'trachea' | 'bronchi') => rooms[id].airway!.mucus.map(m => ({ a: m.pts[0]!, b: m.pts[m.pts.length - 1]! }));
    for (const m of ends('nose')) expect(m.b.x).toBeGreaterThan(m.a.x);
    for (const m of ends('pharynx')) expect(m.b.y).toBeGreaterThan(m.a.y);
    for (const m of ends('trachea')) expect(m.b.y).toBeLessThan(m.a.y);
    // In the bronchial tree mucus heads for the trachea (the right upper lobar bronchus runs upward, so 'towards the trachea' is the rule).
    const exits = rooms.bronchi.doors.filter(d => d.to === 'trachea').map(d => ({ x: d.zone.x + d.zone.w / 2, y: d.zone.y }));
    const toTrachea = (q: { x: number; y: number }) => Math.min(...exits.map(e => Math.hypot(e.x - q.x, e.y - q.y)));
    for (const m of ends('bronchi')) expect(toTrachea(m.b)).toBeLessThan(toTrachea(m.a));
    expect(rooms.alveoli.airway!.mucus).toHaveLength(0);
  });
});

describe('drawing precision (geometry)', () => {
  it('right main bronchus is shorter, wider and steeper than the left; three lobar bronchi right, two left', () => {
    const len = (b: typeof MAIN_BRONCHI.right) => Math.hypot(b.to.x - b.from.x, b.to.y - b.from.y);
    const tilt = (b: typeof MAIN_BRONCHI.right) => Math.abs(Math.atan2(b.to.x - b.from.x, b.to.y - b.from.y));
    const R = MAIN_BRONCHI.right, L = MAIN_BRONCHI.left;
    expect(len(R)).toBeLessThan(len(L));
    expect(Math.min(...R.r)).toBeGreaterThan(Math.max(...L.r));
    expect(tilt(R)).toBeLessThan(tilt(L));
    expect(R.to.x).toBeLessThan(R.from.x); // screen-left is the person's right
    expect(LOBAR.right).toHaveLength(3); expect(LOBAR.left).toHaveLength(2);
  });
  it('tracheal rings are open behind: the back wall is muscle and the rings stop short of the middle', () => {
    const t = rooms.trachea.airway!, rings = t.features.find(f => f.kind === 'rings');
    expect(rings && rings.kind === 'rings' && rings.open > 0).toBe(true);
    expect(t.texture(TRACHEA.mid, 300)).toBe('trachealis');
    expect(t.texture(TRACHEA.x0 + 6, 300)).not.toBe('trachealis');
  });
  it('three nasal shelves: the lowest is the largest, stacked from the top: superior, middle, inferior', () => {
    const { inferior, middle, superior } = CONCHAE;
    expect(inferior.rx).toBeGreaterThan(middle.rx); expect(middle.rx).toBeGreaterThan(superior.rx);
    expect(superior.y).toBeLessThan(middle.y); expect(middle.y).toBeLessThan(inferior.y);
  });
  it('every exploration record stands in its own room', () => {
    for (const id of rxIds) {
      const room = rooms[rxDiscoveries[id]!.room];
      expect(room.targets.some(t => t.id === id)).toBe(true);
    }
    expect(rxCore).toHaveLength(12);
    expect(rooms[content.joinsHeartRoom.room as 'alveoli'].targets.some(t => t.id === content.joinsHeartRoom.target)).toBe(true);
  });
});

describe('airway records and field checks', () => {
  const inNose = () => { const s = q11Fixture(); return { ...s, at: { room: 'nose' as const, ...rooms.nose.spawn, facing: 'right' as const } }; };
  it('opens after the heart graduation, from the newsroom', () => {
    const s = q11Fixture();
    expect(canEnterAirway({ ...s, at: { ...s.at, room: 'newsroom' } })).toBeNull();
    expect(canEnterAirway({ ...s, ledger: s.ledger.filter(k => k !== 'quest.Q010.first'), at: { ...s.at, room: 'newsroom' } })).not.toBeNull();
  });
  it('records only where the structure is, stars are counted per organ and saves validate', () => {
    const s = inNose();
    expect(() => discoverRx(s, 'rx-carina')).toThrow();
    const a = discoverRx(s, 'rx-nostril');
    expect(a.inspected).toContain(rxKey('rx-nostril'));
    expect(() => answerQuiz(s, 'rx-nostril', 'name', true)).toThrow(); // record first
    const q = makeQuestion('rx-nostril', 'name', 'seed');
    expect(q.choices.some(c => c.id === 'rx-nostril')).toBe(true);
    const r = answerQuiz(a, 'rx-nostril', 'name', true);
    expect(r.star).toBe(true);
    expect(rxTotalStars(r.state)).toBe(1);
    expect(totalStars(r.state)).toBe(totalStars(s)); // heart tiers do not move
    expect(() => validateState(JSON.parse(JSON.stringify(r.state)))).not.toThrow();
  });
});
