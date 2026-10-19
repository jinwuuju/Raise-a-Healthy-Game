import content from '../../data/content/q006.v0.1.json';
import { q6Evidence, supplyOrder } from '../../src/domain/q006-state';
import type { GameState } from '../../src/domain/state';
import { q6Fixture } from './q006-fixture';

/** A save right after Q006 was published (Lv.7, 1,350XP), before Q007: the heart-muscle delivery is open (D108). */
export function q7Fixture(): GameState {
  const s = q6Fixture();
  const hx = ['hx-cs', 'hx-rvwall', 'hx-lvwall', 'hx-rca', 'hx-lca'].map(id => 'hx:' + id).filter(k => !s.inspected.includes(k));
  return { ...s, totalXp: 1350, gold: 960, ledger: [...s.ledger, 'quest.Q006.first'], inspected: [...s.inspected, ...hx],
    q006: { accepted: true, mode: 'rest', notes: [...q6Evidence], order: [...supplyOrder], lead: content.article.leads[0]!.id, limit: content.article.limitations[0]!.id, checked: true, publishedAt: '2026-10-15T10:00:00Z' } };
}
