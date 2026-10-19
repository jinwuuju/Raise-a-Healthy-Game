import type { GameState } from '../../src/domain/state';
import { q7Fixture } from './q007-fixture';

/** A save right after Q007 was published (Lv.8, 1,750XP), before Q008 (D108). */
export function q8Fixture(): GameState {
  const s = q7Fixture();
  return { ...s, totalXp: 1750, gold: 1220, ledger: [...s.ledger, 'quest.Q007.first'],
    q007: { accepted: true, mode: 'wide', notes: ['lca-wall', 'rca-wall', 'mild', 'narrow', 'causes', 'tests', 'care'], pair: 'narrow-rest', chain: ['buildup', 'narrowing', 'less-flow'], lead: 'open-road', limit: 'model', checked: true, publishedAt: '2026-10-19T03:00:00Z' } };
}
