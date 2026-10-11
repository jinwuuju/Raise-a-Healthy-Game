import Ajv from 'ajv';
import raw from '../../data/content/cardio-campaign.v0.1.json';
import schema from '../../data/schemas/campaign.schema.json';
import balance from '../../data/balance/early-quests.v0.1.json';
import stages from '../../data/balance/campaign-stages.v0.1.json';
import type { RoomId } from '../world/types';

export const questIds = ['Q001','Q002','Q003','Q004','Q005','Q006','Q007','Q008','Q009','Q010'] as const;
export type QuestId = typeof questIds[number];
export type Evidence = { id: string; title: string; text: string; conceptId: string; sources: string[] };
export type Task = { id: string; kind: 'flow'|'match'|'valves'|'routes'|'sequence'|'supply'|'compare'|'records'|'synthesis'|'planning'; title: string; instruction: string; choices: { id: string; label: string; explanation: string }[]; slots: { id: string; label: string; answer: string[] }[]; hints: string[]; feedback: string; evidenceId: string; scene: { nodes: { id: string; label: string; x: number; y: number }[]; links: [string,string][] }; demonstration: string; baseline: string[] | null };
export type ArticleCard = { id: string; slot: 'observation'|'mechanism'|'conclusion'; text: string; evidenceIds: string[]; valid: boolean; feedback: string };
export type QuestDefinition = { id: QuestId; title: string; question: string; offer: string; region: RoomId; conceptIds: string[]; observations: Evidence[]; tasks: Task[]; cards: ArticleCard[]; acceptedLinks: string[][]; headline: string; alternateHeadline: string; limitations: string; sources: string[]; debrief: string; unlockText: string };
export type CampaignContent = { schemaVersion: 1; contentVersion: string; status: 'draft_unreviewed'; disclaimer: string; review: null; sources: { id: string; title: string; publisher: string; url: string; checkedAt: string; updatedAt: string; section: string; claims: string[] }[]; concepts: { id: string; title: string; text: string; prerequisites: string[]; sources: string[]; limitations: string }[]; quests: QuestDefinition[] };
const ajv = new Ajv({ allErrors: true, strict: true });
const structural = ajv.compile<CampaignContent>(schema);
export function validateContent(value: unknown): CampaignContent {
  if (!structural(value)) throw new Error('취재 콘텐츠 형식 오류: ' + ajv.errorsText(structural.errors));
  const c = value, sources = new Set(c.sources.map(s => s.id)), concepts = new Map(c.concepts.map(s => [s.id,s]));
  if (sources.size !== c.sources.length || concepts.size !== c.concepts.length || c.quests.length !== 10 || c.quests.some((q,i) => q.id !== questIds[i])) throw new Error('콘텐츠 ID 중복/누락');
  const checkSources = (ids: string[]) => { if (!ids.length || new Set(ids).size!==ids.length || ids.some(id => !sources.has(id))) throw new Error('출처 참조 누락'); };
  const validDate=(date:string)=>/^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date))&&new Date(date).toISOString().slice(0,10)===date;
  for(const source of c.sources) {
    let url:URL;try{url=new URL(source.url);}catch{throw new Error('출처 주소 오류');}
    if(url.protocol!=='https:'||url.hostname!=='www.nhlbi.nih.gov'||url.username||url.password||!source.publisher.includes('NHLBI')||!validDate(source.checkedAt)||!validDate(source.updatedAt)||source.updatedAt>source.checkedAt||new Set(source.claims).size!==source.claims.length)throw new Error('출처 기관·확인일·주장 계약 오류');
  }
  const visited = new Set<string>(), active = new Set<string>();
  const visit = (id: string) => { if (active.has(id)) throw new Error('개념 선수 관계 순환'); if (visited.has(id)) return; const concept = concepts.get(id); if (!concept) throw new Error('개념 참조 누락'); active.add(id); for (const dep of concept.prerequisites) visit(dep); active.delete(id); visited.add(id); checkSources(concept.sources); };
  for (const id of concepts.keys()) visit(id);
  const introduced=new Set<string>();
  for (const q of c.quests) {
    checkSources(q.sources); if (new Set(q.conceptIds).size!==q.conceptIds.length || q.conceptIds.some(id => !concepts.has(id))) throw new Error('취재 개념 참조 누락');
    for(const id of q.conceptIds)if(concepts.get(id)!.prerequisites.some(dep=>!introduced.has(dep)))throw new Error('해금보다 먼저 필요한 개념이 있어요.');
    for(const id of q.conceptIds)introduced.add(id);
    const evidence = new Set(q.observations.map(e => e.id));
    for (const e of q.observations) { checkSources(e.sources); if (!q.conceptIds.includes(e.conceptId)||e.sources.some(id=>!q.sources.includes(id))) throw new Error('관찰 개념·출처 누락'); }
    if (evidence.size !== q.observations.length || new Set(q.tasks.map(t => t.id)).size !== q.tasks.length) throw new Error('관찰/퍼즐 중복');
    if(q.tasks.length!==3||q.tasks.some((task,i)=>task.id!==['apply','transfer','transfer-fresh'][i]))throw new Error('모형·전이·새 전이 과제 계약 오류');
    for (const task of q.tasks) {
      if (evidence.has(task.evidenceId)) throw new Error('적용 증거 중복'); evidence.add(task.evidenceId);
      const choices = new Set(task.choices.map(v => v.id));
      if (choices.size !== task.choices.length || new Set(task.slots.map(slot=>slot.id)).size!==task.slots.length || task.slots.some(s => !s.answer.length || new Set(s.answer).size!==s.answer.length || s.answer.some(a => !choices.has(a)))) throw new Error('풀 수 없는 퍼즐');
      if(task.baseline&&(task.kind!=='compare'||task.baseline.length!==task.slots.length||task.baseline.some(id=>!choices.has(id))||task.baseline.every((id,i)=>task.slots[i]!.answer.includes(id))))throw new Error('비교 기준 조건 계약 오류');
      const nodes = new Set(task.scene.nodes.map(n => n.id)); if (nodes.size !== task.scene.nodes.length || task.scene.links.some(pair => pair.some(id => !nodes.has(id)))) throw new Error('도해 참조 오류');
    }
    const cards = new Map(q.cards.map(c => [c.id,c])); if (cards.size !== q.cards.length) throw new Error('기사 카드 중복');
    if (q.cards.some(c => c.evidenceIds.some(id => !evidence.has(id)))) throw new Error('얻을 수 없는 기사 근거');
    if (q.acceptedLinks.length < 2 || new Set(q.acceptedLinks.map(link=>link.join('|'))).size!==q.acceptedLinks.length || q.acceptedLinks.some(link => link.length !== 3 || link.some((id,i) => !cards.get(id)?.valid || !cards.get(id)?.evidenceIds.length || cards.get(id)?.slot !== ['observation','mechanism','conclusion'][i]))) throw new Error('기사 유효 연결 누락');
    const reward=balance.quests.find(b => b.id === q.id);if (!reward) throw new Error('보상 원본 누락');
    const stage=stages.stages[q.id];if(![stage.observe,stage.apply,stage.publish].every(n=>Number.isSafeInteger(n)&&n>=0)||stage.observe+stage.apply+stage.publish!==reward.xp)throw new Error('단계 보상과 원본 불일치');
  }
  if(introduced.size!==concepts.size)throw new Error('해금할 수 없는 도감 개념');
  for(const key of ['xp','gold','reputation'] as const)if(balance.quests.reduce((sum,q)=>sum+q[key],0)!==balance.expectedTotals[key])throw new Error('초반 보상 기준선 불일치');
  return c;
}
export const campaignContent = validateContent(raw);
export const questById = (id: QuestId): QuestDefinition => campaignContent.quests.find(q => q.id === id)!;
export const rewardFor = (id: QuestId) => balance.quests.find(q => q.id === id)!;
