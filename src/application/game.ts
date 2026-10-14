import { defaultAppearance, validateAppearance, type Appearance, type Preset } from '../domain/appearance';
import { orderDrink } from '../domain/cafe';
import { checkArticle, selectArticle } from '../domain/article';
import { publishWithReaction, publishQ2WithReaction, publishQ3WithReaction, publishQ4WithReaction, publishQ5WithReaction, randomReactionValue, reprintArticle, seeReaction } from '../domain/reaction';
import type { QuestId } from '../domain/reaction-state';
import { acceptQ5, setQ5Mode, recordQ5, placeQ5, clearQ5Order, selectQ5, checkQ5 } from '../domain/q005';
import type { Q5Evidence, SignalCard } from '../domain/q005-state';
import type { RhythmMode } from '../domain/rhythm-model';
import { acceptQ4, crossQ4Body, recordQ4, placeQ4Route, joinQ4, selectQ4, checkQ4 } from '../domain/q004';
import type { Q4Evidence, RouteId } from '../domain/q004-state';
import { acceptQ3, setQ3Mode, recordQ3, selectQ3, checkQ3 } from '../domain/q003';
import type { Q3Evidence } from '../domain/q003-state';
import type { ValveMode } from '../domain/valve-model';
import { acceptQ2, observeQ2, reportQ2, selectQ2, checkQ2 } from '../domain/q002';
import type { ChamberId } from '../domain/q002-state';
import type { ArticleSlot } from '../domain/article-state';
import { discover } from '../domain/heart';
import { Q1, acceptQ1, briefQ1, canEnterHeart, observeQ1 } from '../domain/quest';
import { newState, validateState, type GameState } from '../domain/state';
import type { SaveStore } from '../infrastructure/save';
import { canStand } from '../world/collision';
import { rooms } from '../world/rooms';
import type { Dir, RoomId } from '../world/types';

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
    const next = crossQ4Body(this.state, room);
    this.commit({ ...next, at: { room, x, y, facing }, q003: { ...next.q003, mode: 'normal' }, q005: { ...next.q005, mode: 'normal' } });
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

  acceptQuest(): void { this.commit(acceptQ1(this.state)); }
  acceptQ2(): void { const next = acceptQ2(this.state); if (next !== this.state) this.commit(next); }
  acceptQ3(): void { const next = acceptQ3(this.state); if (next !== this.state) this.commit(next); }
  acceptQ5(): void { const next = acceptQ5(this.state); if (next !== this.state) this.commit(next); }
  setQ5Mode(mode: RhythmMode): void { const next = setQ5Mode(this.state, mode); if (next !== this.state) this.commit(next); }
  recordQ5(id: Q5Evidence): boolean { const next = recordQ5(this.state, id); if (next === this.state) return false; this.commit(next); return true; }
  placeQ5(id: SignalCard): void { const next = placeQ5(this.state, id); if (next !== this.state) this.commit(next); }
  clearQ5Order(): void { const next = clearQ5Order(this.state); if (next !== this.state) this.commit(next); }
  selectQ5(slot: 'lead' | 'limit', id: string | null): void { const next = selectQ5(this.state, slot, id); if (next !== this.state) this.commit(next); }
  checkQ5(): void { const next = checkQ5(this.state); if (next !== this.state) this.commit(next); }
  publishQ5(): boolean { const next = publishQ5WithReaction(this.state); if (next === this.state) { this.persist(); return false; } this.commit(next); return true; }
  acceptQ4(): void { const next = acceptQ4(this.state); if (next !== this.state) this.commit(next); }
  recordQ4(id: Q4Evidence): boolean { const next = recordQ4(this.state, id); if (next === this.state) return false; this.commit(next); return true; }
  placeQ4Route(id: RouteId): void { const next = placeQ4Route(this.state, id); if (next !== this.state) this.commit(next); }
  joinQ4(): void { const next = joinQ4(this.state); if (next !== this.state) this.commit(next); }
  selectQ4(slot: 'lead' | 'limit', id: string | null): void { const next = selectQ4(this.state, slot, id); if (next !== this.state) this.commit(next); }
  checkQ4(): void { const next = checkQ4(this.state); if (next !== this.state) this.commit(next); }
  publishQ4(): boolean { const next = publishQ4WithReaction(this.state); if (next === this.state) { this.persist(); return false; } this.commit(next); return true; }
  setQ3Mode(mode: ValveMode): void { const next = setQ3Mode(this.state, mode); if (next !== this.state) this.commit(next); }
  recordQ3(id: Q3Evidence): boolean { const next = recordQ3(this.state, id); if (next === this.state) return false; this.commit(next); return true; }
  selectQ3(slot: 'lead' | 'limit', id: string | null): void { const next = selectQ3(this.state, slot, id); if (next !== this.state) this.commit(next); }
  checkQ3(): void { const next = checkQ3(this.state); if (next !== this.state) this.commit(next); }
  publishQ3(): boolean { const next = publishQ3WithReaction(this.state); if (next === this.state) { this.persist(); return false; } this.commit(next); return true; }
  observeQ2(id: string): boolean { const next = observeQ2(this.state, id); if (next === this.state) return false; this.commit(next); return true; }
  reportQ2(): void { const next = reportQ2(this.state); if (next !== this.state) this.commit(next); }
  selectQ2(slot: ChamberId | 'lead', id: string | null): void { const next = selectQ2(this.state, slot, id); if (next !== this.state) this.commit(next); }
  checkQ2(): void { const next = checkQ2(this.state); if (next !== this.state) this.commit(next); }
  publishQ2(): boolean { const next = publishQ2WithReaction(this.state); if (next === this.state) { this.persist(); return false; } this.commit(next); return true; }

  /** Moves into the Bodyscope heart through the superior vena cava (safe entry point is saved). */
  enterHeart(): void {
    const why = canEnterHeart(this.state);
    if (why) throw new Error(why);
    const sp = rooms.heart.spawn;
    const s = this.state.flags.includes(Q1.entered) ? this.state : { ...this.state, flags: [...this.state.flags, Q1.entered] };
    this.commit({ ...s, at: { room: 'heart', x: sp.x, y: sp.y, facing: rooms.heart.spawnFacing }, q003: { ...s.q003, mode: 'normal' }, q005: { ...s.q005, mode: 'normal' } });
  }

  /** Records an observation; returns whether it was new and whether it completed the checkpoint. */
  observe(id: string): { first: boolean; done: boolean } {
    const before = this.state, next = observeQ1(before, id);
    if (next === before) { this.persist(); return { first: false, done: false }; }
    this.commit(next);
    return { first: next.inspected.length !== before.inspected.length, done: next.flags.includes(Q1.observed) && !before.flags.includes(Q1.observed) };
  }

  brief(): void { this.commit(briefQ1(this.state)); }

  selectArticle(slot: ArticleSlot, id: string | null): void {
    const next = selectArticle(this.state, slot, id); if (next !== this.state) this.commit(next);
  }
  checkArticle(): void {
    const next = checkArticle(this.state); if (next !== this.state) this.commit(next);
  }
  publishArticle(): boolean {
    const next = publishWithReaction(this.state); if (next === this.state) { this.persist(); return false; }
    this.commit(next); return true;
  }
  reprintArticle(expectedCount: number, questId: QuestId = 'Q001'): boolean {
    const next = reprintArticle(this.state, expectedCount, randomReactionValue, new Date().toISOString(), questId); if (next === this.state) return false;
    this.commit(next); return true;
  }
  seeReaction(round: number): void {
    const next = seeReaction(this.state, round); if (next !== this.state) this.commit(next);
  }

  /** Records a heart structure in the exploration record; returns true the first time. No XP or gold. */
  discover(id: string): boolean {
    const before = this.state, next = discover(before, id);
    if (next === before) { this.persist(); return false; }
    this.commit(next);
    return true;
  }

  rest(): void { this.commit({ ...this.state, cafe: { ...this.state.cafe, restedAt: new Date().toISOString() } }); }


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
