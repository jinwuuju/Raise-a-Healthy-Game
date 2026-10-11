import balance from '../../data/balance/q004.v0.1.json';
import { q4Evidence,q4Text,type Q4Evidence,type RouteId } from './q004-state';
import { grantOnce,type GameState } from './state';
import { rooms } from '../world/rooms';
import { inRect,type RoomId } from '../world/types';
export const q4Reward=balance.publication;
export const canOfferQ4=(s:GameState)=>!!s.q003.publishedAt&&s.ledger.includes('quest.Q003.first')&&!s.q004.accepted;
export const q4Ready=(s:GameState)=>q4Evidence.every(id=>s.q004.notes.includes(id));
export function acceptQ4(s:GameState):GameState {
  if(s.q004.accepted)return s;
  if(!canOfferQ4(s)||s.at.room!=='newsroom')throw new Error('Q003 기사 발행 뒤 편집국에서 순환 취재를 받아 주세요.');
  return {...s,q004:{...s.q004,accepted:true}};
}
/** Called with the actual previous room by Game.enter, never by rendering. */
export function crossQ4Body(s:GameState,to:RoomId):GameState {
  if(!s.q004.accepted||s.q004.crossedBody||s.at.room!=='aorta'||to!=='heart'||!q4Evidence.slice(0,5).every(id=>s.q004.notes.includes(id)))return s;
  const exit=rooms.aorta.doors.find(d=>d.id==='body');
  if(!exit||!inRect(s.at,exit.zone))return s;
  return {...s,q004:{...s.q004,crossedBody:true}};
}
export function recordQ4(s:GameState,id:Q4Evidence):GameState {
  const n=q4Text.notes.find(n=>n.id===id),t=n?rooms[s.at.room].targets.find(t=>t.id===n.target):null;
  if(!s.q004.accepted||!n||s.at.room!==n.room||!t||Math.hypot(s.at.x-t.x,s.at.y-t.y)>t.r+2)throw new Error('의뢰를 받은 뒤 실제 순환 취재 지점 가까이에서 관찰해 주세요.');
  if(s.q003.mode!=='normal')throw new Error('판막 비교 창을 닫아 정상 모형으로 돌아온 뒤 관찰해 주세요.');
  if(id==='systemic-return'&&!s.q004.crossedBody)throw new Error('대동맥 위쪽 온몸 출구를 거친 뒤 돌아오는 길을 관찰해 주세요.');
  return s.q004.notes.includes(id)?s:{...s,q004:{...s.q004,notes:[...s.q004.notes,id]}};
}
export function q4Access(s:GameState):string|null {
  if(!q4Ready(s))return '두 순환의 관찰 6곳과 온몸 축약 전환을 마치면 노선 기사를 쓸 수 있어요.';
  if(s.at.room!=='newsroom')return '기사 쓰기와 노선 연결은 편집국에서 할 수 있어요.';
  return null;
}
function writable(s:GameState):void {
  const why=q4Access(s);if(why)throw new Error(why);
  if(s.q004.publishedAt||s.ledger.includes(q4Reward.key))throw new Error('발행한 기사는 기록으로 읽어요.');
}
export function placeQ4Route(s:GameState,id:RouteId):GameState {
  writable(s);if(!['pulmonary','systemic'].includes(id))throw new Error('선택할 수 없는 순환 노선이에요.');
  return s.q004.routes[id]?s:{...s,q004:{...s.q004,routes:{...s.q004.routes,[id]:true},checked:false}};
}
export function joinQ4(s:GameState):GameState {
  writable(s);if(!s.q004.routes.pulmonary||!s.q004.routes.systemic)throw new Error('직접 취재한 두 노선 카드를 먼저 붙여 주세요.');
  return s.q004.joined?s:{...s,q004:{...s.q004,joined:true,checked:false}};
}
export function selectQ4(s:GameState,slot:'lead'|'limit',id:string|null):GameState {
  writable(s);if(!['lead','limit'].includes(slot)||(id!==null&&!(slot==='lead'?q4Text.article.leads:q4Text.article.limitations).some(x=>x.id===id)))throw new Error('선택할 수 없는 기사 문장이에요.');
  return s.q004[slot]===id?s:{...s,q004:{...s.q004,[slot]:id,checked:false}};
}
export function checkQ4(s:GameState):GameState {
  writable(s);return s.q004.checked||!s.q004.joined||!s.q004.lead||!s.q004.limit?s:{...s,q004:{...s.q004,checked:true}};
}
export function publishQ4(s:GameState,now=new Date().toISOString()):GameState {
  if(s.q004.publishedAt||s.ledger.includes(q4Reward.key))return s;
  writable(s);if(!s.q004.checked||!s.q004.joined||!s.q004.lead||!s.q004.limit||!Number.isFinite(Date.parse(now)))throw new Error('두 순환의 연결과 모형의 한계를 편집장에게 확인받아 주세요.');
  return {...grantOnce(s,q4Reward.key,q4Reward),q004:{...s.q004,publishedAt:now}};
}
