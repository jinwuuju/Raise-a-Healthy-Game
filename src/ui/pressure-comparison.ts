import type { Game } from '../application/game';
import { openness, REAL_CYCLE, SLOW } from '../domain/cardiac';
import { q8Text } from '../domain/q008-state';
import { beatSpeed, pressureModes, pressurePush, type PressureMode } from '../domain/pressure-model';
import { HeartView } from '../game/heart-view';
import { rooms } from '../world/rooms';
import { button, el } from './dom';
import { openSheet } from './sheet';

/** Region of the aortic root that holds the ascending aorta and the sinotubular junction. */
const VIEW = { x: 104, y: 40, w: 208, h: 200 };

/**
 * D108 Q008 blood-pressure observer: the same ascending aorta in two panels. The left panel is the resting baseline; the
 * right panel changes one thing (just moved / high while resting). Arrows and the bar are qualitative, never numbers.
 * The walking heart, valves and passage stay normal. Progress goes through Game.
 */
export function openPressureComparison(game: Game): void {
  let dispose = () => {};
  openSheet('혈압 관찰기 · 한 가지씩 바꾸기', c => {
    c.parentElement!.classList.add('valve-sheet', 'rhythm-sheet', 'supply-sheet'); c.classList.add('keep-open');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const modeNav = el('div', 'seg'), explanation = el('p'), status = el('p'); status.setAttribute('role', 'status');
    const save = el('p', 'save-message'); save.setAttribute('role', 'alert');
    const updateError = () => { save.textContent = game.lastError ?? ''; }; const unsub = game.subscribe(updateError); updateError();
    const paired = el('div', 'valve-paired rhythm-paired'), canvases: HTMLCanvasElement[] = [], fills: HTMLElement[] = [];
    for (const title of ['기준 · 쉴 때', '선택한 상태']) {
      const panel = el('section', 'valve-panel'), cv = el('canvas'); cv.setAttribute('aria-label', title + ' · 오름대동맥 벽을 미는 피의 힘');
      const gauge = el('div', 'press-gauge'), fill = el('span', 'press-fill');
      gauge.setAttribute('role', 'img'); gauge.setAttribute('aria-label', title + ' · 벽을 미는 힘 막대(측정값 아님)');
      gauge.style.cssText = 'height:10px;border-radius:5px;background:rgba(255,255,255,.14);overflow:hidden;margin:6px 0 2px';
      fill.style.cssText = 'display:block;height:100%;width:40%;background:#ffdca6;transition:none';
      gauge.append(fill);
      panel.append(el('h3', '', title), cv, el('p', 'muted', '벽을 미는 힘'), gauge); paired.append(panel); canvases.push(cv); fills.push(fill);
    }
    const views = [new HeartView(rooms.aorta), new HeartView(rooms.aorta)];
    const record = button('primary', '비교 기록하기', () => {
      try {
        const mode = game.state.q008.mode;
        if (mode === 'moved' || mode === 'high') game.recordQ8(mode);
        status.textContent = mode === 'high' ? '쉬어도 계속 높은 상태까지 기록했어요. 내 자리의 자료 취재로 이어가요.' : '막 움직인 뒤를 기록했어요. 이번엔 쉬어도 계속 높음을 골라 봐요.';
      } catch (e) { status.textContent = e instanceof Error ? e.message : '기록하지 못했어요.'; }
    });
    let since = 0;
    const choose = (mode: PressureMode) => {
      try {
        game.setQ8Mode(mode); modeNav.querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-pressed', String(pressureModes[i] === mode)));
        explanation.textContent = q8Text.comparison[mode].text;
        record.disabled = mode === 'rest'; record.textContent = mode === 'rest' ? '비교할 상태를 골라 주세요' : q8Text.comparison[mode].label + ' 기록하기';
        views[1]!.pressureHigh = mode === 'high'; since = 0;
      } catch (e) { status.textContent = e instanceof Error ? e.message : '비교를 열지 못했어요.'; }
    };
    pressureModes.forEach(mode => modeNav.append(button('', q8Text.comparison[mode].label, () => choose(mode))));
    const brief = el('div', 'valve-brief'), notes = el('div', 'valve-notes');
    brief.append(el('p', 'muted', q8Text.disclaimer), save, modeNav, explanation, el('p', 'muted', q8Text.singleVariable));
    notes.append(el('p', 'muted', q8Text.layerLimit), status, record);
    const refs = el('details', 'article-sources'); refs.append(el('summary', '', '비교의 출처와 한계'));
    for (const source of q8Text.sources) {
      const a = el('a', '', source.title); a.href = source.url; a.target = '_blank'; a.rel = 'noopener'; refs.append(a, el('p', 'muted', source.section + ' · 확인 ' + source.checked));
    }
    q8Text.simplification.forEach(s => refs.append(el('p', 'muted', s))); notes.append(refs);
    c.append(brief, paired, notes);
    choose(game.state.q008.mode);
    views[0]!.pressure = 0.4; views[1]!.pressure = 0.4;
    let raf = 0, alive = true, previous = performance.now(), signature = '';
    const phase = [REAL_CYCLE * 0.1, REAL_CYCLE * 0.1], wave = [0.3, 0.3];
    const render = (now: number) => {
      if (!alive) return;
      const still = motion.matches, dt = document.hidden || still ? 0 : Math.min(.05, (now - previous) / 1000); previous = now;
      const mode = game.state.q008.mode;
      const size = canvases.map(cv => cv.parentElement!.clientWidth).join(',') + '/' + window.innerHeight + '/' + window.devicePixelRatio + '/' + mode;
      if (document.hidden || (still && size === signature)) { raf = requestAnimationFrame(render); return; }
      signature = size; since += dt;
      views.forEach((v, i) => {
        const m: PressureMode = i === 0 ? 'rest' : mode, speed = beatSpeed(m, since), step = dt / SLOW * speed;
        phase[i] = still ? REAL_CYCLE * 0.3 : (phase[i]! + step) % REAL_CYCLE;
        // The wall push rises while the aortic valve is open and falls slowly between beats (the wall recoils).
        const open = openness('sl', phase[i]!);
        wave[i] = still ? 0.6 : Math.max(open, wave[i]! * Math.exp(-step / (REAL_CYCLE * 0.45)));
        v.pressure = pressurePush(m, wave[i]!, since);
        v.update(dt * speed, phase[i]!);
        fills[i]!.style.width = Math.round(v.pressure * 100) + '%';
        fills[i]!.style.background = i === 1 && mode === 'high' ? '#ff917c' : '#ffdca6';
      });
      canvases.forEach((cv, i) => {
        const r = Math.min(3, window.devicePixelRatio || 1), maxHeight = Math.min(260, window.innerHeight * .42);
        const k = Math.max(1, Math.floor(Math.min((cv.parentElement!.clientWidth - 16) * r / VIEW.w, maxHeight * r / VIEW.h)));
        const W = VIEW.w * k, H = VIEW.h * k;
        if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; cv.style.width = W / r + 'px'; cv.style.height = H / r + 'px'; }
        const g = cv.getContext('2d'); if (!g) return;
        g.imageSmoothingEnabled = false; g.setTransform(k, 0, 0, k, 0, 0);
        g.fillStyle = '#341024'; g.fillRect(0, 0, VIEW.w, VIEW.h);
        views[i]!.drawFloor(g, VIEW.x, VIEW.y, VIEW.w, VIEW.h, phase[i]!);
      });
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    dispose = () => { alive = false; cancelAnimationFrame(raf); unsub(); try { game.setQ8Mode('rest'); } catch { /* rest is always allowed */ } };
  }, () => dispose(), { dismissOnOutside: false, blockRepeatedActivation: true });
}
