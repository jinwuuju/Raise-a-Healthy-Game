import { describe, expect, it } from 'vitest';
import { Game } from '../../src/application/game';
import { acceptInvestigation, chooseTask, observeInvestigation, progressOf, publishArticle, saveDraft, testTask } from '../../src/domain/campaign';
import { questById, questIds, type QuestId } from '../../src/domain/content';
import { availableEvidence, buyItem, equipOutfit, favoriteConcept, newHome, noteLimit, pinEvidence, pinLimit, placeFurniture, spareNote, storeFurniture, switchHome } from '../../src/domain/life';
import { newState, validateState, type GameState } from '../../src/domain/state';
import { SaveStore } from '../../src/infrastructure/save';
import { canStandInRoom } from '../../src/world/collision';
import { projectHomeRoom, rooms } from '../../src/world/rooms';

function investigate(s:GameState,id:QuestId):GameState {
  const q=questById(id);s={...acceptInvestigation(s,id),at:{room:q.region,x:224,y:258,facing:'up'}};
  for(const e of q.observations)s=observeInvestigation(s,id,e.id);
  for(const t of q.tasks.slice(0,2)) {
    if(t.baseline){t.baseline.forEach((c,i)=>{s=chooseTask(s,id,t.id,i,c);});s=testTask(s,id,t.id).state;}
    t.slots.forEach((v,i)=>{s=chooseTask(s,id,t.id,i,v.answer[0]!);});s=testTask(s,id,t.id).state;
  }
  return saveDraft({...s,at:{room:'newsroom',x:212,y:176,facing:'down'}},id,{headline:0,slots:q.acceptedLinks[0]!,note:''});
}
function complete(through:QuestId='Q010'):GameState {
  let s={...newState(),started:true,flags:['met-editor','reported-back']};
  for(const id of questIds){s=publishArticle(investigate(s,id),id);if(id===through)break;}return validateState(s);
}
const inStore=(s:GameState):GameState=>({...s,at:{room:'store',x:208,y:258,facing:'up'}});
const inHome=(s:GameState):GameState=>({...s,at:{room:'home',x:208,y:258,facing:'up'}});
class StorageStub implements Storage {
  data=new Map<string,string>();fail=false;
  get length(){return this.data.size;}clear(){this.data.clear();}key(i:number){return [...this.data.keys()][i]??null;}getItem(k:string){return this.data.get(k)??null;}
  setItem(k:string,v:string){if(this.fail)throw new Error('quota');this.data.set(k,v);}removeItem(k:string){this.data.delete(k);}
}
function loaded(s:GameState){const st=new StorageStub();st.setItem('medical-quest.v4.current',JSON.stringify(s));return{st,game:new Game(new SaveStore(st))};}

describe('optional life and purchase contract',()=>{
  it('rejects locks and insufficient funds, equips only owned clothes, and charges one time',()=>{
    expect(()=>buyItem(inStore(complete('Q001')),'outfit.coat')).toThrow();expect(()=>equipOutfit(newState(),'coat')).toThrow();
    const ready=inStore(complete('Q002'));expect(()=>buyItem({...ready,gold:199},'outfit.coat')).toThrow();
    const s=buyItem(ready,'outfit.coat');expect(s.gold).toBe(ready.gold-200);expect(buyItem(s,'outfit.coat')).toBe(s);expect(equipOutfit(s,'coat').avatar.look.outfit).toBe('coat');expect(validateState(s).campaign.purchased).toContain('outfit.coat');
  });
  it('optional tools have real convenience effects while all underlying evidence stays free',()=>{
    let s=inStore(complete());const evidence=availableEvidence(s);expect(pinLimit(s)).toBe(3);expect(noteLimit(s)).toBe(1);
    for(const e of evidence.slice(0,3))s=pinEvidence(s,e.id);expect(()=>pinEvidence(s,evidence[3]!.id)).toThrow();
    s=buyItem(s,'equipment.notebook');s=pinEvidence(s,evidence[3]!.id);expect(pinLimit(s)).toBe(5);
    expect(()=>spareNote(s,'1','메모')).toThrow();s=buyItem(s,'equipment.desk');s=spareNote(s,'1','두 번째 메모');expect(noteLimit(s)).toBe(2);
    s=buyItem(s,'equipment.bookcase');s=favoriteConcept(s,'circulation');expect(validateState(s).home.favorites).toContain('circulation');expect(s.totalXp).toBe(2700);
  });
  it('keeps layout preview cancellable and rejects overlap, exit blockage and a reporter under furniture',()=>{
    const s=inHome(complete('Q001'));
    expect(()=>placeFurniture(s,{id:'desk',x:0,y:0,rotated:false})).toThrow();
    expect(()=>placeFurniture(s,{id:'chair',x:6,y:6,rotated:false})).toThrow();
    const stood={...s,at:{...s.at,x:164,y:152}};expect(()=>placeFurniture(stood,{id:'chair',x:4,y:5,rotated:false})).toThrow();
    const rotated=placeFurniture(storeFurniture(s,'desk'),{id:'desk',x:3,y:1,rotated:true});expect(validateState(rotated).home.placements.find(p=>p.id==='desk')!.rotated).toBe(true);
    const stored=storeFurniture(rotated,'desk');expect(stored.home.furniture).toContain('desk');expect(stored.home.placements.some(p=>p.id==='desk')).toBe(false);
  });
  it('purchased house expands space and switching keeps furniture in storage',()=>{
    let s=buyItem(inStore(complete()),'home.house');s=switchHome(inHome(s),'house');expect(s.home.placements).toHaveLength(0);expect(s.home.furniture).toContain('bed');expect(validateState(s).home.kind).toBe('house');
    s=placeFurniture(s,{id:'bed',x:9,y:0,rotated:false});expect(s.home.placements).toHaveLength(1);s=switchHome(s,'lodging');expect(s.home.placements).toHaveLength(0);
  });
  it('validates imported home position against incoming furniture instead of previous world furniture',()=>{
    const previous=rooms.home;try{rooms.home=projectHomeRoom(newHome());const s=inHome(complete());s.home={...s.home,placements:[]};s.at={...s.at,x:112,y:96};expect(canStandInRoom(rooms.home,s.at)).toBe(false);expect(validateState(s).at).toEqual(s.at);}finally{rooms.home=previous;}
  });
  it('rejects fabricated equipment, pins, purchased ownership and unlocked house saves',()=>{
    const s=complete();for(const mutate of [(v:GameState)=>{v.campaign.purchased.push('fake');},(v:GameState)=>{v.home.pins.push('Q001:missing');},(v:GameState)=>{v.home.ownedHomes.push('house');},(v:GameState)=>{v.campaign.purchased.push('outfit.coat');}]){const v=structuredClone(s);mutate(v);expect(()=>validateState(v)).toThrow();}
  });
});

describe('atomic progress and immutable published articles',()=>{
  it('storage failure leaves purchase state and currency untouched; retry can succeed',()=>{
    const {st,game}=loaded(inStore(complete()));const before=structuredClone(game.state),raw=st.getItem('medical-quest.v4.current');st.fail=true;expect(()=>game.buyItem('outfit.coat')).toThrow();expect(game.state).toEqual(before);expect(st.getItem('medical-quest.v4.current')).toBe(raw);st.fail=false;game.buyItem('outfit.coat');expect(game.state.gold).toBe(before.gold-200);expect(game.lastError).toBeNull();
  });
  it('publication failure leaves editable draft, rewards and archive untouched',()=>{
    const s=investigate({...newState(),flags:['reported-back']},'Q001');const {st,game}=loaded(s);const before=structuredClone(game.state);st.fail=true;expect(()=>game.publishArticle('Q001')).toThrow();expect(game.state).toEqual(before);expect(progressOf(game.state,'Q001').published).toBe(false);st.fail=false;game.publishArticle('Q001');expect([game.state.totalXp,game.state.gold]).toEqual([100,100]);
  });
  it('editing a published draft does not silently replace the archive before republication',()=>{
    const s=complete('Q001'),published=progressOf(s,'Q001').publishedDraft;const edited=saveDraft(s,'Q001',{headline:1,slots:['observed','mechanism','overclaim'],note:'새 초안'});expect(progressOf(edited,'Q001').publishedDraft).toEqual(published);expect(()=>publishArticle(edited,'Q001')).toThrow();expect(validateState(edited).campaign.records.Q001!.publishedDraft).toEqual(published);
  });
  it('rejects fabricated checkpoints, demonstration proof and publication without prerequisite evidence',()=>{
    const s=complete();for(const mutate of [(v:GameState)=>{v.campaign.records.Q002!.tasks.apply!.choices[0]='lv';},(v:GameState)=>{v.campaign.records.Q005!.tasks.transfer!.demonstrated=true;},(v:GameState)=>{v.ledger=v.ledger.filter(k=>k!=='quest.Q001.apply');}]){const v=structuredClone(s);mutate(v);expect(()=>validateState(v)).toThrow();}
  });
});
