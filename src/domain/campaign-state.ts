import { questIds, questById, rewardFor, type QuestId } from './content';
import shop from '../../data/balance/life-shop.v0.1.json';
import stages from '../../data/balance/campaign-stages.v0.1.json';
export type TaskProgress = { choices: string[]; solved: boolean; hint: number; demonstrated: boolean; trials: string[] };
export type ArticleDraft = { headline: number; slots: string[]; note: string };
export type QuestProgress = { accepted: boolean; evidence: string[]; tasks: Record<string, TaskProgress>; draft: ArticleDraft; publishedDraft: ArticleDraft | null; published: boolean; publishedAt: string | null; articleRevision: number };
export type CampaignState = { version: 'cardio-0.1'; active: QuestId | null; records: Partial<Record<QuestId, QuestProgress>>; purchased: string[] };
export const emptyCampaign = (): CampaignState => ({ version: 'cardio-0.1', active: null, records: {}, purchased: [] });
export const emptyProgress = (): QuestProgress => ({ accepted: false, evidence: [], tasks: {}, draft: { headline: 0, slots: ['', '', ''], note: '' }, publishedDraft: null, published: false, publishedAt: null, articleRevision: 0 });
const list = (v: unknown, max: number): v is string[] => Array.isArray(v) && v.length <= max && [...v].every(x => typeof x === 'string' && x.length <= 100) && new Set(v).size === v.length;
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
export function validateCampaignState(value: unknown, legacy: { flags: string[]; inspected: string[]; ledger: string[]; totalXp?: number }): CampaignState {
  const c = emptyCampaign();
  if (value !== undefined) {
    if (!object(value) || value.version !== 'cardio-0.1' || (value.active !== null && !questIds.includes(value.active as QuestId)) || !object(value.records) || !list(value.purchased, shop.items.length) || value.purchased.some(id => !shop.items.some(item => item.id === id))) throw new Error('취재 저장 형식이 올바르지 않아요.');
    c.active = value.active as QuestId | null; c.purchased = [...value.purchased];
    for (const [id, raw] of Object.entries(value.records)) {
      if (!questIds.includes(id as QuestId) || !object(raw)) throw new Error('없는 취재 기록이에요.');
      const q = questById(id as QuestId), allowed = new Set([...q.observations.map(o => o.id), ...q.tasks.map(t => t.evidenceId)]);
      if (typeof raw.accepted !== 'boolean' || typeof raw.published !== 'boolean' || !list(raw.evidence, allowed.size) || raw.evidence.some(e => !allowed.has(e)) || !object(raw.tasks) || !object(raw.draft) || !Number.isSafeInteger(raw.articleRevision) || Number(raw.articleRevision) < 0) throw new Error('취재 진척이 잘못되었어요.');
      const p = emptyProgress(); p.accepted = raw.accepted; p.published = raw.published; p.evidence = [...raw.evidence]; p.articleRevision = raw.articleRevision as number;
      if (raw.publishedAt !== null && (typeof raw.publishedAt !== 'string' || !Number.isFinite(Date.parse(raw.publishedAt)))) throw new Error('발행 날짜 오류');
      p.publishedAt = raw.publishedAt as string | null;
      const d = raw.draft;
      if (![0, 1].includes(d.headline as number) || !Array.isArray(d.slots) || d.slots.length !== 3 || ![...d.slots].every((x, i) => typeof x === 'string' && (x === '' || q.cards.some(card => card.id === x && card.slot === ['observation', 'mechanism', 'conclusion'][i]))) || typeof d.note !== 'string' || d.note.length > 2000) throw new Error('기사 초안 오류');
      p.draft = { headline: d.headline as number, slots: [...d.slots] as string[], note: d.note };
      const publishedDraft = raw.publishedDraft === undefined && p.published ? d : raw.publishedDraft;
      if (publishedDraft !== undefined && publishedDraft !== null) {
        if (!object(publishedDraft) || ![0, 1].includes(publishedDraft.headline as number) || !Array.isArray(publishedDraft.slots) || publishedDraft.slots.length !== 3 || ![...publishedDraft.slots].every((x, i) => typeof x === 'string' && q.cards.some(card => card.id === x && card.slot === ['observation', 'mechanism', 'conclusion'][i])) || typeof publishedDraft.note !== 'string' || publishedDraft.note.length > 2000) throw new Error('발행 기사 저장 오류');
        p.publishedDraft = { headline: publishedDraft.headline as number, slots: [...publishedDraft.slots] as string[], note: publishedDraft.note };
      }
      for (const [key, rawTask] of Object.entries(raw.tasks)) {
        const def = q.tasks.find(t => t.id === key);
        if (!def || !object(rawTask) || !Array.isArray(rawTask.choices) || rawTask.choices.length !== def.slots.length || ![...rawTask.choices].every(x => typeof x === 'string' && (x === '' || def.choices.some(choice => choice.id === x))) || typeof rawTask.solved !== 'boolean' || typeof rawTask.demonstrated !== 'boolean' || !Number.isInteger(rawTask.hint) || Number(rawTask.hint) < 0 || Number(rawTask.hint) > 3 || !list(rawTask.trials, 2) || rawTask.trials.some(x => !['baseline', 'changed'].includes(x))) throw new Error('퍼즐 저장 오류');
        const t: TaskProgress = { choices: [...rawTask.choices] as string[], solved: rawTask.solved, demonstrated: rawTask.demonstrated, hint: rawTask.hint as number, trials: [...rawTask.trials] };
        if (t.demonstrated && (key !== 'apply' || !t.solved || t.hint !== 3)) throw new Error('시연과 새 배치 기록 불일치');
        if (!t.demonstrated && t.hint > 2) throw new Error('힌트 기록 오류');
        if (t.solved && !def.slots.every((slot, i) => slot.answer.includes(t.choices[i]!))) throw new Error('퍼즐 판정과 배치 불일치');
        if ((!def.baseline && t.trials.length) || (t.trials.includes('changed') && !t.trials.includes('baseline')) || (def.baseline && t.solved && !t.demonstrated && (!t.trials.includes('baseline') || !t.trials.includes('changed')))) throw new Error('기준·변경 조건 비교 기록 오류');
        p.tasks[key] = t;
      }
      c.records[id as QuestId] = p;
    }
  }
  // Existing schema-4 Q001 entry saves keep their observations and original 20 XP key.
  if (legacy.flags.includes('q001-accepted')) {
    const p = c.records.Q001 ?? emptyProgress(); p.accepted = true;
    for (const id of ['heart-out', 'heart-in']) if (legacy.inspected.includes('q001:' + id) && !p.evidence.includes(id)) p.evidence.push(id);
    c.records.Q001 = p; if (c.active === null && !p.published) c.active = 'Q001';
  }
  let minimumXp = 0;
  for (const [index, id] of questIds.entries()) {
    const p = c.records[id] ?? emptyProgress(), q = questById(id);
    const observed = q.observations.every(e => p.evidence.includes(e.id));
    const applied = observed && q.tasks.slice(0, p.tasks.apply?.demonstrated ? 3 : 2).every(t => p.tasks[t.id]?.solved);
    if (p.accepted && (index ? !c.records[questIds[index - 1]!]?.published : !legacy.flags.includes('reported-back'))) throw new Error('취재 선수 조건이 없는 기록이에요.');
    if (!p.accepted && (p.evidence.length || Object.keys(p.tasks).length || p.draft.slots.some(Boolean) || p.draft.note || p.published || p.publishedAt || p.publishedDraft || p.articleRevision)) throw new Error('수락하지 않은 취재 진척이에요.');
    if (Object.keys(p.tasks).length && !observed) throw new Error('관찰 전 모형 조작 기록이에요.');
    for (const task of q.tasks) if (p.evidence.includes(task.evidenceId) !== !!p.tasks[task.id]?.solved) throw new Error('모형 판정과 근거 카드 불일치');
    const keys = { observe: 'quest.' + id + '.observe', apply: 'quest.' + id + '.apply', publish: rewardFor(id).completionKey };
    if (legacy.ledger.includes(keys.observe) !== observed || legacy.ledger.includes(keys.apply) !== applied || legacy.ledger.includes(keys.publish) !== p.published) throw new Error('취재 근거와 보상 원장 불일치');
    for (const stage of ['observe', 'apply', 'publish'] as const) if (legacy.ledger.includes(keys[stage])) minimumXp += stages.stages[id][stage];
    if (p.published !== !!p.publishedAt || p.published !== !!p.publishedDraft || p.published !== (p.articleRevision > 0)) throw new Error('기사 발행 기록 불일치');
    if (p.published && (!applied || !q.acceptedLinks.some(link => link.every((v, i) => v === p.publishedDraft!.slots[i])) || p.publishedDraft!.slots.some(cardId => q.cards.find(card => card.id === cardId)!.evidenceIds.some(e => !p.evidence.includes(e))))) throw new Error('기사에 필요한 근거와 연결이 없어요.');
  }
  if (legacy.ledger.some(key => /^quest\.Q\d{3}\./.test(key) && !questIds.some(id => ['quest.' + id + '.observe', 'quest.' + id + '.apply', rewardFor(id).completionKey].includes(key)))) throw new Error('없는 취재 보상 원장이에요.');
  if (legacy.totalXp !== undefined && legacy.totalXp < minimumXp) throw new Error('경험치와 보상 원장 불일치');
  if (c.active && !c.records[c.active]?.accepted) throw new Error('수락하지 않은 활성 취재');
  const unfinished = questIds.filter(id => c.records[id]?.accepted && !c.records[id]?.published);
  if (unfinished.length > 1 || (unfinished.length && c.active !== unfinished[0])) throw new Error('진행 중인 취재와 활성 취재 불일치');
  for (const itemId of c.purchased) {
    const item = shop.items.find(item => item.id === itemId)!;
    if (!c.records[item.unlock as QuestId]?.published) throw new Error('해금 전 구매 기록이에요.');
  }
  return c;
}
