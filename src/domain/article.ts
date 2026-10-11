import balance from '../../data/balance/q001.v0.1.json';
import { articleText, validateArticle, type ArticleSlot } from './article-state';
import { discoveries, hxKey } from './heart';
import { Q1, obsKey, q1Seen } from './quest';
import { grantOnce, type GameState } from './state';

export const Q1_PUBLISH_REWARD = balance.publication;
export function articleAccess(s: GameState): string | null {
  if (!s.flags.includes(Q1.briefed) || !s.flags.includes(Q1.accepted) || !s.flags.includes(Q1.observed) || q1Seen(s).length !== 2)
    return '두 문을 관찰하고 편집장에게 결과를 알려 주면 기사 쓰기가 열려요.';
  if (s.at.room !== 'newsroom') return '기사 작성은 편집국의 내 자리에서 할 수 있어요. 수첩에서는 초안을 읽을 수 있어요.';
  return null;
}
function writable(s: GameState): void {
  const why = articleAccess(s); if (why) throw new Error(why);
  if (s.article.publishedAt || s.ledger.includes(Q1_PUBLISH_REWARD.key)) throw new Error('이미 발행한 기사는 수첩에서 읽을 수 있어요.');
}
export function selectArticle(s: GameState, slot: ArticleSlot, id: string | null): GameState {
  writable(s);
  if (!['lead', 'returning', 'outgoing', 'extra'].includes(slot)) throw new Error('알 수 없는 기사 문단이에요.');
  const article = validateArticle({ ...s.article, [slot]: id, checked: false });
  if (id !== null && slot !== 'lead' && !s.inspected.includes(slot === 'extra' ? hxKey(id) : obsKey(id))) throw new Error('직접 관찰한 기록만 기사에 붙일 수 있어요.');
  if (s.article[slot] === id) return s;
  return { ...s, article };
}
export function articleFeedback(s: GameState): string[] {
  const a = s.article, f = articleText.feedback, messages: string[] = [];
  if (!a.lead) messages.push(f.lead);
  if (a.returning !== 'heart-in' || !s.inspected.includes(obsKey('heart-in'))) messages.push(f.returning);
  if (a.outgoing !== 'heart-out' || !s.inspected.includes(obsKey('heart-out'))) messages.push(f.outgoing);
  if (a.extra && (!discoveries[a.extra] || !s.inspected.includes(hxKey(a.extra)))) messages.push('추가 메모는 직접 발견한 탐험 기록에서 골라 주세요.');
  return messages;
}
export function checkArticle(s: GameState): GameState {
  writable(s);
  if (articleFeedback(s).length) return s;
  return s.article.checked ? s : { ...s, article: { ...s.article, checked: true } };
}
/** Publication and the remaining reward are one state change with the canonical Q001 completion key. */
export function publishArticle(s: GameState, now = new Date().toISOString()): GameState {
  if (s.article.publishedAt || s.ledger.includes(Q1_PUBLISH_REWARD.key)) return s;
  writable(s);
  if (!s.article.checked || articleFeedback(s).length) throw new Error('편집장에게 초안을 보여 주고 근거를 확인해 주세요.');
  if (!s.ledger.includes(balance.observation.key)) throw new Error('관찰 보상 기록을 확인할 수 없어요. 메뉴에서 이전 백업을 확인해 주세요.');
  if (!Number.isFinite(Date.parse(now))) throw new Error('발행 시각이 잘못되었습니다.');
  return { ...grantOnce(s, Q1_PUBLISH_REWARD.key, Q1_PUBLISH_REWARD), article: { ...s.article, publishedAt: now } };
}
