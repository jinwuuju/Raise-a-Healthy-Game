import './ui/style.css';
import motion from '../data/balance/movement.v0.2.json';
import { Game } from './application/game';
import { inspectLabels, lookText, objective, q1Text, talk, type Line } from './application/story';
import { outfits, presetNames, type Look } from './domain/appearance';
import { cafeMenu, canOrder } from './domain/cafe';
import { Q1, Q1_OBSERVATIONS, canEnterHeart, levelOf, obsKey, q1CanOffer, q1Seen } from './domain/quest';
import { timeModes, type TimeMode } from './domain/state';
import { SaveStore } from './infrastructure/save';
import { World } from './game/world';
import { Dialog } from './ui/dialog';
import { button, el } from './ui/dom';
import { Hud } from './ui/hud';
import { openCreator } from './ui/creator';
import { closeSheet, openSheet, sheetOpen } from './ui/sheet';
import { rooms, type Door, type Target } from './world/rooms';
import { isModelRoom, type RoomId } from './world/types';
import { campaignContent, questById, questIds, rewardFor, type QuestId } from './domain/content';
import { canAcceptInvestigation, progressOf, publishedCount, readyForArticle, reputationOf } from './domain/campaign';
import { openTaskPanel, openArticlePanel, openAtlas, openArchive } from './ui/campaign';
import { openShop, openHome, openWardrobe, openLifeTools } from './ui/life';

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
const fade = el('div', 'fade'); document.body.append(fade);

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

// ---------- Input ----------
const keys = new Set<string>();
const pointer = { id: -1, sx: 0, sy: 0, x: 0, y: 0, t: 0, steering: false };
const dpr = () => Math.min(3, window.devicePixelRatio || 1);
const busy = () => dialog.open || sheetOpen() || !world || world.locked || document.querySelector('.creator') !== null;
function pauseInput(): void { keys.clear(); pointer.id = -1; pointer.steering = false; world?.stop(); }

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
  else if (k === 'm' && world?.roomId === 'street') openMap();
});
window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', pauseInput);

// Any tap while a dialog is open advances it (and closes it after the last line), wherever it lands.
let swallowClickUntil = 0;
const onChoice = (e: Event) => !!(e.target as Element | null)?.closest?.('.dialog .choices button');
document.addEventListener('pointerdown', e => {
  if (!dialog.open || onChoice(e)) return;
  e.preventDefault(); e.stopPropagation();
  swallowClickUntil = performance.now() + 500;
  dialog.tapAnywhere();
}, true);
document.addEventListener('click', e => {
  if (performance.now() < swallowClickUntil && !onChoice(e)) { e.preventDefault(); e.stopPropagation(); }
}, true);

canvas.addEventListener('pointerdown', e => {
  if (busy()) return;
  canvas.focus({ preventScroll: true });
  canvas.setPointerCapture(e.pointerId);
  Object.assign(pointer, { id: e.pointerId, sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, t: performance.now(), steering: false });
});
canvas.addEventListener('pointermove', e => {
  if (e.pointerId !== pointer.id) return;
  pointer.x = e.clientX; pointer.y = e.clientY;
  if (!pointer.steering && (Math.hypot(pointer.x - pointer.sx, pointer.y - pointer.sy) > motion.holdToSteerCssPixels)) pointer.steering = true;
});
const endPointer = (e: PointerEvent, tap: boolean) => {
  if (e.pointerId !== pointer.id) return;
  const wasSteering = pointer.steering;
  pointer.id = -1; pointer.steering = false;
  if (tap && !wasSteering && world && !busy()) world.tap(world.screenToWorld(e.clientX * dpr(), e.clientY * dpr()));
};
canvas.addEventListener('pointerup', e => endPointer(e, true));
canvas.addEventListener('pointercancel', e => endPointer(e, false));
canvas.addEventListener('contextmenu', e => e.preventDefault());

function inputState() {
  if (busy()) return { vx: 0, vy: 0, steer: null };
  const vx = (keys.has('arrowright') || keys.has('d') ? 1 : 0) - (keys.has('arrowleft') || keys.has('a') ? 1 : 0);
  const vy = (keys.has('arrowdown') || keys.has('s') ? 1 : 0) - (keys.has('arrowup') || keys.has('w') ? 1 : 0);
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
  if (scopePromptLatched || busy() || !game.state.campaign.active || canEnterHeart(game.state) || p.moving || p.facing !== 'up') { scopeStandTime = 0; return; }
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
  world.setHome(s.home);
  hud.setObjective(objective(s, world.roomId));
  const has = (f: string) => s.flags.includes(f);
  const needEditor = !has('met-editor') || (s.cafe.welcomeUsed && !has('reported-back')) || q1CanOffer(s) || (has(Q1.observed) && !has(Q1.briefed));
  world.questNpc = world.roomId === 'newsroom' && (needEditor || (!s.campaign.active && publishedCount(s) < 10)) ? 'editor' : null;
  world.questTargets = [];
  const id = s.campaign.active;
  if (id) {
    const q = questById(id), p = progressOf(s, id);
    if (world.roomId === 'newsroom') world.questTargets = [readyForArticle(s, id) ? 'my-desk' : 'device'];
    if (world.roomId === q.region) {
      world.questTargets = q.observations.flatMap((o, i) => p.evidence.includes(o.id) ? [] : [id === 'Q001' ? o.id : i === 0 ? 'investigation-a' : 'investigation-b']);
      if (q.observations.every(o => p.evidence.includes(o.id))) world.questTargets = [readyForArticle(s, id) ? 'return-pad' : 'terminal'];
    }
  }
}
game.subscribe(refresh);

function startWorld() {
  const s = game.state;
  world = new World(s.at.room, s.at.x, s.at.y, s.at.facing, s.avatar.look, s.avatar.name);
  world.onDoor = d => travel(d);
  world.onSignalWait = (_c, sec) => hud.toast(sec > 0 ? '빨간불이에요. 초록불이 켜지면 건너요 · 약 ' + Math.ceil(sec) + '초' : '보행 신호가 곧 바뀌어요. 다음 초록불을 기다려요.');
  world.onTarget = t => interact(t);
  hud.setVisible(true);
  hud.setRoom(s.at.room, () => world!.minimapBase());
  refresh();
  hud.showBanner(rooms[s.at.room].title);
  canvas.focus({ preventScroll: true });
  if (game.lastError) hud.toast(game.lastError, true);
}

type Trip = Pick<Door, 'to' | 'arrive' | 'facing'> & { from?: string };
let traveling = false;
function travel(d: Trip) {
  if (!world) return;
  if (d.to === 'home' && !progressOf(game.state, 'Q001').published) { hud.toast('첫 기사를 마치면 무료 기자 숙소가 열려요.'); return; }
  if (isModelRoom(d.to)) {
    const available = campaignContent.quests.some(q => q.region === d.to && progressOf(game.state, q.id).accepted);
    if (!available) { hud.toast('편집장에게 이 구역의 취재를 받으면 탐험 길이 열려요.'); return; }
  }
  const w = world;
  traveling = true;
  w.locked = true; keys.clear(); pointer.id = -1;
  fade.classList.add('on');
  const scope = isModelRoom(d.to) || isModelRoom(w.roomId);
  if (scope) fade.classList.add('scope');
  window.setTimeout(() => {
    try { if (isModelRoom(d.to) && w.roomId === 'newsroom') game.enterHeart(); else game.enter(d.to, d.arrive.x, d.arrive.y, d.facing); }
    catch (e) { hud.toast(e instanceof Error ? e.message : '이동하지 못했어요.', true); }
    w.setRoom(game.state.at.room, game.state.at.x, game.state.at.y, game.state.at.facing);
    hud.setRoom(w.roomId, () => w.minimapBase());
    refresh();
    fade.classList.remove('on', 'scope');
    hud.showBanner(rooms[w.roomId].title);
    if (isModelRoom(w.roomId)) hud.toast(campaignContent.disclaimer);
    if (!game.persist()) hud.toast('저장하지 못했어요: ' + game.lastError, true);
    window.setTimeout(() => { w.locked = false; traveling = false; }, 120);
  }, scope ? 520 : 210);
}

async function say(lines: Line[]) { if (lines.length) await dialog.show(lines); }

async function interact(t: Target) {
  if (!world || world.locked || dialog.open) return;
  const w = world;
  if (t.id === 'device') scopePromptLatched = true;
  w.stop(); w.locked = true; keys.clear(); pointer.id = -1;
  w.faceToward(t);
  try {
    const id = game.state.campaign.active;
    const q = id ? questById(id) : null;
    if (t.npc === 'editor' && game.has('reported-back') && game.has(Q1.accepted)) {
      if (game.has(Q1.observed) && !game.has(Q1.briefed)) {
        await say(q1Text.editorBrief.map(text => ({ who: '편집장', text, npc: 'editor' })));
        game.brief();
      }
      await editorCampaign();
    } else if (t.npc) {
      const script = talk(t.npc, game.state);
      await say(script.lines);
      if (script.flag) game.flag(script.flag);
      if (script.action === 'offer-q1') await offerQ1();
      if (script.action === 'brief-q1') { game.brief(); hud.toast('연결 장치를 살펴보고 내 책상에서 기사로 엮어요.'); }
      if (t.npc === 'barista') await cafeOrder();
    } else if (t.id === 'device' && id && !canEnterHeart(game.state)) {
      const go = await dialog.show([{ who: '바디스코프', text: id === 'Q001' ? q1Text.deviceReady : q!.question + ' · ' + campaignContent.disclaimer, npc: null }],
        [{ id: 'enter', label: id === 'Q001' ? q1Text.deviceChoices.enter : q!.title + ' 구역으로 들어가기', sub: '관찰·연결·귀환 · 중단 후 이어서 가능', disabled: false }]);
      game.inspect(t.id);
      if (go === 'enter') travel({ to: q!.region, arrive: rooms[q!.region].spawn, facing: 'up' });
    } else if ((t.id === 'heart-out' || t.id === 'heart-in') && id === 'Q001') {
      const obs = q1Text.observations[t.id];
      await say([{ who: t.label, text: obs.text, npc: null }]);
      const r = game.observe(t.id);
      if (r.first) hud.toast('수첩에 적음 · ' + obs.note);
      if (r.done) window.setTimeout(() => hud.toast('관찰 2개 완료! +20XP · 연결 장치에서 배달 길을 이어 보세요. 귀환도 가능해요.'), 1600);
    } else if (t.id === 'investigation-a' || t.id === 'investigation-b') {
      if (!id || q!.region !== w.roomId) { await say([{ who: t.label, text: '이곳의 구조는 도감에서 다시 살펴볼 수 있어요. 진행 중인 취재는 수첩에서 확인해 주세요.', npc: null }]); }
      else {
        const o = q!.observations[t.id === 'investigation-a' ? 0 : 1]!;
        await say([{ who: o.title, text: o.text, npc: null }, { who: '취재 수첩', text: q!.limitations, npc: null }]);
        game.recordObservation(id, o.id); hud.toast('근거 기록 · ' + o.title);
      }
    } else if (t.id === 'terminal') {
      if (!id || q!.region !== w.roomId) hud.toast('진행 중인 취재의 구역에서 연결 장치를 살펴보세요.');
      else { pauseInput(); openTaskPanel(game, id, refresh); }
    } else if (t.id === 'heart-map') {
      openHeartMap();
    } else if (t.id === 'my-desk') {
      if (id) { pauseInput(); openArticlePanel(game, id, refresh); }
      else { pauseInput(); openArchive(game); }
    } else if (t.id === 'shelf') {
      pauseInput(); openAtlas(game);
    } else if (t.id === 'shop-catalog') {
      pauseInput(); openShop(game, refresh);
    } else if (t.id === 'home-edit') {
      pauseInput(); openHome(game, refresh);
    } else if (t.id === 'wardrobe') {
      pauseInput(); openWardrobe(game, refresh);
    } else if (t.id === 'guide') {
      await say([{ who: '안내 로봇 바디', text: q ? q.question + ' 두 표식을 관찰하고 연결 장치에서 직접 재생해 보세요. 심장 지도에서는 전체 구조와 연결 구역을 살펴볼 수 있어요.' : '심장 지도에서 방문한 구역을 이어 탐험해요.', npc: null }]);
    } else if (t.id === 'return-pad') {
      const go = await dialog.show([{ who: '귀환 장치', text: q1Text.returnPad, npc: null }],
        [{ id: 'go', label: q1Text.returnChoices.go, sub: q1Text.returnChoices.goSub, disabled: false }]);
      if (go === 'go') travel({ to: 'newsroom', arrive: { x: 308, y: 152 }, facing: 'down', from: w.roomId });
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

async function editorCampaign() {
  const active = game.state.campaign.active;
  if (active && !progressOf(game.state, active).published) {
    const q = questById(active);
    await say([{ who: '편집장', text: readyForArticle(game.state, active) ? q.debrief + ' 내 책상에서 근거를 연결해 발행해요.' : q.offer + ' 관찰과 새 배치 조작을 마치면 기사로 엮어요.', npc: 'editor' }]);
    return;
  }
  const next = questIds.find(id => !progressOf(game.state, id).published);
  if (next) {
    const q = questById(next), why = canAcceptInvestigation(game.state, next);
    if (why) { await say([{ who: '편집장', text: why, npc: 'editor' }]); return; }
    const pick = await dialog.show([{ who: '편집장', text: q.offer, npc: 'editor' }, { who: '독자 편지', text: q.question, npc: null }],
      [{ id: 'accept', label: '취재 맡기 · ' + next, sub: q.title, disabled: false }, { id: 'later', label: '나중에', sub: '거리와 숙소를 자유롭게 둘러봐요.', disabled: false }]);
    if (pick === 'accept') { game.acceptInvestigation(next); hud.toast('새 취재 · ' + q.title); }
    return;
  }
  const pick = await dialog.show([{ who: '편집장', text: '첫 특집호 완성! 신입기자로 승진했어요. 이제 취재를 다시 돌아보거나 도감·집·옷가게를 둘러봐요.', npc: 'editor' }],
    questIds.map(id => ({ id, label: questById(id).title, sub: '다시 탐험 · 반복 보상 없음', disabled: false })));
  if (pick && questIds.includes(pick as QuestId)) game.acceptInvestigation(pick as QuestId);
}

function openHeartMap() {
  pauseInput();
  openSheet('심장 탐험 지도', (c, close) => {
    c.append(el('p', 'muted', campaignContent.disclaimer + ' · 연결 길은 탐험 동선이며 실제 혈관의 크기·거리·순서를 나타내지 않아요. 해부 연결은 심장 구조 도감에서 확인해요.'));
    c.append(button('row', '심장 구조 도감 보기', () => { close(); openAtlas(game); }));
    const seen = new Set<RoomId>();
    for (const q of campaignContent.quests) {
      if (seen.has(q.region)) continue; seen.add(q.region);
      const allowed = campaignContent.quests.some(other => other.region === q.region && progressOf(game.state, other.id).accepted);
      const row = button('row', rooms[q.region].title + (world?.roomId === q.region ? ' · 현재 위치' : ''), () => { close(); travel({ to: q.region, arrive: rooms[q.region].spawn, facing: 'up' }); });
      row.disabled = !allowed || world?.roomId === q.region;
      row.append(el('span', 'sub', allowed ? '연결 구역으로 이동' : q.id + ' 취재 수락 후 탐험'));
      c.append(row);
    }
  }, () => {}, { dismissOnContentClick: false });
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
  openSheet('취재 수첩', (c, close) => {
    const goal = el('div'); goal.append(el('h3', '', '지금 할 일'), el('p', '', objective(s, world!.roomId))); c.append(goal);
    const id = s.campaign.active;
    if (id) {
      const q = questById(id), p = progressOf(s, id);
      const notes = el('div'); notes.append(el('h3', '', id + ' · ' + q.title), el('p', '', q.question));
      for (const o of q.observations) notes.append(el('p', p.evidence.includes(o.id) ? '' : 'muted', (p.evidence.includes(o.id) ? '✓ ' : '○ ') + o.title + (p.evidence.includes(o.id) ? ' · ' + o.text : ' · 구역에서 표식 관찰')));
      const completed = Object.values(p.tasks).filter(t => t.solved).length;
      notes.append(el('p', 'muted', '모형 적용 ' + completed + '개 · ' + (p.published ? '기사 발행 완료' : readyForArticle(s, id) ? '기사에 쓸 근거가 모였어요.' : '연결 장치에서 새 배치를 직접 시험해요.')));
      if (s.at.room === q.region) notes.append(button('row', '연결 장치의 기록 이어 보기', () => { close(); openTaskPanel(game, id, refresh); }));
      if (s.at.room === 'newsroom') notes.append(button('row', '내 책상에서 기사 쓰기', () => { close(); openArticlePanel(game, id, refresh); }));
      c.append(notes);
    }
    const list = el('div', 'list');
    list.append(button('row', '심장 구조·관찰 도감', () => { close(); openAtlas(game); }));
    list.append(button('row', '발행 기사 보관함 · ' + publishedCount(s) + '/10', () => { close(); openArchive(game); }));
    if (isModelRoom(s.at.room)) list.append(button('row', '하나의 심장 · 연결 구역 지도', () => { close(); openHeartMap(); }));
    list.append(button('row', '근거 핀·자료 즐겨찾기·메모', () => { close(); openLifeTools(game, refresh); }));
    c.append(list);
    const life = el('div'); life.append(el('h3', '', '취재 사이의 생활'), el('p', '', '첫 기사 후 유로프라자 옆 옷가게·무료 숙소를 방문해요. 구매 없이 모든 취재를 마칠 수 있어요.'), el('p', 'muted', '비투비씨 주문 ' + s.cafe.orderCount + '회 · 보유 ' + s.gold + 'G')); c.append(life);
    c.append(el('p', 'muted', campaignContent.disclaimer + ' · 출처와 단순화 한계는 각 도감·기사에서 확인해요.'));
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
    st.append(stat('Lv.' + lv.level, publishedCount(s) === 10 ? '신입기자' : '수습기자'), stat(lv.into + '/' + lv.need, '경험치'), stat(s.gold + 'G', '골드'), stat(String(reputationOf(s)), '명성'));
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
  if (busy() || !world || world.roomId !== 'street') return;
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
    c.append(help);
    const reset = el('div', 'list'); reset.append(button('row danger', '처음부터 다시 시작', () => { if (confirm('지금 기록을 백업하고 새 기자로 시작할까요? 파일로 내보내 두는 것도 권해요.')) { try { game.restart(); close(); location.reload(); } catch (e) { hud.toast('새로 시작하지 못했어요: ' + (e instanceof Error ? e.message : '저장 오류'), true); } } }));
    c.append(reset);
    const docs = el('a', 'row', '설계실(기획 문서) 열기'); docs.href = './design/'; docs.target = '_blank'; docs.rel = 'noopener'; c.append(docs);
    c.append(el('p', 'muted', 'Medical Quest · cardio-0.1 초반 알파 · 기획·개발 진우주'));
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
