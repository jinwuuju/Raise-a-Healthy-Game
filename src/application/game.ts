import { defaultAppearance, validateAppearance, type Appearance, type Preset } from '../domain/appearance';
import { orderDrink } from '../domain/cafe';
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
  private dirtyPosition = false;
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
    if (persist) this.persist();
    for (const fn of this.listeners) fn(this.state);
  }

  persist(): boolean {
    try { this.store.save(this.state); this.dirtyPosition = false; this.lastError = null; return true; }
    catch (e) { this.lastError = e instanceof Error ? e.message : '저장하지 못했어요.'; return false; }
  }

  begin(name: string, preset: Preset, look: Appearance): void {
    const trimmed = name.trim().slice(0, 12) || '새 기자';
    const base = this.state.started ? this.state : newState();
    const valid = validateAppearance(look, preset);
    const owned = base.owned.includes(valid.outfit) ? base.owned : base.owned;
    if (!owned.includes(valid.outfit)) throw new Error('아직 갖고 있지 않은 옷이에요.');
    this.commit({ ...base, started: true, avatar: { preset, name: trimmed, look: valid } });
  }

  resetLook(preset: Preset): Appearance { return defaultAppearance(preset); }

  /** Position updates are kept in memory and flushed by autosave, room changes and the menu. */
  setPosition(room: RoomId, x: number, y: number, facing: Dir): void {
    if (!canStand(room, { x, y })) return;
    const at = this.state.at;
    if (at.room === room && Math.abs(at.x - x) < 0.01 && Math.abs(at.y - y) < 0.01 && at.facing === facing) return;
    this.state = { ...this.state, at: { room, x, y, facing } };
    this.dirtyPosition = true;
  }
  get needsSave(): boolean { return this.dirtyPosition; }

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

  rest(): void { this.commit({ ...this.state, cafe: { ...this.state.cafe, restedAt: new Date().toISOString() } }); }

  setTime(time: TimeMode): void { this.commit({ ...this.state, settings: { ...this.state.settings, time } }); }

  importState(raw: unknown): void {
    const s = validateState(raw);
    this.state = s; this.persist();
    for (const fn of this.listeners) fn(this.state);
  }

  backups(): GameState[] { return this.store.backups(); }

  restart(): void {
    this.state = newState();
    this.persist();
    for (const fn of this.listeners) fn(this.state);
  }
}
