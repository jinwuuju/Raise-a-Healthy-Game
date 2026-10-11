import './ui/style.css';
import motion from '../data/balance/movement.v0.2.json';
import { Game } from './application/game';
import { heartText, inspectLabels, lookText, objective, q1Text, talk, type Line } from './application/story';
import { discovered, discoveries, discoveryIds, roomProgress } from './domain/heart';
import { outfits, presetNames, type Look } from './domain/appearance';
import { cafeMenu, canOrder } from './domain/cafe';
import { Q1, Q1_OBSERVATIONS, Q1_ROOM, canEnterHeart, levelOf, obsKey, q1CanOffer, q1Seen } from './domain/quest';
import { timeModes, type TimeMode } from './domain/state';
import { SaveStore } from './infrastructure/save';
import { World } from './game/world';
import { Dialog } from './ui/dialog';
import { button, el } from './ui/dom';
import { Hud } from './ui/hud';
import { openCreator } from './ui/creator';
import { Joystick } from './ui/joystick';
import { openAtlas } from './ui/atlas';
import { closeSheet, openSheet, sheetOpen } from './ui/sheet';
import { heartRoute } from './world/heart-rooms';
import { rooms, type Target } from './world/rooms';
import { isHeartRoom, type Dir, type Point, type RoomId } from './world/types';

class MemoryStorage implements Storage {
  private m = new Map<string, string>();
  get length() { return this.m.size; }
  clear() { this.m.clear(); }
  getItem(k: string) { return this.m.get(k) ?? null; }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  removeItem(k: string) { this.m.delete(k); }
  setItem(k: string, v: string) { this.m.set(k, v); }
}
async function storage(): Promise<SaveStore> {
  let durable: Storage;
  try { durable = window.localStorage; }
  catch { return new SaveStore(new MemoryStorage(), '자동 저장을 사용할 수 없어요. 메뉴에서 기록을 파일로 내보내 주세요.'); }
  // Do not write a probe: full storage must still allow reading an existing save.
  if (!navigator.locks) return new SaveStore(durable, '이 브라우저에서는 안전한 자동 저장을 사용할 수 없어요. 메뉴에서 기록을 파일로 내보내 주세요.');
  const reason = await new Promise<string | null>(resolve => {
    void navigator.locks.request('medical-quest.v4.writer', { ifAvailable: true }, async lock => {
      resolve(lock ? null : '다른 탭이 기록을 저장하고 있어요. 이 탭의 기록은 파일로 내보낼 수 있어요. 저장하려면 다른 탭을 닫고 새로고침해 주세요.');
      if (lock) await new Promise<void>(() => {}); // Browser releases the lock when this document ends.
    }).catch(() => resolve('저장 잠금을 확보하지 못했어요. 기록을 파일로 내보내고 새로고침해 주세요.'));
  });
  return new SaveStore(durable, reason);
}

const game = new Game(await storage());
const canvas = el('canvas'); canvas.id = 'view'; canvas.tabIndex = 0; canvas.setAttribute('aria-label', '게임 화면');
document.querySelector('#app')!.append(canvas);
const ctx = canvas.getContext('2d', { alpha: false })!;
const fade = el('div', 'fade'); const fadeCard = el('div', 'card'); fade.append(fadeCard); document.body.append(fade);

let world: World | null = null;
const npcLooks: Record<string, Look> = {};
for (const r of Object.values(rooms)) for (const n of r.npcs) npcLooks[n.id] = n.look;
const dialog = new Dialog(id => (id ? npcLooks[id] ?? null : null));

const hud = new Hud({
  onChip: () => openReporter(),
  onNote: () => openNotebook(),
  onMenu: () => openMenu(),
  onMap: () => openMap(),
});
hud.setVisible(false);
// Touch screens get a movement ball at the bottom left (D058); PC keeps keyboard/mouse only.
const touchMode = 'ontouchstart' in window;
const joy = new Joystick(hud.root);
let touchUI = false;
function enableTouchUI(): void { if (touchUI) return; touchUI = true; joy.setVisible(true); hud.setTouch(true); if (world) world.touchHint = true; }
if (window.matchMedia?.('(pointer: coarse)').matches) enableTouchUI();
window.addEventListener('touchstart', () => enableTouchUI(), { passive: true, capture: true });

// ---------- Input ----------
const keys = new Set<string>();
const pointer = { id: -1, sx: 0, sy: 0, x: 0, y: 0, t: 0, steering: false };
const dpr = () => Math.min(3, window.devicePixelRatio || 1);
const busy = () => dialog.open || sheetOpen() || !world || world.locked || document.querySelector('.creator') !== null;
function pauseInput(): void { keys.clear(); pointer.id = -1; pointer.steering = false; joy.reset(); world?.stop(); }

window.addEventListener('keydown', e => {
  if (document.querySelector('.creator')) return;
  const k = e.key.toLowerCase();
  if (dialog.open) {
    if (['e', ' ', 'enter'].includes(k) && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); dialog.advance(); }
    if (k === 'escape') { e.preventDefault(); dialog.close(null); }
    return;
  }
  if (sheetOpen()) return;
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(k)) { keys.add(k); e.preventDefault(); }
  else if ((k === 'e' || k === ' ' || k === 'enter') && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); if (world?.near && !busy()) interact(world.near); }
  else if (k === 'escape') { e.preventDefault(); openMenu(); }
  else if (k === 'j' || k === 'n') openNotebook();
  else if (k === 'm' && world && (world.roomId === 'street' || isHeartRoom(world.roomId))) openMap();
});
window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', pauseInput);

// Any tap while a dialog is open advances it (and closes it after the last line), wherever it lands.
let swallowClickUntil = 0, lastAdvance = 0;
const onChoice = (e: Event) => !!(e.target as Element | null)?.closest?.('.dialog .choices button');
document.addEventListener('pointerdown', e => {
  if (!dialog.open || onChoice(e)) return;
  e.preventDefault(); e.stopPropagation();
  swallowClickUntil = performance.now() + 500;
  lastAdvance = performance.now();
  dialog.tapAnywhere();
}, true);
// Some mobile browsers drop pointer events for touches; advance on the touch itself as well (once per tap).
if (touchMode) document.addEventListener('touchstart', e => {
  if (!dialog.open || onChoice(e)) return;
  e.stopPropagation();
  const now = performance.now();
  swallowClickUntil = now + 500;
  if (now - lastAdvance < 350) return;
  lastAdvance = now;
  dialog.tapAnywhere();
}, { capture: true, passive: true });
document.addEventListener('click', e => {
  if (performance.now() < swallowClickUntil && !onChoice(e)) { e.preventDefault(); e.stopPropagation(); }
}, true);

canvas.addEventListener('pointerdown', e => {
  if (busy() || (touchMode && e.pointerType === 'touch')) return;
  canvas.focus({ preventScroll: true });
  canvas.setPointerCapture(e.pointerId);
  Object.assign(pointer, { id: e.pointerId, sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, t: performance.now(), steering: false });
});
canvas.addEventListener('pointermove', e => {
  if (e.pointerId !== pointer.id || (touchMode && e.pointerType === 'touch')) return;
  pointer.x = e.clientX; pointer.y = e.clientY;
  if (!pointer.steering && (Math.hypot(pointer.x - pointer.sx, pointer.y - pointer.sy) > motion.holdToSteerCssPixels)) pointer.steering = true;
});
const finishPointer = (x: number, y: number, tap: boolean) => {
  const wasSteering = pointer.steering;
  pointer.id = -1; pointer.steering = false;
  if (tap && !wasSteering && world && !busy()) world.tap(world.screenToWorld(x * dpr(), y * dpr()));
};
const endPointer = (e: PointerEvent, tap: boolean) => { if (e.pointerId === pointer.id) finishPointer(e.clientX, e.clientY, tap); };
// Touch path: taps and hold-to-steer on the world work from touch events directly (ids offset from pointer ids).
const TOUCH = 1e6;
const findTouch = (list: TouchList) => { for (let i = 0; i < list.length; i++) if (TOUCH + list[i]!.identifier === pointer.id) return list[i]!; return null; };
if (touchMode) {
  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    const t = e.changedTouches[0];
    if (!t || busy() || pointer.id !== -1 || performance.now() < swallowClickUntil) return;
    Object.assign(pointer, { id: TOUCH + t.identifier, sx: t.clientX, sy: t.clientY, x: t.clientX, y: t.clientY, t: performance.now(), steering: false });
  }, { passive: false });
  canvas.addEventListener('touchmove', e => {
    const t = findTouch(e.changedTouches);
    if (!t) return;
    e.preventDefault();
    pointer.x = t.clientX; pointer.y = t.clientY;
    if (!pointer.steering && Math.hypot(pointer.x - pointer.sx, pointer.y - pointer.sy) > motion.holdToSteerCssPixels) pointer.steering = true;
  }, { passive: false });
  canvas.addEventListener('touchend', e => { const t = findTouch(e.changedTouches); if (t) { e.preventDefault(); finishPointer(t.clientX, t.clientY, true); } }, { passive: false });
  canvas.addEventListener('touchcancel', e => { const t = findTouch(e.changedTouches); if (t) finishPointer(t.clientX, t.clientY, false); });
}
canvas.addEventListener('pointerup', e => endPointer(e, true));
canvas.addEventListener('pointercancel', e => endPointer(e, false));
canvas.addEventListener('contextmenu', e => e.preventDefault());

function inputState() {
  if (busy()) return { vx: 0, vy: 0, steer: null };
  let vx = (keys.has('arrowright') || keys.has('d') ? 1 : 0) - (keys.has('arrowleft') || keys.has('a') ? 1 : 0);
  let vy = (keys.has('arrowdown') || keys.has('s') ? 1 : 0) - (keys.has('arrowup') || keys.has('w') ? 1 : 0);
  if (joy.active && !vx && !vy) { vx = joy.vector.x; vy = joy.vector.y; }
  if (pointer.id !== -1 && !pointer.steering && performance.now() - pointer.t > motion.holdToSteerMilliseconds) pointer.steering = true;
  const steer = pointer.id !== -1 && pointer.steering && world ? world.screenToWorld(pointer.x * dpr(), pointer.y * dpr()) : null;
  return { vx, vy, steer };
}

// ---------- Rendering ----------
let zoom = 4;
function resize() {
  const r = dpr();
  canvas.width = Math.round(window.innerWidth * r); canvas.height = Math.round(window.innerHeight * r);
  zoom = Math.max(2, Math.min(12, Math.round(Math.min(canvas.width, canvas.height) / 240)));
}
window.addEventListener('resize', resize); resize();

let last = performance.now(), saveClock = 0, miniClock = 0;
let scopePromptLatched = false, scopeStandTime = 0;
function autoBodyscope(dt: number): void {
  if (!world) return;
  const t = world.room.targets.find(t => t.id === 'device'), p = world.player;
  const inFront = world.roomId === 'newsroom' && t && Math.abs(p.x - t.x) <= 16 && p.y >= t.y - 3 && p.y <= t.y + t.r;
  if (!inFront) { scopePromptLatched = false; scopeStandTime = 0; return; }
  if (scopePromptLatched || busy() || canEnterHeart(game.state) || p.moving || p.facing !== 'up') { scopeStandTime = 0; return; }
  scopeStandTime += dt;
  if (scopeStandTime >= 0.15) { scopePromptLatched = true; scopeStandTime = 0; void interact(t); }
}
function frame(now: number) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (world) {
    world.update(dt, inputState(), !busy());
    world.render(ctx, canvas.width, canvas.height, world.fitZoom(zoom, canvas.width, canvas.height), dpr());
    const p = world.player;
    game.setPosition(world.roomId, p.x, p.y, p.facing);
    autoBodyscope(dt);
    hud.setSaveError(game.lastError);
    saveClock += dt; miniClock += dt;
    if (saveClock > 8) { saveClock = 0; if (game.needsSave) game.persist(); }
    if (miniClock > 0.12) { miniClock = 0; hud.drawMinimap(p.x, p.y, now / 1000); }
    if (world.heart) hud.drawCycle(world.real, dpr());
  } else { ctx.fillStyle = '#15111f'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
document.addEventListener('visibilitychange', () => { if (document.hidden) { pauseInput(); if (game.needsSave) game.persist(); } });
window.addEventListener('pagehide', () => { if (game.needsSave) game.persist(); });

// ---------- Game flow ----------
function refresh() {
  const s = game.state;
  hud.update(s);
  if (!world) return;
  world.player.look = s.avatar.look; world.player.name = s.avatar.name; world.timeMode = s.settings.time;
  hud.setObjective(objective(s, world.roomId));
  const has = (f: string) => s.flags.includes(f);
  const needEditor = !has('met-editor') || (s.cafe.welcomeUsed && !has('reported-back')) || q1CanOffer(s) || (has(Q1.observed) && !has(Q1.briefed));
  world.questNpc = world.roomId === 'newsroom' && needEditor ? 'editor' : null;
  world.questTargets = [];
  if (world.roomId === 'newsroom' && has(Q1.accepted) && !has(Q1.observed)) world.questTargets = ['device'];
  world.sparkTargets = [];
  if (isHeartRoom(world.roomId)) {
    const here = world.roomId;
    world.questTargets = has(Q1.accepted) && !has(Q1.observed) ? Q1_OBSERVATIONS.filter(id => Q1_ROOM[id] === here && !s.inspected.includes(obsKey(id))) : has(Q1.observed) && !has(Q1.briefed) ? ['return-pad'] : [];
    const found = discovered(s);
    world.sparkTargets = world.room.targets.filter(t => t.id.startsWith('hx-') && !found.includes(t.id)).map(t => t.id);
  }
}
game.subscribe(refresh);

/** Short place name shown on the minimap. */
function mapCaption(room: RoomId): string { const t = rooms[room].title; return room === 'street' ? t.split(' · ')[0]! : t.split(' · ').pop()!.replace(/ \(.*\)/, ''); }

function startWorld() {
  const s = game.state;
  world = new World(s.at.room, s.at.x, s.at.y, s.at.facing, s.avatar.look, s.avatar.name);
  world.onDoor = d => travel({ to: d.to, arrive: d.arrive, facing: d.facing, mode: isHeartRoom(d.to) || isHeartRoom(world!.roomId) ? 'flow' : 'walk', card: d.card ?? null });
  world.onValveWait = (v, sec) => hud.toast(sec < 0 ? '판막은 거꾸로 열리지 않아요. 피는 한 방향으로만 흘러요.' : (heartText.valves as Record<string, { wait: string }>)[v.kind]!.wait + ' · 약 ' + Math.max(1, Math.ceil(sec)) + '초');
  world.onBeat = snd => { if (world && world.roomId !== 'lung') world.showBeat(heartText.sounds[snd]); };
  world.onSignalWait = (_c, sec) => hud.toast(sec > 0 ? '빨간불이에요. 초록불이 켜지면 건너요 · 약 ' + Math.ceil(sec) + '초' : '보행 신호가 곧 바뀌어요. 다음 초록불을 기다려요.');
  world.onTarget = t => interact(t);
  world.touchHint = touchUI;
  hud.setVisible(true);
  hud.setRoom(s.at.room, () => world!.miniMap(), mapCaption(s.at.room));
  refresh();
  hud.showBanner(rooms[s.at.room].title);
  canvas.focus({ preventScroll: true });
  if (game.lastError) hud.toast(game.lastError, true);
}

/** walk: ordinary doors · scope-in/out: the Bodyscope · flow: following the blood between heart rooms. */
type Trip = { to: RoomId; arrive: Point; facing: Dir; mode: 'walk' | 'scope-in' | 'scope-out' | 'flow'; card?: string | null };
let traveling = false;
function travel(d: Trip) {
  if (!world) return;
  const w = world;
  traveling = true;
  w.locked = true; keys.clear(); pointer.id = -1;
  fade.classList.add('on');
  if (d.mode === 'flow') fade.classList.add('flow'); else if (d.mode !== 'walk') fade.classList.add('scope');
  fadeCard.textContent = d.card ?? '';
  fadeCard.classList.toggle('show', !!d.card);
  const wait = d.mode === 'walk' ? 210 : d.card ? 1700 : d.mode === 'flow' ? 600 : 560;
  window.setTimeout(() => {
    try { if (d.mode === 'scope-in') game.enterHeart(); else game.enter(d.to, d.arrive.x, d.arrive.y, d.facing); }
    catch (e) { hud.toast(e instanceof Error ? e.message : '이동하지 못했어요.', true); }
    w.setRoom(game.state.at.room, game.state.at.x, game.state.at.y, game.state.at.facing);
    hud.setRoom(w.roomId, () => w.miniMap(), mapCaption(w.roomId));
    refresh();
    fade.classList.remove('on', 'scope', 'flow'); fadeCard.classList.remove('show');
    hud.showBanner(rooms[w.roomId].title);
    if (d.mode === 'scope-in') hud.toast(heartText.disclaimer);
    if (!game.persist()) hud.toast('저장하지 못했어요: ' + game.lastError, true);
    window.setTimeout(() => {
      w.locked = false; traveling = false;
      // First time inside the heart: the guide robot explains valves and the cycle panel once.
      if (d.mode === 'scope-in' && !game.has('heart-guided')) {
        const guide = w.room.targets.find(t => t.id === 'guide');
        game.flag('heart-guided');
        if (guide) window.setTimeout(() => { if (!busy()) void interact(guide); }, 500);
      }
    }, 120);
  }, wait);
}

async function say(lines: Line[]) { if (lines.length) await dialog.show(lines); }

async function interact(t: Target) {
  if (!world || world.locked || dialog.open) return;
  const w = world;
  if (t.id === 'device') scopePromptLatched = true;
  w.stop(); w.locked = true; keys.clear(); pointer.id = -1;
  w.faceToward(t);
  try {
    if (t.npc) {
      const script = talk(t.npc, game.state);
      await say(script.lines);
      if (script.flag) game.flag(script.flag);
      if (script.action === 'offer-q1') await offerQ1();
      if (script.action === 'brief-q1') { game.brief(); hud.toast('편집장 확인 완료 · 다음 단계는 곧 열려요'); }
      if (t.npc === 'barista') await cafeOrder();
    } else if (t.id === 'device' && !canEnterHeart(game.state)) {
      const go = await dialog.show([{ who: '바디스코프', text: q1Text.deviceReady, npc: null }],
        [{ id: 'enter', label: q1Text.deviceChoices.enter, sub: q1Text.deviceChoices.enterSub, disabled: false }]);
      game.inspect(t.id);
      if (go === 'enter') travel({ to: 'heart', arrive: rooms.heart.spawn, facing: rooms.heart.spawnFacing, mode: 'scope-in', card: heartText.entryCard });
    } else if (t.id === 'heart-out' || t.id === 'heart-in') {
      const obs = q1Text.observations[t.id];
      await say([{ who: t.label, text: obs.text, npc: null }]);
      const r = game.observe(t.id);
      if (r.first) hud.toast('수첩에 적음 · ' + obs.note);
      if (r.done) window.setTimeout(() => hud.toast('관찰 2개 완료! +20XP · 귀환 장치로 돌아가거나 계속 탐험해요'), 1600);
    } else if (t.id.startsWith('hx-') && discoveries[t.id]) {
      const d = discoveries[t.id]!;
      await say([{ who: d.name, text: d.text, npc: null }]);
      if (game.discover(t.id)) hud.toast('탐험 기록 · ' + d.name + ' (' + discovered(game.state).length + '/' + discoveryIds.length + ')');
    } else if (t.id === 'guide') {
      await say(talk('guide', game.state).lines);
    } else if (t.id === 'return-pad') {
      const go = await dialog.show([{ who: '귀환 장치', text: q1Text.returnPad, npc: null }],
        [{ id: 'go', label: q1Text.returnChoices.go, sub: q1Text.returnChoices.goSub, disabled: false }, { id: 'stay', label: q1Text.returnChoices.stay, sub: q1Text.returnChoices.staySub, disabled: false }]);
      if (go === 'go') travel({ to: 'newsroom', arrive: { x: 308, y: 152 }, facing: 'down', mode: 'scope-out' });
    } else {
      const text = lookText[t.id] ?? '';
      await say([{ who: t.label, text, npc: null }]);
      if (t.id === 'window-seat') { game.rest(); hud.toast('잠시 쉬었어요. (생활 행동: 경험치 없음)'); }
      game.inspect(t.id);
    }
  } catch (e) { hud.toast(e instanceof Error ? e.message : '문제가 생겼어요.', true); }
  finally { w.locked = traveling; refresh(); }
}

async function offerQ1() {
  const lines: Line[] = q1Text.offer.map(l => ({ who: l.who, text: l.text, npc: l.who === '편집장' ? 'editor' : null }));
  const c = q1Text.offerChoices;
  const pick = await dialog.show(lines, [{ id: 'accept', label: c.accept, sub: c.acceptSub, disabled: false }, { id: 'later', label: c.later, sub: c.laterSub, disabled: false }]);
  if (pick === 'accept') {
    game.acceptQuest();
    await say([{ who: '편집장', text: q1Text.accepted, npc: 'editor' }]);
    hud.toast('새 취재 · ' + q1Text.title);
  } else await say([{ who: '편집장', text: q1Text.later, npc: 'editor' }]);
}

async function cafeOrder() {
  const s = game.state;
  const choice = await dialog.show([{ who: '바리스타', text: '주문하시겠어요? (보유 ' + s.gold + 'G)', npc: 'barista' }],
    cafeMenu.map(item => { const why = canOrder(s, item); return { id: item.id, label: item.title, sub: why ?? (item.price ? item.price + 'G' : '무료'), disabled: why !== null }; }));
  if (!choice) return;
  const item = cafeMenu.find(i => i.id === choice)!;
  try {
    game.order(choice);
    await say([{ who: '바리스타', text: item.title + ' 나왔습니다! 따뜻할 때 드세요.', npc: 'barista' }]);
    hud.toast(item.title + ' 받음 · ' + (item.price ? item.price + 'G 사용' : '무료'));
  } catch (e) { await say([{ who: '바리스타', text: e instanceof Error ? e.message : '주문을 처리하지 못했어요.', npc: 'barista' }]); }
}

// ---------- Sheets ----------
function saveFeedback(c: HTMLElement): () => void {
  const message = el('p', 'save-message'); message.setAttribute('role', 'status'); c.append(message);
  const update = () => { message.textContent = game.lastError ?? ''; message.classList.toggle('hidden', !game.lastError); };
  update(); return game.subscribe(update);
}
function openNotebook() {
  if (busy() || !world) return;
  pauseInput();
  const s = game.state;
  openSheet('취재 수첩', c => {
    const goal = el('div'); goal.append(el('h3', '', '지금 할 일'), el('p', '', objective(s, world!.roomId))); c.append(goal);
    const notes = el('div'); notes.append(el('h3', '', '관찰 기록'));
    const ids = s.inspected.filter(id => inspectLabels[id]);
    if (ids.length) { const ul = el('ul', 'notes'); for (const id of ids) ul.append(el('li', '', inspectLabels[id]!)); notes.append(ul); }
    else notes.append(el('p', 'muted', '아직 기록이 없어요. 반짝이는 표식이나 사람에게 다가가 살펴보세요.'));
    c.append(notes);
    if (s.flags.includes(Q1.accepted)) {
      const q = el('div'); q.append(el('h3', '', '첫 취재 · ' + q1Text.title));
      q.append(el('p', '', q1Text.offer[1]!.text));
      const seen = q1Seen(s);
      const ul = el('ul', 'notes');
      for (const id of Q1_OBSERVATIONS) ul.append(el('li', seen.includes(id) ? '' : 'muted', seen.includes(id) ? q1Text.observations[id].note : '아직 관찰하지 않음'));
      q.append(ul, el('p', 'muted', q1Text.disclaimer + '. 기사 쓰기는 다음 업데이트에서 열려요.'));
      c.append(q);
    }
    if (s.flags.includes(Q1.entered)) {
      const h = el('div'); h.append(el('h3', '', '심장 탐험 기록 ' + discovered(s).length + '/' + discoveryIds.length));
      const found = discovered(s);
      for (const room of heartRoute) {
        const pr = roomProgress(s, room);
        const ul = el('ul', 'notes');
        for (const id of discoveryIds.filter(i => discoveries[i]!.room === room)) ul.append(el('li', found.includes(id) ? '' : 'muted', found.includes(id) ? discoveries[id]!.name : '??? (아직 찾지 못함)'));
        h.append(el('p', '', rooms[room].title + ' · ' + pr.found + '/' + pr.total), ul);
      }
      h.append(el('p', 'muted', heartText.disclaimer));
      c.append(h);
    }
    const life = el('div'); life.append(el('h3', '', '생활'), el('p', '', '비투비씨 주문 ' + s.cafe.orderCount + '회 · 첫 방문 커피 ' + (s.cafe.welcomeUsed ? '받음' : '아직'))); c.append(life);
    c.append(el('p', 'muted', '기사 작성·의학 도감은 첫 기사를 쓴 뒤 이 수첩에서 이어집니다.'));
  });
}

function openReporter() {
  if (busy() || !world) return;
  pauseInput();
  const s = game.state;
  openSheet('기자 정보', (c, close) => {
    const st = el('div', 'stats');
    const stat = (v: string, l: string) => { const d = el('div', 'stat'); d.append(el('b', '', v), el('span', '', l)); return d; };
    const lv = levelOf(s.totalXp);
    st.append(stat('Lv.' + lv.level, '수습기자'), stat(lv.into + '/' + lv.need, '경험치'), stat(s.gold + 'G', '골드'));
    c.append(st);
    const info = el('div'); info.append(el('h3', '', s.avatar.name), el('p', '', presetNames[s.avatar.preset] + ' · ' + outfits[s.avatar.look.outfit])); c.append(info);
    const list = el('div', 'list');
    list.append(button('row', '외형 꾸미기', () => { close(); editLook(); }));
    c.append(list);
  });
}

function editLook() {
  pauseInput();
  const s = game.state;
  hud.setVisible(false);
  openCreator({ mode: 'edit', name: s.avatar.name, preset: s.avatar.preset, look: s.avatar.look, owned: s.owned,
    onDone: (name, preset, look) => { try { game.begin(name, preset, look); hud.toast(game.lastError ? '외형은 반영했지만 저장하지 못했어요. 기록을 파일로 내보내 주세요.' : '외형을 저장했어요.', !!game.lastError); } catch (e) { hud.toast(e instanceof Error ? e.message : '저장 실패', true); } hud.setVisible(true); hud.focusReporter(); },
    onCancel: () => { hud.setVisible(true); hud.focusReporter(); } });
}

function openMap() {
  if (busy() || !world) return;
  if (isHeartRoom(world.roomId)) { pauseInput(); openAtlas({ room: world.room, roomId: world.roomId, player: { x: world.player.x, y: world.player.y }, state: game.state }, 'room'); return; }
  if (world.roomId !== 'street') return;
  pauseInput();
  openSheet('동네 지도 · 논현로 일대', c => {
    const cv = el('canvas'); const base = world!.minimapBase();
    cv.width = base.width * 4; cv.height = base.height * 4; cv.style.width = '100%'; cv.style.imageRendering = 'pixelated'; cv.style.borderRadius = '12px';
    const g = cv.getContext('2d')!; g.imageSmoothingEnabled = false; g.drawImage(base, 0, 0, cv.width, cv.height);
    const lab = (t: string, x: number, y: number) => { g.font = '700 22px system-ui, sans-serif'; g.textAlign = 'center'; g.lineWidth = 5; g.strokeStyle = 'rgba(20,16,30,0.9)'; g.strokeText(t, x, y); g.fillStyle = '#fff6dc'; g.fillText(t, x, y); };
    const S = 0.5;
    lab('유로프라자', 256 * S, 200 * S); lab('비투비씨', 88 * S, 372 * S); lab('쉼터', 224 * S, 336 * S); lab('을지병원 사거리', 432 * S, 520 * S); lab('압구정역 ↑', 400 * S, 40 * S); lab('호텔', 592 * S, 96 * S); lab('병원', 584 * S, 360 * S);
    const p = world!.player; g.fillStyle = '#ff5a6e'; g.beginPath(); g.arc(p.x * S, p.y * S, 9, 0, Math.PI * 2); g.fill(); g.lineWidth = 3; g.strokeStyle = '#ffffff'; g.stroke();
    c.append(cv, el('p', 'muted', '게임 지도는 실제 거리를 줄이고 단순화했어요. 큰길은 횡단보도로만 건널 수 있어요.'));
  });
}

function openMenu() {
  if (busy() || !world) return;
  pauseInput();
  let stopFeedback = () => {};
  openSheet('메뉴', (c, close) => {
    stopFeedback = saveFeedback(c);
    const saveSec = el('div'); saveSec.append(el('h3', '', '기록·저장'));
    const list = el('div', 'list');
    list.append(button('row', '지금 저장하기', () => { hud.toast(game.persist() ? '저장했어요.' : '저장 실패: ' + game.lastError, !game.lastError ? false : true); }));
    list.append(button('row', '기록 파일로 내보내기', () => exportSave()));
    list.append(button('row', '기록 파일 불러오기', () => importSave(close)));
    list.append(button('row', '최근 백업에서 복구', () => { close(); openBackups(); }));
    saveSec.append(list); c.append(saveSec);
    const view = el('div'); view.append(el('h3', '', '화면 · 시간대'));
    const seg = el('div', 'seg');
    for (const [id, label] of Object.entries(timeModes) as [TimeMode, string][]) {
      const b = button('', label, () => { game.setTime(id); seg.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); });
      b.setAttribute('aria-pressed', String(game.state.settings.time === id)); seg.append(b);
    }
    view.append(seg); c.append(view);
    const help = el('div'); help.append(el('h3', '', '조작 안내'));
    help.append(el('p', '', 'PC: 방향키/WASD 이동 · E/Space 대화·살펴보기 · J 수첩 · M 지도 · Esc 메뉴'));
    help.append(el('p', '', '마우스·터치: 화면을 누르면 그곳으로 걷고, 사람이나 물건을 누르면 다가가서 말을 걸어요. 꾹 누른 채 움직이면 손가락 쪽으로 계속 걸어요. 대화창·창은 아무 곳이나 누르면 넘어가거나 닫혀요.'));
    help.append(el('p', '', '큰길 횡단보도는 보행 신호가 초록불일 때만 건널 수 있어요. 깜빡이기 시작하면 새로 건너지 않아요.'));
    help.append(el('p', '', '휴대폰·태블릿: 왼쪽 아래 조작볼을 엄지로 밀면 그 방향으로 걸어요. 사람·물건은 화면에서 눌러요.'));
    help.append(el('p', '', '심장 속: 판막은 열려 있을 때, 피가 흐르는 방향으로만 지나갈 수 있어요. 오른쪽 위 작은 지도나 심장 주기 창을 누르면 이 방·심장·인체 지도가 열려요.'));
    c.append(help);
    const reset = el('div', 'list'); reset.append(button('row danger', '처음부터 다시 시작', () => { if (confirm('지금 기록을 백업하고 새 기자로 시작할까요? 파일로 내보내 두는 것도 권해요.')) { try { game.restart(); close(); location.reload(); } catch (e) { hud.toast('새로 시작하지 못했어요: ' + (e instanceof Error ? e.message : '저장 오류'), true); } } }));
    c.append(reset);
    const docs = el('a', 'row', '설계실(기획 문서) 열기'); docs.href = './design/'; docs.target = '_blank'; docs.rel = 'noopener'; c.append(docs);
    c.append(el('p', 'muted', 'Medical Quest · redesign-1 · 기획·개발 진우주'));
  }, () => stopFeedback());
}

function openBackups() {
  let stopFeedback = () => {};
  openSheet('백업에서 복구', (c, close) => {
    stopFeedback = saveFeedback(c);
    const backups = game.backups();
    if (!backups.length) { c.append(el('p', 'muted', '아직 백업이 없어요. 플레이하면서 자동으로 최근 기록 2개가 보관돼요.')); return; }
    const list = el('div', 'list');
    for (const b of backups) {
      const row = button('row', b.avatar.name + ' · ' + rooms[b.at.room].title, () => { if (confirm('이 백업으로 되돌릴까요?')) { try { game.importState(b); close(); location.reload(); } catch (e) { hud.toast('복구하지 못했어요: ' + (e instanceof Error ? e.message : '저장 오류'), true); } } });
      row.append(el('span', 'sub', new Date(b.updatedAt).toLocaleString('ko-KR')));
      list.append(row);
    }
    c.append(list);
  }, () => stopFeedback());
}

function exportSave() {
  game.persist();
  const blob = new Blob([JSON.stringify(game.state, null, 2)], { type: 'application/json' });
  const a = el('a'); a.href = URL.createObjectURL(blob); a.download = 'medical-quest-' + game.state.avatar.name + '-' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  hud.toast('기록 파일을 내보냈어요.');
}

function importSave(close: () => void) {
  const input = el('input'); input.type = 'file'; input.accept = 'application/json,.json';
  input.addEventListener('change', async () => {
    const f = input.files?.[0]; if (!f) return;
    try {
      if (f.size > 10 * 1024 * 1024) throw new Error('기록 파일은 10MB 이하만 불러올 수 있어요.');
      const raw = JSON.parse(await f.text());
      if (!confirm('불러온 기록으로 바꿀까요? 지금 기록은 자동 백업에 남아요.')) return;
      game.importState(raw); close(); location.reload();
    } catch (e) { hud.toast('불러오지 못했어요: ' + (e instanceof Error ? e.message : '형식 오류'), true); }
  });
  input.click();
}

if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__mq = { game, get world() { return world; } };

// ---------- Boot ----------
if (game.state.started) startWorld();
else {
  const s = game.state;
  openCreator({ mode: 'new', name: '', preset: s.avatar.preset, look: s.avatar.look, owned: s.owned,
    onDone: (name, preset, look) => { game.begin(name, preset, look); startWorld(); },
    onCancel: () => {} });
}
void closeSheet;
