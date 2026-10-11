import { describe, expect, it } from 'vitest';
import { newState, validateState, type GameState } from '../../src/domain/state';
import { campaignContent, questById, questIds, validateContent, rewardFor, type QuestId } from '../../src/domain/content';
import { acceptInvestigation, articleFeedback, chooseTask, demonstrateTask, hintTask, observeInvestigation, progressOf, publishArticle, readyForArticle, reputationOf, requiredTasks, saveDraft, testTask } from '../../src/domain/campaign';

const atModel=(s:GameState,id:QuestId):GameState=>({...s,at:{room:questById(id).region,x:224,y:258,facing:'up'}});
const home=(s:GameState):GameState=>({...s,at:{room:'newsroom',x:212,y:176,facing:'down'}});
function explore(s:GameState,id:QuestId,hints=false,demo=false):GameState {
 s=atModel(acceptInvestigation(s,id),id);
 for(const e of questById(id).observations)s=observeInvestigation(s,id,e.id);
 if(demo)s=demonstrateTask(s,id,'apply');
 for(const task of requiredTasks(s,id)) {
  if(task.id==='apply'&&demo)continue;
  if(hints)s=hintTask(s,id,task.id);
  if(task.baseline) {for(let i=0;i<task.baseline.length;i++)s=chooseTask(s,id,task.id,i,task.baseline[i]!);s=testTask(s,id,task.id).state;}
  for(let i=0;i<task.slots.length;i++)s=chooseTask(s,id,task.id,i,task.slots[i]!.answer[0]!);
  const r=testTask(s,id,task.id);expect(r.solved).toBe(true);s=validateState(JSON.parse(JSON.stringify(r.state)));
 }
 expect(readyForArticle(s,id)).toBe(true);return home(s);
}
function publish(s:GameState,id:QuestId,variant=0):GameState {
 s=saveDraft(s,id,{headline:variant,slots:questById(id).acceptedLinks[variant]!,note:'내 메모는 자동 의학 판정 대상이 아니다.'});
 expect(articleFeedback(s,id)).toBeNull(); return publishArticle(s,id);
}
describe('campaign progression and provenance',()=>{
 for(const [name,hints,demo] of [['no purchase',false,false],['hints and reload',true,false],['demonstration and fresh transfer',true,true]] as const)it(name+' completes Q001-Q010 at Lv.10 without extra rewards',()=>{
  let s={...newState(),started:true,flags:['met-editor','reported-back']};
  for(const id of questIds) {
   s=publish(explore(s,id,hints,demo),id);
   expect(s.ledger).toContain(rewardFor(id).completionKey);
   const xp=s.totalXp,gold=s.gold;
   s=publish(s,id,1); expect([s.totalXp,s.gold]).toEqual([xp,gold]);
   s=validateState(JSON.parse(JSON.stringify(s)));
  }
  expect([s.totalXp,s.gold,reputationOf(s)]).toEqual([2700,2270,12]);
 });
 it('locks later quests, observations in wrong rooms and premature publication',()=>{
  const s={...newState(),flags:['reported-back']};
  expect(()=>acceptInvestigation(s,'Q002')).toThrow();
  const a=acceptInvestigation(s,'Q001');
  expect(()=>observeInvestigation(a,'Q001','heart-out')).toThrow();
  expect(()=>publishArticle(a,'Q001')).toThrow();
 });
 it('cannot earn the applied checkpoint just by watching a demonstration',()=>{
  let s=atModel(acceptInvestigation({...newState(),flags:['reported-back']},'Q001'),'Q001');
  for(const e of questById('Q001').observations)s=observeInvestigation(s,'Q001',e.id);
  s=demonstrateTask(s,'Q001','apply');expect(s.totalXp).toBe(20);expect(readyForArticle(s,'Q001')).toBe(false);
  expect(requiredTasks(s,'Q001')).toHaveLength(3);
  expect(()=>demonstrateTask(s,'Q001','transfer')).toThrow();
 });
 it('keeps wrong articles as editable drafts and rejects overclaims',()=>{
  let s=explore({...newState(),flags:['reported-back']},'Q001');
  s=saveDraft(s,'Q001',{headline:0,slots:['observed','mechanism','overclaim'],note:''});
  expect(articleFeedback(s,'Q001')).toContain('진단');expect(()=>publishArticle(s,'Q001')).toThrow();
  expect(progressOf(s,'Q001').published).toBe(false);
 });
 it('migrates the existing two observations and their 20 XP without paying twice',()=>{
  const raw={...newState(),flags:['reported-back','q001-accepted','q001-observed'],inspected:['q001:heart-out','q001:heart-in'],ledger:['quest.Q001.observe'],totalXp:20} as Record<string,unknown>;
  delete raw.campaign;let s=validateState(raw);expect(s.campaign.active).toBe('Q001');
  s=atModel(s,'Q001');s=observeInvestigation(s,'Q001','heart-out');expect(s.totalXp).toBe(20);
 });
 it('rejects solved-save claims that disagree with the selected model arrangement',()=>{
  let s=explore({...newState(),flags:['reported-back']},'Q001');
  s={...s,campaign:structuredClone(s.campaign)};s.campaign.records.Q001!.tasks.apply!.choices[0]='es';
  expect(()=>validateState(s)).toThrow();
 });
});
describe('content contract',()=>{
 it('checks actual schema, sources, concept graph, evidence, solutions and article links',()=>expect(validateContent(campaignContent)).toBe(campaignContent));
 for(const mutate of [
  (c:typeof campaignContent)=>{c.sources=[];},
  (c:typeof campaignContent)=>{c.concepts[0]!.prerequisites=['chambers'];},
  (c:typeof campaignContent)=>{c.quests[0]!.tasks[0]!.slots[0]!.answer=['missing'];},
  (c:typeof campaignContent)=>{c.quests[0]!.cards[0]!.evidenceIds=['missing'];},
  (c:typeof campaignContent)=>{c.quests[0]!.acceptedLinks=[];},
 ])it('rejects incomplete/unplayable content '+String(mutate),()=>expect(()=>validateContent(mutateContent(mutate))).toThrow());
});
function mutateContent(f:(c:typeof campaignContent)=>void){const c=structuredClone(campaignContent);f(c);return c;}
