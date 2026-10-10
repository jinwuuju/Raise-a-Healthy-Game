import { defaultAppearance,validateAppearance,type Appearance } from '../domain/appearance';
import movementRules from '../../data/balance/movement.v0.1.json';
import { orderDrink } from '../domain/cafe';
import { newState, presets, validateState, type GameState, type Preset } from '../domain/state';
import { doorFor,canStand, rooms, targetInRange, type Point, type RoomId } from '../domain/world';
import type { SaveStore } from '../infrastructure/save-store';
export type Command = { type: 'start'; preset: Preset; name: string; appearance?:Appearance } | { type:'appearance'; appearance:Appearance } | {type:'equip'; outfitId:string} | { type: 'inspect'; target: string } | { type: 'travel'; target: string } | { type: 'order'; itemId: string; commandId: string } | { type: 'rest'; target: string } | { type: 'save' } | { type: 'import'; state: unknown };
export class GameApplication {
  private state: GameState;
  private pose: Point;
  private pending = false;
  private virtualInput: Point = { x: 0, y: 0 };
  private queuedSteps: Point[] = [];
  private listeners = new Set<() => void>();
  mode: 'world' | 'dialog' = 'dialog';
  constructor(private store: SaveStore, state: GameState, readonly writable: boolean) {
    this.state = validateState(state); this.pose = { x: state.safeLocation.x, y: state.safeLocation.y };
  }
  static async open(store: SaveStore, writable: boolean): Promise<GameApplication> {
    let state = await store.load();
    if (!state) { state = newState(); if (writable) await store.commit(state, null); }
    return new GameApplication(store, state, writable);
  }
  get snapshot(): GameState { return structuredClone(this.state); }
  get directionInput(): Point { return { ...this.virtualInput }; }
  get stepGoal(): Point | undefined { const goal=this.queuedSteps[0]; return goal ? { ...goal } : undefined; }
  setDirectionInput(x:number,y:number): void {
    this.virtualInput=this.writable && this.mode === 'world' && Number.isFinite(x) && Number.isFinite(y) ? {x:Math.sign(x),y:Math.sign(y)} : {x:0,y:0};
  }
  queueStep(x:number,y:number): void {
    if(!this.writable || this.mode!=='world' || this.pending || this.queuedSteps.length>=32 || ![x,y].every(Number.isFinite))return;
    const length=Math.hypot(x,y);if(!length)return;
    const base=this.queuedSteps.at(-1) ?? this.pose;
    const target={x:base.x+x/length*movementRules.buttonTapPixels,y:base.y+y/length*movementRules.buttonTapPixels};
    if(canStand(this.room,target))this.queuedSteps.push(target);
  }
  completeStep(): void { const goal=this.queuedSteps[0]; if(goal && Math.hypot(goal.x-this.pose.x,goal.y-this.pose.y)<.1 && canStand(this.room,goal))this.pose={...goal}; this.queuedSteps.shift(); }
  cancelSteps(): void { this.queuedSteps=[]; }
  get room(): RoomId { return this.state.safeLocation.room; }
  get position(): Point { return { ...this.pose }; }
  get busy(): boolean { return this.pending; }
  subscribe(fn: () => void): () => void { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  move(dx: number, dy: number): void {
    if (!this.writable || this.pending || this.mode !== 'world' || !this.state.started) return;
    // Cap deltas to prevent tunnelling through furniture after a slow frame.
    if (![dx, dy].every(Number.isFinite)) return;
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 4));
    if (steps > 100) return;
    for (let i = 0; i < steps; i++) {
      const x = { ...this.pose, x: this.pose.x + dx / steps };
      if (canStand(this.state.safeLocation.room, x)) this.pose = x;
      const y = { ...this.pose, y: this.pose.y + dy / steps };
      if (canStand(this.state.safeLocation.room, y)) this.pose = y;
    }
  }
  async execute(command: Command): Promise<void> {
    if (!this.writable) throw new Error('다른 창에서 플레이 중입니다. 그 창을 닫고 새로고침해 주세요.');
    if (this.pending) throw new Error('저장 중입니다. 잠시 뒤 다시 시도해 주세요.');
    this.pending = true;
    try {
      let next = this.snapshot;
      next.safeLocation = { ...this.pose, room: next.safeLocation.room };
      if (command.type === 'start') {
        if (next.started || !presets.includes(command.preset) || command.name.trim().length > 20) throw new Error('캐릭터 선택을 확인해 주세요.');
        next.started = true; next.avatar = { preset: command.preset, name: command.name.trim() || '새 기자',appearance:validateAppearance(command.appearance ?? defaultAppearance(command.preset),command.preset) };
      } else if(command.type==='appearance'){
        const appearance=validateAppearance(command.appearance,next.avatar.preset);
        if(!next.ownedCosmeticIds.includes(appearance.outfitId))throw new Error('가지고 있는 옷을 선택해 주세요.');
        next.avatar.appearance=appearance;
      } else if(command.type==='equip'){
        if(!next.ownedCosmeticIds.includes(command.outfitId))throw new Error('가지고 있지 않은 옷입니다.');
        next.avatar.appearance=validateAppearance({...next.avatar.appearance,outfitId:command.outfitId},next.avatar.preset);
      } else if (command.type === 'inspect' || command.type === 'travel') {
        if (!next.started || !(command.type==='travel' ? (()=>{const d=doorFor(next.safeLocation.room,command.target);return d&&Math.hypot(d.x-this.pose.x,d.y-this.pose.y)<=d.radius;})() : targetInRange(next.safeLocation.room,this.pose,command.target))) throw new Error('조금 더 가까이 다가가 주세요.');
        if (command.type === 'inspect') {
          const key = `${next.safeLocation.room}.${command.target}`;
          if (!next.inspected.includes(key)) next.inspected.push(key);
        } else {
          const door=doorFor(next.safeLocation.room,command.target);
          if(!door)throw new Error('출입구가 아닙니다.');
          next.safeLocation={room:door.destination,...door.arrival};
        }
      } else if (command.type === 'order') {
        if (!targetInRange(next.safeLocation.room, this.pose, 'barista')) throw new Error('주문 카운터 가까이 와 주세요.');
        next = orderDrink(next, command.itemId, command.commandId);
      } else if (command.type === 'rest') {
        if (next.safeLocation.room !== 'cafe' || command.target !== 'table' || !targetInRange('cafe', this.pose, 'table')) throw new Error('테이블 가까이 와 주세요.');
        next.cafe.restedAt = new Date().toISOString();
      } else if (command.type === 'import') {
        next = validateState(command.state);
        // Keep this save identity and monotonic local revision on replacement.
        next.saveId = this.state.saveId; next.createdAt = this.state.createdAt;
      }
      next.revision = this.state.revision + 1; next.updatedAt = new Date().toISOString();
      await this.store.commit(next, this.state.revision);
      this.queuedSteps=[]; this.virtualInput={x:0,y:0};
      this.state = next; this.pose = { x: next.safeLocation.x, y: next.safeLocation.y };
      this.listeners.forEach(fn => fn());
    } finally { this.pending = false; }
  }
}
