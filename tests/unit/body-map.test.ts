import { describe, expect, it } from 'vitest';
import body from '../../data/content/body-map.v0.1.json';
import { airwayRoomIds, heartRoomIds } from '../../src/world/types';

describe('body map (front view: screen left is the body right)', () => {
  const o = (id: string) => body.organs.find(x => x.id === id)!;
  it('stays a labelled draft', () => {
    expect(body.status).toBe('draft_unreviewed');
    expect(body.review).toBeNull();
    expect(body.disclaimer).toContain('검수 전 모형');
  });
  it('places organs on the anatomically correct side', () => {
    const mid = 300;
    expect(o('heart').x).toBeGreaterThan(mid);
    expect(o('liver').x).toBeLessThan(mid);
    expect(o('stomach').x).toBeGreaterThan(mid);
    expect(o('lung-right').x).toBeLessThan(mid);
    expect(o('lung-left').x).toBeGreaterThan(mid);
    expect(o('kidney-right').y).toBeGreaterThan(o('kidney-left').y);
    expect(o('lung-left').rx).toBeLessThan(o('lung-right').rx);
    expect(o('brain').y).toBeLessThan(o('heart').y);
    expect(o('heart').y).toBeLessThan(o('liver').y);
  });
  it('only the heart is open from the start; the airway and lungs open with the airway (D112); every room is a Bodyscope room', () => {
    expect(body.organs.filter(x => x.state === 'open').map(x => x.id)).toEqual(['heart']);
    expect(body.organs.filter(x => 'opensWith' in x).map(x => x.id).sort()).toEqual(['airway', 'lung-left', 'lung-right']);
    const all = [...heartRoomIds, ...airwayRoomIds] as string[];
    for (const x of body.organs) for (const r of x.rooms) expect(all).toContain(r);
    expect(new Set(body.organs.flatMap(x => x.rooms))).toEqual(new Set(all));
    expect(o('airway').y).toBeLessThan(o('lung-right').y);
  });
});
