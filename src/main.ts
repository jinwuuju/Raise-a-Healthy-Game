import './ui/style.css';
import motion from '../data/balance/movement.v0.2.json';
import { Game } from './application/game';
import { heartText, lookText, objective, q1Text, talk, type Line } from './application/story';
import { discovered, discoveries, discoveryIds } from './domain/heart';
import { outfits, presetNames, type Look } from './domain/appearance';
import { cafeMenu, canOrder } from './domain/cafe';
import { canBuyItem, canBuyOutfit, jinuItems, tailorItems } from './domain/shop';
import { Q1, Q1_OBSERVATIONS, Q1_ROOM, canEnterHeart, levelOf, obsKey, q1CanOffer } from './domain/quest';
import { lunchHudText } from './domain/lunch';
import { SaveStore } from './infrastructure/save';
import { World } from './game/world';
import { Dialog } from './ui/dialog';
import { button, el } from './ui/dom';
import { Hud } from './ui/hud';
import { openCreator } from './ui/creator';
import { showOpening } from './ui/opening';
import { Joystick } from './ui/joystick';
import { ConfirmControl } from './ui/confirm';
import { openAtlas } from './ui/atlas';
import { openArticle } from './ui/article';
import { openQ2Article } from './ui/q002-article';
import { canOfferQ2, q2Key, q2Seen } from './domain/q002';
import { q2Text } from './domain/q002-state';
import { canOfferQ3, q3NormalDone, q3CompareDone } from './domain/q003';
import { q3Text } from './domain/q003-state';
import { openQ3 } from './ui/q003';
import { openValveComparison } from './ui/valve-comparison';
import { canOfferQ4,q4Ready } from './domain/q004';
import { q4Text,type Q4Evidence } from './domain/q004-state';
import { openQ4 } from './ui/q004';
import { canOfferQ5, q5CompareDone, q5NormalDone } from './domain/q005';
import { q5Normal, q5Text, type SignalCard } from './domain/q005-state';
import { openQ5 } from './ui/q005';
import { openRhythmComparison } from './ui/rhythm-comparison';
import { canOfferQ6, q6CompareDone, q6NormalDone } from './domain/q006';
import { q6Normal, q6Text, type SupplyCard } from './domain/q006-state';
import { openQ6 } from './ui/q006';
import { openSupplyComparison } from './ui/supply-comparison';
import { openReaction } from './ui/reaction';
import { showOrganEntry } from './ui/organ-entry';
import { openNotebook as showNotebook } from './ui/notebook';
import { latestReaction } from './domain/reaction-state';
import { closeSheet, openSheet, sheetOpen } from './ui/sheet';
import { rooms, type Target } from './world/rooms';
import { anchors, crossroads, districtLoaded, dlabels, dstations, loadDistrict, specialBlock } from './world/district';
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

// The real-scale district map is its own chunk (D098). It loads in the background; boot waits for it only when the
// saved position is outside (the save names the district, or the old street that migrates to it).
// D100: every page load shows the title screen while the game gets ready. Only a brand-new reporter starts in front of the
// editor (the newsroom spawn); an existing reporter always continues from the saved place (D101). Browser tests
// (DEV + webdriver) skip the title screen unless the URL asks for ?opening.
const forceOpening = new URLSearchParams(location.search).has('opening');
const skipOpening = import.meta.env.DEV && navigator.webdriver && !forceOpening;
const opening = showOpening(skipOpening);
opening.progress(0.25, '동네 지도를 펼치는 중…');
const districtReady = loadDistrict();
void districtReady.catch(() => undefined); // retried by travel() if the background load failed
let savedOutside = true;
try { savedOutside = /"room":"(district|street)"/.test(localStorage.getItem('medical-quest.v4.current') ?? ''); } catch { /* unreadable storage: wait for the map to be safe */ }
if (savedOutside) {
  // A reporter saved outside cannot be placed without the map: retry once, then say so instead of a frozen loading bar.
  try { await districtReady; }
  catch {
    try { await loadDistrict(); }
    catch (e) { opening.progress(0.25, '동네 지도를 불러오지 못했어요. 연결을 확인하고 새로고침해 주세요.'); throw e; }
  }
}
opening.progress(0.55, '취재 수첩을 펼치는 중…');
const game = new Game(await storage());
opening.setLook(game.state.avatar.look);
opening.progress(0.85, '편집국 불을 켜는 중…');
const canvas = el('canvas'); canvas.id = 'view'; canvas.tabIndex = 0; canvas.setAttribute('aria-label', '게임 화면');
document.querySelector('#app')!.append(canvas);
const ctx = canvas.getContext('2d', { alpha: false })!;
const fade = el('div', 'fade'); const fadeCard = el('div', 'card'); fade.append(fadeCard); document.body.append(fade);

let world: World | null = null;
const npcLooks: Record<string, Look> = {};
// The district (loaded later) only has anonymous walkers; reading it here would need its map chunk.
for (const id of Object.keys(rooms) as RoomId[]) if (id !== 'district') for (const n of rooms[id].npcs) npcLooks[n.id] = n.look;
const confirmControl = new ConfirmControl(() => confirmAction());
const dialog = new Dialog(id => (id ? npcLooks[id] ?? null : null), () => confirmControl.visible ? [confirmControl.root] : []);

const hud = new Hud({
  onChip: () => openReporter(),
  onNote: () => openNotebook(),
  onMenu: () => openMenu(),
  onMap: () => openMap(),
  onLunch: () => openLunchSheet(),
});
hud.setVisible(false);
// Touch screens get a movement ball at the bottom left (D058); PC keeps keyboard/mouse only.
const touchMode = 'ontouchstart' in window;
const joy = new Joystick(hud.root);
let touchUI = false;
function enableTouchUI(): void { if (touchUI) return; touchUI = true; document.body.classList.add('touch-controls'); joy.setVisible(true); hud.setTouch(true); if (world) world.touchHint = true; }
if (window.matchMedia?.('(pointer: coarse)').matches) enableTouchUI();
window.addEventListener('touchstart', () => enableTouchUI(), { passive: true, capture: true });

// ---------- Input ----------
const keys = new Set<string>();
const pointer = { id: -1, sx: 0, sy: 0, x: 0, y: 0, t: 0, steering: false };
const dpr = () => Math.min(3, window.devicePixelRatio || 1);
const busy = () => dialog.open || sheetOpen() || !world || world.locked || document.querySelector('.creator') !== null;
function pauseInput(): void { keys.clear(); pointer.id = -1; pointer.steering = false; joy.reset(); world?.stop(); }
function confirmAction(): void {
  if (dialog.open) { pauseInput(); dialog.advance(); return; }
  if (busy() || !world?.near) return;
  pauseInput(); void interact(world.near);
}

window.addEventListener('keydown', e => {
  if (document.querySelector('.creator, .opening')) return;
  const k = e.key.toLowerCase();
  if (dialog.open) {
    if (['e', ' ', 'enter'].includes(k) && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); dialog.advance(); }
    if (k === 'escape') { e.preventDefault(); dialog.close(null); }
    return;
  }
  if (sheetOpen()) return;
  if (world?.locked) return;
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(k)) { keys.add(k); e.preventDefault(); }
  else if ((k === 'e' || k === ' ' || k === 'enter') && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); if (world?.near && !busy()) interact(world.near); }
  else if (k === 'escape') { e.preventDefault(); openMenu(); }
  else if (k === 'j' || k === 'n') openNotebook();
  else if (k === '+' || k === '=') { e.preventDefault(); setZoomStep(zoomStep + 1); }
  else if (k === '-' || k === '_') { e.preventDefault(); setZoomStep(zoomStep - 1); }
  else if (k === 'm' && world && (world.roomId === 'district' || isHeartRoom(world.roomId))) openMap();
});
window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', pauseInput);

// Any tap while a dialog is open advances it (and closes it after the last line), wherever it lands.
let swallowClickUntil = 0, lastAdvance = 0;
const onChoice = (e: Event) => !!(e.target as Element | null)?.closest?.('.dialog .choices button');
const onConfirm = (e: Event) => !!(e.target as Element | null)?.closest?.('.mobile-confirm');
document.addEventListener('pointerdown', e => {
  if (!dialog.open || onChoice(e) || onConfirm(e)) return;
  e.preventDefault(); e.stopPropagation();
  swallowClickUntil = performance.now() + 500;
  lastAdvance = performance.now();
  dialog.tapAnywhere();
}, true);
// Some mobile browsers drop pointer events for touches; advance on the touch itself as well (once per tap).
if (touchMode) document.addEventListener('touchstart', e => {
  if (!dialog.open || onChoice(e) || onConfirm(e)) return;
  e.stopPropagation();
  const now = performance.now();
  swallowClickUntil = now + 500;
  if (now - lastAdvance < 350) return;
  lastAdvance = now;
  dialog.tapAnywhere();
}, { capture: true, passive: true });
document.addEventListener('click', e => {
  if (performance.now() < swallowClickUntil && !onChoice(e) && !onConfirm(e)) { e.preventDefault(); e.stopPropagation(); }
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
// Two fingers on the world: pinch to zoom (D103). The first finger's tap or steering is cancelled so nothing walks.
let pinch: { dist: number; step: number } | null = null;
const spread = (list: TouchList) => Math.hypot(list[0]!.clientX - list[1]!.clientX, list[0]!.clientY - list[1]!.clientY);
canvas.addEventListener('touchstart', e => {
  if (e.targetTouches.length < 2 || dialog.open || sheetOpen()) return;
  e.preventDefault();
  pointer.id = -1; pointer.steering = false; world?.stop();
  pinch = { dist: Math.max(1, spread(e.targetTouches)), step: zoomStep };
}, { passive: false });
canvas.addEventListener('touchmove', e => {
  if (!pinch || e.targetTouches.length < 2) return;
  e.preventDefault();
  setZoomStep(pinch.step + Math.round(Math.log(spread(e.targetTouches) / pinch.dist) / Math.log(1.3)));
}, { passive: false });
const endPinch = (e: TouchEvent) => { if (pinch && e.targetTouches.length < 2) pinch = null; };
canvas.addEventListener('touchend', endPinch);
canvas.addEventListener('touchcancel', endPinch);
// iOS Safari ignores user-scalable=no: keep its page zoom gesture from fighting the game zoom.
for (const type of ['gesturestart', 'gesturechange']) document.addEventListener(type, e => e.preventDefault(), { passive: false });
let wheelSum = 0;
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  if (busy()) return;
  wheelSum += e.deltaY * (e.deltaMode === 1 ? 30 : 1);
  const need = e.ctrlKey ? 24 : 80; // trackpad pinch arrives as ctrl+wheel with small deltas
  if (Math.abs(wheelSum) >= need) { setZoomStep(zoomStep + (wheelSum < 0 ? 1 : -1)); wheelSum = 0; }
}, { passive: false });
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
// D103 (user): the view can be zoomed in and out (two-finger pinch on touch screens, wheel or +/- on PC). The step is kept
// per device (not in the save) and applied on top of the size-based zoom, in whole steps so pixels stay crisp.
const ZOOM_KEY = 'medical-quest.view.zoom', ZOOM_STEPS = 4;
let zoom = 4, baseZoom = 4;
let zoomStep = (() => { try { const v = Number(localStorage.getItem(ZOOM_KEY) ?? 0); return Number.isInteger(v) && Math.abs(v) <= ZOOM_STEPS ? v : 0; } catch { return 0; } })();
const applyZoom = () => { zoom = Math.max(2, Math.min(14, baseZoom + zoomStep)); };
function setZoomStep(next: number): void {
  const step = Math.max(-ZOOM_STEPS, Math.min(ZOOM_STEPS, Math.round(next)));
  if (step === zoomStep) return;
  zoomStep = step; applyZoom();
  try { localStorage.setItem(ZOOM_KEY, String(step)); } catch { /* the zoom still works for this visit */ }
}
function resize() {
  const r = dpr();
  canvas.width = Math.round(window.innerWidth * r); canvas.height = Math.round(window.innerHeight * r);
  baseZoom = Math.max(2, Math.min(12, Math.round(Math.min(canvas.width, canvas.height) / 240)));
  applyZoom();
}
window.addEventListener('resize', resize); resize();

let last = performance.now(), saveClock = 0, miniClock = 0, lunchClock = 0;
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
    lunchClock += dt;
    // 서울 시계로 점심 마감·자정을 따라간다(자동 굶음 정리는 application, HUD는 읽기만).
    if (lunchClock > 2) { lunchClock = 0; if (!game.settleLunch()) hud.setLunch(lunchHudText(game.state, Date.now())); }
    if (world.heart) hud.drawCycle(world.real, dpr());
  } else { ctx.fillStyle = '#15111f'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  const showConfirm = touchUI && !!world && !sheetOpen() && !document.querySelector('.creator') && (!world.locked || dialog.open) && !dialog.awaitingChoice;
  confirmControl.setState(showConfirm, dialog.open || (!busy() && !!world?.near), dialog.open ? '대화 다음 줄' : world?.near ? world.near.label + ' · 대화/살펴보기' : '가까운 사람이나 구조 앞에서 확인');
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
document.addEventListener('visibilitychange', () => { if (document.hidden) { pauseInput(); if (game.needsSave) game.persist(); } });
window.addEventListener('pagehide', () => { if (game.needsSave) game.persist(); });

// ---------- Game flow ----------
function refresh() {
  const s = game.state;
  hud.update(s);
  hud.setLunch(world ? lunchHudText(s, Date.now()) : null);
  if (!world) return;
  world.player.look = s.avatar.look; world.player.name = s.avatar.name;
  const layer = world.roomId === 'aorta' && s.q006.mode !== 'rest' ? q6Text.comparison[s.q006.mode].label : world.roomId !== 'heart' ? '' : s.q003.mode !== 'normal' ? q3Text.comparison[s.q003.mode].label : s.q005.mode !== 'normal' ? q5Text.comparison[s.q005.mode].label : '';
  hud.setObjective((layer ? '검수 전 모형 · ' + layer + ' 비교 · ' : '') + objective(s, world.roomId));
  if (world.heart) { world.heart.comparison = world.roomId === 'heart' ? s.q003.mode : 'normal'; world.heart.rhythm = world.roomId === 'heart' ? s.q005.mode : 'normal'; world.heart.supply = world.roomId === 'aorta' ? s.q006.mode : 'rest'; }
  const has = (f: string) => s.flags.includes(f);
  const needEditor = !has('met-editor') || (s.cafe.welcomeUsed && !has('reported-back')) || q1CanOffer(s) || (has(Q1.observed) && !has(Q1.briefed)) || canOfferQ2(s) || canOfferQ3(s) || canOfferQ4(s) || canOfferQ5(s) || canOfferQ6(s) || (s.q002.accepted && !s.q002.reported && q2Seen(s).length === 4);
  world.questNpc = world.roomId === 'newsroom' && needEditor ? 'editor' : null;
  world.questTargets = [];
  if (world.roomId === 'newsroom' && has(Q1.accepted) && !has(Q1.observed)) world.questTargets = ['device'];
  if (world.roomId === 'newsroom' && has(Q1.briefed) && !s.article.publishedAt) world.questTargets = ['my-desk'];
  if (world.roomId === 'newsroom' && s.q002.reported && !s.q002.publishedAt) world.questTargets = ['my-desk'];
  if (world.roomId === 'newsroom' && s.q003.accepted && !s.q003.publishedAt) world.questTargets = q3CompareDone(s) ? ['my-desk'] : ['device'];
  if (world.roomId === 'newsroom' && s.q004.accepted && !s.q004.publishedAt) world.questTargets = q4Ready(s) ? ['my-desk'] : ['device'];
  if (world.roomId === 'newsroom' && s.q005.accepted && !s.q005.publishedAt) world.questTargets = q5CompareDone(s) ? ['my-desk'] : ['device'];
  if (world.roomId === 'newsroom' && s.q006.accepted && !s.q006.publishedAt) world.questTargets = q6CompareDone(s) ? ['my-desk'] : ['device'];
  world.sparkTargets = [];
  if (isHeartRoom(world.roomId)) {
    const here = world.roomId;
    world.questTargets = has(Q1.accepted) && !has(Q1.observed) ? Q1_OBSERVATIONS.filter(id => Q1_ROOM[id] === here && !s.inspected.includes(obsKey(id))) : has(Q1.observed) && !has(Q1.briefed) ? ['return-pad'] : [];
    if (s.q002.accepted && !s.q002.reported) world.questTargets = q2Seen(s).length === 4 ? ['return-pad'] : q2Text.notes.filter(n => n.room === here && !s.inspected.includes(q2Key(n.id))).map(n => n.target);
    if (s.q003.accepted && !s.q003.publishedAt) world.questTargets = !q3NormalDone(s) ? q3Text.normal.filter(n => n.room === here && !s.q003.notes.includes(n.id as 'tricuspid' | 'pulmonary')).map(n => n.target) : !q3CompareDone(s) && here === 'heart' ? ['hx-tricuspid'] : ['return-pad'];
    if(s.q004.accepted&&!s.q004.publishedAt)world.questTargets=q4Ready(s)?['return-pad']:q4Text.notes.filter(n=>n.room===here&&!s.q004.notes.includes(n.id as Q4Evidence)&&(n.id!=='systemic-return'||s.q004.crossedBody)).map(n=>n.target);
    if (s.q005.accepted && !s.q005.publishedAt) world.questTargets = !q5NormalDone(s) ? q5Text.notes.filter(n => n.room === here && !s.q005.notes.includes(n.id as SignalCard)).map(n => n.target) : !q5CompareDone(s) && here === 'heart' ? ['hx-sa'] : ['return-pad'];
    if (s.q006.accepted && !s.q006.publishedAt) world.questTargets = !q6NormalDone(s) ? q6Text.notes.filter(n => n.room === here && !s.q006.notes.includes(n.id as SupplyCard)).map(n => n.target) : !q6CompareDone(s) ? (here === 'aorta' ? ['hx-sinus'] : []) : ['return-pad'];
    const found = discovered(s);
    world.sparkTargets = world.room.targets.filter(t => t.id.startsWith('hx-') && !found.includes(t.id)).map(t => t.id);
  }
}
game.subscribe(refresh);

/** Short place name shown on the minimap. */
function mapCaption(room: RoomId): string { const t = rooms[room].title; return room === 'district' ? t.split(' · ')[0]! : t.split(' · ').pop()!.replace(/ \(.*\)/, ''); }

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
  game.settleLunch();
  const pending = latestReaction(game.state);
  if (pending && pending.round > game.state.reactions.seen) showReaction(pending, true);
}

/** walk: ordinary doors · scope-in/out: the Bodyscope · flow: following the blood between heart rooms. */
type Trip = { to: RoomId; arrive: Point; facing: Dir; mode: 'walk' | 'scope-in' | 'scope-out' | 'flow'; card?: string | null };
let traveling = false;
async function travel(d: Trip) {
  if (!world || traveling) return;
  if (d.to === 'district' && !districtLoaded()) {
    traveling = true;
    try { await loadDistrict(); }
    catch { hud.toast('동네 지도를 불러오지 못했어요. 연결을 확인하고 다시 나가 보세요.', true); return; }
    finally { traveling = false; }
  }
  const w = world;
  traveling = true;
  w.locked = true; pauseInput();
  if (d.mode === 'scope-in') {
    try { await showOrganEntry(canvas); }
    catch (e) { w.locked = false; traveling = false; hud.toast(e instanceof Error ? e.message : '입장 연출을 열지 못했어요.', true); return; }
  }
  fade.classList.add('on');
  if (d.mode === 'flow') fade.classList.add('flow'); else if (d.mode !== 'walk') fade.classList.add('scope');
  const card = d.mode === 'scope-in' ? null : d.mode === 'flow' && w.roomId === 'aorta' && d.to === 'heart' && game.state.q004.accepted ? q4Text.bodyTransit : d.card;
  fadeCard.textContent = card ?? '';
  fadeCard.classList.toggle('show', !!card);
  const wait = d.mode === 'walk' ? 210 : d.mode === 'scope-in' ? 80 : card ? 1700 : d.mode === 'flow' ? 600 : 560;
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
    const routeNote=q4Text.notes.find(n=>n.target===t.id&&n.room===w.roomId);
    const signalNote = q5Text.notes.find(n => n.target === t.id && n.room === w.roomId);
    const supplyNote = q6Text.notes.find(n => n.target === t.id && n.room === w.roomId);
    if (t.id === 'lift-panel' && (w.roomId === 'lift1' || w.roomId === 'lift4')) {
      const floor = await dialog.show([{ who: '엘리베이터', text: '이동할 층을 선택하세요.', npc: null }], [
        { id: 'lift1', label: '1층 · 로비', sub: '정문과 논현로', disabled: w.roomId === 'lift1' },
        { id: 'lift4', label: '4층 · 라운지와 사무실', sub: '복도 안쪽에 내 자리', disabled: w.roomId === 'lift4' },
      ]);
      if (floor === 'lift1' || floor === 'lift4') void travel({ to: floor, arrive: rooms[floor].spawn, facing: 'down', mode: 'walk', card: floor === 'lift1' ? '1층' : '4층' });
    } else if (t.id === 'hx-sinus' && w.roomId === 'aorta' && game.state.q006.accepted && q6NormalDone(game.state)) {
      pauseInput(); openSupplyComparison(game);
    } else if (game.state.q006.accepted && supplyNote) {
      await say([{ who: supplyNote.name, text: supplyNote.text + '\n' + q6Text.disclaimer, npc: null }]);
      if (game.recordQ6(supplyNote.id as SupplyCard)) hud.toast('공급 취재 기록 · ' + supplyNote.name + ' (' + q6Normal.filter(id => game.state.q006.notes.includes(id)).length + '/5)');
      game.discover(t.id);
    } else if (t.id === 'hx-sa' && w.roomId === 'heart' && game.state.q005.accepted && q5NormalDone(game.state)) {
      pauseInput(); openRhythmComparison(game);
    } else if (game.state.q005.accepted && signalNote) {
      await say([{ who: signalNote.name, text: signalNote.text + '\n' + q5Text.disclaimer, npc: null }]);
      if (game.recordQ5(signalNote.id as SignalCard)) hud.toast('신호 취재 기록 · ' + signalNote.name + ' (' + q5Normal.filter(id => game.state.q005.notes.includes(id)).length + '/5)');
      game.discover(t.id);
    } else if(game.state.q004.accepted&&routeNote){
      await say([{who:routeNote.name,text:routeNote.text+'\n'+q4Text.disclaimer,npc:null}]);
      if(game.recordQ4(routeNote.id as Q4Evidence))hud.toast('순환 취재 기록 · '+routeNote.name+' ('+game.state.q004.notes.length+'/6)');
      if(t.id.startsWith('hx-'))game.discover(t.id);
    } else if (t.id === 'hx-tricuspid' && game.state.q003.accepted && q3NormalDone(game.state)) {
      pauseInput(); openValveComparison(game);
    } else if (t.npc) {
      const script = talk(t.npc, game.state);
      await say(script.lines);
      if (script.flag) game.flag(script.flag);
      if (script.action === 'offer-q1') await offerQ1();
      if (script.action === 'brief-q1') { game.brief(); hud.toast('편집장 확인 완료 · 내 자리에서 첫 기사를 써 봐요'); }
      if (script.action === 'offer-q2') {
        const choice = await dialog.show([{ who: '편집장', text: q2Text.question, npc: 'editor' }], [{ id: 'accept', label: '네 방의 주소 취재 맡기', sub: '심장의 네 방을 걸으며 출입구를 확인해요', disabled: false }]);
        if (choice === 'accept') { game.acceptQ2(); hud.toast('Q002 · 네 방의 주소 취재를 맡았어요'); }
      }
      if (script.action === 'brief-q2') { game.reportQ2(); hud.toast('네 방 보고 완료 · 내 자리에서 도해 기사 쓰기'); }
      if (script.action === 'offer-q3') {
        const choice = await dialog.show([{ who: '편집장', text: q3Text.question, npc: 'editor' }], [{ id: 'accept', label: '판막 취재 맡기', sub: '정상 기준부터 질환 비교와 자료 취재로', disabled: false }]);
        if (choice === 'accept') { game.acceptQ3(); hud.toast('Q003 · 판막 취재를 맡았어요'); }
      }
      if (script.action === 'offer-q5') {
        const choice = await dialog.show([{ who: '편집장', text: q5Text.question, npc: 'editor' }], [{ id: 'accept', label: '박동 신호 취재 맡기', sub: '신호가 지나는 곳을 보고 심방세동과 비교해요', disabled: false }]);
        if (choice === 'accept') { game.acceptQ5(); hud.toast('Q005 · 박동 신호 취재를 맡았어요 · 신호 관찰기 무료 대여'); }
      }
      if (script.action === 'offer-q6') {
        const choice = await dialog.show([{ who: '편집장', text: q6Text.question, npc: 'editor' }], [{ id: 'accept', label: '심장 근육 공급 취재 맡기', sub: '공급 노선을 걷고 쉴 때와 더 일할 때를 비교해요', disabled: false }]);
        if (choice === 'accept') { game.acceptQ6(); hud.toast('Q006 · 심장 근육 공급 취재를 맡았어요 · 공급 관찰기 무료 대여'); }
      }
      if(script.action==='offer-q4'){
        const choice=await dialog.show([{who:'편집장',text:q4Text.question,npc:'editor'}],[{id:'accept',label:'두 순환 취재 맡기',sub:'폐와 온몸 노선을 직접 따라가요',disabled:false}]);
        if(choice==='accept'){game.acceptQ4();hud.toast('Q004 · 두 순환 취재를 맡았어요');}
      }
      if (t.npc === 'barista') await cafeOrder();
      if (t.npc === 'jinu-clerk') await jinuCounter();
      if (t.npc === 'tailor') await tailorFitting();
    } else if (t.id === 'my-desk' && game.has(Q1.briefed)) {
      pauseInput(); if (game.state.q006.accepted) showQ6(); else if (game.state.q005.accepted) showQ5(); else if(game.state.q004.accepted)showQ4(); else if (game.state.q003.accepted) showQ3(); else if (game.state.q002.reported) showQ2Article(); else showArticle();
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
      if (go === 'go') travel({ to: 'newsroom', arrive: { x: 464, y: 152 }, facing: 'down', mode: 'scope-out' });
    } else if (t.id === 'tailor-mirror') {
      const go = await dialog.show([{ who: '전신 거울', text: '거울 앞에 섰다. 옷장에 있는 옷이나 머리 모양을 바꿔 볼까?', npc: null }],
        [{ id: 'edit', label: '외형 꾸미기', sub: '옷장 ' + game.state.owned.length + '벌 · 머리·얼굴도 바꿀 수 있어요', disabled: false }]);
      if (go === 'edit') window.setTimeout(() => editLook(), 0);
    } else {
      const text = lookText[t.id] ?? '';
      await say([{ who: t.label, text, npc: null }]);
      if (t.id === 'window-seat') { game.rest(); hud.toast('잠시 쉬었어요. (생활 행동: 경험치 없음)'); }
      game.inspect(t.id);
    }
    if (game.state.q002.accepted && q2Text.notes.some(n => n.target === t.id && n.room === w.roomId) && !game.state.inspected.includes(q2Key(w.roomId))) {
      const note = q2Text.notes.find(n => n.target === t.id)!;
      await say([{ who: note.name + ' · 출입구 취재', text: note.text + '\n' + note.route + '\n' + q2Text.disclaimer, npc: null }]);
      if (game.observeQ2(t.id)) hud.toast('주소 카드 기록 · ' + note.name + ' (' + q2Seen(game.state).length + '/4)');
    }
    const normal = q3Text.normal.find(n => n.target === t.id && n.room === w.roomId);
    if (game.state.q003.accepted && normal && !game.state.q003.notes.includes(normal.id as 'tricuspid' | 'pulmonary')) {
      await say([{ who: normal.name, text: normal.text + '\n' + q3Text.disclaimer, npc: null }]);
      if (game.recordQ3(normal.id as 'tricuspid' | 'pulmonary')) hud.toast('정상 기준 기록 · ' + normal.name);
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

/** D103: the Jin-U till. One purchase per conversation; gold, bag and ledger change together in the application. */
async function jinuCounter() {
  const s = game.state;
  const choice = await dialog.show([{ who: '진U 점원', text: '무엇을 계산해 드릴까요? (보유 ' + s.gold + 'G)', npc: 'jinu-clerk' }],
    jinuItems.map(item => {
      const why = canBuyItem(s, item), have = s.shop.bag[item.id] ?? 0;
      return { id: item.id, label: item.title, sub: (why ?? item.price + 'G') + (have ? ' · 가방에 ' + have + '개' : ''), disabled: why !== null };
    }));
  if (!choice) return;
  const item = jinuItems.find(i => i.id === choice)!;
  try {
    game.buyItem(choice);
    hud.toast(item.title + ' 샀어요 · ' + item.price + 'G 사용 · 가방에 ' + (game.state.shop.bag[item.id] ?? 0) + '개');
    await say([{ who: '진U 점원', text: item.line, npc: 'jinu-clerk' }]);
  } catch (e) { await say([{ who: '진U 점원', text: e instanceof Error ? e.message : '계산하지 못했어요.', npc: 'jinu-clerk' }]); }
}

/** D103: Orbit Tailor. The chosen outfit is tried on the reporter in the world first; leaving the fitting buys nothing. */
async function tailorFitting() {
  const w = world, s = game.state;
  if (!w) return;
  const pick = await dialog.show([{ who: '오비트 테일러 주인', text: '어떤 옷을 입어 볼까요? (보유 ' + s.gold + 'G)', npc: 'tailor' }],
    tailorItems.map(item => {
      const why = canBuyOutfit(s, item);
      const sub = why === '보유 중' ? (s.avatar.look.outfit === item.id ? '보유 중 · 지금 입고 있어요' : '보유 중 · 갈아입기') : why ? item.price + 'G · ' + why : item.price + 'G · 입어 보기';
      return { id: item.id, label: outfits[item.id], sub, disabled: why === '골드 부족' || s.avatar.look.outfit === item.id };
    }));
  if (!pick) return;
  const item = tailorItems.find(i => i.id === pick)!, owned = s.owned.includes(item.id), name = outfits[item.id];
  const before = w.player.look;
  w.player.look = { ...s.avatar.look, outfit: item.id };
  let choice: string | null = null;
  try {
    choice = await dialog.show([{ who: '오비트 테일러 주인', text: item.line + (owned ? ' 이미 옷장에 있는 옷이에요.' : ' 가격은 ' + item.price + 'G, 지금 ' + s.gold + 'G 있어요.'), npc: 'tailor' }],
      owned ? [{ id: 'wear', label: '이 옷으로 갈아입기', sub: '옷장에 있는 옷', disabled: false }]
        : [{ id: 'buy-wear', label: '사서 바로 입기', sub: item.price + 'G', disabled: false }, { id: 'buy', label: '사서 옷장에 넣기', sub: item.price + 'G · 지금 옷은 그대로', disabled: false }]);
  } finally { w.player.look = before; }
  if (!choice) { hud.toast('입어 보기만 했어요. 산 옷은 없어요.'); return; }
  try {
    game.buyOutfit(item.id, choice !== 'buy');
    w.player.look = game.state.avatar.look;
    hud.toast(owned ? name + '(으)로 갈아입었어요' : name + ' 샀어요 · ' + item.price + 'G 사용' + (choice === 'buy' ? ' · 옷장에 넣었어요' : ''));
    if (!owned) await say([{ who: '오비트 테일러 주인', text: choice === 'buy' ? '옷장에 넣어 둘게요. 기자 정보의 외형 꾸미기나 이 거울에서 언제든 입을 수 있어요.' : '정말 잘 어울려요! 즐거운 취재 되세요.', npc: 'tailor' }]);
  } catch (e) { await say([{ who: '오비트 테일러 주인', text: e instanceof Error ? e.message : '계산하지 못했어요.', npc: 'tailor' }]); }
}

// ---------- Sheets ----------
function showArticle() {
  openArticle(game, () => { const result = latestReaction(game.state); if (result) showReaction(result); });
}
function showQ2Article() { openQ2Article(game, () => { const result = latestReaction(game.state); if (result) showReaction(result); }); }
function showQ3() { openQ3(game, () => { const result = latestReaction(game.state); if (result) showReaction(result); }); }
function showQ4() {openQ4(game,()=>{const result=latestReaction(game.state);if(result)showReaction(result);});}
function showQ5() { openQ5(game, () => { const result = latestReaction(game.state); if (result) showReaction(result); }); }
function showQ6() { openQ6(game, () => { const result = latestReaction(game.state); if (result) showReaction(result); }); }
function showReaction(result: NonNullable<ReturnType<typeof latestReaction>>, replay = false) { openReaction(game, result, { readArticle: result.questId === 'Q006' ? showQ6 : result.questId === 'Q005' ? showQ5 : result.questId === 'Q004' ? showQ4 : result.questId === 'Q003' ? showQ3 : result.questId === 'Q002' ? showQ2Article : showArticle, exportSave }, replay); }
function saveFeedback(c: HTMLElement): () => void {
  const message = el('p', 'save-message'); message.setAttribute('role', 'status'); c.append(message);
  const update = () => { message.textContent = game.lastError ?? ''; message.classList.toggle('hidden', !game.lastError); };
  update(); return game.subscribe(update);
}
function openNotebook(tab?: number) {
  if (busy() || !world) return;
  pauseInput();
  showNotebook(game, world.roomId, { article: showArticle, q002: showQ2Article, q003: showQ3, q004:showQ4, q005: showQ5, q006: showQ6, reaction: r => showReaction(r, true), map: openMap, lunch: date => openLunchSheet(date), lunchDex: target => { void loadLunch().then(m => { target.replaceChildren(); m.renderLunchDex(target, game.state); }).catch(() => target.replaceChildren(el('p', 'muted', '도감을 불러오지 못했어요. 네트워크를 확인해 주세요.'))); } }, tab);
}
/** 오늘의 점심 화면·데이터·그림은 처음 열 때 따로 내려받는다(첫 로딩 크기 보호). */
const loadLunch = () => import('./ui/lunch');
function openLunchSheet(readOnlyDate?: string) {
  if (busy() || !world || !game.state.started) return;
  pauseInput();
  void loadLunch().then(m => { if (busy()) return; m.openLunch(game, { exportSave, readOnlyDate, onRecord: () => openNotebook(4) }); })
    .catch(() => hud.toast('점심 화면을 불러오지 못했어요. 연결을 확인하고 다시 눌러 주세요.', true));
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
  if (world.roomId !== 'district') return;
  pauseInput();
  openSheet('동네 지도 · 유로프라자 주변', c => {
    const cv = el('canvas'); const base = world!.minimapBase();
    const Z = world!.roomId === 'district' ? 1 : 4; cv.width = base.width * Z; cv.height = base.height * Z; cv.style.width = '100%'; cv.style.imageRendering = 'pixelated'; cv.style.borderRadius = '12px';
    const g = cv.getContext('2d')!; g.imageSmoothingEnabled = false; g.drawImage(base, 0, 0, cv.width, cv.height);
    const lab = (t: string, x: number, y: number) => { g.font = '700 30px system-ui, sans-serif'; g.textAlign = 'center'; g.lineWidth = 5; g.strokeStyle = 'rgba(20,16,30,0.9)'; g.strokeText(t, x, y); g.fillStyle = '#fff6dc'; g.fillText(t, x, y); };
    const S = 1 / 8, A = anchors, cafe = specialBlock('cafe')!, jinu = specialBlock('jinu')!;
    lab('유로프라자', (A.euro.x + A.euro.w / 2) * S, (A.euro.y - 12) * S); lab('비투비씨', (cafe.x + cafe.w / 2) * S, (cafe.y - cafe.h - 6) * S);
    lab('진U', (jinu.x + jinu.w / 2) * S, (jinu.y + jinu.d + 30) * S); lab('오비트 테일러', (A.tailorDoor.x + 7) * S - 110, (A.tailorDoor.y - 60) * S); lab('을지병원 사거리', crossroads.x * S, (crossroads.y + 90) * S);
    for (const st of dstations) lab(st.name + '역', st.x * S, st.y * S - 10);
    for (const l of dlabels) if (l.text === '논현로' || l.text === '도산대로' || l.text === '가로수길') lab(l.text, Math.max(240, Math.min(base.width * 8 - 240, l.x)) * S, Math.max(120, Math.min(base.height * 8 - 120, l.y)) * S);
    const p = world!.player; g.fillStyle = '#ff5a6e'; g.beginPath(); g.arc(p.x * S, p.y * S, 12, 0, Math.PI * 2); g.fill(); g.lineWidth = 3; g.strokeStyle = '#ffffff'; g.stroke();
    c.append(cv, el('p', 'muted', '실제 축척 지도예요(1칸 = 3m, 유로프라자 반경 약 1km). 큰길은 횡단보도로만 건널 수 있어요. 지도 데이터 © OpenStreetMap 기여자(ODbL).'));
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
    const help = el('div'); help.append(el('h3', '', '조작 안내'));
    help.append(el('p', '', 'PC: 방향키/WASD 이동 · E/Space 대화·살펴보기 · J 수첩 · M 지도 · Esc 메뉴'));
    help.append(el('p', '', '마우스·터치: 화면을 누르면 그곳으로 걷고, 사람이나 물건을 누르면 다가가서 말을 걸어요. 꾹 누른 채 움직이면 손가락 쪽으로 계속 걸어요. 대화창·창은 아무 곳이나 누르면 넘어가거나 닫혀요.'));
    help.append(el('p', '', '시간: 점심 주문 마감 같은 하루 일정은 기기 시계의 한국 시간(서울)을 따라가요. 거리는 언제나 낮이에요. 따로 시간대를 고르는 설정은 없어요.'));
    help.append(el('p', '', '화면 확대·축소: 휴대폰은 두 손가락으로 벌리거나 모으고, PC는 마우스 휠이나 +/- 키를 써요. 고른 크기는 이 기기에 기억돼요.'));
    help.append(el('p', '', '큰길 횡단보도는 보행 신호가 초록불일 때만 건널 수 있어요. 깜빡이기 시작하면 새로 건너지 않아요.'));
    help.append(el('p', '', '휴대폰·태블릿: 왼쪽 아래 조작볼로 걷고 오른쪽 확인 버튼으로 가까운 사람·구조를 살펴봐요. 확인은 대화도 넘겨요. 선택지는 직접 눌러 주세요.'));
    help.append(el('p', '', '심장 속: 판막은 열려 있을 때, 피가 흐르는 방향으로만 지나갈 수 있어요. 오른쪽 위 심장 주기는 접고 펼칠 수 있어요. 작은 지도나 펼친 주기의 심장 길 안내를 누르면 이 방·심장·인체 지도가 열려요.'));
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
void opening.ready(game.state.started).then(() => {
if (game.state.started) startWorld();
else {
  const s = game.state;
  openCreator({ mode: 'new', name: '', preset: s.avatar.preset, look: s.avatar.look, owned: s.owned,
    onDone: (name, preset, look) => { game.begin(name, preset, look); startWorld(); },
    onCancel: () => {} });
}
});
void closeSheet;
