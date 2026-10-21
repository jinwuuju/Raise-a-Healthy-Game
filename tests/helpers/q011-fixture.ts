import type { GameState } from '../../src/domain/state';
import { hxKey } from '../../src/domain/heart';
import { coreIds } from '../../src/domain/q010';
import { q10Fixture } from './q010-fixture';

/** A save right after Q010 was published: heart graduated, Lv.10, 2,700XP, rank 신입 기자 (D108). Core structures carry a star. */
export function q11Fixture(): GameState {
  const s = q10Fixture();
  const inspected = [...s.inspected, ...coreIds.map(hxKey).filter(k => !s.inspected.includes(k))];
  const mastery = { ...s.mastery }; for (const id of coreIds) if (!mastery[id]) mastery[id] = { stars: 1, kinds: ['name'] };
  return { ...s, inspected, mastery, gold: s.gold + 400 + 5 * coreIds.length, ledger: [...s.ledger, 'quest.Q010.first'], heartRun: { ...s.heartRun, runs: Math.max(1, s.heartRun.runs) },
    q010: { accepted: true, runDone: true, claim: 'two-pumps', evidence: ['valves', 'two-loops'], lead: 'one-line', analogy: 'two-pumps', limit: 'analogy', checked: true, publishedAt: '2026-10-21T06:00:00Z' } };
}
