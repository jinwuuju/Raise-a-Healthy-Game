import { campaignContent, questById, questIds, rewardFor, type QuestId } from './content';
import { emptyProgress, type QuestProgress, type TaskProgress } from './campaign-state';
import { grantOnce, type GameState } from './state';
import simulation from '../../data/balance/model-simulation.v0.1.json';
import stages from '../../data/balance/campaign-stages.v0.1.json';

export const progressOf=(s:GameState,id:QuestId):QuestProgress=>s.campaign.records[id]??emptyProgress();
export const currentInvestigation=(s:GameState):QuestId|null=>s.campaign.active;
export const publishedCount=(s:GameState)=>questIds.filter(id=>progressOf(s,id).published).length;
export const reputationOf=(s:GameState)=>questIds.reduce((v,id)=>v+(progressOf(s,id).published?rewardFor(id).reputation:0),0);
export function canAcceptInvestigation(s:GameState,id:QuestId):string|null {
  const i=questIds.indexOf(id);
  if (id==='Q001' && !s.flags.includes('reported-back')) return '먼저 카페 방문을 편집장에게 보고해 주세요.';
  if (i>0 && !progressOf(s,questIds[i-1]!).published) return '이전 취재의 기사를 먼저 발행해 주세요.';
  if (questIds.some(q=>q!==id && progressOf(s,q).accepted && !progressOf(s,q).published)) return '진행 중인 취재부터 마무리해 주세요.';
  return null;
}
function replace(s:GameState,id:QuestId,p:QuestProgress):GameState {return {...s,campaign:{...s.campaign,records:{...s.campaign.records,[id]:p}}};}
export function acceptInvestigation(s:GameState,id:QuestId):GameState {
  const why=canAcceptInvestigation(s,id); if (why) throw new Error(why);
  const p={...progressOf(s,id),accepted:true};
  const next=replace(s,id,p); return {...next,campaign:{...next.campaign,active:id},flags:id==='Q001' && !s.flags.includes('q001-accepted')?[...s.flags,'q001-accepted']:s.flags};
}
function requireInvestigation(s:GameState,id:QuestId,inModel=false):QuestProgress {
  const p=progressOf(s,id); if (!p.accepted) throw new Error('편집장에게 취재 의뢰를 먼저 받아 주세요.');
  if (inModel && (s.at.room!==questById(id).region || s.campaign.active!==id)) throw new Error('이 취재의 모형 구역에서 조작해 주세요.'); return p;
}
export function observeInvestigation(s:GameState,id:QuestId,evidenceId:string):GameState {
  const p=requireInvestigation(s,id,true), q=questById(id);
  if (!q.observations.some(e=>e.id===evidenceId)) throw new Error('관찰 대상이 아니에요.');
  let next=replace(s,id,{...p,evidence:p.evidence.includes(evidenceId)?p.evidence:[...p.evidence,evidenceId]});
  if (q.observations.every(e=>progressOf(next,id).evidence.includes(e.id))) next=grantOnce(next,'quest.'+id+'.observe',{xp:stages.stages[id].observe,gold:0});
  return next;
}
export function taskProgress(s:GameState,id:QuestId,taskId:string):TaskProgress {
  const t=questById(id).tasks.find(t=>t.id===taskId); if (!t) throw new Error('없는 모형 과제');
  return progressOf(s,id).tasks[taskId]??{choices:t.slots.map(()=>''),solved:false,hint:0,demonstrated:false,trials:[]};
}
function changeTask(s:GameState,id:QuestId,taskId:string,p:TaskProgress):GameState {
  const q=requireInvestigation(s,id,true); if (!questById(id).observations.every(e=>q.evidence.includes(e.id))) throw new Error('관찰 두 곳을 먼저 확인해 주세요.');
  return replace(s,id,{...q,tasks:{...q.tasks,[taskId]:p}});
}
export function chooseTask(s:GameState,id:QuestId,taskId:string,index:number,choice:string):GameState {
  const def=questById(id).tasks.find(t=>t.id===taskId); if (!def || !def.slots[index] || !def.choices.some(c=>c.id===choice)) throw new Error('잘못된 모형 조작');
  const old=taskProgress(s,id,taskId); if(old.solved)return s;
  const choices=[...old.choices]; choices[index]=choice;
  return changeTask(s,id,taskId,{...old,choices,solved:false});
}
export function hintTask(s:GameState,id:QuestId,taskId:string):GameState {
  const p=taskProgress(s,id,taskId); if(p.solved)return s; return changeTask(s,id,taskId,{...p,hint:Math.min(2,p.hint+1)});
}
export function demonstrateTask(s:GameState,id:QuestId,taskId:string):GameState {
  if (taskId!=='apply') throw new Error('새 배치는 직접 적용해 주세요. 힌트와 느린 재생은 사용할 수 있어요.');
  const def=questById(id).tasks[0]!, p=taskProgress(s,id,taskId);
  if(p.solved)return s;
  let next=changeTask(s,id,taskId,{...p,choices:def.slots.map(s=>s.answer[0]!),solved:true,hint:3,demonstrated:true});
  const progress=progressOf(next,id); next=replace(next,id,{...progress,evidence:progress.evidence.includes(def.evidenceId)?progress.evidence:[...progress.evidence,def.evidenceId]}); return next;
}
export const requiredTasks=(s:GameState,id:QuestId)=>questById(id).tasks.slice(0,taskProgress(s,id,'apply').demonstrated?3:2);
export const readyForArticle=(s:GameState,id:QuestId)=>questById(id).observations.every(e=>progressOf(s,id).evidence.includes(e.id)) && requiredTasks(s,id).every(t=>taskProgress(s,id,t.id).solved);
export function testTask(s:GameState,id:QuestId,taskId:string):{state:GameState;message:string;solved:boolean} {
  const def=questById(id).tasks.find(t=>t.id===taskId); if (!def) throw new Error('없는 과제');
  const old=taskProgress(s,id,taskId);
  if(old.solved)return {state:s,message:'이미 확인한 배치예요. 취재수첩의 근거와 새 배치를 확인해 주세요.',solved:true};
  if (def.baseline && def.baseline.every((v,i)=>old.choices[i]===v)) {
    const state=changeTask(s,id,taskId,{...old,trials:old.trials.includes('baseline')?old.trials:[...old.trials,'baseline']});
    return {state,message:'기준 조건 기록: 표식 '+simulation.compare.baselineMarkers+'개(게임 수치). 이제 폭만 바꿔 같은 길이로 재생해요.',solved:false};
  }
  const wrong=def.slots.findIndex((slot,i)=>!slot.answer.includes(old.choices[i]!));
  if (wrong!==-1) return {state:changeTask(s,id,taskId,old),message:def.slots[wrong]!.label+'에서 표식이 막혔어요. '+def.feedback,solved:false};
  if (def.baseline && !old.trials.includes('baseline')) return {state:s,message:'넓은 폭·같은 길이의 기준 조건을 먼저 시험해 주세요.',solved:false};
  let next=changeTask(s,id,taskId,{...old,solved:true,trials:def.baseline?['baseline','changed']:old.trials});
  const p=progressOf(next,id); next=replace(next,id,{...p,evidence:p.evidence.includes(def.evidenceId)?p.evidence:[...p.evidence,def.evidenceId]});
  if (readyForArticle(next,id)) next=grantOnce(next,'quest.'+id+'.apply',{xp:stages.stages[id].apply,gold:0});
  return {state:next,message:(def.baseline?'변경 조건: 표식 '+simulation.compare.changedMarkers+'개(게임 수치). ':'')+def.feedback+(readyForArticle(next,id)?' 기사에 쓸 근거가 모였어요.':' 다음 새 배치에도 적용해요.'),solved:true};
}
export function saveDraft(s:GameState,id:QuestId,draft:QuestProgress['draft']):GameState {
  const p=requireInvestigation(s,id); if (s.at.room!=='newsroom') throw new Error('편집국 책상에서 기사를 작성해 주세요.');
  const q=questById(id);
  if(![0,1].includes(draft.headline)||draft.slots.length!==3||!draft.slots.every((card,i)=>card===''||q.cards.some(c=>c.id===card&&c.slot===['observation','mechanism','conclusion'][i]))||typeof draft.note!=='string'||draft.note.length>2000)throw new Error('기사 초안 형식을 확인해 주세요.');
  return replace(s,id,{...p,draft:{...draft,slots:[...draft.slots]}});
}
export function articleFeedback(s:GameState,id:QuestId):string|null {
  if (!readyForArticle(s,id)) return '관찰과 모형 적용·새 배치 취재를 먼저 마쳐 주세요.';
  const p=progressOf(s,id),q=questById(id);
  for (const card of p.draft.slots) {
    const c=q.cards.find(c=>c.id===card); if (!c) return '관찰·기전·결론 카드를 모두 연결해 주세요.';
    if (!c.valid) return c.feedback;
    if (c.evidenceIds.some(e=>!p.evidence.includes(e))) return '아직 얻지 못한 근거가 있어요. 모형에 돌아가 확인해 주세요.';
  }
  if (!q.acceptedLinks.some(link=>link.every((v,i)=>v===p.draft.slots[i]))) return '카드는 각각 가능하지만 이 관찰·설명·결론의 연결이 어긋나요. 함께 이어지는 조합을 골라 주세요.';
  return null;
}
export function publishArticle(s:GameState,id:QuestId):GameState {
  const p=requireInvestigation(s,id); if (s.at.room!=='newsroom') throw new Error('편집국에서 발행해 주세요.');
  const why=articleFeedback(s,id); if (why) throw new Error(why);
  const reward=rewardFor(id);
  let next=grantOnce(s,reward.completionKey,{xp:stages.stages[id].publish,gold:reward.gold});
  next=replace(next,id,{...p,published:true,publishedDraft:{...p.draft,slots:[...p.draft.slots]},publishedAt:p.publishedAt??new Date().toISOString(),articleRevision:p.articleRevision+1});
  const gift=id==='Q001'?'pressvest':id==='Q010'?'formal':null;
  if(gift && !next.owned.includes(gift))next={...next,owned:[...next.owned,gift]};
  return {...next,campaign:{...next.campaign,active:p.published && s.campaign.active!==id?s.campaign.active:null}};
}
export function campaignObjective(s:GameState):string|null {
  const id=s.campaign.active;
  if (!id) { const next=questIds.find(id=>!progressOf(s,id).published); if (publishedCount(s)) return next?'편집장에게 '+next+' 새 취재 받기':'첫 특집호 완료 · 신입 승진! 도감·옷가게·집을 둘러보세요.'; return null; }
  const q=questById(id),p=progressOf(s,id);
  if (p.published) return q.title+' 다시 둘러보기 · 반복 보상 없음';
  if (s.at.room==='newsroom') return readyForArticle(s,id)?'내 책상에서 '+id+' 기사 쓰고 발행하기':'바디스코프 앞에 서서 '+q.title+' 취재하기';
  if (s.at.room!==q.region) return '편집국 바디스코프로 돌아가 '+id+' 취재하기';
  const seen=q.observations.filter(e=>p.evidence.includes(e.id)).length;
  if (seen<q.observations.length) return q.title+' · 두 표식 관찰 ('+seen+'/2)';
  return readyForArticle(s,id)?'귀환 장치로 돌아가 기사 쓰기':'연결 장치에서 모형과 새 배치 취재 · 귀환 가능';
}
export const conceptsUnlocked=(s:GameState)=>campaignContent.concepts.filter(c=>campaignContent.quests.some(q=>q.conceptIds.includes(c.id)&&progressOf(s,q.id).published));
