import { q5Fixture } from './q005-fixture';
import type { GameState } from '../../src/domain/state';

/** A save right after Q005 was published (Lv.6, 1,000XP), before the Q006 commission. */
export function q6Fixture(): GameState {
  const s = q5Fixture();
  return { ...s, totalXp: 1000, gold: 740, ledger: [...s.ledger, 'quest.Q005.first'],
    q005: { accepted: true, mode: 'normal', notes: ['sa', 'av', 'right-branch', 'atria', 'left-branch', 'af', 'causes', 'tests', 'care'], order: ['sa', 'atria', 'av', 'right-branch', 'left-branch'], lead: 'signal', limit: 'model', checked: true, publishedAt: '2026-10-13T10:00:00Z' } };
}
