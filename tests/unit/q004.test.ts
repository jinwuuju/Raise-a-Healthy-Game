import { describe,expect,it } from 'vitest';
import { q3Fixture } from '../helpers/q003-fixture';
import { acceptQ4,recordQ4,crossQ4Body,placeQ4Route,joinQ4,selectQ4,checkQ4 } from '../../src/domain/q004';
import { q4Text,q4Evidence,emptyQ4,validateQ4 } from '../../src/domain/q004-state';
import { validateQ3 } from '../../src/domain/q003-state';
import { publishQ4WithReaction,reprintArticle } from '../../src/domain/reaction';
import { latestReaction } from '../../src/domain/reaction-state';
import { newState,validateState,type GameState } from '../../src/domain/state';
import { Game } from '../../src/application/game';
import { SaveStore } from '../../src/infrastructure/save';
import { rooms } from '../../src/world/rooms';
import { canStand } from '../../src/world/collision';
import type { RoomId } from '../../src/world/types';

export function q4Fixture():GameState {
  const s=q3Fixture();return {...s,totalXp:450,gold:370,ledger:[...s.ledger,'quest.Q003.first'],q003:{accepted:true,mode:'normal',notes:['tricuspid','pulmonary','stenosis','regurgitation','causes','tests','care'],lead:'compare',limit:'model',checked:true,publishedAt:'2026-10-12T00:00:00Z'}};
}
function at(s:GameState,room:RoomId,target:string):GameState {
  const t=rooms[room].targets.find(t=>t.id===target)!;
  for(let dx=-20;dx<=20;dx+=2)for(let dy=-20;dy<=20;dy+=2){const p={x:t.x+dx,y:t.y+dy};if(Math.hypot(dx,dy)<=t.r&&canStand(room,p))return {...s,at:{room,...p,facing:'up'}};}
  throw new Error('Unreachable target');
}
function observed():GameState {
  let s=acceptQ4(q4Fixture());
  for(const n of q4Text.notes.slice(0,5))s=recordQ4(at(s,n.room as RoomId,n.target),n.id as typeof q4Evidence[number]);
  s=crossQ4Body({...s,at:{room:'aorta',x:208,y:12,facing:'up'}},'heart');s=recordQ4(at(s,'heart','hx-svc'),'systemic-return');return {...s,at:newState().at};
}
function ready():GameState {
  let s=observed();s=placeQ4Route(s,'pulmonary');s=placeQ4Route(s,'systemic');s=joinQ4(s);return checkQ4(selectQ4(selectQ4(s,'lead','pulmonary'),'limit','model'));
}
class Memory implements Storage {
  data=new Map<string,string>();fail=false;get length(){return this.data.size;}clear(){this.data.clear();}key(i:number){return [...this.data.keys()][i]??null;}
  getItem(k:string){return this.data.get(k)??null;}removeItem(k:string){this.data.delete(k);}setItem(k:string,v:string){if(this.fail)throw new Error('quota');this.data.set(k,v);}
}
describe('Q004 two-circuit reporting',()=>{
  it('requires Q003, independent physical observations, and preserves the existing accessible targets and sources',()=>{
    expect(()=>acceptQ4(newState())).toThrow();const s=acceptQ4(q4Fixture());expect(acceptQ4(s)).toBe(s);expect(s.q004.notes).toEqual([]);expect(s.totalXp).toBe(450);
    expect(()=>recordQ4(s,'gas')).toThrow();
    for(const n of q4Text.notes){expect(at(s,n.room as RoomId,n.target)).toBeTruthy();expect(n.src.every(id=>q4Text.sources.some(x=>x.id===id))).toBe(true);}
  });
  it('does not replace body transit with office return, previous room history or entry through the Bodyscope',()=>{
    let s=acceptQ4(q4Fixture());expect(()=>recordQ4(at(s,'heart','hx-svc'),'systemic-return')).toThrow('출구');expect(crossQ4Body(s,'heart')).toBe(s);
    for(const n of q4Text.notes.slice(0,5))s=recordQ4(at(s,n.room as RoomId,n.target),n.id as typeof q4Evidence[number]);
    expect(crossQ4Body(s,'newsroom')).toBe(s);expect(crossQ4Body({...s,at:newState().at},'heart').q004.crossedBody).toBe(false);
    expect(crossQ4Body(s,'heart')).toBe(s);
    const through=crossQ4Body({...s,at:{room:'aorta',x:208,y:12,facing:'up'}},'heart');expect(through.q004.crossedBody).toBe(true);expect(through.totalXp).toBe(450);expect(crossQ4Body(through,'heart')).toBe(through);
  });
  it('needs both observed route cards, heart bridges and a limit, with no reward for assembling/re-reading',()=>{
    const s=observed();expect(()=>joinQ4(s)).toThrow();expect(checkQ4(s).q004.checked).toBe(false);
    const r=ready();expect(r.q004.checked).toBe(true);expect(selectQ4(r,'lead','systemic').q004.checked).toBe(false);
    expect(placeQ4Route(r,'pulmonary')).toBe(r);expect(joinQ4(r)).toBe(r);expect(r.gold).toBe(370);
    expect(()=>placeQ4Route({...s,at:{...s.at,room:'lung'}},'pulmonary')).toThrow('편집국');
  });
  it('keeps old saves and rejects sparse, fabricated or orphan notes/transit/approval/publication',()=>{
    const {q004:_,...old}=q4Fixture();expect(validateState(old).q004).toEqual(emptyQ4());const r=ready();expect(validateState(r).q004).toEqual(r.q004);
    expect(()=>validateQ4({...emptyQ4(),accepted:true,notes:Array(1)})).toThrow();expect(()=>validateQ3({...newState().q003,accepted:true,notes:Array(1)})).toThrow();
    for(const patch of [{crossedBody:true,notes:[]},{crossedBody:false},{joined:true,routes:{pulmonary:true,systemic:false}},{checked:true,limit:null}])expect(()=>validateQ4({...r.q004,...patch})).toThrow();
    expect(()=>validateState({...r,q003:{...r.q003,publishedAt:null}})).toThrow();
  });
  it('grants 250XP/170G and the saved Q004 reaction once; explicit reprints only add gold',()=>{
    const r=ready(),p=publishQ4WithReaction(r,()=>.5),receipt=latestReaction(p)!;
    expect([p.totalXp,p.gold,receipt.questId,receipt.xp,receipt.baseGold]).toEqual([700,540+receipt.bonusGold,'Q004',250,170]);
    expect(publishQ4WithReaction(p,()=>{throw new Error('must not draw');})).toBe(p);
    const next=reprintArticle(p,p.reactions.count,()=>.5,new Date().toISOString(),'Q004');expect(next.totalXp).toBe(700);expect(next.gold).toBe(p.gold+latestReaction(next)!.bonusGold);
    expect(reprintArticle(next,p.reactions.count,()=>{throw new Error('must not draw');},new Date().toISOString(),'Q004')).toBe(next);expect(validateState(next)).toEqual(next);
    expect(()=>publishQ4WithReaction({...r,gold:Number.MAX_SAFE_INTEGER-170},()=>.5)).toThrow();
    expect(()=>validateState({...p,ledger:p.ledger.filter(k=>k!=='quest.Q004.first')})).toThrow();
  });
  it('commits the actual body-to-atrium travel once and preserves publication through failed writes and retry',()=>{
    const mem=new Memory();let s=acceptQ4(q4Fixture());for(const n of q4Text.notes.slice(0,5))s=recordQ4(at(s,n.room as RoomId,n.target),n.id as typeof q4Evidence[number]);
    mem.setItem('medical-quest.v4.current',JSON.stringify({...s,at:{room:'aorta',x:208,y:12,facing:'up'}}));const travel=new Game(new SaveStore(mem)),sp=rooms.heart.spawn;travel.enter('heart',sp.x,sp.y,'down');expect(travel.state.q004.crossedBody).toBe(true);
    mem.clear();mem.setItem('medical-quest.v4.current',JSON.stringify(ready()));const game=new Game(new SaveStore(mem));mem.fail=true;game.publishQ4();const receipt=latestReaction(game.state)!;
    expect(game.lastError).toBeTruthy();expect(game.publishQ4()).toBe(false);expect(latestReaction(game.state)).toEqual(receipt);mem.fail=false;game.persist();expect(new Game(new SaveStore(mem)).state.q004).toEqual(game.state.q004);
  });
});
