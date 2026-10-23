import type { GameState } from '../../src/domain/state';
import { q11Fixture } from './q011-fixture';

/** A save right after Q011 ‘공기 항구’ was published (D112): Lv.11, 3,250XP plus the heart graduation state. */
export function q12Fixture(): GameState {
  const s = q11Fixture();
  const keys = ['rx:rx-vestibule', 'rx:rx-inferior-concha', 'rx:rx-mucosa', 'rx:rx-cilia-nose'].filter(k => !s.inspected.includes(k));
  return { ...s, inspected: [...s.inspected, ...keys], totalXp: s.totalXp + 550, gold: s.gold + 380, ledger: [...s.ledger, 'quest.Q011.first'],
    q011: { accepted: true, notes: ['hairs', 'shelves', 'wall', 'mucus'], compared: ['cold', 'dust', 'virus'], pairs: ['wall', 'mucus', 'hairs'], lead: 'winter', analogy: 'harbor', limit: 'analogy', checked: true, publishedAt: '2026-10-23T01:00:00Z' } };
}
