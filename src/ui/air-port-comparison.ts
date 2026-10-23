import type { Game } from '../application/game';
import { airflow } from '../domain/breath';
import { airModes, q11Text, type AirMode } from '../domain/q011-state';
import { AirwayView } from '../game/airway-view';
import { rooms } from '../world/rooms';
import type { Point } from '../world/types';
import { button, el } from './dom';
import { openSheet } from './sheet';

/** Part of the nasal cavity shown (the whole way from the nostril to the back of the nose). */
const VIEW = { x: 0, y: 64, w: 672, h: 296 };
type Kind = 'dust' | 'pollen' | 'virus' | 'speck';
type Bit = { kind: Kind; off: number; stick: number | null };

/*
 * Particles carried by one parcel of incoming air. `stick` is where along the way the particle lands on the wall
 * (fraction of the way from the nostril to the back of the nose); null = it is still in the air at the back.
 * Dust is caught at the hairs, pollen between the shelves; most small virus-carrying particles stick to the mucus but
 * not all of them (design 20 virus thread). Qualitative picture only, not a measurement (content: observer.limit).
 */
const BITS: Record<AirMode, Bit[]> = {
  cold: [{ kind: 'speck', off: -0.4, stick: 0.55 }, { kind: 'speck', off: 0.5, stick: null }],
  dust: [
    ...[-0.7, -0.3, 0.1, 0.5, 0.8].map((off, i) => ({ kind: 'dust' as const, off, stick: 0.07 + i * 0.015 })),
    ...[-0.6, -0.1, 0.3, 0.7].map((off, i) => ({ kind: 'pollen' as const, off, stick: 0.3 + i * 0.09 })),
    { kind: 'pollen', off: 0.05, stick: null },
  ],
  virus: [
    ...[-0.8, -0.5, -0.2, 0.1, 0.35, 0.6, 0.85, -0.65, 0.2].map((off, i) => ({ kind: 'virus' as const, off, stick: 0.26 + i * 0.065 })),
    { kind: 'virus', off: -0.3, stick: null }, { kind: 'virus', off: 0.45, stick: null }, { kind: 'virus', off: 0.0, stick: null },
  ],
};

function along(pts: Point[], u: number): Point {
  const seg: number[] = []; let total = 0;
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y); seg.push(l); total += l; }
  let d = Math.max(0, Math.min(1, u)) * total, i = 0;
  while (i < seg.length - 1 && d > seg[i]!) { d -= seg[i]!; i++; }
  const a = pts[i]!, b = pts[i + 1]!, k = Math.max(0, Math.min(1, d / (seg[i] || 1)));
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
}

function drawBit(g: CanvasRenderingContext2D, kind: Kind, x: number, y: number): void {
  x = Math.round(x); y = Math.round(y);
  if (kind === 'dust') { g.fillStyle = '#6e5038'; g.fillRect(x - 3, y - 2, 6, 5); g.fillRect(x - 2, y - 3, 4, 7); g.fillStyle = '#9a7650'; g.fillRect(x - 2, y - 2, 2, 1); }
  else if (kind === 'pollen') { g.fillStyle = '#e8c23c'; g.fillRect(x - 2, y - 2, 4, 4); g.fillStyle = '#b8901c'; g.fillRect(x - 3, y, 1, 1); g.fillRect(x + 2, y - 1, 1, 1); g.fillRect(x, y - 3, 1, 1); g.fillRect(x - 1, y + 2, 1, 1); }
  else if (kind === 'virus') { g.fillStyle = '#7d4fb0'; g.fillRect(x, y, 2, 2); g.fillStyle = 'rgba(200,160,250,0.95)'; g.fillRect(x - 1, y, 1, 1); g.fillRect(x + 2, y + 1, 1, 1); g.fillRect(x + 1, y - 1, 1, 1); g.fillRect(x, y + 2, 1, 1); }
  else { g.fillStyle = 'rgba(210,200,180,0.9)'; g.fillRect(x, y, 2, 2); }
}

const mix = (a: [number, number, number], b: [number, number, number], t: number) => a.map((v, i) => Math.round(v + (b[i]! - v) * t)) as [number, number, number];

/**
 * D112 Q011 air-port observer at the back of the nose: the same nasal cavity, one parcel of incoming air followed
 * through one breath in. Only the incoming air changes (cold dry air, dusty air, air with small virus-carrying
 * particles). Warmth, moisture and particles are qualitative bars, never numbers. Progress goes through Game.
 */
export function openAirPortComparison(game: Game): void {
  let dispose = () => {};
  const o = q11Text.observer;
  openSheet(o.title + ' · 들어오는 공기만 바꾸기', c => {
    c.parentElement!.classList.add('valve-sheet', 'rhythm-sheet', 'supply-sheet', 'air-sheet'); c.classList.add('keep-open');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const replay = !!game.state.q011.publishedAt;
    const modeNav = el('div', 'seg'), explanation = el('p'), status = el('p'); status.setAttribute('role', 'status');
    const save = el('p', 'save-message'); save.setAttribute('role', 'alert');
    const updateError = () => { save.textContent = game.lastError ?? ''; }; const unsub = game.subscribe(updateError); updateError();
    const stage = el('section', 'valve-panel air-panel'), cv = el('canvas');
    cv.setAttribute('aria-label', '코안 옆 단면 · 왼쪽 콧구멍에서 오른쪽 뒤콧구멍까지 공기 한 덩이를 따라가는 모형');
    cv.style.cssText = 'width:100%;height:auto;image-rendering:pixelated;display:block;border-radius:6px';
    cv.width = VIEW.w; cv.height = VIEW.h;
    stage.append(el('h3', '', '콧구멍 → 코선반 → 뒤콧구멍'), cv);
    const gauges = el('div', 'air-gauges'); gauges.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px';
    const fills: Record<'front' | 'back', Record<'warm' | 'wet' | 'bits', HTMLElement>> = { front: {} as never, back: {} as never };
    for (const end of ['front', 'back'] as const) {
      const col = el('div', 'air-end'); col.append(el('h4', '', o.ends[end]));
      for (const key of ['warm', 'wet', 'bits'] as const) {
        const bar = el('div', 'press-gauge'), fill = el('span', 'press-fill');
        bar.setAttribute('role', 'img'); bar.setAttribute('aria-label', o.ends[end] + ' · ' + o.gauges[key] + ' 막대(측정값 아님)');
        bar.style.cssText = 'height:10px;border-radius:5px;background:rgba(255,255,255,.14);overflow:hidden;margin:2px 0 6px';
        fill.style.cssText = 'display:block;height:100%;width:0%;transition:width .4s';
        bar.append(fill); col.append(el('p', 'muted', o.gauges[key]), bar); fills[end][key] = fill;
      }
      gauges.append(col);
    }
    stage.append(gauges);
    const view = new AirwayView(rooms.nose);
    const lane = rooms.nose.airway!.lanes[0]!.pts;
    let mode: AirMode = 'cold', since = 0;
    const count = () => airModes.filter(m => game.state.q011.compared.includes(m)).length;
    const record = button('primary air-record', '이 공기 기록하기', () => {
      try {
        const first = game.compareQ11(mode);
        status.textContent = count() === airModes.length ? '세 가지 공기를 모두 기록했어요. 편집국 내 자리에서 본 것과 코가 하는 일을 이어 기사를 써요.' : (first ? o.modes[mode].label + ' 기록 완료' : '이미 기록한 공기예요') + ' (' + count() + '/' + airModes.length + ') · 다른 공기도 골라 봐요.';
        paint();
      } catch (e) { status.textContent = e instanceof Error ? e.message : '기록하지 못했어요.'; }
    });
    const paint = () => {
      modeNav.querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-pressed', String(airModes[i] === mode)));
      explanation.textContent = o.modes[mode].text;
      for (const end of ['front', 'back'] as const) for (const key of ['warm', 'wet', 'bits'] as const) {
        const level = o.modes[mode][end][key]; fills[end][key].style.width = level * 25 + '%';
        fills[end][key].style.background = key === 'warm' ? (level >= 3 ? '#ffb48a' : '#8fc8ff') : key === 'wet' ? '#9be7ff' : '#d9c48a';
      }
      const done = game.state.q011.compared.includes(mode);
      record.textContent = replay ? '발행한 취재예요 · 기록은 바뀌지 않아요' : done ? o.modes[mode].label + ' · 기록함' : o.modes[mode].label + ' 기록하기';
      record.disabled = replay;
    };
    airModes.forEach(m => modeNav.append(button('', o.modes[m].label, () => { mode = m; since = 0; paint(); })));
    const brief = el('div', 'valve-brief'), notes = el('div', 'valve-notes');
    brief.append(el('p', 'muted', q11Text.disclaimer), save, el('p', '', o.intro), modeNav, explanation, el('p', 'muted', o.singleVariable));
    notes.append(el('p', 'muted', o.limit), status, record);
    const refs = el('details', 'article-sources'); refs.append(el('summary', '', '비교의 출처와 한계'));
    for (const source of q11Text.sources) {
      const a = el('a', '', source.title); a.href = source.url; a.target = '_blank'; a.rel = 'noopener'; refs.append(a, el('p', 'muted', source.section + ' · 확인 ' + source.checked));
    }
    q11Text.simplification.forEach(s => refs.append(el('p', 'muted', s))); notes.append(refs);
    c.append(brief, stage, notes);
    paint();
    status.textContent = replay ? '발행한 취재의 관찰기를 다시 보고 있어요.' : '기록한 공기 ' + count() + '/' + airModes.length;
    const g = cv.getContext('2d');
    let raf = 0, alive = true, previous = performance.now(), clock = 1, signature = '';
    const render = (now: number) => {
      if (!alive) return;
      const still = motion.matches, dt = document.hidden ? 0 : Math.min(0.05, (now - previous) / 1000); previous = now;
      const sig = mode + '/' + still;
      if (!g || document.hidden || (still && sig === signature)) { raf = requestAnimationFrame(render); return; }
      signature = sig; since += still ? 0 : dt;
      // A breath in carries the parcel from the nostril to the back of the nose; the parcel waits there, then a new one comes.
      clock = still ? 1 : (clock + dt) % 2.6; view.update(still ? 0 : dt, Math.min(clock, 2.4));
      const cycle = still ? 1 : (since % 5) / 3.6, u = Math.min(1, cycle);
      g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false;
      g.fillStyle = '#2a0812'; g.fillRect(0, 0, VIEW.w, VIEW.h);
      view.drawFloor(g, VIEW.x, VIEW.y, VIEW.w, VIEW.h);
      const m = o.modes[mode], p = along(lane, u), px = p.x - VIEW.x, py = p.y - VIEW.y;
      // Particles: on the parcel until they land on the wet wall, then carried slowly back by the mucus.
      BITS[mode].forEach((b, i) => {
        if (b.stick !== null && u >= b.stick) {
          const q = along(lane, b.stick), drift = still ? 0 : Math.max(0, (u - b.stick)) * 18;
          drawBit(g, b.kind, q.x - VIEW.x + drift + (i % 3), q.y - VIEW.y + 20 + (i % 2) * 3);
        } else drawBit(g, b.kind, px + b.off * 10 + Math.sin(since * 3 + i) * (still ? 0 : 1.5), py + b.off * 9);
      });
      // The parcel: blue when cold, warmer as it goes; drops of moisture gather around it.
      const warm = (m.front.warm + (m.back.warm - m.front.warm) * u) / 4, wet = Math.round(m.front.wet + (m.back.wet - m.front.wet) * u);
      const [r, gg, bb] = mix([143, 200, 255], [255, 180, 138], warm);
      for (let k = -5; k <= 5; k++) for (let j = -4; j <= 4; j++) {
        const d = (k * k) / 25 + (j * j) / 16; if (d > 1) continue;
        g.fillStyle = `rgba(${r},${gg},${bb},${(0.55 - d * 0.35).toFixed(3)})`; g.fillRect(Math.round(px + k), Math.round(py + j), 1, 1);
      }
      for (let k = 0; k < wet * 2; k++) { const a = k * 2.4 + since; g.fillStyle = 'rgba(190,240,255,0.9)'; g.fillRect(Math.round(px + Math.cos(a) * 8), Math.round(py + Math.sin(a) * 6), 1, 2); }
      // End markers and the breath direction.
      g.fillStyle = 'rgba(255,240,200,0.9)'; g.fillRect(4, Math.round(along(lane, 0).y - VIEW.y) - 14, 2, 10); g.fillRect(VIEW.w - 30, Math.round(along(lane, 1).y - VIEW.y) - 14, 2, 10);
      if (!still && airflow(Math.min(clock, 2.4)) > 0.05) { g.fillStyle = 'rgba(226,246,255,0.7)'; for (let k = 0; k < 3; k++) g.fillRect(Math.round(px - 10 - k * 4), Math.round(py), 2, 1); }
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    dispose = () => { alive = false; cancelAnimationFrame(raf); unsub(); };
  }, () => dispose(), { dismissOnOutside: false, blockRepeatedActivation: true });
}
