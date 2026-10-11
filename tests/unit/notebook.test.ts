import { describe, expect, it } from 'vitest';
import { notebookRecords } from '../../src/application/notebook';
import { discoveries, discoveryIds } from '../../src/domain/heart';
import { newState } from '../../src/domain/state';

describe('notebook record classification', () => {
  it('partitions every persisted observation exactly once, including unknown older records', () => {
    const inspected = ['q001:heart-in', 'q001:heart-out', ...discoveryIds.map(id => 'hx:' + id), 'my-desk', 'device', 'shelf', 'notice', 'street-notice', 'station', 'park-bench', 'fountain', 'window-seat', 'old-record', 'hx:future-structure'];
    const s = { ...newState(), inspected }, before = JSON.stringify(s), vm = notebookRecords(s);
    const all = [...vm.evidence, ...Object.values(vm.anatomy).flat(), ...Object.values(vm.local).flat(), ...vm.legacy];
    expect(new Set(all).size).toBe(inspected.length); expect(all.sort()).toEqual([...inspected].sort());
    expect(vm.legacy).toEqual(['old-record', 'hx:future-structure']); expect(JSON.stringify(s)).toBe(before);
  });
  it('puts observations in quest files, heart structures in their actual room and place notes in their own area', () => {
    const s = { ...newState(), inspected: ['q001:heart-in', 'hx:' + discoveryIds[0], 'shelf', 'park-bench', 'window-seat'] };
    const vm = notebookRecords(s); expect(vm.evidence).toEqual(['q001:heart-in']);
    expect(vm.anatomy[discoveries[discoveryIds[0]!]!.room]).toEqual(['hx:' + discoveryIds[0]]);
    expect(vm.local).toEqual({ office: ['shelf'], neighborhood: ['park-bench'], cafe: ['window-seat'] });
  });
  it('treats prototype-like imported keys as legacy records rather than inherited dictionary entries', () => {
    const keys = ['constructor', 'toString', '__proto__', 'hx:constructor', 'hx:toString', 'hx:__proto__'];
    const vm = notebookRecords({ ...newState(), inspected: keys });
    expect(vm.legacy).toEqual(keys); expect(vm.anatomy).toEqual({});
    expect(Object.values(vm.local).flat()).toEqual([]);
  });
});
