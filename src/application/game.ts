import { defaultAppearance, validateAppearance, type Appearance, type Preset } from '../domain/appearance';
import { orderDrink } from '../domain/cafe';
import { discover } from '../domain/heart';
import { Q1, acceptQ1, briefQ1, canEnterHeart, observeQ1 } from '../domain/quest';
import { newState, validateState, type GameState, type TimeMode } from '../domain/state';
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

  acceptQuest(): void { this.commit(acceptQ1(this.state)); }

  /** Moves into the Bodyscope heart through the superior vena cava (safe entry point is saved). */
  enterHeart(): void {
    const why = canEnterHeart(this.state);
    if (why) throw new Error(why);
    const sp = rooms.heart.spawn;
    const s = this.state.flags.includes(Q1.entered) ? this.state : { ...this.state, flags: [...this.state.flags, Q1.entered] };
    this.commit({ ...s, at: { room: 'heart', x: sp.x, y: sp.y, facing: rooms.heart.spawnFacing } });
  }

  /** Records an observation; returns whether it was new and whether it completed the checkpoint. */
  observe(id: string): { first: boolean; done: boolean } {
    const before = this.state, next = observeQ1(before, id);
    if (next === before) { this.persist(); return { first: false, done: false }; }
    this.commit(next);
    return { first: next.inspected.length !== before.inspected.length, done: next.flags.includes(Q1.observed) && !before.flags.includes(Q1.observed) };
  }

  brief(): void { this.commit(briefQ1(this.state)); }

  /** Records a heart structure in the exploration record; returns true the first time. No XP or gold. */
  discover(id: string): boolean {
    const before = this.state, next = discover(before, id);
    if (next === before) { this.persist(); return false; }
    this.commit(next);
    return true;
  }

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
