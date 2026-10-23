import type { GameState } from '../../src/domain/state';
import { q12Fixture } from './q012-fixture';

/** A save right after Q012 ‘갈라지는 길’ was published (D113): Lv.12, 3,850XP plus the Q011 state. */
export function q13Fixture(): GameState {
  const s = q12Fixture();
  const keys = ['rx:rx-soft-palate', 'rx:rx-fork', 'rx:rx-epiglottis', 'rx:rx-glottis', 'rx:rx-esophagus'].filter(k => !s.inspected.includes(k));
  return { ...s, inspected: [...s.inspected, ...keys], totalXp: s.totalXp + 600, gold: s.gold + 400, ledger: [...s.ledger, 'quest.Q012.first'],
    q012: { accepted: true, notes: ['palate', 'fork', 'lid', 'cords'], compared: ['breath', 'swallow', 'slip'], order: ['arrive', 'close', 'down', 'open'], lead: 'reader', analogy: 'rail', limit: 'analogy', checked: true, publishedAt: '2026-10-23T03:00:00Z' } };
}
