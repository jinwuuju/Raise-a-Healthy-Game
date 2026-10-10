import './ui/style.css';
import motion from '../data/balance/movement.v0.2.json';
import { Game } from './application/game';
import { inspectLabels, lookText, objective, talk, type Line } from './application/story';
import { outfits, presetNames, type Look } from './domain/appearance';
import { cafeMenu, canOrder } from './domain/cafe';
import { timeModes, type TimeMode } from './domain/state';
import { SaveStore } from './infrastructure/save';
import { World } from './game/world';
import { Dialog } from './ui/dialog';
import { button, el } from './ui/dom';
import { Hud } from './ui/hud';
import { openCreator } from './ui/creator';
import { closeSheet, openSheet, sheetOpen } from './ui/sheet';
import { rooms, type Door, type Target } from './world/rooms';

class MemoryStorage implements Storage {
  private m = new Map<string, string>();
  get length() { return this.m.size; }
  clear() { this.m.clear(); }
  getItem(k: string) { return this.m.get(k) ?? null; }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  removeItem(k: string) { this.m.delete(k); }
  setItem(k: string, v: string) { this.m.set(k, v); }
}
function storage(): Storage { try { localStorage.setItem('mq.probe', '1'); localStorage.removeItem('mq.probe'); return localStorage; } catch { return new MemoryStorage(); } }

const game = new Game(new SaveStore(storage()));
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
  onAction: () => { if (world?.near) interact(world.near); },
});
hud.setVisible(false);

// ---------- Input ----------
const keys = new Set<string>();
const pointer = { id: -1, sx: 0, sy: 0, x: 0, y: 0, t: 0, steering: false };
const dpr = () => Math.min(3, window.devicePixelRatio || 1);
const busy = () => dialog.open || sheetOpen() || !world || world.locked || document.querySelector('.creator') !== null;

window.addEventListener('keydown', e => {
  if (document.querySelector('.creator') && e.key !== 'Escape') return;
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
window.addEventListener('blur', () => { keys.clear(); pointer.id = -1; world?.stop(); });

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
function frame(now: number) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (world) {
    world.update(dt, inputState());
    world.render(ctx, canvas.width, canvas.height, world.fitZoom(zoom, canvas.width, canvas.height), dpr());
    const p = world.player;
    game.setPosition(world.roomId, p.x, p.y, p.facing);
    saveClock += dt; miniClock += dt;
    if (saveClock > 8) { saveClock = 0; if (game.needsSave) game.persist(); }
    if (miniClock > 0.12) { miniClock = 0; hud.drawMinimap(p.x, p.y, now / 1000); }
  } else { ctx.fillStyle = '#15111f'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
document.addEventListener('visibilitychange', () => { if (document.hidden && game.needsSave) game.persist(); });
window.addEventListener('pagehide', () => { if (game.needsSave) game.persist(); });

// ---------- Game flow ----------
function refresh() {
  const s = game.state;
  hud.update(s);
  if (!world) return;
  world.player.look = s.avatar.look; world.player.name = s.avatar.name; world.timeMode = s.settings.time;
  hud.setObjective(objective(s, world.roomId));
  const needEditor = !s.flags.includes('met-editor') || (s.cafe.welcomeUsed && !s.flags.includes('reported-back'));
  world.questNpc = world.roomId === 'newsroom' && needEditor ? 'editor' : null;
}
game.subscribe(refresh);

function startWorld() {
  const s = game.state;
  world = new World(s.at.room, s.at.x, s.at.y, s.at.facing, s.avatar.look, s.avatar.name);
  world.onDoor = d => travel(d);
  world.onNear = t => hud.setAction(t);
  world.onTarget = t => interact(t);
  hud.setVisible(true);
  hud.setRoom(s.at.room, () => world!.minimapBase());
  refresh();
  hud.showBanner(rooms[s.at.room].title);
  canvas.focus({ preventScroll: true });
  if (game.lastError) hud.toast(game.lastError, true);
}

function travel(d: Door) {
  if (!world) return;
  const w = world;
  w.locked = true; keys.clear(); pointer.id = -1;
  fade.classList.add('on');
  window.setTimeout(() => {
    try { game.enter(d.to, d.arrive.x, d.arrive.y, d.facing); }
    catch (e) { hud.toast(e instanceof Error ? e.message : '이동하지 못했어요.', true); }
    w.setRoom(game.state.at.room, game.state.at.x, game.state.at.y, game.state.at.facing);
    hud.setRoom(w.roomId, () => w.minimapBase());
    refresh();
    fade.classList.remove('on');
    hud.showBanner(rooms[w.roomId].title);
    if (!game.persist()) hud.toast('저장하지 못했어요: ' + game.lastError, true);
    window.setTimeout(() => { w.locked = false; }, 120);
  }, 210);
}

async function say(lines: Line[]) { if (lines.length) await dialog.show(lines); }

async function interact(t: Target) {
  if (!world || world.locked || dialog.open) return;
  const w = world;
  w.stop(); w.locked = true; keys.clear(); pointer.id = -1;
  w.faceToward(t);
  try {
    if (t.npc) {
      const script = talk(t.npc, game.state);
      await say(script.lines);
      if (script.flag) game.flag(script.flag);
      if (t.npc === 'barista') await cafeOrder();
    } else {
      const text = lookText[t.id] ?? '';
      await say([{ who: t.label, text, npc: null }]);
      if (t.id === 'window-seat') { game.rest(); hud.toast('잠시 쉬었어요. (생활 행동: 경험치 없음)'); }
      game.inspect(t.id);
    }
  } catch (e) { hud.toast(e instanceof Error ? e.message : '문제가 생겼어요.', true); }
  finally { w.locked = false; refresh(); }
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
function openNotebook() {
  if (!world || dialog.open) return;
  world.stop();
  const s = game.state;
  openSheet('취재 수첩', c => {
    const goal = el('div'); goal.append(el('h3', '', '지금 할 일'), el('p', '', objective(s, world!.roomId))); c.append(goal);
    const notes = el('div'); notes.append(el('h3', '', '관찰 기록'));
    const ids = s.inspected.filter(id => inspectLabels[id]);
    if (ids.length) { const ul = el('ul', 'notes'); for (const id of ids) ul.append(el('li', '', inspectLabels[id]!)); notes.append(ul); }
    else notes.append(el('p', 'muted', '아직 기록이 없어요. 반짝이는 표식이나 사람에게 다가가 살펴보세요.'));
    c.append(notes);
    const life = el('div'); life.append(el('h3', '', '생활'), el('p', '', '비투비씨 주문 ' + s.cafe.orderCount + '회 · 첫 방문 커피 ' + (s.cafe.welcomeUsed ? '받음' : '아직'))); c.append(life);
    c.append(el('p', 'muted', '기사 작성·의학 도감은 첫 취재가 열리면 이 수첩에서 이어집니다.'));
  });
}

function openReporter() {
  if (!world || dialog.open) return;
  world.stop();
  const s = game.state;
  openSheet('기자 정보', (c, close) => {
    const st = el('div', 'stats');
    const stat = (v: string, l: string) => { const d = el('div', 'stat'); d.append(el('b', '', v), el('span', '', l)); return d; };
    st.append(stat('Lv.1', '수습기자'), stat(String(s.totalXp), '경험치'), stat(s.gold + 'G', '골드'));
    c.append(st);
    const info = el('div'); info.append(el('h3', '', s.avatar.name), el('p', '', presetNames[s.avatar.preset] + ' · ' + outfits[s.avatar.look.outfit])); c.append(info);
    const list = el('div', 'list');
    list.append(button('row', '외형 꾸미기', () => { close(); editLook(); }));
    c.append(list);
  });
}

function editLook() {
  const s = game.state;
  hud.setVisible(false);
  openCreator({ mode: 'edit', name: s.avatar.name, preset: s.avatar.preset, look: s.avatar.look, owned: s.owned,
    onDone: (name, preset, look) => { try { game.begin(name, preset, look); hud.toast('외형을 저장했어요.'); } catch (e) { hud.toast(e instanceof Error ? e.message : '저장 실패', true); } hud.setVisible(true); },
    onCancel: () => hud.setVisible(true) });
}

function openMap() {
  if (!world) return;
  world.stop();
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
  if (!world || dialog.open) return;
  world.stop();
  openSheet('메뉴', (c, close) => {
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
    help.append(el('p', '', '모바일: 화면을 누르면 그곳으로 걷고, 꾹 누른 채 움직이면 손가락 쪽으로 계속 걸어요. 오른쪽 아래 버튼으로 대화해요.'));
    c.append(help);
    const reset = el('div', 'list'); reset.append(button('row danger', '처음부터 다시 시작', () => { if (confirm('지금 기록을 지우고 새 기자로 시작할까요? 먼저 파일로 내보내 두는 것을 권해요.')) { close(); game.restart(); location.reload(); } }));
    c.append(reset);
    const docs = el('a', 'row', '설계실(기획 문서) 열기'); docs.href = './design/'; docs.target = '_blank'; docs.rel = 'noopener'; c.append(docs);
    c.append(el('p', 'muted', 'Medical Quest · redesign-1 · 기획·개발 진우주'));
  });
}

function openBackups() {
  openSheet('백업에서 복구', (c, close) => {
    const backups = game.backups();
    if (!backups.length) { c.append(el('p', 'muted', '아직 백업이 없어요. 플레이하면서 자동으로 최근 기록 2개가 보관돼요.')); return; }
    const list = el('div', 'list');
    for (const b of backups) {
      const row = button('row', b.avatar.name + ' · ' + rooms[b.at.room].title, () => { if (confirm('이 백업으로 되돌릴까요?')) { game.importState(b); close(); location.reload(); } });
      row.append(el('span', 'sub', new Date(b.updatedAt).toLocaleString('ko-KR')));
      list.append(row);
    }
    c.append(list);
  });
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
      const raw = JSON.parse(await f.text());
      if (!confirm('불러온 기록으로 바꿀까요? 지금 기록은 자동 백업에 남아요.')) return;
      game.persist(); game.importState(raw); close(); location.reload();
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
