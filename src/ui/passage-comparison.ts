import type { Game } from '../application/game';
import { REAL_CYCLE, SLOW } from '../domain/cardiac';
import { q7Text } from '../domain/q007-state';
import { passageModes, type PassageMode } from '../domain/passage-model';
import { HeartView } from '../game/heart-view';
import { rooms } from '../world/rooms';
import { button, el } from './dom';
import { openSheet } from './sheet';

/** Region of the aortic root that holds the aortic valve and both coronary openings (same frame as the Q006 supply observer). */
const VIEW = { x: 56, y: 220, w: 304, h: 200 };

/**
 * D108 Q007 passage observer: the Q006 supply observer screen reused as the baseline (design 16 section 3, step 2).
 * Only the entrance width changes; the beat, the rest condition and passage stay normal. Progress goes through Game.
 */
export function openPassageComparison(game: Game): void {
  let dispose = () => {};
  openSheet('통로 관찰기 · 통로 폭 하나만 바꾸기', c => {
    c.parentElement!.classList.add('valve-sheet', 'rhythm-sheet', 'supply-sheet'); c.classList.add('keep-open');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const modeNav = el('div', 'seg'), explanation = el('p'), status = el('p'); status.setAttribute('role', 'status');
    const save = el('p', 'save-message'); save.setAttribute('role', 'alert');
    const updateError = () => { save.textContent = game.lastError ?? ''; }; const unsub = game.subscribe(updateError); updateError();
    const paired = el('div', 'valve-paired rhythm-paired'), canvases: HTMLCanvasElement[] = [];
    for (const title of ['기준 · 넓은 통로', '선택한 통로 폭']) {
      const panel = el('section', 'valve-panel'), cv = el('canvas'); cv.setAttribute('aria-label', title + ' · 왼쪽 오른관상동맥 입구, 오른쪽 왼관상동맥 입구');
      panel.append(el('h3', '', title), cv, el('p', 'muted', '왼쪽 · 오른관상동맥 입구 / 오른쪽 · 왼관상동맥 입구')); paired.append(panel); canvases.push(cv);
    }
    const views = [new HeartView(rooms.aorta), new HeartView(rooms.aorta)];
    const record = button('primary', '비교 기록하기', () => {
      try {
        const mode = game.state.q007.mode;
        if (mode === 'mild' || mode === 'narrow') game.recordQ7(mode);
        status.textContent = mode === 'narrow' ? '많이 좁아진 통로까지 기록했어요. 내 자리의 자료 취재로 이어가요.' : '조금 좁아진 통로를 기록했어요. 이번엔 많이 좁아짐을 골라 봐요.';
      } catch (e) { status.textContent = e instanceof Error ? e.message : '기록하지 못했어요.'; }
    });
    const choose = (mode: PassageMode) => {
      try {
        game.setQ7Mode(mode); modeNav.querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-pressed', String(passageModes[i] === mode)));
        explanation.textContent = q7Text.comparison[mode].text;
        record.disabled = mode === 'wide'; record.textContent = mode === 'wide' ? '좁아진 폭을 골라 주세요' : q7Text.comparison[mode].label + ' 기록하기';
        views[1]!.passage = mode;
      } catch (e) { status.textContent = e instanceof Error ? e.message : '비교를 열지 못했어요.'; }
    };
    passageModes.forEach(mode => modeNav.append(button('', q7Text.comparison[mode].label, () => choose(mode))));
    const brief = el('div', 'valve-brief'), notes = el('div', 'valve-notes');
    brief.append(el('p', 'muted', q7Text.disclaimer), save, modeNav, explanation, el('p', 'muted', q7Text.singleVariable));
    notes.append(el('p', 'muted', q7Text.layerLimit), status, record);
    const refs = el('details', 'article-sources'); refs.append(el('summary', '', '비교의 출처와 한계'));
    for (const source of q7Text.sources) {
      const a = el('a', '', source.title); a.href = source.url; a.target = '_blank'; a.rel = 'noopener'; refs.append(a, el('p', 'muted', source.section + ' · 확인 ' + source.checked));
    }
    q7Text.simplification.forEach(s => refs.append(el('p', 'muted', s))); notes.append(refs);
    c.append(brief, paired, notes);
    choose(game.state.q007.mode);
    let raf = 0, alive = true, previous = performance.now(), signature = '';
    const render = (now: number) => {
      if (!alive) return;
      const still = motion.matches, dt = document.hidden || still ? 0 : Math.min(.05, (now - previous) / 1000); previous = now;
      const size = canvases.map(cv => cv.parentElement!.clientWidth).join(',') + '/' + window.innerHeight + '/' + window.devicePixelRatio + '/' + game.state.q007.mode;
      if (document.hidden || (still && size === signature)) { raf = requestAnimationFrame(render); return; }
      signature = size;
      const real = still ? REAL_CYCLE * 0.7 : ((now / 1000) / SLOW) % REAL_CYCLE;
      views.forEach(v => v.update(dt, real));
      canvases.forEach((cv, i) => {
        const r = Math.min(3, window.devicePixelRatio || 1), maxHeight = Math.min(260, window.innerHeight * .42);
        const k = Math.max(1, Math.floor(Math.min((cv.parentElement!.clientWidth - 16) * r / VIEW.w, maxHeight * r / VIEW.h)));
        const W = VIEW.w * k, H = VIEW.h * k;
        if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; cv.style.width = W / r + 'px'; cv.style.height = H / r + 'px'; }
        const g = cv.getContext('2d'); if (!g) return;
        g.imageSmoothingEnabled = false; g.setTransform(k, 0, 0, k, 0, 0);
        g.fillStyle = '#341024'; g.fillRect(0, 0, VIEW.w, VIEW.h);
        views[i]!.drawFloor(g, VIEW.x, VIEW.y, VIEW.w, VIEW.h, real);
      });
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    dispose = () => { alive = false; cancelAnimationFrame(raf); unsub(); try { game.setQ7Mode('wide'); } catch { /* wide is always allowed */ } };
  }, () => dispose(), { dismissOnOutside: false, blockRepeatedActivation: true });
}
