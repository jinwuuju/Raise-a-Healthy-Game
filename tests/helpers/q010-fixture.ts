import type { GameState } from '../../src/domain/state';
import { q9Fixture } from './q009-fixture';

/** A save right after Q009 was published (Lv.10, 2,700XP), before Q010 (D108). */
export function q10Fixture(): GameState {
  const s = q9Fixture();
  return { ...s, totalXp: 2700, gold: 1870, ledger: [...s.ledger, 'quest.Q009.first'],
    q009: { accepted: true, notes: ['wall', 'right-pump', 'lung', 'left-pump'], slots: ['ra', 'rv', 'la', 'lv'], chain: ['ra', 'rv', 'lung', 'la', 'lv', 'body'], lead: 'mirror', analogy: 'two-pumps', limit: 'analogy', checked: true, publishedAt: '2026-10-21T03:00:00Z' } };
}
