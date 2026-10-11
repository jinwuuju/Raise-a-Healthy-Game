import type { Game } from '../application/game';
import { q3Text } from '../domain/q003-state';
import { valveModes, type ValveMode } from '../domain/valve-model';
import { HeartView } from '../game/heart-view';
import { rooms } from '../world/rooms';
import { button, el } from './dom';
import { openSheet } from './sheet';

/** Same room, valve coordinates and clock phases on both sides. Progress goes through Game. */
export function openValveComparison(game: Game): void {
  let dispose = () => {};
  openSheet('삼첨판 · 정상과 질환 비교', (c) => {
    c.parentElement!.classList.add('valve-sheet'); c.classList.add('keep-open');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const modeNav = el('div', 'seg three'), explanation = el('p'), status = el('p'); status.setAttribute('role', 'status');
    const save = el('p', 'save-message'); save.setAttribute('role', 'alert');
    const updateError = () => { save.textContent = game.lastError ?? ''; }; const unsub = game.subscribe(updateError); updateError();
    const paired = el('div', 'valve-paired'), canvases: HTMLCanvasElement[] = [];
    for (const title of ['정상 기준', '선택한 비교 레이어']) {
      const panel = el('section', 'valve-panel'), cv = el('canvas'); cv.setAttribute('aria-label', title + ' · 위는 충만기, 아래는 심실 수축기');
      panel.append(el('h3', '', title), cv, el('p', 'muted', '위 · 충만기 / 아래 · 심실 수축기')); paired.append(panel); canvases.push(cv);
    }
    const views = Array.from({ length: 4 }, () => new HeartView(rooms.heart));
    const choose = (mode: ValveMode) => {
      try {
        game.setQ3Mode(mode); modeNav.querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-pressed', String(valveModes[i] === mode)));
        explanation.textContent = q3Text.comparison[mode].text;
        record.disabled = mode === 'normal'; record.textContent = mode === 'normal' ? '비교 레이어를 골라 주세요' : q3Text.comparison[mode].label + ' 비교 기록하기';
        views[2]!.comparison = mode; views[3]!.comparison = mode;
      } catch (e) { status.textContent = e instanceof Error ? e.message : '비교를 열지 못했어요.'; }
    };
    const record = button('primary', '비교 기록하기', () => {
      try { const mode = game.state.q003.mode; if (mode !== 'normal') game.recordQ3(mode); status.textContent = '비교를 수첩 인체 탐험에 기록했어요. 두 변화를 보고 내 자리의 자료 취재로 이어가요.'; }
      catch (e) { status.textContent = e instanceof Error ? e.message : '기록하지 못했어요.'; }
    });
    valveModes.forEach(mode => modeNav.append(button('', q3Text.comparison[mode].label, () => choose(mode))));
    const brief = el('div', 'valve-brief'), notes = el('div', 'valve-notes');
    brief.append(el('p', 'muted', q3Text.disclaimer), save, modeNav, explanation);
    notes.append(el('p', 'muted', q3Text.layerLimit), status, record);
    c.append(brief, paired, notes);
    const refs = el('details', 'article-sources'); refs.append(el('summary', '', '비교의 출처와 한계'));
    for (const source of q3Text.sources.filter(s => ['nhlbi-valve-types', 'openstax-cycle'].includes(s.id))) {
      const a = el('a', '', source.title); a.href = source.url; a.target = '_blank'; a.rel = 'noopener'; refs.append(a, el('p', 'muted', source.section + ' · 확인 ' + source.checked));
    }
    q3Text.simplification.forEach(s => refs.append(el('p', 'muted', s))); notes.append(refs);
    choose(game.state.q003.mode);
    let raf = 0, alive = true, previous = performance.now(), signature = '';
    const render = (now: number) => {
      if (!alive) return;
      const dt = document.hidden || motion.matches ? 0 : Math.min(.05, (now - previous) / 1000); previous = now;
      const size = canvases.map(cv => cv.parentElement!.clientWidth).join(',') + '/' + window.innerHeight + '/' + window.devicePixelRatio + '/' + game.state.q003.mode;
      if (document.hidden || (motion.matches && size === signature)) { raf = requestAnimationFrame(render); return; }
      signature = size;
      views.forEach((v, i) => v.update(dt, i % 2 === 0 ? .66 : .32));
      canvases.forEach((cv, col) => {
        const r = Math.min(3, window.devicePixelRatio || 1), maxHeight = Math.min(280, window.innerHeight * .42);
        const k = Math.max(1, Math.floor(Math.min((cv.parentElement!.clientWidth - 16) * r / 160, maxHeight * r / 224)));
        const W = 160 * k, H = 224 * k;
        if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; cv.style.width = W / r + 'px'; cv.style.height = H / r + 'px'; }
        const g = cv.getContext('2d')!; g.imageSmoothingEnabled = false;
        for (let row = 0; row < 2; row++) {
          g.setTransform(k, 0, 0, k, 0, row * 112 * k);
          g.save(); g.beginPath(); g.rect(0, 0, 160, 112); g.clip();
          g.fillStyle = '#341024'; g.fillRect(0, 0, 160, 112);
          views[col * 2 + row]!.drawFloor(g, 220, 316, 160, 112, row === 0 ? .66 : .32);
          g.restore();
        }
      });
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    dispose = () => { alive = false; cancelAnimationFrame(raf); unsub(); game.setQ3Mode('normal'); };
  }, () => dispose(), { dismissOnOutside: false, blockRepeatedActivation: true });
}
