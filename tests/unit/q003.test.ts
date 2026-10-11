import { describe, expect, it } from 'vitest';
import { q3Fixture } from '../helpers/q003-fixture';
import { acceptQ3, checkQ3, recordQ3, setQ3Mode, selectQ3 } from '../../src/domain/q003';
import { q3Text, q3Evidence, emptyQ3 } from '../../src/domain/q003-state';
import { comparisonOpening, hasBackflow } from '../../src/domain/valve-model';
import { openness, passable } from '../../src/domain/cardiac';
import { publishQ3WithReaction, reprintArticle } from '../../src/domain/reaction';
import { latestReaction } from '../../src/domain/reaction-state';
import { newState, validateState, type GameState } from '../../src/domain/state';
import { Game } from '../../src/application/game';
import { SaveStore } from '../../src/infrastructure/save';
import { rooms } from '../../src/world/rooms';
import { canStand } from '../../src/world/collision';
import type { RoomId } from '../../src/world/types';

function at(s: GameState, room: RoomId, target: string): GameState {
  const t = rooms[room].targets.find(t => t.id === target)!;
  for (let dx = -18; dx <= 18; dx += 2) for (let dy = -18; dy <= 18; dy += 2) {
    const p = { x: t.x + dx, y: t.y + dy };
    if (Math.hypot(dx,dy) <= t.r && canStand(room,p)) return { ...s, at: { room, ...p, facing: 'up' } };
  }
  throw new Error('unreachable target');
}
function normal(): GameState {
  let s = acceptQ3(q3Fixture());
  s = recordQ3(at(s,'heart','hx-tricuspid'),'tricuspid');
  return recordQ3(at(s,'rv','heart-out'),'pulmonary');
}
function compared(): GameState {
  let s = at(normal(),'heart','hx-tricuspid');
  for (const mode of ['stenosis','regurgitation'] as const) s = recordQ3(setQ3Mode(s,mode),mode);
  return at(setQ3Mode(s,'normal'),'newsroom','my-desk');
}
function ready(): GameState {
  let s = compared();
  for (const id of ['causes','tests','care'] as const) s = recordQ3(s,id);
  return checkQ3(selectQ3(selectQ3(s,'lead','compare'),'limit','model'));
}
class Memory implements Storage {
  data = new Map<string,string>(); fail = false;
  get length() { return this.data.size; } clear() { this.data.clear(); } key(i:number) { return [...this.data.keys()][i] ?? null; }
  getItem(k:string) { return this.data.get(k) ?? null; } removeItem(k:string) { this.data.delete(k); }
  setItem(k:string,v:string) { if (this.fail) throw new Error('quota'); this.data.set(k,v); }
}
describe('Q003 normal-first disease reporting', () => {
  it('requires Q002 publication and physical observation, before any disease comparison', () => {
    expect(() => acceptQ3(newState())).toThrow(); const s = acceptQ3(q3Fixture()); expect(acceptQ3(s)).toBe(s);
    expect(() => setQ3Mode(s,'stenosis')).toThrow(); expect(() => recordQ3(s,'tricuspid')).toThrow();
    expect(() => setQ3Mode(normal(),'stenosis')).toThrow();
    const n = normal(); expect(n.q003.notes).toEqual(['tricuspid','pulmonary']); expect(n.totalXp).toBe(250);
  });
  it('separates display opening/backflow from normal actor passability and shows the difference in the right phases', () => {
    const fill = openness('av',.66), systole = openness('av',.32);
    expect(fill).toBe(1); expect(systole).toBe(0);
    expect(comparisonOpening('stenosis',fill)).toBeLessThan(fill); expect(comparisonOpening('stenosis',systole)).toBe(0);
    expect(hasBackflow('regurgitation',fill)).toBe(false); expect(hasBackflow('regurgitation',systole)).toBe(true);
    expect(hasBackflow('normal',systole)).toBe(false);
    expect(passable('av',.66)).toBe(true); expect(passable('av',.32)).toBe(false);
  });
  it('requires correct layer, then source → fictional test → care principles, with no observation rewards', () => {
    const n = at(normal(),'heart','hx-tricuspid'); expect(() => recordQ3(n,'regurgitation')).toThrow();
    expect(() => recordQ3(compared(),'care')).toThrow();
    expect(() => recordQ3(at(compared(),'heart','hx-tricuspid'),'causes')).toThrow();
    const s = ready(); expect(s.q003.notes).toEqual([...q3Evidence]); expect([s.totalXp,s.gold]).toEqual([250,220]);
    expect(selectQ3(s,'lead','timing').q003.checked).toBe(false);
    expect(() => selectQ3({ ...s, at: { ...s.at,room:'heart' } },'limit','model')).toThrow();
  });
  it('keeps old saves and resumes comparison/data/article drafts; rejects orphan evidence and publications', () => {
    const { q003:_, ...old } = q3Fixture(); expect(validateState(old).q003).toEqual(emptyQ3());
    expect(validateState(ready()).q003).toEqual(ready().q003);
    expect(() => validateState({ ...ready(),q003:{ ...ready().q003,notes:['care'] } })).toThrow();
    const p = publishQ3WithReaction(ready(),()=>.5);
    expect(() => validateState({ ...p,ledger:p.ledger.filter(k=>k!=='quest.Q003.first') })).toThrow();
    expect(() => validateState({ ...p,q002:{ ...p.q002,publishedAt:null } })).toThrow();
  });
  it('makes canonical XP/base gold and quest-linked reaction atomic and reprints grant only gold', () => {
    const s = ready(), p = publishQ3WithReaction(s,()=>.5), r=latestReaction(p)!;
    expect([p.totalXp,p.gold,r.questId,r.xp,r.baseGold]).toEqual([450,370+r.bonusGold,'Q003',200,150]);
    expect(publishQ3WithReaction(p,()=>{ throw new Error('must not draw'); })).toBe(p);
    const repeat=reprintArticle(p,p.reactions.count,()=>.5,new Date().toISOString(),'Q003');
    expect(repeat.totalXp).toBe(450); expect(repeat.gold).toBe(p.gold+latestReaction(repeat)!.bonusGold);
    expect(reprintArticle(repeat,p.reactions.count,()=>{ throw new Error('must not draw'); },new Date().toISOString(),'Q003')).toBe(repeat);
    expect(validateState(repeat)).toEqual(repeat);
    expect(() => publishQ3WithReaction({ ...s,gold:Number.MAX_SAFE_INTEGER-150 },()=>.5)).toThrow();
  });
  it('keeps one receipt through failed writes, retries and reload; room travel resets the comparison layer', () => {
    const mem=new Memory(); mem.setItem('medical-quest.v4.current',JSON.stringify(ready())); const game=new Game(new SaveStore(mem));
    mem.fail=true; game.publishQ3(); const receipt=latestReaction(game.state)!; expect(game.lastError).toBeTruthy();
    expect(game.publishQ3()).toBe(false); expect(latestReaction(game.state)).toEqual(receipt);
    mem.fail=false; game.persist(); expect(new Game(new SaveStore(mem)).state.q003).toEqual(game.state.q003);
    mem.clear(); mem.setItem('medical-quest.v4.current',JSON.stringify(setQ3Mode(at(normal(),'heart','hx-tricuspid'),'regurgitation')));
    const traveling = new Game(new SaveStore(mem)); const p=rooms.newsroom.spawn; traveling.enter('newsroom',p.x,p.y,'down'); expect(traveling.state.q003.mode).toBe('normal');
  });
  it('keeps fictional materials, source references and draft status on all medical content', () => {
    expect(q3Text.status).toBe('draft_unreviewed'); expect(q3Text.review).toBeNull();
    for (const note of [...q3Text.normal,...q3Text.materials]) expect(note.src.every(id=>q3Text.sources.some(s=>s.id===id))).toBe(true);
    expect(q3Text.materials[1]!.cards.every(c=>c.title.startsWith('가상'))).toBe(true);
  });
});
