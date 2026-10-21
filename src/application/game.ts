import { defaultAppearance, validateAppearance, type Appearance, type Preset } from '../domain/appearance';
import { orderDrink } from '../domain/cafe';
import { buyItem, buyOutfit } from '../domain/shop';
import { checkArticle, selectArticle } from '../domain/article';
import { publishWithReaction, publishQ2WithReaction, publishQ3WithReaction, publishQ4WithReaction, publishQ5WithReaction, publishQ6WithReaction, publishQ7WithReaction, publishQ8WithReaction, publishQ9WithReaction, publishQ10WithReaction, randomReactionValue, reprintArticle, seeReaction } from '../domain/reaction';
import type { QuestId } from '../domain/reaction-state';
import { acceptQ5, setQ5Mode, recordQ5, placeQ5, clearQ5Order, selectQ5, checkQ5 } from '../domain/q005';
import type { Q5Evidence, SignalCard } from '../domain/q005-state';
import type { RhythmMode } from '../domain/rhythm-model';
import { acceptQ6, setQ6Mode, recordQ6, placeQ6, clearQ6Order, selectQ6, checkQ6 } from '../domain/q006';
import type { BoardCard, Q6Evidence } from '../domain/q006-state';
import { acceptQ7, setQ7Mode, recordQ7, pairQ7, chainQ7, clearQ7Board, selectQ7, checkQ7 } from '../domain/q007';
import type { ChainCard, PairCard, Q7Evidence } from '../domain/q007-state';
import type { PassageMode } from '../domain/passage-model';
import { acceptQ8, setQ8Mode, recordQ8, pickQ8, verdictQ8, clearQ8Board, selectQ8, checkQ8 } from '../domain/q008';
import type { Q8Evidence, RecordCard, VerdictCard } from '../domain/q008-state';
import type { PressureMode } from '../domain/pressure-model';
import { acceptQ10, runQ10, claimQ10, evidenceQ10, clearQ10Board, selectQ10, checkQ10 } from '../domain/q010';
import { acceptQ9, recordQ9, slotQ9, chainQ9, clearQ9Board, selectQ9, checkQ9 } from '../domain/q009';
import type { ChainCard as Q9ChainCard, DecoyCard as Q9DecoyCard, Q9Evidence, RoomCard as Q9RoomCard } from '../domain/q009-state';
import type { SupplyMode } from '../domain/supply-model';
import { acceptQ4, crossQ4Body, recordQ4, placeQ4Route, joinQ4, selectQ4, checkQ4 } from '../domain/q004';
import type { Q4Evidence, RouteId } from '../domain/q004-state';
import { acceptQ3, setQ3Mode, recordQ3, selectQ3, checkQ3 } from '../domain/q003';
import type { Q3Evidence } from '../domain/q003-state';
import type { ValveMode } from '../domain/valve-model';
import { acceptQ2, observeQ2, reportQ2, selectQ2, checkQ2 } from '../domain/q002';
import type { ChamberId } from '../domain/q002-state';
import type { ArticleSlot } from '../domain/article-state';
import { discover } from '../domain/heart';
import { canEnterAirway, discoverRx } from '../domain/airway';
import { answerQuiz, type QuizKind } from '../domain/mastery';
import { finishRun, type RunResult, type RunReward } from '../domain/heart-run';
import { Q1, acceptQ1, briefQ1, canEnterHeart, observeQ1 } from '../domain/quest';
import { newState, validateState, type GameState } from '../domain/state';
import { clearLunchPlan, drawLunch, orderLunch, planLunch, reportLunch, seeLunch, settleLunch, skipLunch, type Crave, type CraveChoice, type LunchPool } from '../domain/lunch';
import type { SaveStore } from '../infrastructure/save';
import { canStand } from '../world/collision';
import { rooms } from '../world/rooms';
import type { Dir, RoomId } from '../world/types';

type Listener = (s: GameState) => void;
type Voice = { id: string; lines: number };
function voiceOf(voices: Voice[]): [string, number] {
  const usable = voices.filter(v => v.lines > 0);
  if (!usable.length) throw new Error('동료 대사가 없어요.');
  const v = usable[Math.min(usable.length - 1, Math.floor(randomReactionValue() * usable.length))]!;
  return [v.id, Math.min(v.lines - 1, Math.floor(randomReactionValue() * v.lines))];
}

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
    this.commit({ ...next, at: { room, x, y, facing }, q003: { ...next.q003, mode: 'normal' }, q005: { ...next.q005, mode: 'normal' }, q006: { ...next.q006, mode: 'rest' }, q007: { ...next.q007, mode: 'wide' }, q008: { ...next.q008, mode: 'rest' } });
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

  private commandId(): string {
    return (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now()) + String(Math.random()).slice(2, 8)).replaceAll('-', '').slice(0, 24);
  }
  order(itemId: string): void { this.commit(orderDrink(this.state, itemId, this.commandId())); }
  /** D103: buy one item at Jin-U (gold, bag and ledger change together). */
  /** D106: a field check about a recorded heart structure. Returns whether a star was earned. */
  answerQuiz(id: string, kind: QuizKind, correct: boolean): boolean { const r = answerQuiz(this.state, id, kind, correct); if (r.state === this.state) return false; this.commit(r.state); return r.star; }
  /** D106: hands in a finished blood-delivery run (once per run id) and returns the reward breakdown. */
  finishRun(res: RunResult): RunReward | null { const r = finishRun(this.state, res); const next = r.reward ? runQ10(r.state, res.kind ?? 'blood') : r.state; if (next !== this.state) this.commit(next); return r.reward; }
  buyItem(itemId: string): void { this.commit(buyItem(this.state, itemId, this.commandId())); }
  /** D103: buy a piece of clothing at the Orbit Tailor, optionally wearing it at once. */
  buyOutfit(id: string, wear: boolean): void { const next = buyOutfit(this.state, id, wear); if (next !== this.state) this.commit(next); }

  acceptQuest(): void { this.commit(acceptQ1(this.state)); }
  acceptQ2(): void { const next = acceptQ2(this.state); if (next !== this.state) this.commit(next); }
  acceptQ3(): void { const next = acceptQ3(this.state); if (next !== this.state) this.commit(next); }
  acceptQ6(): void { const next = acceptQ6(this.state); if (next !== this.state) this.commit(next); }
  setQ6Mode(mode: SupplyMode): void { const next = setQ6Mode(this.state, mode); if (next !== this.state) this.commit(next); }
  recordQ6(id: Q6Evidence): boolean { const next = recordQ6(this.state, id); if (next === this.state) return false; this.commit(next); return true; }
  placeQ6(id: BoardCard): void { const next = placeQ6(this.state, id); if (next !== this.state) this.commit(next); }
  clearQ6Order(): void { const next = clearQ6Order(this.state); if (next !== this.state) this.commit(next); }
  selectQ6(slot: 'lead' | 'limit', id: string | null): void { const next = selectQ6(this.state, slot, id); if (next !== this.state) this.commit(next); }
  checkQ6(): void { const next = checkQ6(this.state); if (next !== this.state) this.commit(next); }
  publishQ6(): boolean { const next = publishQ6WithReaction(this.state); if (next === this.state) { this.persist(); return false; } this.commit(next); return true; }
  acceptQ10(): void { const next = acceptQ10(this.state); if (next !== this.state) this.commit(next); }
  claimQ10(id: string): void { const next = claimQ10(this.state, id); if (next !== this.state) this.commit(next); }
  evidenceQ10(id: string): void { const next = evidenceQ10(this.state, id); if (next !== this.state) this.commit(next); }
  clearQ10Board(): void { const next = clearQ10Board(this.state); if (next !== this.state) this.commit(next); }
  selectQ10(slot: 'lead' | 'analogy' | 'limit', id: string | null): void { const next = selectQ10(this.state, slot, id); if (next !== this.state) this.commit(next); }
  checkQ10(): void { const next = checkQ10(this.state); if (next !== this.state) this.commit(next); }
  publishQ10(): boolean { const next = publishQ10WithReaction(this.state); if (next === this.state) { this.persist(); return false; } this.commit(next); return true; }
  acceptQ9(): void { const next = acceptQ9(this.state); if (next !== this.state) this.commit(next); }
  recordQ9(id: Q9Evidence): boolean { const next = recordQ9(this.state, id); if (next === this.state) return false; this.commit(next); return true; }
  slotQ9(id: Q9RoomCard): void { const next = slotQ9(this.state, id); if (next !== this.state) this.commit(next); }
  chainQ9(id: Q9ChainCard | Q9DecoyCard): void { const next = chainQ9(this.state, id); if (next !== this.state) this.commit(next); }
  clearQ9Board(): void { const next = clearQ9Board(this.state); if (next !== this.state) this.commit(next); }
  selectQ9(slot: 'lead' | 'analogy' | 'limit', id: string | null): void { const next = selectQ9(this.state, slot, id); if (next !== this.state) this.commit(next); }
  checkQ9(): void { const next = checkQ9(this.state); if (next !== this.state) this.commit(next); }
  publishQ9(): boolean { const next = publishQ9WithReaction(this.state); if (next === this.state) { this.persist(); return false; } this.commit(next); return true; }
  acceptQ8(): void { const next = acceptQ8(this.state); if (next !== this.state) this.commit(next); }
  setQ8Mode(mode: PressureMode): void { const next = setQ8Mode(this.state, mode); if (next !== this.state) this.commit(next); }
  recordQ8(id: Q8Evidence): boolean { const next = recordQ8(this.state, id); if (next === this.state) return false; this.commit(next); return true; }
  pickQ8(id: RecordCard): void { const next = pickQ8(this.state, id); if (next !== this.state) this.commit(next); }
  verdictQ8(id: VerdictCard): void { const next = verdictQ8(this.state, id); if (next !== this.state) this.commit(next); }
  clearQ8Board(): void { const next = clearQ8Board(this.state); if (next !== this.state) this.commit(next); }
  selectQ8(slot: 'lead' | 'limit', id: string | null): void { const next = selectQ8(this.state, slot, id); if (next !== this.state) this.commit(next); }
  checkQ8(): void { const next = checkQ8(this.state); if (next !== this.state) this.commit(next); }
  publishQ8(): boolean { const next = publishQ8WithReaction(this.state); if (next === this.state) { this.persist(); return false; } this.commit(next); return true; }
  acceptQ7(): void { const next = acceptQ7(this.state); if (next !== this.state) this.commit(next); }
  setQ7Mode(mode: PassageMode): void { const next = setQ7Mode(this.state, mode); if (next !== this.state) this.commit(next); }
  recordQ7(id: Q7Evidence): boolean { const next = recordQ7(this.state, id); if (next === this.state) return false; this.commit(next); return true; }
  pairQ7(id: PairCard): void { const next = pairQ7(this.state, id); if (next !== this.state) this.commit(next); }
  chainQ7(id: ChainCard | 'cut'): void { const next = chainQ7(this.state, id); if (next !== this.state) this.commit(next); }
  clearQ7Board(): void { const next = clearQ7Board(this.state); if (next !== this.state) this.commit(next); }
  selectQ7(slot: 'lead' | 'limit', id: string | null): void { const next = selectQ7(this.state, slot, id); if (next !== this.state) this.commit(next); }
  checkQ7(): void { const next = checkQ7(this.state); if (next !== this.state) this.commit(next); }
  publishQ7(): boolean { const next = publishQ7WithReaction(this.state); if (next === this.state) { this.persist(); return false; } this.commit(next); return true; }
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
    this.commit({ ...s, at: { room: 'heart', x: sp.x, y: sp.y, facing: rooms.heart.spawnFacing }, q003: { ...s.q003, mode: 'normal' }, q005: { ...s.q005, mode: 'normal' }, q006: { ...s.q006, mode: 'rest' }, q007: { ...s.q007, mode: 'wide' }, q008: { ...s.q008, mode: 'rest' } });
  }

  /** D111: moves into the Bodyscope airway through a nostril (after the heart graduation). Air modes are not saved. */
  enterAirway(): void {
    const why = canEnterAirway(this.state);
    if (why) throw new Error(why);
    const r = rooms.nose;
    this.commit({ ...this.state, at: { room: 'nose', x: r.spawn.x, y: r.spawn.y, facing: r.spawnFacing } });
  }
  /** Records an airway structure (rx:); returns true the first time. No XP or gold. */
  discoverRx(id: string): boolean {
    const before = this.state, next = discoverRx(before, id);
    if (next === before) { this.persist(); return false; }
    this.commit(next);
    return true;
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

  /* ---- 오늘의 점심(D085): 확정·저장은 여기서만. 연출과 카드 다시 보기는 저장된 기록을 읽는다. 보상 없음(⑦에서 결정). ---- */
  /** 지난 날 미확정·오늘 11:30 경과를 자동 굶음으로 정리한다. 바뀌었으면 true. */
  settleLunch(now = Date.now()): boolean { const next = settleLunch(this.state, now); if (next === this.state) return false; this.commit(next); return true; }
  drawLunch(crave: CraveChoice, pool: LunchPool, now = Date.now()): void { const next = drawLunch(this.state, now, crave, pool, randomReactionValue); if (next !== this.state) this.commit(next); }
  /** voices: 동료 id와 해당 상황 대사 개수. 누가 말할지는 여기서 정해 저장한다. */
  reportLunch(menu: string, voices: Voice[], now = Date.now()): void { const [who, line] = voiceOf(voices); const next = reportLunch(this.state, now, menu, who, line); if (next !== this.state) this.commit(next); }
  orderLunch(menu: string, menuName: string, tips: string[], applicable: string[], voices: Voice[], now = Date.now()): void { const [who, line] = voiceOf(voices); this.commit(orderLunch(this.state, now, menu, menuName, tips, applicable, who, line)); }
  skipLunch(voices: Voice[], now = Date.now()): void { const [who, line] = voiceOf(voices); this.commit(skipLunch(this.state, now, who, line)); }
  seeLunch(date: string): void { const next = seeLunch(this.state, date); if (next !== this.state) this.commit(next); }
  /** 내일 뭐 먹지(D087): 생각해 두기만, 주문·보상 없음. */
  planLunch(crave: Crave, menu: string | null, pool: LunchPool, now = Date.now()): void { const next = planLunch(this.state, now, crave, menu, pool); if (next !== this.state) this.commit(next); }
  clearLunchPlan(): void { const next = clearLunchPlan(this.state); if (next !== this.state) this.commit(next); }

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
