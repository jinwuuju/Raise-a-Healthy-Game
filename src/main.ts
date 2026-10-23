import './ui/style.css';
import motion from '../data/balance/movement.v0.2.json';
import { Game } from './application/game';
import { heartText, lookText, objective, q1Text, talk, type Line } from './application/story';
import { discovered, discoveries, discoveryIds, hxKey } from './domain/heart';
import { MASTERY_DISCLAIMER, hints, hintOf, roomNameOf, isOpen, makeQuestion, maxStars, nextKind, nextLocked, roomNames, shortName, starsOf, tierOf, totalStars, type QuizKind } from './domain/mastery';
import { DELIVER, LOAD, MUSCLE, muscleOpen, pickMuscle, pickWaypoints, type RunKind, type RunReward, type Wall } from './domain/heart-run';
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
import { canOfferQ7, q7CompareDone, q7NormalDone } from './domain/q007';
import { canOfferQ8, OBSERVER as Q8_OBSERVER, q8CompareDone, q8NormalDone } from './domain/q008';
import { q8Normal, q8Text, type Q8Evidence } from './domain/q008-state';
import { openQ8 } from './ui/q008';
import { openPressureComparison } from './ui/pressure-comparison';
import { canOfferQ9, q9Ready } from './domain/q009';
import { q9Evidence, q9Text, type Q9Evidence } from './domain/q009-state';
import { openQ9 } from './ui/q009';
import { Q11_OBSERVER, canOfferQ11, q11NotesDone, q11Ready } from './domain/q011';
import { q11Evidence, q11Text, type Q11Evidence } from './domain/q011-state';
import { openQ11 } from './ui/q011';
import { openAirPortComparison } from './ui/air-port-comparison';
import { Q12_OBSERVER, canOfferQ12, q12NotesDone, q12Ready } from './domain/q012';
import { q12Evidence, q12Text, type Q12Evidence } from './domain/q012-state';
import { openQ12 } from './ui/q012';
import { openForkComparison } from './ui/fork-comparison';
import { showAirwayEntry } from './ui/airway-entry';
import { canOfferQ10, coreIds, q10CoreLeft, q10Ready } from './domain/q010';
import { q10Text } from './domain/q010-state';
import { openQ10 } from './ui/q010';
import { q7Normal, q7Text, type Q7Evidence } from './domain/q007-state';
import { openQ7 } from './ui/q007';
import { openPassageComparison } from './ui/passage-comparison';
import { openSupplyComparison } from './ui/supply-comparison';
import { openReaction } from './ui/reaction';
import { showOrganEntry } from './ui/organ-entry';
import airSpace from '../data/content/respiratory-space.v0.1.json';
import { RX_MASTERY_DISCLAIMER, airwayOpen, isRx, rxCore, rxDiscovered, rxDiscoveries, rxIds, rxIsOpen, rxKey, rxNextLocked, rxTierOf, rxTotalStars } from './domain/airway';
import { openNotebook as showNotebook } from './ui/notebook';
import { latestReaction } from './domain/reaction-state';
import { closeSheet, openSheet, sheetOpen } from './ui/sheet';
import { rooms, type Target } from './world/rooms';
import { anchors, crossroads, districtLoaded, dlabels, dstations, exits, loadDistrict, specialBlock } from './world/district';
import { isAirwayRoom, isBodyRoom, isHeartRoom, type Dir, type Point, type RoomId } from './world/types';

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
  onHome: () => returnToEuro(),
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
  else if (k === 'h') returnToEuro();
  else if (k === '+' || k === '=') { e.preventDefault(); setZoomStep(zoomStep + 1); }
  else if (k === '-' || k === '_') { e.preventDefault(); setZoomStep(zoomStep - 1); }
  else if (k === 'm' && world && (world.roomId === 'district' || isBodyRoom(world.roomId))) openMap();
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
  const layer = world.roomId === 'aorta' && s.q008.mode !== 'rest' ? q8Text.comparison[s.q008.mode].label : world.roomId === 'aorta' && s.q006.mode !== 'rest' ? q6Text.comparison[s.q006.mode].label : world.roomId !== 'heart' ? '' : s.q003.mode !== 'normal' ? q3Text.comparison[s.q003.mode].label : s.q005.mode !== 'normal' ? q5Text.comparison[s.q005.mode].label : '';
  hud.setObjective((layer ? '검수 전 모형 · ' + layer + ' 비교 · ' : '') + objective(s, world.roomId));
  if (world.heart) { world.heart.comparison = world.roomId === 'heart' ? s.q003.mode : 'normal'; world.heart.rhythm = world.roomId === 'heart' ? s.q005.mode : 'normal'; world.heart.supply = world.roomId === 'aorta' ? s.q006.mode : 'rest'; }
  const has = (f: string) => s.flags.includes(f);
  const needEditor = !has('met-editor') || (s.cafe.welcomeUsed && !has('reported-back')) || q1CanOffer(s) || (has(Q1.observed) && !has(Q1.briefed)) || canOfferQ2(s) || canOfferQ3(s) || canOfferQ4(s) || canOfferQ5(s) || canOfferQ6(s) || canOfferQ7(s) || canOfferQ8(s) || canOfferQ9(s) || canOfferQ10(s) || canOfferQ11(s) || canOfferQ12(s) || (s.q002.accepted && !s.q002.reported && q2Seen(s).length === 4);
  world.questNpc = world.roomId === 'newsroom' && needEditor ? 'editor' : null;
  world.questTargets = [];
  if (world.roomId === 'newsroom' && has(Q1.accepted) && !has(Q1.observed)) world.questTargets = ['device'];
  if (world.roomId === 'newsroom' && has(Q1.briefed) && !s.article.publishedAt) world.questTargets = ['my-desk'];
  if (world.roomId === 'newsroom' && s.q002.reported && !s.q002.publishedAt) world.questTargets = ['my-desk'];
  if (world.roomId === 'newsroom' && s.q003.accepted && !s.q003.publishedAt) world.questTargets = q3CompareDone(s) ? ['my-desk'] : ['device'];
  if (world.roomId === 'newsroom' && s.q004.accepted && !s.q004.publishedAt) world.questTargets = q4Ready(s) ? ['my-desk'] : ['device'];
  if (world.roomId === 'newsroom' && s.q005.accepted && !s.q005.publishedAt) world.questTargets = q5CompareDone(s) ? ['my-desk'] : ['device'];
  if (world.roomId === 'newsroom' && s.q006.accepted && !s.q006.publishedAt) world.questTargets = q6CompareDone(s) ? ['my-desk'] : ['device'];
  if (world.roomId === 'newsroom' && s.q007.accepted && !s.q007.publishedAt) world.questTargets = q7CompareDone(s) ? ['my-desk'] : ['device'];
  if (world.roomId === 'newsroom' && s.q008.accepted && !s.q008.publishedAt) world.questTargets = q8CompareDone(s) ? ['my-desk'] : ['device'];
  if (world.roomId === 'newsroom' && s.q009.accepted && !s.q009.publishedAt) world.questTargets = q9Ready(s) ? ['my-desk'] : ['device'];
  if (world.roomId === 'newsroom' && s.q010.accepted && !s.q010.publishedAt) world.questTargets = q10Ready(s) ? ['my-desk'] : ['device'];
  if (world.roomId === 'newsroom' && s.q011.accepted && !s.q011.publishedAt) world.questTargets = q11Ready(s) ? ['my-desk'] : ['device'];
  if (world.roomId === 'newsroom' && s.q012.accepted && !s.q012.publishedAt) world.questTargets = q12Ready(s) ? ['my-desk'] : ['device'];
  world.sparkTargets = []; world.labelOverride = {}; world.verbOverride = {}; world.badges = {};
  if (isHeartRoom(world.roomId)) {
    const here = world.roomId;
    world.questTargets = has(Q1.accepted) && !has(Q1.observed) ? Q1_OBSERVATIONS.filter(id => Q1_ROOM[id] === here && !s.inspected.includes(obsKey(id))) : has(Q1.observed) && !has(Q1.briefed) ? ['return-pad'] : [];
    if (s.q002.accepted && !s.q002.reported) world.questTargets = q2Seen(s).length === 4 ? ['return-pad'] : q2Text.notes.filter(n => n.room === here && !s.inspected.includes(q2Key(n.id))).map(n => n.target);
    if (s.q003.accepted && !s.q003.publishedAt) world.questTargets = !q3NormalDone(s) ? q3Text.normal.filter(n => n.room === here && !s.q003.notes.includes(n.id as 'tricuspid' | 'pulmonary')).map(n => n.target) : !q3CompareDone(s) && here === 'heart' ? ['hx-tricuspid'] : ['return-pad'];
    if(s.q004.accepted&&!s.q004.publishedAt)world.questTargets=q4Ready(s)?['return-pad']:q4Text.notes.filter(n=>n.room===here&&!s.q004.notes.includes(n.id as Q4Evidence)&&(n.id!=='systemic-return'||s.q004.crossedBody)).map(n=>n.target);
    if (s.q005.accepted && !s.q005.publishedAt) world.questTargets = !q5NormalDone(s) ? q5Text.notes.filter(n => n.room === here && !s.q005.notes.includes(n.id as SignalCard)).map(n => n.target) : !q5CompareDone(s) && here === 'heart' ? ['hx-sa'] : ['return-pad'];
    if (s.q006.accepted && !s.q006.publishedAt) world.questTargets = !q6NormalDone(s) ? q6Text.notes.filter(n => n.room === here && !s.q006.notes.includes(n.id as SupplyCard)).map(n => n.target) : !q6CompareDone(s) ? (here === 'aorta' ? ['hx-sinus'] : []) : ['return-pad'];
    if (s.q007.accepted && !s.q007.publishedAt) world.questTargets = !q7NormalDone(s) ? q7Text.notes.filter(n => n.room === here && !s.q007.notes.includes(n.id as Q7Evidence)).map(n => n.target) : !q7CompareDone(s) ? (here === 'aorta' ? ['hx-sinus'] : []) : ['return-pad'];
    if (s.q008.accepted && !s.q008.publishedAt) world.questTargets = !q8NormalDone(s) ? q8Text.notes.filter(n => n.room === here && !s.q008.notes.includes(n.id as Q8Evidence)).map(n => n.target) : !q8CompareDone(s) ? (here === Q8_OBSERVER.room ? [Q8_OBSERVER.target] : []) : ['return-pad'];
    if (s.q009.accepted && !s.q009.publishedAt) world.questTargets = !q9Ready(s) ? q9Text.notes.filter(n => n.room === here && !s.q009.notes.includes(n.id as Q9Evidence)).map(n => n.target) : ['return-pad'];
    const q10Open = s.q010.accepted && !s.q010.publishedAt;
    if (q10Open) world.questTargets = !s.q010.runDone ? (here === 'heart' && !run ? ['guide'] : []) : q10CoreLeft(s).length ? [] : ['return-pad'];
    const found = discovered(s);
    world.sparkTargets = world.room.targets.filter(t => t.id.startsWith('hx-') && !found.includes(t.id)).map(t => t.id);
    // D106: recorded structures hide their names until mastered (field checks); deeper tiers stay locked until enough stars.
    const lab: Record<string, string> = {}, verb: Record<string, string> = {}, badge: Record<string, string> = {}, wps = run ? run.waypoints.map(x => x.id) : [];
    for (const t of world.room.targets) {
      if (t.id === 'guide' && here === 'heart') { verb[t.id] = run ? '안내' : '배달 런 · 안내'; continue; }
      if (!t.id.startsWith('hx-') || !discoveries[t.id] || world.questTargets.includes(t.id)) continue;
      const known = s.inspected.includes(hxKey(t.id)), stars = starsOf(s, t.id);
      const rd = runDecor(t.id);
      if (rd) { if (rd.label) lab[t.id] = rd.label; verb[t.id] = rd.verb; if (rd.badge) badge[t.id] = rd.badge; continue; }
      if (!known && !isOpen(s, t.id)) { lab[t.id] = tierOf(t.id).title; verb[t.id] = '잠김'; badge[t.id] = '잠김'; continue; }
      if (known && stars < 3) { lab[t.id] = '???'; verb[t.id] = '확인 문제'; badge[t.id] = '★' + stars + '/3'; }
      else if (known) badge[t.id] = '★★★';
    }
    // D108 Q010: core structures without a star wear the special-issue badge; their names stay hidden for the question.
    if (q10Open && s.q010.runDone && !run) for (const id of q10CoreLeft(s)) if (world.room.targets.some(t => t.id === id)) { badge[id] = '특집 확인'; verb[id] = '특집 확인 문제'; }
    world.labelOverride = lab; world.verbOverride = verb; world.badges = badge;
    world.sparkTargets = world.sparkTargets.filter(id => isOpen(s, id) && !wps.includes(id));
  }
  if (isAirwayRoom(world.roomId)) {
    // D111: airway records follow the heart rules (core first, names hidden for field checks, deeper tiers by airway stars).
    const found = rxDiscovered(s), lab: Record<string, string> = {}, verb: Record<string, string> = {}, badge: Record<string, string> = {};
    // D112 Q011: the four nose scenes, then the air-port observer at the back of the nose, then home to write.
    if (s.q011.accepted && !s.q011.publishedAt) {
      const here = world.roomId;
      world.questTargets = !q11NotesDone(s) ? q11Text.notes.filter(n => n.room === here && !s.q011.notes.includes(n.id as Q11Evidence)).map(n => n.target) : !q11Ready(s) ? (here === Q11_OBSERVER.room ? [Q11_OBSERVER.target] : []) : ['return-pad'];
    }
    // D113 Q012: the four throat scenes (pharynx and larynx), then the fork observer in front of the oesophagus, then home.
    if (s.q012.accepted && !s.q012.publishedAt) {
      const here = world.roomId;
      world.questTargets = !q12NotesDone(s) ? q12Text.notes.filter(n => n.room === here && !s.q012.notes.includes(n.id as Q12Evidence)).map(n => n.target) : !q12Ready(s) ? (here === Q12_OBSERVER.room ? [Q12_OBSERVER.target] : []) : ['return-pad'];
    }
    for (const t of world.room.targets) {
      if (!isRx(t.id) || world.questTargets.includes(t.id)) continue;
      const known = s.inspected.includes(rxKey(t.id)), stars = starsOf(s, t.id);
      if (!known && !rxIsOpen(s, t.id)) { lab[t.id] = rxTierOf(t.id).title; verb[t.id] = '잠김'; badge[t.id] = '잠김'; continue; }
      if (known && stars < 3) { lab[t.id] = '???'; verb[t.id] = '확인 문제'; badge[t.id] = '★' + stars + '/3'; }
      else if (known) badge[t.id] = '★★★';
      else if (rxCore.includes(t.id)) badge[t.id] = '핵심';
    }
    world.labelOverride = lab; world.verbOverride = verb; world.badges = badge;
    world.sparkTargets = world.room.targets.filter(t => isRx(t.id) && !found.includes(t.id) && rxIsOpen(s, t.id)).map(t => t.id);
  }
}
game.subscribe(refresh);

/** Short place name shown on the minimap. */
function mapCaption(room: RoomId): string { const t = rooms[room].title; return room === 'district' ? t.split(' · ')[0]! : t.split(' · ').pop()!.replace(/ \(.*\)/, ''); }

function startWorld() {
  const s = game.state;
  world = new World(s.at.room, s.at.x, s.at.y, s.at.facing, s.avatar.look, s.avatar.name);
  world.onDoor = d => travel({ to: d.to, arrive: d.arrive, facing: d.facing, mode: isBodyRoom(d.to) || isBodyRoom(world!.roomId) ? 'flow' : 'walk', card: d.card ?? null, ...(d.note ? { done: d.note } : {}) });
  world.onValveWait = (v, sec) => hud.toast(sec < 0 ? '판막은 거꾸로 열리지 않아요. 피는 한 방향으로만 흘러요.' : (heartText.valves as Record<string, { wait: string }>)[v.kind]!.wait + ' · 약 ' + Math.max(1, Math.ceil(sec)) + '초');
  world.onBeat = snd => { if (world && world.roomId !== 'lung') world.showBeat(heartText.sounds[snd]); };
  world.onGateWait = () => hud.toast(airSpace.swallowWait);
  world.onBreath = w => { if (world && isAirwayRoom(world.roomId)) world.showBeat(w === 'swallow' ? '꿀꺽' : airSpace.breath[w]); };
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
type Trip = { to: RoomId; arrive: Point; facing: Dir; mode: 'walk' | 'scope-in' | 'scope-out' | 'flow'; card?: string | null; done?: string; organ?: 'heart' | 'airway' };
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
    // D072 heart film; D112 nostril film for the airway (presentation only, the entry is committed below).
    try { await (d.organ === 'airway' ? showAirwayEntry(canvas) : showOrganEntry(canvas)); }
    catch (e) { w.locked = false; traveling = false; hud.toast(e instanceof Error ? e.message : '입장 연출을 열지 못했어요.', true); return; }
  }
  fade.classList.add('on');
  if (d.mode === 'flow') fade.classList.add('flow'); else if (d.mode !== 'walk') fade.classList.add('scope');
  const card = d.mode === 'scope-in' ? null : d.mode === 'flow' && w.roomId === 'aorta' && d.to === 'heart' && game.state.q004.accepted ? q4Text.bodyTransit : d.card;
  fadeCard.textContent = card ?? '';
  fadeCard.classList.toggle('show', !!card);
  const wait = d.mode === 'walk' ? 210 : d.mode === 'scope-in' ? (card ? 1700 : 80) : card ? 1700 : d.mode === 'flow' ? 600 : 560;
  window.setTimeout(() => {
    try { if (d.mode === 'scope-in') { if (d.organ === 'airway') game.enterAirway(); else game.enterHeart(); } else game.enter(d.to, d.arrive.x, d.arrive.y, d.facing); }
    catch (e) { hud.toast(e instanceof Error ? e.message : '이동하지 못했어요.', true); }
    const fromRoom = w.roomId;
    w.setRoom(game.state.at.room, game.state.at.x, game.state.at.y, game.state.at.facing);
    if (run && !isHeartRoom(w.roomId)) stopRun('심장 밖으로 나와서 배달을 그만뒀어요.'); else runHud();
    hud.setRoom(w.roomId, () => w.miniMap(), mapCaption(w.roomId));
    refresh();
    fade.classList.remove('on', 'scope', 'flow'); fadeCard.classList.remove('show');
    if (w.roomId !== fromRoom) hud.showBanner(rooms[w.roomId].title); // underpass / return button inside the district: no banner
    if (d.mode === 'scope-in') hud.toast(d.organ === 'airway' ? airSpace.entryToast : heartText.disclaimer);
    else if (d.done && w.roomId === d.to) hud.toast(d.done);
    if (!game.persist()) hud.toast('저장하지 못했어요: ' + game.lastError, true);
    window.setTimeout(() => {
      w.locked = false; traveling = false;
      // First time inside the heart: the guide robot explains valves and the cycle panel once.
      if (d.mode === 'scope-in' && d.organ === 'airway' && !game.has('airway-guided')) {
        game.flag('airway-guided');
        window.setTimeout(() => { if (!busy()) void say(airSpace.guideOnce.map(text => ({ who: '바디스코프 안내', text, npc: null }))); }, 500);
      }
      if (d.mode === 'scope-in' && d.organ !== 'airway' && !game.has('heart-guided')) {
        const guide = w.room.targets.find(t => t.id === 'guide');
        game.flag('heart-guided');
        if (guide) window.setTimeout(() => { if (!busy()) { guideIntro = true; void interact(guide); } }, 500);
      }
    }, 120);
  }, wait);
}

/**
 * D104: the HUD button (and the H key) brings the reporter back to the front of Euro Plaza, wherever they wandered.
 * Outside the heart only: inside it the Bodyscope trip and the quest modes decide how the reporter leaves.
 */
function returnToEuro(): void {
  if (!world || busy() || traveling) return;
  if (isBodyRoom(world.roomId)) { hud.toast(isHeartRoom(world.roomId) ? '심장 속에서는 바디스코프로 먼저 나와 주세요.' : '호흡기 속에서는 귀환 장치로 먼저 나와 주세요.', true); return; }
  const to = exits.euroOut;
  if (world.roomId === 'district' && Math.hypot(world.player.x - to.x, world.player.y - to.y) < 24) { hud.toast('이미 유로프라자 앞이에요.'); return; }
  void travel({ to: 'district', arrive: to, facing: 'down', mode: 'walk', done: '유로프라자 앞으로 돌아왔어요.' });
}

/* ---------- D106 heart learning: field checks and the blood-delivery run (design 18) ---------- */
const NL = String.fromCharCode(10);
type ActiveRun = {
  id: string; kind: RunKind; start: number; oxygen: boolean; waypoints: { id: string; done: boolean; correct: boolean }[];
  /** Muscle delivery only: the ordered wall, whether a coronary opening was tried, entered, and the wall fed. */
  wall: Wall | null; tried: boolean; entered: boolean; fed: boolean;
};
let run: ActiveRun | null = null, runTimer = 0;
/** The first heart visit plays the guide's explanation, not the delivery menu. */
let guideIntro = false;
const fmt = (sec: number) => Math.floor(sec / 60) + ':' + String(Math.floor(sec % 60)).padStart(2, '0');
const newRunId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const WALL_NAME: Record<Wall, string> = { lv: '좌심실 벽', rv: '우심실 벽' };
const runBest = (kind: RunKind): number | null => kind === 'muscle' ? game.state.heartRun.muscle.best : game.state.heartRun.best;

function runHud(): void {
  if (!run) { hud.setRun(null); return; }
  const r = run, here = world?.roomId, sec = (performance.now() - r.start) / 1000, best = runBest(r.kind);
  const title = (r.kind === 'muscle' ? '근육 배달 ' : '') + '⏱ ' + fmt(sec) + (best !== null ? ' · 최고 ' + fmt(best) : '') + ' · 산소 ' + (r.oxygen ? '실음' : '아직');
  const oxygen = { text: '폐 · 가스 교환에서 산소 싣기', done: r.oxygen, here: here === 'lung' && !r.oxygen };
  const clue = (x: ActiveRun['waypoints'][number]) => ({ text: '경유지 · ' + hints[x.id]! + (here === discoveries[x.id]!.room && !x.done ? ' (이 방)' : ''), done: x.done, here: here === discoveries[x.id]!.room && !x.done });
  if (r.kind === 'muscle') {
    const wall = r.wall!, back = r.waypoints[2]!;
    hud.setRun({ title, rows: [
      oxygen, clue(r.waypoints[0]!),
      { text: '대동맥 뿌리 · ' + WALL_NAME[wall] + '을 주로 맡는 관상동맥 입구로', done: r.entered, here: here === 'aorta' && !r.entered },
      { text: WALL_NAME[wall] + ' 근육에 산소 배달', done: r.fed, here: here === wall && r.entered && !r.fed },
      { text: '돌아오는 문 · ' + hints[MUSCLE.back]!, done: back.done, here: here === 'heart' && r.fed && !back.done },
    ] });
    return;
  }
  hud.setRun({ title, rows: [
    oxygen, ...r.waypoints.map(clue),
    { text: '대동맥 뿌리 · 오름대동맥에서 배달', done: false, here: here === 'aorta' },
  ] });
}

function startRun(kind: RunKind = 'blood'): void {
  if (!world || world.roomId !== 'heart' || run) return;
  if (kind === 'muscle' && !muscleOpen(game.state)) return;
  const id = newRunId(), base = { id, kind, start: performance.now(), oxygen: false, tried: false, entered: false, fed: false };
  if (kind === 'muscle') {
    const m = pickMuscle(game.state, id);
    run = { ...base, wall: m.wall, waypoints: [m.waypoint, MUSCLE.entry[m.wall], MUSCLE.back].map(x => ({ id: x, done: false, correct: false })) };
  } else run = { ...base, wall: null, waypoints: pickWaypoints(game.state, id).map(x => ({ id: x, done: false, correct: false })) };
  window.clearInterval(runTimer); runTimer = window.setInterval(runHud, 500);
  runHud(); refresh();
  hud.toast(kind === 'muscle' ? '근육 배달 시작! 오늘 주문은 ' + WALL_NAME[run.wall!] + ' · 폐에서 산소를 싣고 대동맥 뿌리의 관상동맥으로' : '배달 시작! 단서로 경유지를 찾고, 폐에서 산소를 실어 대동맥으로');
}

function stopRun(note: string | null): void {
  if (!run) return;
  run = null; window.clearInterval(runTimer); hud.setRun(null); refresh();
  if (note) hud.toast(note);
}

/** How a structure reads during a delivery; null = not a stop right now. */
function runDecor(id: string): { label?: string; verb: string; badge?: string } | null {
  const r = run; if (!r) return null;
  if (id === LOAD) return { verb: '산소 싣기', badge: '배달 런' };
  if (r.kind === 'blood') {
    if (id === DELIVER) return { verb: '배달하기', badge: '배달 런' };
    return r.waypoints.some(x => x.id === id) ? { label: '???', verb: '경유지 확인' } : null;
  }
  if (id === r.waypoints[0]!.id) return { label: '???', verb: '경유지 확인' };
  if (!r.entered && (id === MUSCLE.entry.lv || id === MUSCLE.entry.rv)) return { verb: '이 관상동맥으로', badge: '근육 배달' };
  if (r.entered && !r.fed && id === MUSCLE.wall[r.wall!]) return { verb: '근육에 산소 배달', badge: '근육 배달' };
  if (r.fed && id === MUSCLE.back) return { label: '???', verb: '돌아오는 문 확인', badge: '근육 배달' };
  return null;
}

/** One question about a recorded structure. null = closed without answering (nothing recorded). */
async function fieldCheck(id: string, kind: QuizKind): Promise<boolean | null> {
  const air = isRx(id), locked = () => (air ? rxNextLocked(game.state) : nextLocked(game.state));
  const q = makeQuestion(id, kind, newRunId()), before = locked(), d = discoveries[id] ?? rxDiscoveries[id]!;
  const pick = await dialog.show([{ who: '확인 문제', text: q.prompt, npc: null }], q.choices.map(c => ({ id: c.id, label: c.label, sub: '', disabled: false })));
  if (pick === null) return null;
  const correct = pick === q.answer, star = game.answerQuiz(id, kind, correct);
  const answer = kind === 'room' ? roomNameOf(id) : shortName(id);
  if (correct) await say([{ who: '정답! · ' + d.name, text: (star ? '별 +1 (★' + starsOf(game.state, id) + '/3) · +5G' : '이 유형의 별은 이미 받았어요.') + NL + hintOf(id) + NL + (air ? RX_MASTERY_DISCLAIMER : MASTERY_DISCLAIMER), npc: null }]);
  else await say([{ who: '아쉬워요 · 정답은 ' + answer, text: d.name + ' — ' + hintOf(id) + NL + '틀려도 잃는 건 없어요. 다음에 다시 와서 맞혀 봐요.', npc: null }]);
  if (before && !locked()?.ids.every(x => before.ids.includes(x))) hud.toast(before.title + '가 열렸어요! 새 구조가 반짝여요');
  return correct;
}
const runStop = (t: Target): boolean => {
  const r = run; if (!r) return false;
  if (t.id === LOAD) return true;
  if (r.kind === 'blood') return t.id === DELIVER || r.waypoints.some(x => x.id === t.id && !x.done);
  const wp = r.waypoints[0]!;
  return (t.id === wp.id && !wp.done) || (!r.entered && (t.id === MUSCLE.entry.lv || t.id === MUSCLE.entry.rv))
    || (r.entered && !r.fed && t.id === MUSCLE.wall[r.wall!]) || (r.fed && t.id === MUSCLE.back && !r.waypoints[2]!.done);
};
/** Settles a finished run (blood at the ascending aorta, muscle at the coronary sinus opening) and shows the result. */
function completeRun(r: ActiveRun): void {
  const seconds = (performance.now() - r.start) / 1000;
  const special = game.state.q010.runDone;
  const reward = game.finishRun({ runId: r.id, seconds, oxygen: true, kind: r.kind, waypoints: r.waypoints.map(x => ({ id: x.id, correct: x.done && x.correct })) });
  stopRun(null);
  if (!special && game.state.q010.runDone) hud.toast('특집 배달 런 완주 · 졸업 특집 1/3 · 이제 별 없는 핵심 구조를 확인해요');
  if (reward) showRunResult(reward, seconds, r);
}
const WRONG_ENTRY: Record<Wall, string> = {
  lv: '오른관상동맥도 양쪽 심실 일부에 피를 보내지만, 오늘 주문한 좌심실 벽을 주로 맡는 건 왼관상동맥이에요. 왼쪽 입구로 가 봐요.',
  rv: '왼관상동맥은 주로 좌심방·좌심실·심실중격을 맡아요. 우심실 벽은 오른관상동맥 쪽이에요. 오른쪽 입구로 가 봐요.',
};
const ENTRY_CARD: Record<Wall, string> = {
  lv: '왼관상동맥 → 앞으로 내려가는 가지·옆으로 도는 가지 → 좌심실 벽 근육' + NL + '근육 속은 걸을 수 없어 좌심실 안에서 벽을 찾아요 (이동 축약)',
  rv: '오른관상동맥 → 심장 오른쪽을 따라 도는 가지 → 우심실 벽 근육' + NL + '근육 속은 걸을 수 없어 우심실 안에서 벽을 찾아요 (이동 축약)',
};
const WALL_TEXT: Record<Wall, string> = {
  lv: '산소를 실은 피가 좌심실 벽 근육에 닿았어요. 온몸으로 피를 보내는 두꺼운 벽이라 쉬지 않고 산소가 필요해요. 이 근육 속 혈관은 심장이 조일 때 눌려서, 피는 주로 심장이 풀릴 때 흘러들어요.',
  rv: '산소를 실은 피가 우심실 벽 근육에 닿았어요. 폐로 피를 보내는 얇은 벽도 쉬지 않고 일하니까 산소가 필요해요.',
};
/** One stop of the heart-muscle delivery after the oxygen and the clue waypoint (D108, Q006 route). */
async function muscleStep(t: Target, r: ActiveRun, fromQuest: boolean): Promise<void> {
  const wall = r.wall!, entry = r.waypoints[1]!, back = r.waypoints[2]!;
  if (t.id === MUSCLE.entry.lv || t.id === MUSCLE.entry.rv) {
    if (!r.oxygen) { hud.toast('아직 산소를 싣지 않았어요 · 온몸을 돌아 우심방에서 다시 폐로'); return; }
    const right = t.id === MUSCLE.entry[wall];
    if (!r.tried) { r.tried = true; entry.correct = right; }
    if (!right) { await say([{ who: discoveries[t.id]!.name, text: WRONG_ENTRY[wall] + NL + '틀려도 잃는 건 없어요.', npc: null }]); return; }
    entry.done = true; r.entered = true; game.discover(t.id);
    void travel({ to: wall, arrive: rooms[wall].spawn, facing: rooms[wall].spawnFacing, mode: 'flow', card: ENTRY_CARD[wall] });
  } else if (t.id === MUSCLE.wall[wall]) {
    await say([{ who: WALL_NAME[wall] + ' · 근육 배달', text: WALL_TEXT[wall] + NL + MASTERY_DISCLAIMER, npc: null }]);
    game.discover(t.id); r.fed = true;
    void travel({ to: 'heart', arrive: rooms.heart.spawn, facing: rooms.heart.spawnFacing, mode: 'flow', card: '근육을 거친 피 → 심장 정맥 → 관상정맥동 → 우심방' + NL + '피가 돌아온 입구를 찾아요 (이동 축약)' });
  } else if (t.id === MUSCLE.back) {
    let ok = true;
    if (!fromQuest && game.state.inspected.includes(hxKey(t.id))) { const a = await fieldCheck(t.id, 'name'); if (a === null) return; ok = a; }
    else if (!fromQuest) await say([{ who: discoveries[t.id]!.name, text: discoveries[t.id]!.text, npc: null }]);
    game.discover(t.id); back.done = true; back.correct = ok;
    completeRun(r);
  }
}
/** One stop of the delivery run. fromQuest: a commission note already showed this place, so no text or quiz again. */
async function runStep(t: Target, fromQuest: boolean): Promise<void> {
  const r = run; if (!r) return;
  const d = discoveries[t.id]!;
  if (r.kind === 'muscle' && t.id !== LOAD && t.id !== r.waypoints[0]!.id) { await muscleStep(t, r, fromQuest); runHud(); return; }
  if (t.id === LOAD) {
    if (r.oxygen) hud.toast(r.kind === 'muscle' ? '산소는 이미 실었어요 · 대동맥 뿌리의 관상동맥 입구로' : '산소는 이미 실었어요 · 폐정맥을 따라 좌심방으로');
    else { if (!fromQuest) await say([{ who: d.name + ' · 산소 싣기', text: d.text, npc: null }]); game.discover(t.id); r.oxygen = true; hud.toast('산소를 실었어요! 적혈구가 밝은 붉은색이 됐어요'); }
  } else if (t.id === DELIVER) {
    if (!r.oxygen) { hud.toast('아직 산소를 싣지 않았어요 · 온몸을 돌아 우심방에서 다시 폐로'); return; }
    game.discover(t.id);
    completeRun(r);
  } else {
    const wp = r.waypoints.find(x => x.id === t.id)!;
    if (fromQuest) { game.discover(t.id); wp.done = true; wp.correct = true; hud.toast('취재 지점이 경유지이기도 했어요! 경유지 정답'); }
    else if (game.state.inspected.includes(hxKey(t.id))) {
      const ok = await fieldCheck(t.id, 'name');
      if (ok === null) return;
      wp.done = true; wp.correct = ok;
    } else {
      await say([{ who: d.name + ' · 새 경유지', text: d.text, npc: null }]);
      game.discover(t.id); wp.done = true; wp.correct = true;
      hud.toast('단서만으로 새 구조를 찾았어요! 경유지 정답');
    }
  }
  runHud();
}

function showRunResult(rw: RunReward, seconds: number, r: ActiveRun): void {
  pauseInput();
  const h = game.state.heartRun, muscle = r.kind === 'muscle', best = runBest(r.kind);
  openSheet(muscle ? '심장 근육 배달 결과' : '혈류 배달 결과', (c, close) => {
    const top = el('div', 'run-result');
    top.append(el('div', 'run-grade grade-' + rw.grade, rw.grade), el('p', '', fmt(seconds) + (rw.best ? ' · 최고 기록!' : ' · 최고 ' + fmt(best ?? seconds)) + (rw.combo > 1 ? ' · 연속 ' + rw.combo + '판' : '')));
    const lines = el('ul', 'run-lines'); for (const l of rw.lines) lines.append(el('li', '', l));
    const wps = el('ul', 'run-lines');
    r.waypoints.forEach((x, i) => {
      const text = muscle && i === 1 ? '갈림길 · ' + discoveries[x.id]!.name + (x.correct ? ' · 한 번에 골랐어요' : ' · 다시 골라 찾았어요') + ' → ' + WALL_NAME[r.wall!]
        : discoveries[x.id]!.name + ' — ' + hints[x.id];
      wps.append(el('li', x.correct ? 'ok' : 'miss', (x.correct ? '✓ ' : '· ') + text));
    });
    c.append(top, el('h3', '', '보상 +' + rw.gold + 'G' + (rw.xp ? ' · +' + rw.xp + 'XP' + (levelOf(game.state.totalXp).need === 0 ? ' (출시 상한 레벨이라 다음 장이 열리면 반영)' : '') : '')), lines, el('h3', '', muscle ? '길 찾기' : '경유지'), wps);
    if (rw.sighting) { const card = el('div', 'run-sighting'); card.append(el('b', '', (rw.sighting.first ? '새 목격 · ' : '다시 목격 · ') + rw.sighting.name), el('p', '', rw.sighting.text)); c.append(card); }
    c.append(el('p', 'muted', '배달 ' + h.runs + '번째' + (muscle ? ' (근육 배달 ' + h.muscle.runs + '번째)' : '') + ' · 목격 ' + h.seen.length + '종 · ' + MASTERY_DISCLAIMER));
    const row = el('div', 'list');
    row.append(button('row', muscle ? '한 판 더 · 여기 우심방에서 다음 근육 배달' : '한 판 더 · 온몸을 돌아 우심방에서 출발', () => { close(); again(r.kind); }), button('row', '닫기', () => close()));
    c.append(row);
  });
}

function again(kind: RunKind): void {
  if (!world) return;
  if (world.roomId !== 'heart') void travel({ to: 'heart', arrive: rooms.heart.spawn, facing: rooms.heart.spawnFacing, mode: 'flow', card: '대동맥 → 온몸 → 상대정맥 → 우심방' + NL + '다음 배달을 받으러 가요' });
  let tries = 0;
  const wait = () => { if (world && world.roomId === 'heart' && !traveling && !world.locked) startRun(kind); else if (++tries < 60) window.setTimeout(wait, 200); };
  window.setTimeout(wait, 400);
}

async function say(lines: Line[]) { if (lines.length) await dialog.show(lines); }

/** D110: a published commission keeps its observer as an extra choice on the structure; the field check stays the default (D106). */
function observerReplay(id: string, room: RoomId): { label: string; open: () => void } | null {
  const s = game.state;
  if (id === 'hx-tricuspid' && room === 'heart' && s.q003.publishedAt) return { label: 'Q003 판막 비교', open: () => openValveComparison(game) };
  if (id === 'hx-sa' && room === 'heart' && s.q005.publishedAt) return { label: 'Q005 박자 비교', open: () => openRhythmComparison(game) };
  if (id === 'hx-sinus' && room === 'aorta' && s.q007.publishedAt) return { label: 'Q007 통로 비교', open: () => openPassageComparison(game) };
  if (id === 'hx-sinus' && room === 'aorta' && s.q006.publishedAt) return { label: 'Q006 공급 비교', open: () => openSupplyComparison(game) };
  if (id === 'rx-choana' && room === 'nose' && s.q011.publishedAt) return { label: 'Q011 공기 항구 관찰기', open: () => openAirPortComparison(game) };
  if (id === Q12_OBSERVER.target && room === Q12_OBSERVER.room && s.q012.publishedAt) return { label: 'Q012 갈림길 관찰기', open: () => openForkComparison(game) };
  if (id === 'hx-ascending' && room === 'aorta' && s.q008.publishedAt) return { label: 'Q008 혈압 비교', open: () => openPressureComparison(game) };
  return null;
}

async function interact(t: Target) {
  if (!world || world.locked || dialog.open) return;
  const w = world;
  if (t.id === 'device') scopePromptLatched = true;
  w.stop(); w.locked = true; keys.clear(); pointer.id = -1;
  w.faceToward(t);
  try {
    const wasQuestStop = w.questTargets.includes(t.id); // recording a note refreshes the list, so read it first
    const routeNote=q4Text.notes.find(n=>n.target===t.id&&n.room===w.roomId);
    const signalNote = q5Text.notes.find(n => n.target === t.id && n.room === w.roomId);
    const supplyNote = q6Text.notes.find(n => n.target === t.id && n.room === w.roomId);
    const passageNote = q7Text.notes.find(n => n.target === t.id && n.room === w.roomId);
    const pressureNote = q8Text.notes.find(n => n.target === t.id && n.room === w.roomId);
    const q8Open = game.state.q008.accepted && !game.state.q008.publishedAt;
    const evidenceNote = q9Text.notes.find(n => n.target === t.id && n.room === w.roomId);
    const q9Open = game.state.q009.accepted && !game.state.q009.publishedAt;
    const airNote = q11Text.notes.find(n => n.target === t.id && n.room === w.roomId);
    const q11Open = game.state.q011.accepted && !game.state.q011.publishedAt;
    const throatNote = q12Text.notes.find(n => n.target === t.id && n.room === w.roomId);
    const q12Open = game.state.q012.accepted && !game.state.q012.publishedAt;
    if (t.id === 'lift-panel' && (w.roomId === 'lift1' || w.roomId === 'lift4')) {
      const floor = await dialog.show([{ who: '엘리베이터', text: '이동할 층을 선택하세요.', npc: null }], [
        { id: 'lift1', label: '1층 · 로비', sub: '정문과 논현로', disabled: w.roomId === 'lift1' },
        { id: 'lift4', label: '4층 · 라운지와 사무실', sub: '복도 안쪽에 내 자리', disabled: w.roomId === 'lift4' },
      ]);
      if (floor === 'lift1' || floor === 'lift4') void travel({ to: floor, arrive: rooms[floor].spawn, facing: 'down', mode: 'walk', card: floor === 'lift1' ? '1층' : '4층' });
    } else if (runStop(t) && !wasQuestStop) {
      await runStep(t, false);
    } else if (game.state.q010.accepted && !game.state.q010.publishedAt && game.state.q010.runDone && !run && q10CoreLeft(game.state).includes(t.id) && discoveries[t.id]?.room === w.roomId) {
      const d = discoveries[t.id]!;
      if (!game.state.inspected.includes(hxKey(t.id))) { await say([{ who: d.name, text: d.text, npc: null }]); game.discover(t.id); }
      const ok = await fieldCheck(t.id, nextKind(game.state, t.id, game.state.heartRun.runs + game.state.revision));
      if (ok) { const left = q10CoreLeft(game.state).length; hud.toast(left ? '특집 핵심 구조 확인 · ' + (coreIds.length - left) + '/' + coreIds.length : '핵심 구조 확인 완료! 편집국 내 자리에서 졸업 특집 기사를 써요'); }
    } else if (q11Open && airNote && !game.state.q011.notes.includes(airNote.id as Q11Evidence)) {
      await say([{ who: airNote.name, text: airNote.text + NL + q11Text.disclaimer, npc: null }]);
      if (game.recordQ11(airNote.id as Q11Evidence)) hud.toast('공기 항구 취재 기록 · ' + airNote.name.replace('장면 · ', '') + ' (' + q11Evidence.filter(id => game.state.q011.notes.includes(id)).length + '/' + q11Evidence.length + ')' + (q11NotesDone(game.state) ? ' · 맨 뒤 뒤콧구멍 앞 관찰기로' : ''));
    } else if (q11Open && t.id === Q11_OBSERVER.target && w.roomId === Q11_OBSERVER.room && q11NotesDone(game.state)) {
      pauseInput(); openAirPortComparison(game);
    } else if (q12Open && throatNote && !game.state.q012.notes.includes(throatNote.id as Q12Evidence)) {
      await say([{ who: throatNote.name, text: throatNote.text + NL + q12Text.disclaimer, npc: null }]);
      if (game.recordQ12(throatNote.id as Q12Evidence)) hud.toast('갈라지는 길 취재 기록 · ' + throatNote.name.replace('장면 · ', '') + ' (' + q12Evidence.filter(id => game.state.q012.notes.includes(id)).length + '/' + q12Evidence.length + ')' + (q12NotesDone(game.state) ? ' · 목구멍 맨 아래 식도 입구 앞 관찰기로' : ''));
    } else if (q12Open && t.id === Q12_OBSERVER.target && w.roomId === Q12_OBSERVER.room && q12NotesDone(game.state)) {
      pauseInput(); openForkComparison(game);
    } else if (q9Open && evidenceNote && !game.state.q009.notes.includes(evidenceNote.id as Q9Evidence)) {
      await say([{ who: evidenceNote.name, text: evidenceNote.text + NL + q9Text.disclaimer, npc: null }]);
      if (game.recordQ9(evidenceNote.id as Q9Evidence)) hud.toast('순환 설명 근거 · ' + evidenceNote.name.replace('근거 · ', '') + ' (' + q9Evidence.filter(id => game.state.q009.notes.includes(id)).length + '/4)');
      if (t.id.startsWith('hx-')) game.discover(t.id);
    } else if (q8Open && t.id === Q8_OBSERVER.target && w.roomId === Q8_OBSERVER.room && q8NormalDone(game.state) && runStop(t)) {
      hud.toast('배달을 먼저 마쳐요 · 혈압 관찰기는 배달 뒤에 다시 눌러 열어요'); // the run step below counts this stop (D107)
    } else if (q8Open && t.id === Q8_OBSERVER.target && w.roomId === Q8_OBSERVER.room && q8NormalDone(game.state)) {
      pauseInput(); openPressureComparison(game);
    } else if (q8Open && pressureNote && !game.state.q008.notes.includes(pressureNote.id as Q8Evidence)) {
      await say([{ who: pressureNote.name, text: pressureNote.text + NL + q8Text.disclaimer, npc: null }]);
      if (game.recordQ8(pressureNote.id as Q8Evidence)) hud.toast('혈압 취재 기록 · ' + pressureNote.name + ' (' + q8Normal.filter(id => game.state.q008.notes.includes(id)).length + '/2)');
      game.discover(t.id);
    } else if (t.id === 'hx-sinus' && w.roomId === 'aorta' && game.state.q007.accepted && !game.state.q007.publishedAt && q7NormalDone(game.state)) {
      pauseInput(); openPassageComparison(game);
    } else if (game.state.q007.accepted && !game.state.q007.publishedAt && passageNote && !game.state.q007.notes.includes(passageNote.id as Q7Evidence)) {
      await say([{ who: passageNote.name, text: passageNote.text + NL + q7Text.disclaimer, npc: null }]);
      if (game.recordQ7(passageNote.id as Q7Evidence)) hud.toast('통로 취재 기록 · ' + passageNote.name + ' (' + q7Normal.filter(id => game.state.q007.notes.includes(id)).length + '/2)');
      game.discover(t.id);
    } else if (t.id === 'hx-sinus' && w.roomId === 'aorta' && game.state.q006.accepted && !game.state.q006.publishedAt && q6NormalDone(game.state)) {
      pauseInput(); openSupplyComparison(game);
    } else if (game.state.q006.accepted && !game.state.q006.publishedAt && supplyNote) {
      await say([{ who: supplyNote.name, text: supplyNote.text + '\n' + q6Text.disclaimer, npc: null }]);
      if (game.recordQ6(supplyNote.id as SupplyCard)) hud.toast('공급 취재 기록 · ' + supplyNote.name + ' (' + q6Normal.filter(id => game.state.q006.notes.includes(id)).length + '/5)');
      game.discover(t.id);
    } else if (t.id === 'hx-sa' && w.roomId === 'heart' && game.state.q005.accepted && !game.state.q005.publishedAt && q5NormalDone(game.state)) {
      pauseInput(); openRhythmComparison(game);
    } else if (game.state.q005.accepted && !game.state.q005.publishedAt && signalNote) {
      await say([{ who: signalNote.name, text: signalNote.text + '\n' + q5Text.disclaimer, npc: null }]);
      if (game.recordQ5(signalNote.id as SignalCard)) hud.toast('신호 취재 기록 · ' + signalNote.name + ' (' + q5Normal.filter(id => game.state.q005.notes.includes(id)).length + '/5)');
      game.discover(t.id);
    } else if (game.state.q004.accepted && !game.state.q004.publishedAt && routeNote) {
      await say([{who:routeNote.name,text:routeNote.text+'\n'+q4Text.disclaimer,npc:null}]);
      if(game.recordQ4(routeNote.id as Q4Evidence))hud.toast('순환 취재 기록 · '+routeNote.name+' ('+game.state.q004.notes.length+'/6)');
      if(t.id.startsWith('hx-'))game.discover(t.id);
    } else if (t.id === 'hx-tricuspid' && game.state.q003.accepted && !game.state.q003.publishedAt && q3NormalDone(game.state)) {
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
      if (script.action === 'offer-q12') {
        const choice = await dialog.show([{ who: '편집장', text: q12Text.question, npc: 'editor' }], [{ id: 'accept', label: '갈라지는 길 취재 맡기', sub: '목구멍과 공기 길 입구를 걸으며 공기와 음식이 갈리는 순간을 봐요', disabled: false }]);
        if (choice === 'accept') { game.acceptQ12(); hud.toast('Q012 · 갈라지는 길 취재를 맡았어요 · 바디스코프에서 호흡기를 골라 목구멍으로'); }
      }
      if (script.action === 'offer-q11') {
        const choice = await dialog.show([{ who: '편집장', text: q11Text.question, npc: 'editor' }], [{ id: 'accept', label: '공기 항구 취재 맡기', sub: '콧구멍에서 뒤콧구멍까지 걸으며 코가 공기에 하는 일을 봐요', disabled: false }]);
        if (choice === 'accept') { game.acceptQ11(); hud.toast('Q011 · 공기 항구 취재를 맡았어요 · 바디스코프에서 호흡기를 골라 콧구멍으로'); }
      }
      if (script.action === 'offer-q10') {
        const choice = await dialog.show([{ who: '편집장', text: q10Text.question, npc: 'editor' }], [{ id: 'accept', label: '심장 졸업 특집호 맡기', sub: '특집 배달 런 · 핵심 구조 확인 · 쉬운 특집 기사', disabled: false }]);
        if (choice === 'accept') { game.acceptQ10(); hud.toast('Q010 · 심장 졸업 특집호를 맡았어요 · 바디스코프로 들어가 바디에게'); }
      }
      if (script.action === 'offer-q9') {
        const choice = await dialog.show([{ who: '편집장', text: q9Text.question, npc: 'editor' }], [{ id: 'accept', label: '순환 설명 취재 맡기', sub: '심장 속 근거 네 곳을 다시 보고 처음 보는 그림을 읽어요', disabled: false }]);
        if (choice === 'accept') { game.acceptQ9(); hud.toast('Q009 · 순환 설명 취재를 맡았어요 · 바디스코프로 근거 다시 보기'); }
      }
      if (script.action === 'offer-q8') {
        const choice = await dialog.show([{ who: '편집장', text: q8Text.question, npc: 'editor' }], [{ id: 'accept', label: '혈압 기록 취재 맡기', sub: '벽을 미는 힘을 보고 한 가지씩 바꿔 비교해요', disabled: false }]);
        if (choice === 'accept') { game.acceptQ8(); hud.toast('Q008 · 혈압 기록 취재를 맡았어요 · 혈압 관찰기 무료 대여'); }
      }
      if (script.action === 'offer-q7') {
        const choice = await dialog.show([{ who: '편집장', text: q7Text.question, npc: 'editor' }], [{ id: 'accept', label: '통로 비교 취재 맡기', sub: '관상동맥 입구를 다시 보고 통로 폭 하나만 바꿔 비교해요', disabled: false }]);
        if (choice === 'accept') { game.acceptQ7(); hud.toast('Q007 · 통로 비교 취재를 맡았어요 · 통로 관찰기 무료 대여'); }
      }
      if(script.action==='offer-q4'){
        const choice=await dialog.show([{who:'편집장',text:q4Text.question,npc:'editor'}],[{id:'accept',label:'두 순환 취재 맡기',sub:'폐와 온몸 노선을 직접 따라가요',disabled:false}]);
        if(choice==='accept'){game.acceptQ4();hud.toast('Q004 · 두 순환 취재를 맡았어요');}
      }
      if (t.npc === 'barista') await cafeOrder();
      if (t.npc === 'jinu-clerk') await jinuCounter();
      if (t.npc === 'tailor') await tailorFitting();
    } else if (t.id === 'my-desk' && game.has(Q1.briefed)) {
      pauseInput(); if (game.state.q012.accepted) showQ12(); else if (game.state.q011.accepted) showQ11(); else if (game.state.q010.accepted) showQ10(); else if (game.state.q009.accepted) showQ9(); else if (game.state.q008.accepted) showQ8(); else if (game.state.q007.accepted) showQ7(); else if (game.state.q006.accepted) showQ6(); else if (game.state.q005.accepted) showQ5(); else if(game.state.q004.accepted)showQ4(); else if (game.state.q003.accepted) showQ3(); else if (game.state.q002.reported) showQ2Article(); else showArticle();
    } else if (t.id === 'device' && !canEnterHeart(game.state) && airwayOpen(game.state)) {
      // D111: after the heart graduation the Bodyscope asks which organ to enter (design 20 section 2).
      const dv = airSpace.device;
      const go = await dialog.show([{ who: '바디스코프', text: dv.text, npc: null }], [
        { id: 'enter', label: dv.heart, sub: dv.heartSub, disabled: false },
        { id: 'airway', label: dv.airway, sub: dv.airwaySub, disabled: false }]);
      game.inspect(t.id);
      if (go === 'enter') travel({ to: 'heart', arrive: rooms.heart.spawn, facing: rooms.heart.spawnFacing, mode: 'scope-in', card: heartText.entryCard });
      else if (go === 'airway') travel({ to: 'nose', arrive: rooms.nose.spawn, facing: rooms.nose.spawnFacing, mode: 'scope-in', organ: 'airway' });
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
      const d = discoveries[t.id]!, known = game.state.inspected.includes(hxKey(t.id));
      // A stop of the current commission (Q002 rooms, Q003 normal valves) keeps its own note after this: no quiz, no lock.
      const questStop = wasQuestStop;
      if (questStop) { if (!known) { await say([{ who: d.name, text: d.text, npc: null }]); game.discover(t.id); } }
      else if (run) hud.toast('배달 중이에요 · 배달 칸의 다음 할 일을 따라가요 (구조 보기는 배달 뒤에)');
      else if (!known && !isOpen(game.state, t.id)) { const tier = tierOf(t.id); hud.toast(tier.title + ' · 별 ' + totalStars(game.state) + '/' + tier.unlockStars + '개를 모으면 열려요'); }
      else if (!known) {
        await say([{ who: d.name, text: d.text, npc: null }]);
        if (game.discover(t.id)) hud.toast('탐험 기록 · ' + d.name + ' (' + discovered(game.state).length + '/' + discoveryIds.length + ') · 다시 오면 확인 문제');
      } else {
        const stars = starsOf(game.state, t.id), done = stars >= 3, replay = observerReplay(t.id, w.roomId);
        const pick = await dialog.show([{ who: done ? d.name : '???', text: done ? '별 3개를 모은 구조예요. 연습 문제를 풀거나 설명을 다시 볼 수 있어요.' : '탐험 기록에 있는 구조예요. 이름표를 가려 두었어요. 기억나나요?', npc: null }], [
          { id: 'quiz', label: done ? '연습 문제' : '확인 문제 풀기', sub: '별 ' + stars + '/3' + (done ? ' · 보상 없음' : ' · 맞히면 별 +1 · +5G · 틀려도 잃는 것 없음'), disabled: false },
          { id: 'read', label: '설명 다시 읽기', sub: '이름과 설명을 봐요', disabled: false },
          ...(replay ? [{ id: 'replay', label: '관찰기 다시 보기', sub: replay.label + ' · 기록과 보상은 바뀌지 않아요', disabled: false }] : [])]);
        if (pick === 'quiz') await fieldCheck(t.id, nextKind(game.state, t.id, game.state.heartRun.runs + stars + game.state.revision));
        else if (pick === 'read') await say([{ who: d.name, text: d.text, npc: null }]);
        else if (pick === 'replay' && replay) { pauseInput(); replay.open(); }
      }
    } else if (isRx(t.id) && isAirwayRoom(w.roomId)) {
      // D111 airway records: same core-first tiers and field checks as the heart (design 18), counted per organ.
      const d = rxDiscoveries[t.id]!, known = game.state.inspected.includes(rxKey(t.id));
      const more = t.id === 'rx-membrane' ? NL + airSpace.membraneCross : '';
      if (!known && !rxIsOpen(game.state, t.id)) { const tier = rxTierOf(t.id); hud.toast(tier.title + ' · 호흡기 별 ' + rxTotalStars(game.state) + '/' + tier.unlockStars + '개를 모으면 열려요'); }
      else if (!known) {
        await say([{ who: d.name, text: d.text + more, npc: null }]);
        if (game.discoverRx(t.id)) hud.toast('호흡기 탐험 기록 · ' + d.name + ' (' + rxDiscovered(game.state).length + '/' + rxIds.length + ') · 다시 오면 확인 문제');
      } else {
        const stars = starsOf(game.state, t.id), done = stars >= 3, airReplay = observerReplay(t.id, w.roomId);
        const pick = await dialog.show([{ who: done ? d.name : '???', text: done ? '별 3개를 모은 구조예요. 연습 문제를 풀거나 설명을 다시 볼 수 있어요.' : '탐험 기록에 있는 구조예요. 이름표를 가려 두었어요. 기억나나요?', npc: null }], [
          { id: 'quiz', label: done ? '연습 문제' : '확인 문제 풀기', sub: '별 ' + stars + '/3' + (done ? ' · 보상 없음' : ' · 맞히면 별 +1 · +5G · 틀려도 잃는 것 없음'), disabled: false },
          { id: 'read', label: '설명 다시 읽기', sub: '이름과 설명을 봐요', disabled: false },
          ...(airReplay ? [{ id: 'replay', label: '관찰기 다시 보기', sub: airReplay.label + ' · 기록과 보상은 바뀌지 않아요', disabled: false }] : [])]);
        if (pick === 'quiz') await fieldCheck(t.id, nextKind(game.state, t.id, game.state.revision + stars));
        else if (pick === 'read') await say([{ who: d.name, text: d.text + more, npc: null }]);
        else if (pick === 'replay' && airReplay) { pauseInput(); airReplay.open(); }
      }
    } else if (t.id === 'mouth' && isAirwayRoom(w.roomId)) {
      await say([{ who: t.label, text: airSpace.mouth, npc: null }]);
    } else if (t.id.startsWith('deadend-') && isAirwayRoom(w.roomId)) {
      await say([{ who: t.label, text: airSpace.deadEnd, npc: null }]);
    } else if (t.id === 'guide') {
      if (w.roomId !== 'heart' || run || guideIntro) { const intro = guideIntro; guideIntro = false; await say(talk('guide', game.state).lines); if (intro) hud.toast('바디에게 다시 말을 걸면 혈류 배달 런을 할 수 있어요'); }
      else {
        const h = game.state.heartRun, lock = nextLocked(game.state);
        const info = '배달 ' + h.runs + '번 · 최고 ' + (h.best !== null ? fmt(h.best) + ' (' + h.bestGrade + ')' : '없음') + (h.muscle.runs ? ' · 근육 배달 ' + h.muscle.runs + '번' : '') + ' · 구조 별 ' + totalStars(game.state) + '/' + maxStars() + (lock ? ' · 다음 해금: ' + lock.title + '(별 ' + lock.unlockStars + '개)' : '');
        const pick = await dialog.show([{ who: '안내 로봇 바디', text: '삐빅! 혈류 배달 런을 해 볼래요? 적혈구를 싣고 폐에서 산소를 받아 대동맥까지 달려요. 이름 없이 단서만 보고 경유지 3곳을 찾을수록 보상이 커져요.' + NL + info, npc: null }], [
          { id: 'run', label: '혈류 배달 런 시작', sub: '매번 골드 · 등급·연속·오늘 첫 배달 보너스 · 가끔 희귀 목격 · 처음 해낸 일엔 경험치', disabled: false },
          { id: 'muscle', label: '심장 근육 배달 시작', sub: muscleOpen(game.state) ? '관상동맥으로 심장 벽 근육에 산소를 · Q006 노선 · 첫 근육 배달엔 경험치' : 'Q006 ‘펌프도 배달이 필요해’를 마치면 열려요', disabled: !muscleOpen(game.state) },
          { id: 'talk', label: '안내 다시 듣기', sub: '심장 탐사 기본 안내', disabled: false }]);
        if (pick === 'run') startRun(); else if (pick === 'muscle') startRun('muscle'); else if (pick === 'talk') await say(talk('guide', game.state).lines);
      }
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
    // A commission stop that is also a delivery stop: the commission note ran above; the run counts it too (no second quiz).
    if (runStop(t) && wasQuestStop) await runStep(t, true);
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
function showQ7() { openQ7(game, () => { const result = latestReaction(game.state); if (result) showReaction(result); }); }
function showQ8() { openQ8(game, () => { const result = latestReaction(game.state); if (result) showReaction(result); }); }
function showQ12() { openQ12(game, () => { const result = latestReaction(game.state); if (result) showReaction(result); }); }
function showQ11() { openQ11(game, () => { const result = latestReaction(game.state); if (result) showReaction(result); }); }
function showQ10() { openQ10(game, () => { const result = latestReaction(game.state); if (result) showReaction(result); }); }
function showQ9() { openQ9(game, () => { const result = latestReaction(game.state); if (result) showReaction(result); }); }
function showReaction(result: NonNullable<ReturnType<typeof latestReaction>>, replay = false) { openReaction(game, result, { readArticle: result.questId === 'Q012' ? showQ12 : result.questId === 'Q011' ? showQ11 : result.questId === 'Q010' ? showQ10 : result.questId === 'Q009' ? showQ9 : result.questId === 'Q008' ? showQ8 : result.questId === 'Q007' ? showQ7 : result.questId === 'Q006' ? showQ6 : result.questId === 'Q005' ? showQ5 : result.questId === 'Q004' ? showQ4 : result.questId === 'Q003' ? showQ3 : result.questId === 'Q002' ? showQ2Article : showArticle, exportSave }, replay); }
function saveFeedback(c: HTMLElement): () => void {
  const message = el('p', 'save-message'); message.setAttribute('role', 'status'); c.append(message);
  const update = () => { message.textContent = game.lastError ?? ''; message.classList.toggle('hidden', !game.lastError); };
  update(); return game.subscribe(update);
}
function openNotebook(tab?: number) {
  if (busy() || !world) return;
  pauseInput();
  showNotebook(game, world.roomId, { article: showArticle, q002: showQ2Article, q003: showQ3, q004:showQ4, q005: showQ5, q006: showQ6, q007: showQ7, q008: showQ8, q009: showQ9, q010: showQ10, q011: showQ11, q012: showQ12, reaction: r => showReaction(r, true), map: openMap, lunch: date => openLunchSheet(date), lunchDex: target => { void loadLunch().then(m => { target.replaceChildren(); m.renderLunchDex(target, game.state); }).catch(() => target.replaceChildren(el('p', 'muted', '도감을 불러오지 못했어요. 네트워크를 확인해 주세요.'))); } }, tab);
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
  if (isHeartRoom(world.roomId) || isAirwayRoom(world.roomId)) { pauseInput(); openAtlas({ room: world.room, roomId: world.roomId, player: { x: world.player.x, y: world.player.y }, state: game.state }, 'room'); return; }
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

if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__mq = { game, get world() { return world; }, get run() { return run; } };

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
