import { q3Fixture } from './q003-fixture';
import type { GameState } from '../../src/domain/state';

/** A save right after Q004 was published (Lv.5, 700XP), before the Q005 commission. */
export function q5Fixture(): GameState {
  const s = q3Fixture();
  return { ...s, totalXp: 700, gold: 540, ledger: [...s.ledger, 'quest.Q003.first', 'quest.Q004.first'],
    q003: { accepted: true, mode: 'normal', notes: ['tricuspid', 'pulmonary', 'stenosis', 'regurgitation', 'causes', 'tests', 'care'], lead: 'compare', limit: 'model', checked: true, publishedAt: '2026-10-12T00:00:00Z' },
    q004: { accepted: true, notes: ['pulmonary-out', 'gas', 'pulmonary-return', 'systemic-out', 'body-route', 'systemic-return'], crossedBody: true, routes: { pulmonary: true, systemic: true }, joined: true, lead: 'pulmonary', limit: 'model', checked: true, publishedAt: '2026-10-12T01:00:00Z' } };
}
