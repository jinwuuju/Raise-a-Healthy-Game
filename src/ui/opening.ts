import { SCENE_H, SCENE_W, TEAS, paintScene, teaAt } from '../art/opening';
import type { Look } from '../domain/appearance';
import { button, el } from './dom';

const TEA_KEY = 'medical-quest.opening.tea';
export type Opening = { progress(fraction: number, label: string): void; setLook(look: Look): void; ready(started: boolean): Promise<void> };

function loadFound(): string[] {
  try { const v = JSON.parse(localStorage.getItem(TEA_KEY) ?? '[]'); return Array.isArray(v) ? v.filter(id => TEAS.some(t => t.id === id)) : []; } catch { return []; }
}

/**
 * Title screen (D100). index.html already shows the title while the game script downloads; this adds the pixel scene,
 * the loading bar, the hidden green-tea game and the start button. It never touches game progress.
 */
export function showOpening(skip: boolean): Opening {
  const existing = document.getElementById('opening');
  if (skip) { existing?.remove(); return { progress() {}, setLook() {}, ready: () => Promise.resolve() }; }
  const root = existing ?? el('div', 'opening');
  if (!existing) {
    root.id = 'opening';
    root.innerHTML = '<div class=op-inner><header class=op-title><small>논현로 메디컬 데스크</small><h1><span class=g>건강</span> <span class=y>기자</span> <span class=p>키우기</span></h1><p>몸속을 걸으며 취재하는 픽셀 건강 기자 RPG</p></header><div class=op-scene></div><div class=op-foot><p class=op-status role=status>출근 준비 중…</p><div class=op-bar><i></i></div></div><p class=op-credit>제작 · 진우주</p></div>';
    document.body.append(root);
  }
  root.setAttribute('role', 'region'); root.setAttribute('aria-label', '건강 기자 키우기 시작 화면');
  const sceneBox = root.querySelector<HTMLElement>('.op-scene')!, foot = root.querySelector<HTMLElement>('.op-foot')!;
  const status = root.querySelector<HTMLElement>('.op-status')!, bar = root.querySelector<HTMLElement>('.op-bar i');
  const cv = el('canvas'); cv.setAttribute('role', 'img');
  cv.setAttribute('aria-label', '가을 오후의 유로프라자 앞. 은행나무와 신문 가판대, 벤치, 둥실 떠 있는 하트 친구와 기자가 있고 곳곳에 녹차가 숨어 있어요.');
  const tea = el('p', 'op-tea'); tea.setAttribute('aria-live', 'polite');
  sceneBox.replaceChildren(cv, tea);
  const off = document.createElement('canvas'); off.width = SCENE_W; off.height = SCENE_H;
  const og = off.getContext('2d')!, g = cv.getContext('2d')!;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const found = new Map<string, number>(loadFound().map(id => [id, -10]));
  let look: Look | null = null, raf = 0, alive = true, dirty = true, t0 = performance.now();
  const count = () => {
    const n = found.size;
    tea.textContent = n === TEAS.length ? '녹차 ' + n + '잔을 모두 찾았어요! 따뜻하게 한 모금 하고 출근해요.' : n ? '숨은 녹차 ' + n + '/' + TEAS.length + ' 찾음' : '장면 곳곳에 녹차 ' + TEAS.length + '잔이 숨어 있어요. 눌러서 찾아 보세요!';
  };
  count();
  const size = () => {
    const dpr = Math.min(3, window.devicePixelRatio || 1), landscape = window.innerWidth > window.innerHeight && window.innerHeight < 520;
    const maxW = Math.max(SCENE_W, sceneBox.clientWidth - 6), maxH = Math.max(SCENE_H, window.innerHeight * (landscape ? 0.74 : 0.4));
    const k = Math.max(1, Math.floor(Math.min((maxW * dpr) / SCENE_W, (maxH * dpr) / SCENE_H)));
    if (cv.width !== SCENE_W * k) { cv.width = SCENE_W * k; cv.height = SCENE_H * k; dirty = true; }
    cv.style.width = (SCENE_W * k) / dpr + 'px'; cv.style.height = (SCENE_H * k) / dpr + 'px';
  };
  const draw = (now: number) => {
    if (!alive) return;
    const still = motion.matches, t = still ? 0 : (now - t0) / 1000;
    if (!still || dirty) {
      og.clearRect(0, 0, SCENE_W, SCENE_H); paintScene(og, t, look, found);
      g.imageSmoothingEnabled = false; g.clearRect(0, 0, cv.width, cv.height); g.drawImage(off, 0, 0, cv.width, cv.height); dirty = false;
    }
    raf = requestAnimationFrame(draw);
  };
  cv.addEventListener('click', e => {
    const r = cv.getBoundingClientRect(), hit = teaAt(((e.clientX - r.left) / r.width) * SCENE_W, ((e.clientY - r.top) / r.height) * SCENE_H);
    if (!hit || found.has(hit.id)) return;
    found.set(hit.id, motion.matches ? -10 : (performance.now() - t0) / 1000); dirty = true;
    try { localStorage.setItem(TEA_KEY, JSON.stringify([...found.keys()])); } catch { /* the hunt still works for this visit */ }
    count(); if (found.size < TEAS.length) tea.textContent = hit.found + ' · ' + tea.textContent;
  });
  const onResize = () => size();
  window.addEventListener('resize', onResize); size(); raf = requestAnimationFrame(draw);
  return {
    progress(fraction, label) { if (bar) bar.style.width = Math.round(Math.max(0.08, Math.min(1, fraction)) * 100) + '%'; status.textContent = label; },
    setLook(next) { look = next; dirty = true; },
    ready(started) {
      if (bar) bar.style.width = '100%';
      status.textContent = '출근 준비 완료!';
      return new Promise(resolve => {
        const start = button('op-start', started ? '이어서 출근하기' : '시작하기', () => {
          start.disabled = true; alive = false; cancelAnimationFrame(raf); window.removeEventListener('resize', onResize);
          root.classList.add('op-leaving');
          window.setTimeout(() => root.remove(), motion.matches ? 0 : 280);
          resolve();
        });
        foot.replaceChildren(status, start);
        start.focus({ preventScroll: true });
      });
    },
  };
}
