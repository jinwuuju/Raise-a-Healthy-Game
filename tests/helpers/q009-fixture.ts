import type { GameState } from '../../src/domain/state';
import { q8Fixture } from './q008-fixture';

/** A save right after Q008 was published (Lv.9, 2,200XP), before Q009 (D108). */
export function q9Fixture(): GameState {
  const s = q8Fixture();
  return { ...s, totalXp: 2200, gold: 1520, ledger: [...s.ledger, 'quest.Q008.first'],
    q008: { accepted: true, mode: 'rest', notes: ['squeeze', 'recoil', 'moved', 'high', 'causes', 'tests', 'care'], picks: ['home-1', 'home-2', 'home-3'], verdict: 'repeat', lead: 'one-number', limit: 'model', checked: true, publishedAt: '2026-10-19T06:00:00Z' } };
}
