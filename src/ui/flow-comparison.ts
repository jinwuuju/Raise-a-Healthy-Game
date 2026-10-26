import type { Game } from '../application/game';
import { SWALLOW, airflow } from '../domain/breath';
import { breathModes, q13Text, type BreathMode } from '../domain/q013-state';
import { AirwayView } from '../game/airway-view';
import { rooms } from '../world/rooms';
import { button, el } from './dom';
import { openSheet } from './sheet';

/** Parts of the two rooms shown side by side (front sections): the windpipe down to its split, and the upper bronchial tree. */
const TRACHEA = { x: 52, y: 210, w: 280, h: 470 };
const BRONCHI = { x: 110, y: 0, w: 420, h: 470 };
/** Where the arrows stand, in room pixels: the air in the middle of the windpipe, the mucus on both walls. */
const AIR_AT = { x: 192, y: 420 };
const MUCUS_AT = [{ x: 150, y: 520 }, { x: 234, y: 520 }];
const AIR_COLOUR = ['#1d4e7a', '#8fd3ff', '#e2f6ff'] as const;
const MUCUS_COLOUR = ['#6b5a1c', '#ecd86a', '#fff6c4'] as const;

/** A chunky pixel arrow: dir 1 points down, -1 points up. */
function arrow(g: CanvasRenderingContext2D, x: number, y: number, dir: 1 | -1, len: number, w: number, c: readonly [string, string, string]): void {
  x = Math.round(x); y = Math.round(y);
  const head = Math.round(w * 1.6), tip = y + dir * (len / 2), base = tip - dir * head, tail = y - dir * (len / 2);
  const rect = (x0: number, y0: number, ww: number, hh: number, col: string) => { g.fillStyle = col; g.fillRect(x0, Math.min(y0, y0 + hh), ww, Math.abs(hh)); };
  rect(x - w / 2 - 1, tail, w + 2, base - tail, c[0]); rect(x - w / 2, tail, w, base - tail, c[1]); rect(x - w / 2, tail, 1, base - tail, c[2]);
  for (let k = 0; k <= head; k++) {
    const half = Math.round(head * (1 - k / head)), yy = base + dir * k;
    g.fillStyle = c[0]; g.fillRect(x - half - 1, yy, half * 2 + 3, 1);
    if (half > 0) { g.fillStyle = c[1]; g.fillRect(x - half, yy, half * 2 + 1, 1); g.fillStyle = c[2]; g.fillRect(x - half, yy, 1, 1); }
  }
}

/** Air held still: two short bars (a pause mark) where the air arrow would be. */
function pause(g: CanvasRenderingContext2D, x: number, y: number, c: readonly [string, string, string]): void {
  x = Math.round(x); y = Math.round(y);
  for (const dx of [-8, 4]) { g.fillStyle = c[0]; g.fillRect(x + dx - 1, y - 12, 7, 24); g.fillStyle = c[1]; g.fillRect(x + dx, y - 11, 5, 22); g.fillStyle = c[2]; g.fillRect(x + dx, y - 11, 1, 22); }
}

/**
 * D117 Q013 flow observer in the middle of the trachea: the windpipe and the upper bronchial tree seen from the front,
 * driven by the same airway clock and the same AirwayView as the walkable rooms. Only the breath changes (breathing in,
 * breathing out, holding the breath). The air specks follow the breath; the mucus on the cilia keeps going up whatever
 * the breath does. The flow list is the content file's words, never numbers. Progress goes through Game; drawing never
 * changes the save.
 */
export function openFlowComparison(game: Game): void {
  let dispose = () => {};
  const o = q13Text.observer;
  openSheet(o.title + ' · 숨만 바꾸기', c => {
    c.parentElement!.classList.add('valve-sheet', 'rhythm-sheet', 'supply-sheet', 'air-sheet', 'flow-sheet'); c.classList.add('keep-open');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const replay = !!game.state.q013.publishedAt;
    const modeNav = el('div', 'seg'), explanation = el('p'), result = el('p', 'flow-result'), status = el('p'); status.setAttribute('role', 'status');
    const save = el('p', 'save-message'); save.setAttribute('role', 'alert');
    const updateError = () => { save.textContent = game.lastError ?? ''; }; const unsub = game.subscribe(updateError); updateError();
    const stage = el('section', 'valve-panel air-panel flow-panel');
    const pair = el('div', 'flow-views'); pair.style.cssText = 'display:grid;grid-template-columns:' + TRACHEA.w + 'fr ' + BRONCHI.w + 'fr;gap:6px';
    const canvas = (label: string, caption: string, v: { w: number; h: number }) => {
      const fig = el('figure', 'flow-view'), cv = el('canvas');
      fig.style.margin = '0'; cv.setAttribute('aria-label', label);
      cv.style.cssText = 'width:100%;height:auto;image-rendering:pixelated;display:block;border-radius:6px';
      cv.width = v.w; cv.height = v.h; fig.append(cv, el('figcaption', 'muted', caption)); pair.append(fig); return cv;
    };
    const tracheaCv = canvas('기관 앞 단면 모형 · 위쪽이 목, 아래에서 좌우로 갈라짐, 가운데 파란 화살표는 공기, 양쪽 벽의 노란 화살표는 점액', o.views.trachea, TRACHEA);
    const bronchiCv = canvas('기관지 앞 단면 모형 · 왼쪽이 몸의 오른쪽, 가지마다 점액이 위로 모여 오름', o.views.bronchi, BRONCHI);
    stage.append(el('h3', '', '기관 → 갈림 능선 → 좌우 기관지'), pair, el('p', 'muted', '파란 화살표 = 공기 · 노란 화살표 = 점액'));
    const flows = el('dl', 'flow-list'); flows.style.cssText = 'display:grid;grid-template-columns:auto 1fr;gap:2px 10px;margin:8px 0 0';
    stage.append(result, flows);
    const tube = new AirwayView(rooms.trachea), tree = new AirwayView(rooms.bronchi);
    let mode: BreathMode = 'in', since = 0;
    const count = () => breathModes.filter(m => game.state.q013.compared.includes(m)).length;
    const record = button('primary flow-record', '이 장면 기록하기', () => {
      try {
        const first = game.compareQ13(mode);
        status.textContent = count() === breathModes.length ? '세 가지 숨을 모두 기록했어요. 편집국 내 자리에서 두 흐름을 나누고 기사를 써요.' : (first ? o.modes[mode].label + ' 기록 완료' : '이미 기록한 장면이에요') + ' (' + count() + '/' + breathModes.length + ') · 다른 숨도 골라 봐요.';
        paint();
      } catch (e) { status.textContent = e instanceof Error ? e.message : '기록하지 못했어요.'; }
    });
    const paint = () => {
      modeNav.querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-pressed', String(breathModes[i] === mode)));
      const m = o.modes[mode];
      explanation.textContent = m.text; result.textContent = '어디로 가나 · ' + m.result;
      flows.replaceChildren();
      for (const key of ['air', 'mucus', 'cilia'] as const) flows.append(el('dt', '', o.flowNames[key]), el('dd', '', m.flows[key]));
      flows.querySelectorAll('dd').forEach(d => { (d as HTMLElement).style.margin = '0'; });
      const done = game.state.q013.compared.includes(mode);
      record.textContent = replay ? '발행한 취재예요 · 기록은 바뀌지 않아요' : done ? m.label + ' · 기록함' : m.label + ' 기록하기';
      record.disabled = replay;
    };
    breathModes.forEach(m => modeNav.append(button('', o.modes[m].label, () => { mode = m; since = 0; paint(); })));
    const brief = el('div', 'valve-brief'), notes = el('div', 'valve-notes');
    brief.append(el('p', 'muted', q13Text.disclaimer), save, el('p', '', o.intro), modeNav, explanation, el('p', 'muted', o.singleVariable));
    notes.append(el('p', 'muted', o.limit), status, record);
    const refs = el('details', 'article-sources'); refs.append(el('summary', '', '비교의 출처와 한계'));
    for (const source of q13Text.sources) {
      const a = el('a', '', source.title); a.href = source.url; a.target = '_blank'; a.rel = 'noopener'; refs.append(a, el('p', 'muted', source.section + ' · 확인 ' + source.checked));
    }
    q13Text.simplification.forEach(s => refs.append(el('p', 'muted', s))); notes.append(refs);
    c.append(brief, stage, notes);
    paint();
    status.textContent = replay ? '발행한 취재의 관찰기를 다시 보고 있어요.' : '기록한 숨 ' + count() + '/' + breathModes.length;
    const gt = tracheaCv.getContext('2d'), gb = bronchiCv.getContext('2d');
    let raf = 0, alive = true, previous = performance.now(), signature = '';
    /** Airway clock for this mode: inside breathing in, inside breathing out, or a held breath (no air movement). */
    const clockOf = (t: number, still: boolean): number => {
      if (mode === 'hold') return SWALLOW.at + 1.2;
      if (mode === 'in') return still ? 1.4 : 0.3 + (t % 2.1);
      return still ? 4.6 : 3.0 + (t % 3.6);
    };
    const render = (now: number) => {
      if (!alive) return;
      const still = motion.matches, dt = document.hidden ? 0 : Math.min(0.05, (now - previous) / 1000); previous = now;
      const sig = mode + '/' + still;
      if (!gt || !gb || document.hidden || (still && sig === signature)) { raf = requestAnimationFrame(render); return; }
      signature = sig; since += still ? 0 : dt;
      const clock = clockOf(since, still);
      tube.update(still ? 0 : dt, clock); tree.update(still ? 0 : dt, clock);
      for (const [g, v, view] of [[gt, TRACHEA, tube], [gb, BRONCHI, tree]] as const) {
        g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false;
        g.fillStyle = '#2a0812'; g.fillRect(0, 0, v.w, v.h);
        view.drawFloor(g, v.x, v.y, v.w, v.h);
      }
      // The two flows as arrows: the air follows the breath (or holds still), the mucus always goes up.
      const flow = airflow(clock), bob = still ? 0 : Math.round(Math.sin(since * 4) * 2);
      if (mode === 'hold' || Math.abs(flow) < 0.04) pause(gt, AIR_AT.x - TRACHEA.x, AIR_AT.y - TRACHEA.y, AIR_COLOUR);
      else arrow(gt, AIR_AT.x - TRACHEA.x, AIR_AT.y - TRACHEA.y + bob * (flow > 0 ? 1 : -1), flow > 0 ? 1 : -1, 64, 8, AIR_COLOUR);
      for (const m of MUCUS_AT) arrow(gt, m.x - TRACHEA.x, m.y - TRACHEA.y - Math.abs(bob), -1, 34, 4, MUCUS_COLOUR);
      arrow(gb, 238 - BRONCHI.x, 350, -1, 34, 4, MUCUS_COLOUR);
      const word = mode === 'hold' ? '숨 참기 · 공기 멈춤' : mode === 'in' ? '들숨 · 공기 내려감' : '날숨 · 공기 올라옴';
      gt.font = 'bold 12px sans-serif'; const w = Math.min(TRACHEA.w - 8, Math.ceil(gt.measureText(word).width) + 12);
      gt.fillStyle = 'rgba(20,4,10,0.7)'; gt.fillRect(4, 4, w, 18); gt.fillStyle = '#fff1d6'; gt.fillText(word, 10, 17);
      gb.font = 'bold 12px sans-serif'; const wb = Math.ceil(gb.measureText('점액은 늘 위로').width) + 12;
      gb.fillStyle = 'rgba(20,4,10,0.7)'; gb.fillRect(4, 4, wb, 18); gb.fillStyle = '#fff6c4'; gb.fillText('점액은 늘 위로', 10, 17);
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    dispose = () => { alive = false; cancelAnimationFrame(raf); unsub(); };
  }, () => dispose(), { dismissOnOutside: false, blockRepeatedActivation: true });
}
