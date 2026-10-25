import bodyMap from '../../data/content/body-map.v0.1.json';
import heart from '../../data/content/heart-interior.v0.1.json';
import { organMinimap } from '../art/organ';
import { airwayMinimap } from '../art/airway';
import airContent from '../../data/content/respiratory-interior.v0.1.json';
import { airwayOpen, rxDiscovered, rxDiscoveries, rxIds, rxMaxStars, rxNextLocked, rxRoomProgress, rxRoomStars, rxTotalStars } from '../domain/airway';
import { Q11_OBSERVER, q11NotesDone } from '../domain/q011';
import { q11Text } from '../domain/q011-state';
import { Q12_OBSERVER, q12NotesDone } from '../domain/q012';
import { q12Text } from '../domain/q012-state';
import { airwayRoomIds } from '../world/types';
import { discovered, discoveries, discoveryIds, roomProgress } from '../domain/heart';
import { maxStars, roomStars, tiers, tierStars, totalStars } from '../domain/mastery';
import { Q1_OBSERVATIONS, obsKey } from '../domain/quest';
import type { GameState } from '../domain/state';
import type { Room } from '../world/rooms';
import type { Point, RoomId } from '../world/types';
import { button, el } from './dom';
import { openSheet } from './sheet';

/*
 * Bodyscope map (D059/D060): one instrument screen with three scales, from the outside in —
 * the body, the heart's two circuits, and the room the reporter stands in. Canvases are drawn at the
 * real screen resolution so every label stays sharp; nothing here changes game progress.
 */
export type AtlasTab = 'body' | 'heart' | 'airway' | 'room';
type Ctx = { room: Room; roomId: RoomId; player: Point; state: GameState };
type Organ = { id: string; name: string; x: number; y: number; rx: number; ry: number; state: string; rooms: string[]; note?: string; opensWith?: string };
/** D112: organs whose state follows the game (the airway opens with the heart graduation). */
const stateOf = (o: Organ, s: GameState): string => (o.opensWith === 'airway' && airwayOpen(s) ? 'open' : o.state);

const C = {
  panel: '#1a1322', deep: '#120c18', scope: '#7ff0f2', gold: '#f1cf8b', ivory: '#f7ecdd', muted: '#a99fb8',
  rich: '#e2445c', poor: '#7f2a44', richCore: '#ff8a98', poorCore: '#b24a64',
};
const FONT = "'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',system-ui,sans-serif";
const font = (px: number, w = 700) => `${w} ${px}px ${FONT}`;

export function openAtlas(ctx: Ctx, start: AtlasTab): void {
  let stopResize = () => {};
  openSheet('바디스코프 지도', (c) => {
    c.parentElement?.classList.add('atlas-sheet');
    c.classList.add('keep-open');
    const scale = el('nav', 'scale'); scale.setAttribute('aria-label', '지도 축척');
    const head = el('div', 'place');
    const stage = el('div', 'stage');
    const info = el('div', 'info');
    // D112: inside the airway the middle scale is the air path instead of the heart's two circuits.
    const tabs: [AtlasTab, string][] = ctx.room.airway ? [['body', '인체'], ['airway', '호흡기'], ['room', '이 방']] : [['body', '인체'], ['heart', '심장'], ['room', '이 방']];
    let currentTab = start, raf = 0;
    const show = (tab: AtlasTab) => {
      currentTab = tab; c.scrollTop = 0;
      scale.querySelectorAll('button').forEach((b, i) => { const on = tabs[i]![0] === tab; b.setAttribute('aria-pressed', String(on)); b.classList.toggle('on', on); });
      const cv = el('canvas'); cv.className = 'scope-canvas';
      stage.replaceChildren(cv);
      head.replaceChildren(...placeLine(ctx, tab));
      info.replaceChildren(...(tab === 'room' ? roomInfo(ctx) : tab === 'heart' ? heartInfo(ctx) : tab === 'airway' ? airwayInfo(ctx) : bodyInfo(ctx)));
      requestAnimationFrame(() => (tab === 'room' ? drawRoom : tab === 'heart' ? drawHeart : tab === 'airway' ? drawAirway : drawBody)(cv, ctx));
    };
    tabs.forEach(([id, label], i) => {
      if (i) scale.append(el('span', 'step', '›'));
      scale.append(button('', label, () => show(id)));
    });
    c.append(scale, head, stage, info);
    show(start);
    // D116: phones rotate and windows resize while the map is open; redraw at the new size instead of stretching.
    const onResize = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => show(currentTab)); };
    window.addEventListener('resize', onResize);
    stopResize = () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
  }, () => stopResize());
}

function placeLine(ctx: Ctx, tab: AtlasTab): HTMLElement[] {
  const total = discoveryIds.length, found = discovered(ctx.state).length;
  if (tab === 'room') {
    const pr = ctx.room.airway ? rxRoomProgress(ctx.state, ctx.roomId) : roomProgress(ctx.state, ctx.roomId);
    return [el('h3', '', ctx.room.title.split(' · ').pop()!), el('span', 'meter', '이 방에서 찾은 구조 ' + pr.found + '/' + pr.total)];
  }
  if (tab === 'heart') {
    const st = totalStars(ctx.state), mx = maxStars();
    return [el('h3', '', '심장과 두 순환'), el('span', 'meter', '심장 탐험 기록 ' + found + '/' + total + ' · 숙련 ★' + st + '/' + mx + ' (' + Math.floor(st * 100 / mx) + '%)')];
  }
  if (tab === 'airway') {
    const st = rxTotalStars(ctx.state), mx = rxMaxStars();
    return [el('h3', '', '공기 길 · 콧구멍에서 폐포까지'), el('span', 'meter', '호흡기 탐험 기록 ' + rxDiscovered(ctx.state).length + '/' + rxIds.length + ' · 숙련 ★' + st + '/' + mx + ' (' + Math.floor(st * 100 / mx) + '%)')];
  }
  return [el('h3', '', '인체'), el('span', 'meter', '탐험할 수 있는 기관 ' + (bodyMap.organs as Organ[]).filter(o => stateOf(o, ctx.state) !== 'locked').length + '/' + bodyMap.organs.length)];
}

/** D116: the canvas height the sheet shows at once, below the scale and the place line, so the whole drawing is visible without scrolling. */
function fitHeight(cv: HTMLCanvasElement): number {
  const stage = cv.parentElement!, content = stage.closest('.content') as HTMLElement | null;
  if (!content) return Infinity;
  const top = stage.getBoundingClientRect().top - content.getBoundingClientRect().top + content.scrollTop;
  return Math.floor(content.clientHeight - (parseFloat(getComputedStyle(content).paddingBottom) || 0) - top - 2);
}

/** Canvas sized to its box at device resolution; returns a context in CSS pixels. */
function prepare(cv: HTMLCanvasElement, aspect: number, maxH: number): { g: CanvasRenderingContext2D; W: number; H: number } {
  const W = Math.max(240, cv.parentElement!.clientWidth);
  const H = Math.max(180, Math.min(Math.round(W * aspect), maxH, fitHeight(cv)));
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  cv.style.height = H + 'px';
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  const g = cv.getContext('2d')!;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const bg = g.createRadialGradient(W * 0.5, H * 0.45, 10, W * 0.5, H * 0.5, Math.max(W, H) * 0.75);
  bg.addColorStop(0, '#24182e'); bg.addColorStop(1, C.deep);
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(127,240,242,0.05)'; g.lineWidth = 1;
  for (let x = 0.5; x < W; x += 24) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
  for (let y = 0.5; y < H; y += 24) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  g.strokeStyle = 'rgba(127,240,242,0.4)'; g.lineWidth = 1.5;
  for (const [x, y, dx, dy] of [[8, 8, 1, 1], [W - 8, 8, -1, 1], [8, H - 8, 1, -1], [W - 8, H - 8, -1, -1]] as [number, number, number, number][]) {
    g.beginPath(); g.moveTo(x, y + dy * 14); g.lineTo(x, y); g.lineTo(x + dx * 14, y); g.stroke();
  }
  return { g, W, H };
}

function tag(g: CanvasRenderingContext2D, text: string, x: number, y: number, o: { color?: string; fill?: string; stroke?: string; size?: number; W?: number } = {}): { x: number; y: number; w: number; h: number } {
  const size = o.size ?? 12;
  g.font = font(size, 800);
  const w = g.measureText(text).width + 14, h = size + 10;
  let bx = x - w / 2;
  if (o.W) bx = Math.max(6, Math.min(o.W - w - 6, bx));
  g.beginPath(); g.roundRect(bx, y - h / 2, w, h, h / 2);
  g.fillStyle = o.fill ?? 'rgba(18,12,24,0.88)'; g.fill();
  if (o.stroke) { g.lineWidth = 1; g.strokeStyle = o.stroke; g.stroke(); }
  g.fillStyle = o.color ?? C.ivory; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, bx + w / 2, y + 0.5);
  return { x: bx, y: y - h / 2, w, h };
}

function you(g: CanvasRenderingContext2D, x: number, y: number) {
  for (const [r, a] of [[16, 0.12], [10, 0.25]] as [number, number][]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = `rgba(127,240,242,${a})`; g.fill(); }
  g.beginPath(); g.arc(x, y, 5.5, 0, Math.PI * 2); g.fillStyle = '#ffffff'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = C.scope; g.stroke();
}

// ------------------------------------------------------------------ this room
function drawRoom(cv: HTMLCanvasElement, ctx: Ctx) {
  const { g, W, H } = prepare(cv, 1, Math.round(window.innerHeight * 0.52));
  const air = !!ctx.room.airway, m = air ? airwayMinimap(ctx.room, 0.5) : organMinimap(ctx.room, 0.5);
  const pad = 20, k = Math.min((W - pad * 2) / m.c.width, (H - pad * 2) / m.c.height);
  const ox = (W - m.c.width * k) / 2, oy = (H - m.c.height * k) / 2;
  g.save(); g.imageSmoothingEnabled = false; g.shadowColor = 'rgba(226,68,92,0.35)'; g.shadowBlur = 18;
  g.drawImage(m.c, ox, oy, m.c.width * k, m.c.height * k); g.restore();
  const P = (x: number, y: number): [number, number] => [ox + (m.ox + x * m.s) * k, oy + (m.oy + y * m.s) * k];
  const found = air ? rxDiscovered(ctx.state) : discovered(ctx.state), taken: { x: number; y: number; w: number; h: number }[] = [];
  const free = (r: { x: number; y: number; w: number; h: number }) => !taken.some(q => r.x < q.x + q.w && r.x + r.w > q.x && r.y < q.y + q.h && r.y + r.h > q.y);
  const place = (text: string, x: number, y: number, o: Parameters<typeof tag>[4]) => {
    g.font = font(o?.size ?? 12, 800);
    const w = g.measureText(text).width + 14, h = (o?.size ?? 12) + 10;
    for (const dy of [-16, 16, -32, 32]) { const r = { x: x - w / 2, y: y + dy - h / 2, w, h }; if (free(r)) { taken.push(tag(g, text, x, y + dy, { ...o, W })); return; } }
  };
  for (const d of ctx.room.doors) {
    const [x, y] = P(d.zone.x + d.zone.w / 2, d.zone.y + d.zone.h / 2);
    g.beginPath(); g.arc(x, y, 7, 0, Math.PI * 2); g.fillStyle = C.gold; g.fill();
    place('나가는 길 · ' + d.label, x, y, { color: '#2a1d08', fill: C.gold, size: 12 });
  }
  for (const t of ctx.room.targets) {
    const [x, y] = P(t.x, t.y);
    if (t.id === 'return-pad') { g.fillStyle = C.scope; g.fillRect(x - 5, y - 5, 10, 10); place('귀환 장치', x, y, { color: C.scope, stroke: 'rgba(127,240,242,0.5)' }); continue; }
    if ((Q1_OBSERVATIONS as readonly string[]).includes(t.id)) {
      const done = ctx.state.inspected.includes(obsKey(t.id));
      g.beginPath(); g.arc(x, y, 7, 0, Math.PI * 2); g.lineWidth = 2.5; g.strokeStyle = done ? 'rgba(241,207,139,0.5)' : C.gold; g.stroke();
      place((done ? '관찰함 · ' : '취재 · ') + t.label, x, y, { color: done ? C.muted : C.gold, stroke: 'rgba(241,207,139,0.55)' });
      continue;
    }
    // D112: stops of the open air-port commission are marked like the Q001 stops.
    const q11 = ctx.state.q011, q11Open = air && q11.accepted && !q11.publishedAt;
    const scene = q11Open ? q11Text.notes.find(n => n.target === t.id && n.room === ctx.roomId) : undefined;
    const observer = q11Open && q11NotesDone(ctx.state) && t.id === Q11_OBSERVER.target && ctx.roomId === Q11_OBSERVER.room && q11.compared.length < 3;
    if ((scene && !q11.notes.includes(scene.id as never)) || observer) {
      g.beginPath(); g.arc(x, y, 7, 0, Math.PI * 2); g.lineWidth = 2.5; g.strokeStyle = C.gold; g.stroke();
      place('취재 · ' + (observer ? q11Text.observer.title : scene!.name.replace('장면 · ', '')), x, y, { color: C.gold, stroke: 'rgba(241,207,139,0.55)' });
      continue;
    }
    // D113: the same for the open fork commission (throat scenes, then the fork observer).
    const q12 = ctx.state.q012, q12Open = air && q12.accepted && !q12.publishedAt;
    const throat = q12Open ? q12Text.notes.find(n => n.target === t.id && n.room === ctx.roomId) : undefined;
    const fork = q12Open && q12NotesDone(ctx.state) && t.id === Q12_OBSERVER.target && ctx.roomId === Q12_OBSERVER.room && q12.compared.length < 3;
    if ((throat && !q12.notes.includes(throat.id as never)) || fork) {
      g.beginPath(); g.arc(x, y, 7, 0, Math.PI * 2); g.lineWidth = 2.5; g.strokeStyle = C.gold; g.stroke();
      place('취재 · ' + (fork ? q12Text.observer.title : throat!.name.replace('장면 · ', '')), x, y, { color: C.gold, stroke: 'rgba(241,207,139,0.55)' });
      continue;
    }
    if (!t.id.startsWith(air ? 'rx-' : 'hx-')) continue;
    if (found.includes(t.id)) {
      g.save(); g.translate(x, y); g.rotate(Math.PI / 4); g.fillStyle = C.scope; g.fillRect(-4, -4, 8, 8); g.restore();
      place(air ? rxDiscoveries[t.id]!.name : discoveries[t.id]!.name, x, y, { color: '#e3fbf8', stroke: 'rgba(127,240,242,0.35)' });
    } else {
      g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2); g.setLineDash([2, 2]); g.lineWidth = 1.5; g.strokeStyle = 'rgba(247,236,221,0.55)'; g.stroke(); g.setLineDash([]);
    }
  }
  const [px, py] = P(ctx.player.x, ctx.player.y);
  you(g, px, py);
}

function roomInfo(ctx: Ctx): HTMLElement[] {
  const list = el('ul', 'chips');
  if (ctx.room.airway) {
    const found = rxDiscovered(ctx.state);
    for (const id of rxIds.filter(i => rxDiscoveries[i]!.room === ctx.roomId)) list.append(el('li', found.includes(id) ? 'got' : 'unknown', found.includes(id) ? rxDiscoveries[id]!.name : '아직 모름'));
    return [legend([['you', '지금 위치'], ['exit', '나가는 길'], ['pad', '귀환 장치'], ['got', '기록한 구조'], ['unknown', '아직 못 찾은 구조']]), list,
      el('p', 'note', '공기는 들숨과 날숨으로 같은 길을 오가서 어느 문으로든 되돌아갈 수 있어요. 노란 선은 삼킬 때만 닫히는 문(목젖·후두덮개)이에요.')];
  }
  const ids = discoveryIds.filter(id => discoveries[id]!.room === ctx.roomId), found = discovered(ctx.state);
  for (const id of ids) list.append(el('li', found.includes(id) ? 'got' : 'unknown', found.includes(id) ? discoveries[id]!.name : '아직 모름'));
  return [legend([['you', '지금 위치'], ['exit', '나가는 길'], ['pad', '귀환 장치'], ['got', '기록한 구조'], ['unknown', '아직 못 찾은 구조']]), list,
    el('p', 'note', '판막 표시 가운데 밝은 쪽이 이 방에서 나가는 판막이고, 흐린 쪽은 들어온 판막이에요. 들어온 판막으로는 되돌아갈 수 없어요.')];
}

// ------------------------------------------------------------------ heart: two circuits
function vessel(g: CanvasRenderingContext2D, pts: [number, number][], rich: boolean, name: string, labelAt: number) {
  g.lineCap = 'round'; g.lineJoin = 'round';
  const path = () => { g.beginPath(); g.moveTo(pts[0]![0], pts[0]![1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i]![0], pts[i]![1]); };
  path(); g.lineWidth = 11; g.strokeStyle = rich ? C.rich : C.poor; g.stroke();
  path(); g.lineWidth = 3; g.strokeStyle = rich ? C.richCore : C.poorCore; g.stroke();
  for (let i = 1; i < pts.length; i++) {
    const [x1, y1] = pts[i - 1]!, [x2, y2] = pts[i]!, len = Math.hypot(x2 - x1, y2 - y1);
    if (len < 40) continue;
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, a = Math.atan2(y2 - y1, x2 - x1);
    g.beginPath(); g.moveTo(mx + Math.cos(a) * 7, my + Math.sin(a) * 7); g.lineTo(mx + Math.cos(a + 2.4) * 7, my + Math.sin(a + 2.4) * 7); g.lineTo(mx + Math.cos(a - 2.4) * 7, my + Math.sin(a - 2.4) * 7);
    g.closePath(); g.fillStyle = '#fff1ea'; g.fill();
  }
  const [lx, ly] = pts[labelAt]!;
  g.save(); g.font = font(11, 700); g.fillStyle = rich ? '#ffb7c1' : '#d690a4'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(name, lx, ly); g.restore();
}

function drawHeart(cv: HTMLCanvasElement, ctx: Ctx) {
  const { g, W, H } = prepare(cv, 1.02, Math.round(window.innerHeight * 0.58));
  const X = (f: number) => W * f, Y = (f: number) => H * f;
  const cw = X(0.27), ch = Y(0.12);
  const node: Record<string, [number, number]> = { heart: [X(0.36), Y(0.42)], la: [X(0.64), Y(0.42)], rv: [X(0.36), Y(0.6)], lv: [X(0.64), Y(0.6)] };
  // Heart outline behind the four chambers.
  g.beginPath(); g.roundRect(X(0.19), Y(0.33), X(0.62), Y(0.36), 26); g.fillStyle = 'rgba(226,68,92,0.07)'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = 'rgba(255,170,185,0.25)'; g.stroke();
  g.beginPath(); g.moveTo(X(0.5), Y(0.34)); g.lineTo(X(0.5), Y(0.68)); g.setLineDash([4, 4]); g.strokeStyle = 'rgba(255,200,210,0.25)'; g.stroke(); g.setLineDash([]);
  // Pulmonary circuit (top): RV -> pulmonary artery -> lungs -> pulmonary veins -> LA.
  vessel(g, [[X(0.29), Y(0.6)], [X(0.17), Y(0.6)], [X(0.17), Y(0.12)], [X(0.38), Y(0.12)]], false, '폐동맥', 1);
  vessel(g, [[X(0.62), Y(0.12)], [X(0.83), Y(0.12)], [X(0.83), Y(0.42)], [X(0.71), Y(0.42)]], true, '폐정맥', 2);
  // Systemic circuit (bottom): LV -> aorta -> body -> venae cavae -> RA.
  vessel(g, [[X(0.71), Y(0.6)], [X(0.93), Y(0.6)], [X(0.93), Y(0.9)], [X(0.62), Y(0.9)]], true, '대동맥', 2);
  vessel(g, [[X(0.38), Y(0.9)], [X(0.07), Y(0.9)], [X(0.07), Y(0.42)], [X(0.29), Y(0.42)]], false, '대정맥', 2);
  // Within the heart: atria to ventricles.
  vessel(g, [[X(0.36), Y(0.47)], [X(0.36), Y(0.55)]], false, '', 0);
  vessel(g, [[X(0.64), Y(0.47)], [X(0.64), Y(0.55)]], true, '', 0);
  g.font = font(12, 800); g.fillStyle = 'rgba(247,236,221,0.55)'; g.textAlign = 'center';
  g.fillText('폐순환', X(0.5), Y(0.035)); g.fillText('온몸순환', X(0.5), Y(0.975));
  const here = ctx.roomId;
  const chip = (id: string, x: number, y: number, w: number, h: number, name: string, color: string, prog: { found: number; total: number } | null) => {
    const cur = id === here;
    if (cur) { g.save(); g.shadowColor = C.scope; g.shadowBlur = 18; g.beginPath(); g.roundRect(x - w / 2, y - h / 2, w, h, 12); g.fillStyle = C.panel; g.fill(); g.restore(); }
    g.beginPath(); g.roundRect(x - w / 2, y - h / 2, w, h, 12);
    const gr = g.createLinearGradient(0, y - h / 2, 0, y + h / 2); gr.addColorStop(0, '#2c1e34'); gr.addColorStop(1, '#1d1424');
    g.fillStyle = gr; g.fill(); g.lineWidth = cur ? 2.5 : 1.5; g.strokeStyle = cur ? C.scope : color; g.stroke();
    g.fillStyle = C.ivory; g.font = font(Math.max(12, Math.min(15, w / 6)), 800); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(name, x, y - (prog ? 7 : 0));
    if (prog) {
      const bw = w - 26, bx = x - bw / 2, by = y + 9;
      g.fillStyle = 'rgba(255,255,255,0.1)'; g.beginPath(); g.roundRect(bx, by, bw, 4, 2); g.fill();
      g.fillStyle = cur ? C.scope : color; g.beginPath(); g.roundRect(bx, by, Math.max(4, bw * (prog.found / Math.max(1, prog.total))), 4, 2); g.fill();
    }
    if (cur) tag(g, '지금 여기', x, y - h / 2 - 12, { color: '#062a2a', fill: C.scope, size: 11, W });
    // D108 see-through map: this room's stars at the chip's corner, gold when the room's medal is earned.
    const rs = roomStars(ctx.state, id);
    if (rs.max) {
      if (rs.medal) { g.beginPath(); g.roundRect(x - w / 2 - 3, y - h / 2 - 3, w + 6, h + 6, 14); g.lineWidth = 2; g.strokeStyle = C.gold; g.stroke(); }
      tag(g, (rs.medal ? '메달 ★' : '★') + rs.stars + (rs.medal ? '' : '/' + rs.max), x + w / 2 - 8, y + h / 2, { color: '#2a1d05', fill: rs.stars ? C.gold : 'rgba(241,207,139,0.45)', size: 10, W });
    }
  };
  const names: Record<string, string> = { heart: '우심방', rv: '우심실', la: '좌심방', lv: '좌심실' };
  for (const [id, [x, y]] of Object.entries(node)) chip(id, x, y, cw, ch, names[id]!, id === 'heart' || id === 'rv' ? '#b24a64' : '#e2445c', roomProgress(ctx.state, id as RoomId));
  chip('lung', X(0.5), Y(0.12), X(0.3), Y(0.11), '폐', '#e48a9c', roomProgress(ctx.state, 'lung'));
  chip('aorta', X(0.93), Y(0.75), X(0.13), Y(0.1), '대동맥', '#e2445c', null);
  chip('body', X(0.5), Y(0.9), X(0.3), Y(0.1), '온몸', 'rgba(247,236,221,0.35)', null);
}

function heartInfo(ctx: Ctx): HTMLElement[] {
  const p = roomProgress(ctx.state, 'aorta');
  const medals = ['heart', 'rv', 'lung', 'la', 'lv', 'aorta'].filter(r => roomStars(ctx.state, r).medal).length;
  const tierLine = tiers.map(t => { const ts = tierStars(ctx.state, t); return t.title + ' ★' + ts.stars + '/' + ts.max; }).join(' · ');
  return [legend([['poor', '산소가 적은 피'], ['rich', '산소가 많은 피'], ['you', '지금 있는 곳']]),
    el('p', '', '방 모서리의 ★는 그 방 구조의 확인 문제 별이에요. 방의 별을 모두 모으면 금색 메달 테두리가 생겨요. ' + tierLine + ' · 메달 ' + medals + '/6'),
    el('p', '', '오른쪽 심장은 피를 폐로 보내고(폐순환), 왼쪽 심장은 온몸으로 보내요(온몸순환). 판막은 이 화살표 방향으로만 열려요.'),
    el('p', 'note', '대동맥 뿌리 기록 ' + p.found + '/' + p.total + '. 이 그림은 순서를 보여 주는 도식이라 실제 방의 위치·크기와 다릅니다. ' + heart.disclaimer)];
}

// ------------------------------------------------------------------ body
function drawBody(cv: HTMLCanvasElement, ctx: Ctx) {
  const { g, W, H } = prepare(cv, 1.25, Math.round(window.innerHeight * 0.6));
  // D116: labels must fit inside the canvas. Narrow screens drop the ‘준비 중’ words (the legend and the dashed outline say it).
  const narrow = W < 480, labelFont = font(narrow ? 12 : 13, 800);
  const labelOf = (o: Organ, state: string) => o.name + (state === 'partial' ? ' (일부)' : state === 'locked' && !narrow ? ' · 준비 중' : '');
  g.font = labelFont;
  let lw = 0, rw = 0;
  for (const o of bodyMap.organs as Organ[]) { const w = g.measureText(labelOf(o, stateOf(o, ctx.state))).width; if (o.x < 300) lw = Math.max(lw, w); else rw = Math.max(rw, w); }
  const s = Math.max(0.12, Math.min((W * 0.62) / 600, (H * 0.92) / 860, (W - lw - rw - 48) / 360));
  const oxLo = lw + 24 - 120 * s, oxHi = W - 24 - rw - 480 * s;
  const ox = Math.max(oxLo, Math.min(oxHi, W / 2 - 300 * s)), oy = (H - 22) / 2 - 430 * s;
  const T = (x: number, y: number): [number, number] => [ox + x * s, oy + y * s];
  // Silhouette: one smooth outline.
  const P = (pts: number[][]) => { g.beginPath(); const [x0, y0] = T(pts[0]![0]!, pts[0]![1]!); g.moveTo(x0, y0); for (const q of pts.slice(1)) { const [a, b] = T(q[0]!, q[1]!), [c, d] = T(q[2]!, q[3]!); g.quadraticCurveTo(a, b, c, d); } g.closePath(); };
  P([[300, 172], [338, 172, 342, 186], [420, 196, 432, 232], [470, 360, 494, 470], [500, 492, 476, 494], [454, 470, 428, 330], [432, 520, 418, 700], [412, 850, 380, 852], [348, 850, 344, 760], [320, 700, 300, 700], [280, 700, 256, 760], [252, 850, 220, 852], [188, 850, 182, 700], [168, 520, 172, 330], [146, 470, 124, 494], [100, 492, 106, 470], [130, 360, 168, 232], [180, 196, 258, 186], [262, 172, 300, 172]]);
  const fill = g.createLinearGradient(0, oy, 0, oy + 860 * s); fill.addColorStop(0, '#2d2140'); fill.addColorStop(1, '#1d1529');
  g.fillStyle = fill; g.fill(); g.lineWidth = 1.5; g.strokeStyle = 'rgba(127,240,242,0.45)'; g.stroke();
  const [hx, hy] = T(300, 96); g.beginPath(); g.ellipse(hx, hy, 60 * s, 72 * s, 0, 0, Math.PI * 2); g.fillStyle = '#2d2140'; g.fill(); g.stroke();
  const [nx, ny] = T(276, 150); g.fillStyle = '#2d2140'; g.fillRect(nx, ny, 48 * s, 30 * s);
  const t = performance.now() / 600;
  const left: { y: number; o: Organ; x: number }[] = [], right: { y: number; o: Organ; x: number }[] = [];
  for (const o of bodyMap.organs as Organ[]) {
    const [x, y] = T(o.x, o.y), rx = o.rx * s, ry = o.ry * s;
    const state = stateOf(o, ctx.state), open = state === 'open', part = state === 'partial', here = o.rooms.includes(ctx.roomId);
    if (open || part) {
      const gr = g.createRadialGradient(x - rx * 0.3, y - ry * 0.35, 1, x, y, Math.max(rx, ry));
      gr.addColorStop(0, o.id === 'heart' ? '#ff8a98' : '#f4b4c0'); gr.addColorStop(1, o.id === 'heart' ? '#b8233d' : '#b4566b');
      g.globalAlpha = part ? 0.7 : 1; g.beginPath(); g.ellipse(x, y, rx, ry, o.id === 'heart' ? -0.5 : 0, 0, Math.PI * 2); g.fillStyle = gr; g.fill(); g.globalAlpha = 1;
      if (part) { g.setLineDash([4, 3]); g.lineWidth = 1.5; g.strokeStyle = 'rgba(255,220,228,0.8)'; g.stroke(); g.setLineDash([]); }
    } else {
      g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.setLineDash([3, 4]); g.lineWidth = 1.2; g.strokeStyle = 'rgba(247,236,221,0.28)'; g.stroke(); g.setLineDash([]);
    }
    if (here) { g.beginPath(); g.ellipse(x, y, rx + 6 + Math.sin(t) * 2, ry + 6 + Math.sin(t) * 2, 0, 0, Math.PI * 2); g.lineWidth = 2.5; g.strokeStyle = C.scope; g.stroke(); }
    (o.x < 300 ? left : right).push({ y, o: { ...o, state }, x: x + (o.x < 300 ? -rx : rx) });
  }
  // Labels sit in the margins with leader lines, like an atlas plate (screen left = body right).
  for (const [side, list] of [[-1, left], [1, right]] as [number, typeof left][]) {
    list.sort((a, b) => a.y - b.y);
    // Spread the labels downwards, then pull them back up if the last one would leave the canvas.
    const gap = narrow ? 20 : 24, ys: number[] = [];
    let last = -Infinity;
    for (const it of list) { last = Math.max(it.y, last + gap); ys.push(last); }
    for (let i = ys.length - 1; i >= 0; i--) ys[i] = Math.max(12, Math.min(ys[i]!, i === ys.length - 1 ? H - 32 : ys[i + 1]! - gap));
    list.forEach((it, i) => {
      const y = ys[i]!, lx = side < 0 ? ox + 120 * s - 14 : ox + 480 * s + 14;
      g.beginPath(); g.moveTo(it.x, it.y); g.lineTo(lx, y); g.lineWidth = 1; g.strokeStyle = 'rgba(247,236,221,0.3)'; g.stroke();
      g.font = labelFont; g.textBaseline = 'middle'; g.textAlign = side < 0 ? 'right' : 'left';
      g.fillStyle = it.o.state === 'open' ? C.ivory : it.o.state === 'partial' ? '#f4c6cf' : 'rgba(247,236,221,0.42)';
      g.fillText(labelOf(it.o, it.o.state), lx + side * 4, y);
    });
  }
  g.font = font(11, 700); g.fillStyle = C.muted; g.textAlign = 'center';
  g.fillText('몸의 오른쪽', ox + 150 * s, H - 14); g.fillText('몸의 왼쪽', ox + 450 * s, H - 14);
}

function bodyInfo(ctx: Ctx): HTMLElement[] {
  return [legend([['open', '탐험할 수 있음'], ['part', '일부만 열림'], ['locked', '준비 중'], ['you', '지금 있는 기관']]),
    el('p', '', airwayOpen(ctx.state) ? '심장 속과 호흡기(콧구멍부터 폐포까지)를 탐험할 수 있어요. 폐포의 공기 쪽과 심장 탐사의 폐 모세혈관은 같은 폐포의 두 면이에요. 다른 기관은 취재가 열리면 하나씩 이어져요.' : '지금은 심장 속과 폐의 모세혈관 구역을 탐험할 수 있어요. 호흡기는 심장 졸업 특집호를 발행하면 열려요. 다른 기관은 취재가 열리면 하나씩 이어져요.'),
    el('p', 'note', bodyMap.note + ' ' + bodyMap.disclaimer)];
}

function legend(items: [string, string][]): HTMLElement {
  const ul = el('ul', 'legend');
  for (const [k, text] of items) { const li = el('li'); li.append(el('i', 'sw ' + k), el('span', '', text)); ul.append(li); }
  return ul;
}

// ------------------------------------------------------------------ airway: the air path (D112)

const airNames = Object.fromEntries(airContent.rooms.map(r => [r.id, r.name])) as Record<string, string>;

/** The six airway rooms in the order air comes in, two-way links, the swallow gates, the food way and the heart's side of the alveolus. */
function drawAirway(cv: HTMLCanvasElement, ctx: Ctx) {
  const { g, W, H } = prepare(cv, 1.25, Math.round(window.innerHeight * 0.6));
  // Left margin for the breath words, the path in the middle-left, notes in a right column (narrow phones included).
  const n = airwayRoomIds.length, bw = Math.min(190, (W - 64) * 0.45), x = 58 + bw / 2, top = H * 0.09, step = (H * 0.84) / (n - 1), bh = Math.min(step * 0.62, 46);
  const rx = x + bw / 2 + 10;
  const note = (text: string, y: number, o: Parameters<typeof tag>[4]) => { g.font = font(o?.size ?? 10, 800); return tag(g, text, rx + (g.measureText(text).width + 14) / 2, y, { ...o, W }); };
  const yOf = (i: number) => top + step * i;
  // Two-way air between neighbouring rooms.
  for (let i = 1; i < n; i++) {
    const y0 = yOf(i - 1) + bh / 2, y1 = yOf(i) - bh / 2;
    g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y1); g.lineWidth = 6; g.strokeStyle = 'rgba(190,232,255,0.55)'; g.stroke();
    for (const [yy, d] of [[y0 + 4, -1], [y1 - 4, 1]] as [number, number][]) { g.beginPath(); g.moveTo(x, yy + d * 6); g.lineTo(x - 6, yy); g.lineTo(x + 6, yy); g.closePath(); g.fillStyle = '#e2f6ff'; g.fill(); }
  }
  g.save(); g.font = font(11, 700); g.fillStyle = '#bfe8ff'; g.textAlign = 'right'; g.textBaseline = 'middle';
  g.fillText('들숨 ↓', x - bw / 2 - 8, yOf(1) - step / 2); g.fillText('날숨 ↑', x - bw / 2 - 8, yOf(2) - step / 2); g.restore();
  airwayRoomIds.forEach((id, i) => {
    const y = yOf(i), pr = rxRoomProgress(ctx.state, id), rs = rxRoomStars(ctx.state, id), here = ctx.roomId === id;
    g.beginPath(); g.roundRect(x - bw / 2, y - bh / 2, bw, bh, 12);
    g.fillStyle = id === 'alveoli' ? 'rgba(234,214,220,0.16)' : 'rgba(201,107,122,0.22)'; g.fill();
    g.lineWidth = here ? 3 : rs.medal ? 2.5 : 1.5; g.strokeStyle = here ? C.scope : rs.medal ? C.gold : 'rgba(255,190,200,0.45)'; g.stroke();
    if (bh >= 36) {
      g.font = font(13, 800); g.fillStyle = C.ivory; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(airNames[id] ?? id, x, y - bh * 0.17);
      g.font = font(11, 700); g.fillStyle = rs.medal ? C.gold : C.muted;
      g.fillText('기록 ' + pr.found + '/' + pr.total + ' · ★' + rs.stars + '/' + rs.max, x, y + bh * 0.24);
    } else {
      // D116: short canvases (phones on their side) get one line per room so the name and the record do not overlap.
      const line = (airNames[id] ?? id) + ' · ' + pr.found + '/' + pr.total + ' · ★' + rs.stars + '/' + rs.max;
      g.font = font(12, 800); if (g.measureText(line).width > bw - 10) g.font = font(10, 800);
      g.fillStyle = rs.medal ? C.gold : C.ivory; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(line, x, y);
    }
    if (here) you(g, x - bw / 2 + 2, y);
  });
  // Swallow gates and the food way: the oesophagus opening is never walked into.
  const gate = (i: number, text: string) => note(text, yOf(i) - bh * 0.18, { color: '#2a1d08', fill: '#fff1bf', size: 10 });
  gate(1, '삼킬 때 목젖이 닫힘'); gate(2, '삼킬 때 후두덮개가 닫힘');
  g.beginPath(); g.moveTo(x + bw / 2, yOf(1) + bh * 0.25); g.lineTo(rx + 4, yOf(2) + step * 0.5); g.setLineDash([3, 4]); g.lineWidth = 2; g.strokeStyle = 'rgba(247,236,221,0.4)'; g.stroke(); g.setLineDash([]);
  note('음식 길(식도) · 못 들어감', yOf(2) + step * 0.55, { color: C.muted, stroke: 'rgba(247,236,221,0.3)', size: 10 });
  // Mucus always goes one way on the cilia.
  note('점액 → 늘 목 쪽으로', yOf(0) + bh * 0.2, { color: '#f3e7b0', stroke: 'rgba(236,228,170,0.4)', size: 10 });
  note('점액 → 늘 위쪽으로', yOf(3) + bh * 0.1, { color: '#f3e7b0', stroke: 'rgba(236,228,170,0.4)', size: 10 });
  // The far side of the alveolus is the heart chapter's lung capillaries (same alveolus, not a copy).
  const ya = yOf(n - 1);
  g.beginPath(); g.moveTo(x + bw / 2, ya); g.lineTo(rx, ya); g.setLineDash([4, 3]); g.lineWidth = 2.5; g.strokeStyle = C.rich; g.stroke(); g.setLineDash([]);
  note('건너편 = 심장의 폐 모세혈관', ya, { color: '#ffb7c1', stroke: 'rgba(226,68,92,0.6)', size: 10 });
}

function airwayInfo(ctx: Ctx): HTMLElement[] {
  const lock = rxNextLocked(ctx.state), q = ctx.state.q011;
  const out = [legend([['you', '지금 있는 곳'], ['got', '별을 모두 모은 방 = 금색 테두리']]),
    el('p', '', '공기는 콧구멍에서 폐포까지 한 길을 들숨과 날숨으로 오가요. 삼킬 때만 목젖과 후두덮개가 길을 덮고, 점액은 숨과 상관없이 섬모를 타고 한쪽으로만 가요.' + (lock ? ' 다음 해금: ' + lock.title + ' · 호흡기 별 ' + rxTotalStars(ctx.state) + '/' + lock.unlockStars : ''))];
  if (q.accepted && !q.publishedAt) out.push(el('p', '', 'Q011 공기 항구 · 코안의 장면 ' + q.notes.length + '/4 · 관찰기 공기 ' + q.compared.length + '/3'));
  const q12 = ctx.state.q012;
  if (q12.accepted && !q12.publishedAt) out.push(el('p', '', 'Q012 갈라지는 길 · 목구멍과 공기 길 입구의 장면 ' + q12.notes.length + '/4 · 관찰기 ' + q12.compared.length + '/3'));
  out.push(el('p', 'note', airContent.disclaimer + ' ' + airContent.simplification[0]));
  return out;
}
