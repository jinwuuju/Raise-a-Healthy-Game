import { AY, CH, CW, WALK_CYCLE, characterFrame, hairSwatch, portrait, skinSwatch } from '../art/character';
import {
  defaultAppearance, faceFor, faceShapes, faceStyles, hairColors, hairFor, hairStyles, outfits, presetNames, presets, shapeFor, skinColors, skinFor,
  type Appearance, type FaceId, type HairColorId, type HairId, type OutfitId, type Preset, type ShapeId, type SkinId,
} from '../domain/appearance';
import type { Dir } from '../world/types';
import { button, el, pixelCanvas } from './dom';
import { trapTab } from './focus';

type Opts = { mode: 'new' | 'edit'; name: string; preset: Preset; look: Appearance; owned: OutfitId[]; onDone: (name: string, preset: Preset, look: Appearance) => void; onCancel: () => void };

export function openCreator(o: Opts): void {
  let preset = o.preset, look: Appearance = { ...o.look }, name = o.name;
  const root = el('div', 'creator');
  const before = document.activeElement as HTMLElement | null;
  root.tabIndex = -1; root.setAttribute('aria-modal', 'true');
  root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', o.mode === 'new' ? '기자 만들기' : '외형 꾸미기');
  const card = el('div', 'card');
  const stage = el('div', 'stage');
  const title = el('div', 'title');
  title.append(el('small', '', 'HEALTH REPORTER'), el('b', '', o.mode === 'new' ? '건강 기자 키우기' : '외형 꾸미기'));
  const ped = el('div', 'pedestal');
  const preview = el('canvas', 'preview');
  const pg = preview.getContext('2d')!;
  // Draw at an integer number of device pixels per sprite pixel and stand the feet on the pedestal.
  let scale = 1;
  const fitViewport = () => {
    const v = window.visualViewport;
    root.style.height = (v?.height ?? window.innerHeight) + 'px';
    root.style.width = (v?.width ?? window.innerWidth) + 'px';
    root.style.top = (v?.offsetTop ?? 0) + 'px'; root.style.left = (v?.offsetLeft ?? 0) + 'px';
    root.classList.toggle('compact', (v?.height ?? window.innerHeight) < 480 && (v?.width ?? window.innerWidth) < 600);
  };
  const layout = () => {
    const dpr = window.devicePixelRatio || 1;
    const base = window.matchMedia('(max-width: 760px)').matches ? 5 : 7;
    const footY = ped.offsetTop + ped.offsetHeight / 2;
    const top = title.offsetTop + title.offsetHeight + 8;
    const fit = Math.min(base, (footY - top) / AY, (stage.clientWidth - 32) / CW);
    scale = Math.max(1, Math.floor(fit * dpr));
    if (preview.width !== CW * scale) { preview.width = CW * scale; preview.height = CH * scale; }
    pg.imageSmoothingEnabled = false;
    preview.style.width = (CW * scale) / dpr + 'px';
    preview.style.height = (CH * scale) / dpr + 'px';
    preview.style.top = Math.round(footY - (AY * scale) / dpr) + 'px';
  };
  const dirs: Dir[] = ['down', 'left', 'up', 'right'];
  let dirIndex = 0, auto = true, t0 = performance.now();
  const rot = el('div', 'rot');
  rot.append(button('', '◀', () => { auto = false; dirIndex = (dirIndex + 1) % 4; }, '왼쪽으로 돌리기'), button('', '▶', () => { auto = false; dirIndex = (dirIndex + 3) % 4; }, '오른쪽으로 돌리기'));
  stage.append(title, ped, preview, rot);

  const form = el('form');
  form.addEventListener('submit', e => { e.preventDefault(); finish(); });
  const nameField = el('label', 'f');
  nameField.append(el('span', 'lab', '기자 이름'));
  const input = el('input'); input.type = 'text'; input.maxLength = 12; input.value = name; input.autocomplete = 'off'; input.placeholder = '비워 두면 ‘새 기자’'; input.setAttribute('aria-label', '기자 이름');
  input.addEventListener('input', () => { name = input.value; });
  nameField.append(input);
  const sections = el('div'); sections.style.display = 'grid'; sections.style.gap = '16px';
  form.setAttribute('aria-label', '외형 선택');
  form.append(nameField, el('p', 'scroll-hint', '아래로 스크롤해 머리·얼굴·색·옷을 골라 주세요.'), sections);
  const actions = el('div', 'actions');
  if (o.mode === 'edit') actions.append(button('secondary', '취소', () => { stop(); o.onCancel(); }));
  const go = button('primary', o.mode === 'new' ? '첫 출근하기' : '저장하기', () => finish());
  actions.append(go);
  form.append(el('p', 'note', '외형은 언제든 왼쪽 위 기자 정보에서 다시 바꿀 수 있어요. 새 옷은 유로프라자 근처 옷가게 ‘오비트 테일러’에서 살 수 있어요.'));
  card.append(stage, form, actions);
  root.append(card);
  document.body.append(root);
  fitViewport();

  function group(label: string, body: HTMLElement): HTMLElement { const f = el('div', 'f'); f.style.display = 'grid'; f.style.gap = '7px'; f.append(el('span', 'lab', label), body); return f; }

  function render(): void {
    const focusKey = (document.activeElement as HTMLElement | null)?.dataset.focusKey;
    sections.textContent = '';
    const presetRow = el('div', 'opts types');
    for (const p of presets) {
      const b = button('opt preset', '', () => { if (preset === p) return; preset = p; look = { ...defaultAppearance(p), outfit: o.owned.includes(look.outfit) ? look.outfit : 'reporter' }; render(); });
      b.dataset.focusKey = 'preset:' + p;
      b.setAttribute('aria-pressed', String(preset === p));
      b.append(pixelCanvas(portrait(defaultAppearance(p))), el('span', '', presetNames[p]));
      presetRow.append(b);
    }
    sections.append(group('기자 타입', presetRow));
    const chips = <K extends string>(ids: K[], table: Record<string, string>, cur: K, set: (v: K) => void, disabled: (v: K) => boolean = () => false) => {
      const row = el('div', 'opts');
      for (const id of ids) {
        const b = button('opt', table[id] ?? id, () => { set(id); render(); });
        b.dataset.focusKey = table[id] ?? id;
        b.setAttribute('aria-pressed', String(cur === id)); b.disabled = disabled(id);
        if (b.disabled) b.textContent = (table[id] ?? id) + ' 🔒';
        row.append(b);
      }
      return row;
    };
    const swatches = <K extends string>(ids: K[], table: Record<string, string>, color: (id: K) => string, cur: K, set: (v: K) => void) => {
      const row = el('div', 'opts');
      for (const id of ids) {
        const b = button('sw', '', () => { set(id); render(); }, table[id] ?? id);
        b.dataset.focusKey = table[id] ?? id;
        b.style.background = color(id); b.title = table[id] ?? id; b.setAttribute('aria-pressed', String(cur === id));
        b.append(el('span', '', table[id] ?? id));
        row.append(b);
      }
      return row;
    };
    sections.append(group('머리 모양', chips<HairId>(hairFor(preset), hairStyles, look.hair, v => { look.hair = v; })));
    sections.append(group(preset === 'alien' ? '안테나·털 색' : '머리 색', swatches<HairColorId>(Object.keys(hairColors) as HairColorId[], hairColors, hairSwatch, look.hairColor, v => { look.hairColor = v; })));
    sections.append(group('얼굴형', chips<ShapeId>(shapeFor(preset), faceShapes, look.shape, v => { look.shape = v; })));
    sections.append(group('눈매', chips<FaceId>(faceFor(preset), faceStyles, look.face, v => { look.face = v; })));
    sections.append(group('피부', swatches<SkinId>(skinFor(preset), skinColors, skinSwatch, look.skin, v => { look.skin = v; })));
    sections.append(group('옷', chips<OutfitId>(Object.keys(outfits) as OutfitId[], outfits, look.outfit, v => { look.outfit = v; }, v => !o.owned.includes(v))));
    if (focusKey) [...sections.querySelectorAll<HTMLButtonElement>('button')].find(b => b.dataset.focusKey === focusKey)?.focus({ preventScroll: true });
  }

  let raf = 0;
  const loop = (now: number) => {
    const t = (now - t0) / 1000;
    if (auto) dirIndex = Math.floor(t / 1.6) % 4;
    const frame = auto ? WALK_CYCLE[Math.floor(t * 7) % 4]! : (Math.floor(t * 1.6) % 2 ? 3 : 0);
    pg.clearRect(0, 0, preview.width, preview.height);
    pg.drawImage(characterFrame(look, dirs[dirIndex]!, frame), 0, 0, CW * scale, CH * scale);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  // The stage stretches when the option list renders or the window changes, so re-anchor on every resize.
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => layout()) : null;
  ro?.observe(stage);
  const onResize = () => { fitViewport(); layout(); };
  window.addEventListener('resize', onResize);
  window.visualViewport?.addEventListener('resize', onResize);
  window.visualViewport?.addEventListener('scroll', onResize);
  layout();
  const onKey = (e: KeyboardEvent) => {
    trapTab(root, e);
    if (e.key === 'Escape') {
      e.preventDefault(); e.stopPropagation();
      if (o.mode === 'edit') { stop(); o.onCancel(); }
    }
  };
  document.addEventListener('keydown', onKey, true);
  const stop = () => { cancelAnimationFrame(raf); ro?.disconnect(); window.removeEventListener('resize', onResize); window.visualViewport?.removeEventListener('resize', onResize); window.visualViewport?.removeEventListener('scroll', onResize); document.removeEventListener('keydown', onKey, true); root.remove(); before?.focus({ preventScroll: true }); };
  function finish(): void {
    const n = name.trim() || '새 기자';
    stop(); o.onDone(n.slice(0, 12), preset, { ...look });
  }
  t0 = performance.now();
  render();
  layout();
  if (o.mode === 'new') { input.select(); }
  go.focus({ preventScroll: true });
}
