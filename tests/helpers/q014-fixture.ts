import type { GameState } from '../../src/domain/state';
import { q13Fixture } from './q013-fixture';

/** A save right after Q013 ‘두 개의 흐름’ was published (D117): Lv.13, 4,530XP plus the Q012 state. */
export function q14Fixture(): GameState {
  const s = q13Fixture();
  const keys = ['rx:rx-c-ring', 'rx:rx-escalator', 'rx:rx-carina', 'rx:rx-lobar', 'rx:rx-goblet'].filter(k => !s.inspected.includes(k));
  return { ...s, inspected: [...s.inspected, ...keys], totalXp: s.totalXp + 680, gold: s.gold + 420, ledger: [...s.ledger, 'quest.Q013.first'],
    q013: { accepted: true, notes: ['rings', 'carpet', 'carina', 'branches'], compared: ['in', 'out', 'hold'], sorted: ['tide', 'divide', 'up', 'gather'], lead: 'reader', analogy: 'escalator', limit: 'analogy', checked: true, publishedAt: '2026-10-26T03:00:00Z' } };
}
