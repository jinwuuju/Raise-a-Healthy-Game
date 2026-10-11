import { newState, type GameState } from '../../src/domain/state';
export function q3Fixture(): GameState {
  const s = newState();
  return { ...s, started: true, totalXp: 250, gold: 220,
    ledger: ['quest.Q001.observe', 'quest.Q001.first', 'quest.Q002.first'],
    flags: ['met-editor','reported-back','q001-accepted','q001-entered','q001-observed','q001-briefed','heart-guided'],
    inspected: ['q001:heart-in','q001:heart-out','q002:heart','q002:rv','q002:la','q002:lv'],
    cafe: { ...s.cafe, welcomeUsed: true },
    article: { lead: 'question', returning: 'heart-in', outgoing: 'heart-out', extra: null, checked: true, publishedAt: '2026-10-11T00:00:00Z' },
    q002: { accepted: true, reported: true, lead: 'addresses', cards: { heart: 'heart', rv: 'rv', la: 'la', lv: 'lv' }, checked: true, publishedAt: '2026-10-11T00:01:00Z' } };
}
