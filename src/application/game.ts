import { defaultAppearance, validateAppearance, type Appearance, type Preset } from '../domain/appearance';
import { orderDrink } from '../domain/cafe';
import { Q1, acceptQ1, briefQ1, canEnterHeart, observeQ1 } from '../domain/quest';
import { newState, validateState, type GameState, type TimeMode } from '../domain/state';
import type { SaveStore } from '../infrastructure/save';
import { canStand } from '../world/collision';
import { rooms } from '../world/rooms';
import type { Dir, RoomId } from '../world/types';
import { acceptInvestigation, chooseTask, demonstrateTask, hintTask, observeInvestigation, progressOf, publishArticle, saveDraft, testTask } from '../domain/campaign';
import { questById, type QuestId } from '../domain/content';
import type { QuestProgress } from '../domain/campaign-state';
import { buyItem, equipOutfit, placeFurniture, storeFurniture, switchHome, pinEvidence, favoriteConcept, spareNote, type HomeKind, type Placement } from '../domain/life';
import type { OutfitId } from '../domain/appearance';

type Listener = (s: GameState) => void;

/** The only place that changes persistent progress. Rendering and DOM read from here. */
export class Game {
  state: GameState;
  private listeners = new Set<Listener>();
  private dirty = false;
  private positionDirty = false;
  /** Set after import/restart: the page is about to reload, so the old world must not write its position back. */
  private hold = false;
  lastError: string | null = null;

  constructor(private store: SaveStore) {
    const loaded = store.load();
    this.state = loaded.state ?? newState();
    this.lastError = loaded.error;
  }

  subscribe(fn: Listener): () => void { this.listeners.add(fn); return () => this.listeners.delete(fn); }

  private commit(next: GameState, persist = true): void {
    const s = { ...next, revision: next.revision + 1, updatedAt: new Date().toISOString() };
    this.state = validateState(s);
    this.dirty = true;
    this.positionDirty = false;
    if (persist) this.persist();
    for (const fn of this.listeners) fn(this.state);
  }

  /** Progress and purchases become visible only after their entire candidate save succeeds. */
  private commitAtomic(next: GameState): void {
    if (next === this.state) return;
    const candidate = validateState({ ...next, revision: next.revision + 1, updatedAt: new Date().toISOString() });
    try { this.store.save(candidate); }
    catch (e) {
      this.lastError = e instanceof Error ? e.message : '저장하지 못했어요.';
      for (const fn of this.listeners) fn(this.state);
      throw e;
    }
    this.state = candidate; this.dirty = false; this.positionDirty = false; this.lastError = null;
    for (const fn of this.listeners) fn(this.state);
  }

  persist(): boolean {
    const before = this.lastError;
    let saved = false;
    try {
      const s = this.positionDirty ? validateState({ ...this.state, revision: this.state.revision + 1, updatedAt: new Date().toISOString() }) : this.state;
      this.store.save(s); this.state = s; this.dirty = false; this.positionDirty = false; this.lastError = null; saved = true;
    }
    catch (e) { this.lastError = e instanceof Error ? e.message : '저장하지 못했어요.'; }
    if (before !== this.lastError) for (const fn of this.listeners) fn(this.state);
    return saved;
  }

  begin(name: string, preset: Preset, look: Appearance): void {
    const trimmed = name.trim().slice(0, 12) || '새 기자';
    const base = this.state.started ? this.state : newState();
    const valid = validateAppearance(look, preset);
    if (!base.owned.includes(valid.outfit)) throw new Error('아직 갖고 있지 않은 옷이에요.');
    this.commit({ ...base, started: true, avatar: { preset, name: trimmed, look: valid } });
  }

  resetLook(preset: Preset): Appearance { return defaultAppearance(preset); }

  /** Position updates are kept in memory and flushed by autosave, room changes and the menu. */
  setPosition(room: RoomId, x: number, y: number, facing: Dir): void {
    if (this.hold || !canStand(room, { x, y })) return;
    const at = this.state.at;
    if (at.room === room && Math.abs(at.x - x) < 0.01 && Math.abs(at.y - y) < 0.01 && at.facing === facing) return;
    this.state = { ...this.state, at: { room, x, y, facing } };
    this.dirty = true;
    this.positionDirty = true;
  }
  get needsSave(): boolean { return this.dirty; }

  enter(room: RoomId, x: number, y: number, facing: Dir): void {
    if (!rooms[room] || !canStand(room, { x, y })) throw new Error('이동할 수 없는 위치예요.');
    this.commit({ ...this.state, at: { room, x, y, facing } });
  }

  inspect(id: string): void {
    if (this.state.inspected.includes(id)) { this.persist(); return; }
    this.commit({ ...this.state, inspected: [...this.state.inspected, id] });
  }

  flag(name: string): void {
    if (this.state.flags.includes(name)) return;
    this.commit({ ...this.state, flags: [...this.state.flags, name] });
  }
  has(name: string): boolean { return this.state.flags.includes(name); }

  order(itemId: string): void {
    const id = (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now())).replaceAll('-', '').slice(0, 24);
    this.commit(orderDrink(this.state, itemId, id));
  }

  acceptQuest(): void { this.commitAtomic(acceptInvestigation(acceptQ1(this.state),'Q001')); }
  acceptInvestigation(id:QuestId):void { this.commitAtomic(acceptInvestigation(this.state,id)); }
  recordObservation(id:QuestId,evidenceId:string):void { this.commitAtomic(observeInvestigation(this.state,id,evidenceId)); }
  chooseTask(id:QuestId,taskId:string,index:number,choice:string):void { this.commitAtomic(chooseTask(this.state,id,taskId,index,choice)); }
  hintTask(id:QuestId,taskId:string):void { this.commitAtomic(hintTask(this.state,id,taskId)); }
  demonstrateTask(id:QuestId,taskId:string):void { this.commitAtomic(demonstrateTask(this.state,id,taskId)); }
  testTask(id:QuestId,taskId:string):{message:string;solved:boolean} { const r=testTask(this.state,id,taskId); this.commitAtomic(r.state); return r; }
  saveDraft(id:QuestId,draft:QuestProgress['draft']):void { this.commitAtomic(saveDraft(this.state,id,draft)); }
  publishArticle(id:QuestId):void { this.commitAtomic(publishArticle(this.state,id)); }
  buyItem(id:string):void { this.commitAtomic(buyItem(this.state,id)); }
  equipOutfit(id:OutfitId):void { this.commitAtomic(equipOutfit(this.state,id)); }
  placeFurniture(p:Placement):void { this.commitAtomic(placeFurniture(this.state,p)); }
  storeFurniture(id:string):void { this.commitAtomic(storeFurniture(this.state,id)); }
  switchHome(kind:HomeKind):void { this.commitAtomic(switchHome(this.state,kind)); }
  pinEvidence(id:string):void { this.commitAtomic(pinEvidence(this.state,id)); }
  favoriteConcept(id:string):void { this.commitAtomic(favoriteConcept(this.state,id)); }
  spareNote(slot:string,text:string):void { this.commitAtomic(spareNote(this.state,slot,text)); }

  /** Moves into the Bodyscope heart model (safe entry point is saved). */
  enterHeart(): void {
    const why = canEnterHeart(this.state);
    if (why) throw new Error(why);
    const id=this.state.campaign.active;
    if(!id||!progressOf(this.state,id).accepted)throw new Error('편집장에게 취재를 선택하고 바디스코프를 가동해 주세요.');
    const room=questById(id).region,sp = rooms[room].spawn;
    const s = this.state.flags.includes(Q1.entered) ? this.state : { ...this.state, flags: [...this.state.flags, Q1.entered] };
    this.commitAtomic({ ...s, at: { room, x: sp.x, y: sp.y, facing: 'up' } });
  }

  /** Records an observation; returns whether it was new and whether it completed the checkpoint. */
  observe(id: string): { first: boolean; done: boolean } {
    const before = this.state, next = observeInvestigation(observeQ1(before,id),'Q001',id);
    if (next === before) { this.persist(); return { first: false, done: false }; }
    this.commitAtomic(next);
    return { first: next.inspected.length !== before.inspected.length, done: next.flags.includes(Q1.observed) && !before.flags.includes(Q1.observed) };
  }

  brief(): void { this.commit(briefQ1(this.state)); }

  rest(): void { this.commit({ ...this.state, cafe: { ...this.state.cafe, restedAt: new Date().toISOString() } }); }

  setTime(time: TimeMode): void { this.commit({ ...this.state, settings: { ...this.state.settings, time } }); }

  importState(raw: unknown): void {
    const s = validateState(raw);
    this.replace(s);
  }

  private replace(s: GameState): void {
    try { this.store.replace(s, this.state); }
    catch (e) { this.lastError = e instanceof Error ? e.message : '저장하지 못했어요.'; for (const fn of this.listeners) fn(this.state); throw e; }
    this.state = s; this.hold = true; this.dirty = false; this.positionDirty = false; this.lastError = null;
    for (const fn of this.listeners) fn(this.state);
  }

  backups(): GameState[] { return this.store.backups(); }

  restart(): void {
    this.replace(newState());
  }
}
