import type { Game } from '../application/game';
import { SWALLOW, breathWord, epiglottisDown } from '../domain/breath';
import { q12Text, throatModes, type ThroatMode } from '../domain/q012-state';
import { AirwayView } from '../game/airway-view';
import { fillPoly } from '../game/heart-view';
import { rooms } from '../world/rooms';
import type { Point } from '../world/types';
import { button, el } from './dom';
import { openSheet } from './sheet';

/** Parts of the two rooms shown side by side: the throat from the side (face on the left) and the air-way entrance from the front. */
const SIDE = { x: 110, y: 200, w: 300, h: 470 };
const FRONT = { x: 58, y: 0, w: 300, h: 470 };
/** Path of what is swallowed (mouth -> shared throat -> the back way) and of a slipping crumb (-> the front way), in room pixels. */
const FOOD: Point[] = [{ x: 150, y: 418 }, { x: 250, y: 436 }, { x: 292, y: 470 }, { x: 290, y: 540 }, { x: 300, y: 600 }, { x: 316, y: 690 }];
const CRUMB_SIDE: Point[] = [{ x: 150, y: 418 }, { x: 250, y: 436 }, { x: 286, y: 480 }, { x: 262, y: 560 }, { x: 214, y: 640 }, { x: 208, y: 680 }];
const CRUMB_FRONT: Point[] = [{ x: 208, y: -10 }, { x: 208, y: 120 }, { x: 206, y: 226 }];
/** Side view: the epiglottis at the front of the air-way entrance (the side room has no lid of its own). */
const LID = { root: { x: 168, y: 640 }, up: { x: 186, y: 566 }, down: { x: 262, y: 632 } };

function along(pts: Point[], u: number): Point {
  const seg: number[] = []; let total = 0;
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y); seg.push(l); total += l; }
  let d = Math.max(0, Math.min(1, u)) * total, i = 0;
  while (i < seg.length - 1 && d > seg[i]!) { d -= seg[i]!; i++; }
  const a = pts[i]!, b = pts[i + 1]!, k = Math.max(0, Math.min(1, d / (seg[i] || 1)));
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
}
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function drawWater(g: CanvasRenderingContext2D, x: number, y: number): void {
  x = Math.round(x); y = Math.round(y);
  for (let k = -6; k <= 6; k++) for (let j = -5; j <= 5; j++) {
    const d = (k * k) / 36 + (j * j) / 25; if (d > 1) continue;
    g.fillStyle = d > 0.7 ? '#2f6fa8' : j < -1 && k < 0 ? '#e6f7ff' : '#7cc4f0'; g.fillRect(x + k, y + j, 1, 1);
  }
}
function drawCrumb(g: CanvasRenderingContext2D, x: number, y: number): void {
  x = Math.round(x); y = Math.round(y);
  g.fillStyle = '#6b4a22'; g.fillRect(x - 3, y - 2, 7, 5); g.fillRect(x - 2, y - 3, 5, 7);
  g.fillStyle = '#d9a95c'; g.fillRect(x - 2, y - 2, 5, 3); g.fillStyle = '#f4d79a'; g.fillRect(x - 1, y - 2, 2, 1);
}
function drawSideLid(g: CanvasRenderingContext2D, down: number): void {
  const tip = { x: LID.up.x + (LID.down.x - LID.up.x) * down, y: LID.up.y + (LID.down.y - LID.up.y) * down };
  const dx = tip.x - LID.root.x, dy = tip.y - LID.root.y, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  const poly = [{ x: LID.root.x + nx * 7, y: LID.root.y + ny * 7 }, { x: tip.x + nx * 3, y: tip.y + ny * 3 }, { x: tip.x - nx * 3, y: tip.y - ny * 3 }, { x: LID.root.x - nx * 7, y: LID.root.y - ny * 7 }]
    .map(q => ({ x: q.x - SIDE.x, y: q.y - SIDE.y }));
  fillPoly(g, poly.map(q => ({ x: q.x + 1, y: q.y + 2 })), 'rgba(60,10,22,0.55)');
  fillPoly(g, poly, '#e597a3');
  fillPoly(g, [poly[0]!, poly[1]!, { x: (LID.root.x + tip.x) / 2 - SIDE.x, y: (LID.root.y + tip.y) / 2 - SIDE.y }], '#f4b3bc');
}
function puff(g: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  for (let k = -r; k <= r; k++) for (let j = -r; j <= r; j++) if (k * k + j * j <= r * r && (k + j) % 2 === 0) { g.fillStyle = 'rgba(235,245,255,0.75)'; g.fillRect(Math.round(x + k), Math.round(y + j), 1, 1); }
}

/**
 * D113 Q012 fork observer in front of the oesophagus: the same throat seen from the side and the air-way entrance seen
 * from the front, driven by the same airway clock as the walkable rooms. Only what passes the throat changes (air while
 * breathing, a sip of water, a crumb that slips while breathing in). The gate list is the content file's words, never
 * numbers. Progress goes through Game; drawing never changes the save.
 */
export function openForkComparison(game: Game): void {
  let dispose = () => {};
  const o = q12Text.observer;
  openSheet(o.title + ' · 목을 지나는 것만 바꾸기', c => {
    c.parentElement!.classList.add('valve-sheet', 'rhythm-sheet', 'supply-sheet', 'air-sheet', 'fork-sheet'); c.classList.add('keep-open');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const replay = !!game.state.q012.publishedAt;
    const modeNav = el('div', 'seg'), explanation = el('p'), result = el('p', 'fork-result'), status = el('p'); status.setAttribute('role', 'status');
    const save = el('p', 'save-message'); save.setAttribute('role', 'alert');
    const updateError = () => { save.textContent = game.lastError ?? ''; }; const unsub = game.subscribe(updateError); updateError();
    const stage = el('section', 'valve-panel air-panel fork-panel');
    const pair = el('div', 'fork-views'); pair.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:6px';
    const canvas = (label: string, caption: string, v: { w: number; h: number }) => {
      const fig = el('figure', 'fork-view'), cv = el('canvas');
      fig.style.margin = '0'; cv.setAttribute('aria-label', label);
      cv.style.cssText = 'width:100%;height:auto;image-rendering:pixelated;display:block;border-radius:6px';
      cv.width = v.w; cv.height = v.h; fig.append(cv, el('figcaption', 'muted', caption)); pair.append(fig); return cv;
    };
    const sideCv = canvas('목구멍 옆 단면 모형 · 왼쪽이 얼굴, 위쪽에 목젖, 아래에서 앞은 공기 길 뒤는 음식 길', o.views.side, SIDE);
    const frontCv = canvas('공기 길 입구 앞 단면 모형 · 위에 후두덮개, 아래에 성대와 그 틈', o.views.front, FRONT);
    stage.append(el('h3', '', '목구멍 → 갈림길 → 공기 길 · 음식 길'), pair);
    const gates = el('dl', 'fork-gates'); gates.style.cssText = 'display:grid;grid-template-columns:auto 1fr;gap:2px 10px;margin:8px 0 0';
    stage.append(result, gates);
    const side = new AirwayView(rooms.pharynx), front = new AirwayView(rooms.larynx);
    let mode: ThroatMode = 'breath', since = 0;
    const count = () => throatModes.filter(m => game.state.q012.compared.includes(m)).length;
    const record = button('primary fork-record', '이 장면 기록하기', () => {
      try {
        const first = game.compareQ12(mode);
        status.textContent = count() === throatModes.length ? '세 가지를 모두 기록했어요. 편집국 내 자리에서 삼킴 한 번을 순서대로 놓고 기사를 써요.' : (first ? o.modes[mode].label + ' 기록 완료' : '이미 기록한 장면이에요') + ' (' + count() + '/' + throatModes.length + ') · 다른 것도 골라 봐요.';
        paint();
      } catch (e) { status.textContent = e instanceof Error ? e.message : '기록하지 못했어요.'; }
    });
    const paint = () => {
      modeNav.querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-pressed', String(throatModes[i] === mode)));
      const m = o.modes[mode];
      explanation.textContent = m.text; result.textContent = '어디로 갔나 · ' + m.result;
      gates.replaceChildren();
      for (const key of ['palate', 'lid', 'cords', 'food', 'breath'] as const) gates.append(el('dt', '', o.gateNames[key]), el('dd', '', m.gates[key]));
      gates.querySelectorAll('dd').forEach(d => { (d as HTMLElement).style.margin = '0'; });
      const done = game.state.q012.compared.includes(mode);
      record.textContent = replay ? '발행한 취재예요 · 기록은 바뀌지 않아요' : done ? m.label + ' · 기록함' : m.label + ' 기록하기';
      record.disabled = replay;
    };
    throatModes.forEach(m => modeNav.append(button('', o.modes[m].label, () => { mode = m; since = 0; paint(); })));
    const brief = el('div', 'valve-brief'), notes = el('div', 'valve-notes');
    brief.append(el('p', 'muted', q12Text.disclaimer), save, el('p', '', o.intro), modeNav, explanation, el('p', 'muted', o.singleVariable));
    notes.append(el('p', 'muted', o.limit), status, record);
    const refs = el('details', 'article-sources'); refs.append(el('summary', '', '비교의 출처와 한계'));
    for (const source of q12Text.sources) {
      const a = el('a', '', source.title); a.href = source.url; a.target = '_blank'; a.rel = 'noopener'; refs.append(a, el('p', 'muted', source.section + ' · 확인 ' + source.checked));
    }
    q12Text.simplification.forEach(s => refs.append(el('p', 'muted', s))); notes.append(refs);
    c.append(brief, stage, notes);
    paint();
    status.textContent = replay ? '발행한 취재의 관찰기를 다시 보고 있어요.' : '기록한 장면 ' + count() + '/' + throatModes.length;

    const gs = sideCv.getContext('2d'), gf = frontCv.getContext('2d');
    let raf = 0, alive = true, previous = performance.now(), signature = '';
    /** Airway clock for this mode: breathing only, one slowed swallow with breaths around it, or breathing with a slip. */
    const clockOf = (t: number, still: boolean): number => {
      if (mode === 'swallow') return still ? SWALLOW.at + 1.1 : SWALLOW.at - 2 + (t % 6.4);
      return still ? 1.2 : 0.2 + (t % 6.8);
    };
    const render = (now: number) => {
      if (!alive) return;
      const still = motion.matches, dt = document.hidden ? 0 : Math.min(0.05, (now - previous) / 1000); previous = now;
      const sig = mode + '/' + still;
      if (!gs || !gf || document.hidden || (still && sig === signature)) { raf = requestAnimationFrame(render); return; }
      signature = sig; since += still ? 0 : dt;
      const clock = clockOf(since, still);
      side.update(still ? 0 : dt, clock); front.update(still ? 0 : dt, clock);
      for (const [g, v, view] of [[gs, SIDE, side], [gf, FRONT, front]] as const) {
        g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false;
        g.fillStyle = '#2a0812'; g.fillRect(0, 0, v.w, v.h);
        view.drawFloor(g, v.x, v.y, v.w, v.h);
      }
      drawSideLid(gs, epiglottisDown(clock));
      let word = breathWord(clock) === 'swallow' ? '꿀꺽 · 숨 멈춤' : breathWord(clock) === 'in' ? '들숨' : '날숨';
      if (mode === 'swallow') {
        // The sip reaches the throat just before the swallow, goes down the back way while the gates are shut.
        const s0 = SWALLOW.at - 0.8, u = still ? 0.62 : clamp01((clock - s0) / (SWALLOW.length + 0.6));
        if (clock >= s0 - 0.6 && u < 1) { const p = clock < s0 ? FOOD[0]! : along(FOOD, u); drawWater(gs, p.x - SIDE.x, p.y - SIDE.y); }
      } else if (mode === 'slip') {
        // A crumb is pulled in with a breath in, sticks above the folds, then coughs carry it back up.
        const t = still ? 2.2 : clock - 0.2, inT = 2.4, cough = 3.0, back = 4.4;
        if (t < inT) {
          const u = clamp01(t / inT);
          if (u < 0.65) { const p = along(CRUMB_SIDE, u / 0.65); drawCrumb(gs, p.x - SIDE.x, p.y - SIDE.y); }
          else { const p = along(CRUMB_FRONT, (u - 0.65) / 0.35); drawCrumb(gf, p.x - FRONT.x, p.y - FRONT.y); }
        } else if (t < cough) { const p = CRUMB_FRONT[2]!; drawCrumb(gf, p.x - FRONT.x, p.y - FRONT.y); word = '어? 걸렸다'; }
        else if (t < back) {
          const u = clamp01((t - cough) / (back - cough)); word = '콜록 콜록! 기침';
          if (u < 0.45) { const p = along(CRUMB_FRONT, 1 - u / 0.45); drawCrumb(gf, p.x - FRONT.x, p.y - FRONT.y); for (let k = 0; k < 3; k++) puff(gf, p.x - FRONT.x + (k - 1) * 9, p.y - FRONT.y + 12 + k * 4, 4); }
          else { const p = along(CRUMB_SIDE, 1 - ((u - 0.45) / 0.55) * 0.6); drawCrumb(gs, p.x - SIDE.x, p.y - SIDE.y); puff(gs, p.x - SIDE.x - 8, p.y - SIDE.y + 10, 4); }
        } else { const p = along(CRUMB_SIDE, 0.4); drawCrumb(gs, p.x - SIDE.x, p.y - SIDE.y); }
      }
      for (const g of [gs, gf]) { g.font = 'bold 12px sans-serif'; g.fillStyle = 'rgba(20,4,10,0.7)'; g.fillRect(4, 4, 104, 18); g.fillStyle = '#fff1d6'; g.fillText(word, 9, 17); }
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    dispose = () => { alive = false; cancelAnimationFrame(raf); unsub(); };
  }, () => dispose(), { dismissOnOutside: false, blockRepeatedActivation: true });
}
