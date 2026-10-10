import { defaultAppearance } from '../../src/domain/appearance';
import { it, expect } from 'vitest';
import { GameApplication } from '../../src/application/game';
import { newState, type GameState } from '../../src/domain/state';
import type { SaveStore } from '../../src/infrastructure/save-store';
class MemoryStore implements SaveStore {
  state: GameState | null = null; fail = false;
  async load() { return this.state; }
  async backups() { return []; }
  async commit(next: GameState, revision: number | null) {
    if (this.fail) throw new Error('quota fixture');
    if ((this.state?.revision ?? null) !== revision) throw new Error('revision conflict');
    this.state = structuredClone(next);
  }
}
it('failed persistence keeps the original domain state and allows retry', async () => {
  const store = new MemoryStore(); const app = await GameApplication.open(store, true);
  store.fail = true;
  await expect(app.execute({ type: 'start', name: '진우주', preset: 'alien' })).rejects.toThrow('quota');
  expect(app.snapshot.started).toBe(false); expect(app.snapshot.revision).toBe(0); expect(app.busy).toBe(false);
  store.fail = false; await app.execute({ type: 'start', name: '진우주', preset: 'alien' });
  const reopened = await GameApplication.open(store, true); expect(reopened.snapshot.avatar.preset).toBe('alien');
});
it('modal locks movement, foot obstacles cannot be tunnelled through, and remote inspection fails', async () => {
  const store = new MemoryStore(); const app = await GameApplication.open(store, true);
  await app.execute({ type: 'start', name: '', preset: 'female' });
  app.move(0, -40); expect(app.position.y).toBe(270);
  app.mode = 'world'; app.move(0, -100); expect(app.position.y).toBe(170);
  app.move(0, -100); expect(app.position.y).toBeGreaterThanOrEqual(163);
  await expect(app.execute({ type: 'inspect', target: 'device' })).rejects.toThrow('가까이');
  await app.execute({ type: 'inspect', target: 'editor' });
  await app.execute({ type: 'inspect', target: 'editor' });
  expect(app.snapshot.inspected).toEqual(['newsroom.editor']); expect(app.snapshot.gold).toBe(0);
});
it('application read-only and stale-revision writes are rejected without losing newer state', async () => {
  const store = new MemoryStore(); const writer = await GameApplication.open(store, true);
  const stale = await GameApplication.open(store, true); const reader = await GameApplication.open(store, false);
  await writer.execute({ type: 'start', preset: 'male', name: 'A' });
  await expect(reader.execute({ type: 'save' })).rejects.toThrow('다른 창');
  await expect(stale.execute({ type: 'start', preset: 'female', name: 'B' })).rejects.toThrow('revision');
  expect(store.state!.avatar.name).toBe('A');
});
it('invalid imports preserve existing state, and valid imports retain local save identity', async () => {
  const store = new MemoryStore(); const app = await GameApplication.open(store, true); const original = app.snapshot;
  await expect(app.execute({ type: 'import', state: { ...original, schemaVersion: 4 } })).rejects.toThrow();
  expect(app.snapshot).toEqual(original);
  const external = newState(); external.avatar.preset = 'alien'; external.avatar.appearance=defaultAppearance('alien');
  await app.execute({ type: 'import', state: external });
  expect(app.snapshot.saveId).toBe(original.saveId); expect(app.snapshot.revision).toBe(1);
});
it('cafe order and balance are not updated when persistence fails', async () => {
  const store = new MemoryStore(); const state = newState(); state.started = true; state.safeLocation = { room: 'cafe', x: 300, y: 185 };
  store.state = state; const app = await GameApplication.open(store, true); store.fail = true;
  await expect(app.execute({ type: 'order', itemId: 'welcome', commandId: 'failed' })).rejects.toThrow('quota');
  expect(app.snapshot.cafe.welcomeUsed).toBe(false); expect(app.snapshot.cafe.orderCount).toBe(0);
  store.fail = false; await app.execute({ type: 'order', itemId: 'welcome', commandId: 'retry' });
  expect(app.snapshot.cafe.welcomeUsed).toBe(true); expect(app.snapshot.totalXp).toBe(0);
});
it('appearance/equipment writes are atomic and reject unowned clothing',async()=>{
  const store=new MemoryStore();const app=await GameApplication.open(store,true);
  await app.execute({type:'start',preset:'female',name:'새 기자'});
  await app.execute({type:'equip',outfitId:'hoodie'});expect(app.snapshot.avatar.appearance.outfitId).toBe('hoodie');
  await expect(app.execute({type:'equip',outfitId:'coat'})).rejects.toThrow('가지고');
  store.fail=true;await expect(app.execute({type:'appearance',appearance:{...app.snapshot.avatar.appearance,skinId:'tan'}})).rejects.toThrow('quota');
  expect(app.snapshot.avatar.appearance.skinId).toBe('peach');
});
it('travel requires the door threshold, not the wider investigation range',async()=>{
  const store=new MemoryStore();const state=newState();state.started=true;state.safeLocation={room:'newsroom',x:565,y:270};store.state=state;
  const app=await GameApplication.open(store,true);app.mode='world';
  await expect(app.execute({type:'travel',target:'exit'})).rejects.toThrow('가까이');
  app.move(0,26);await app.execute({type:'travel',target:'exit'});expect(app.room).toBe('lobby');
});
