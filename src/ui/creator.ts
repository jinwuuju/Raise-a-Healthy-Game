import { CH, CW, WALK_CYCLE, characterFrame, hairSwatch, portrait, skinSwatch } from '../art/character';
import {
  defaultAppearance, faceStyles, hairColors, hairFor, hairStyles, outfits, presetNames, presets, skinColors, skinFor,
  type Appearance, type FaceId, type HairColorId, type HairId, type OutfitId, type Preset, type SkinId,
} from '../domain/appearance';
import type { Dir } from '../world/types';
import { button, el, pixelCanvas } from './dom';

type Opts = { mode: 'new' | 'edit'; name: string; preset: Preset; look: Appearance; owned: OutfitId[]; onDone: (name: string, preset: Preset, look: Appearance) => void; onCancel: () => void };

export function openCreator(o: Opts): void {
  let preset = o.preset, look: Appearance = { ...o.look }, name = o.name;
  const root = el('div', 'creator');
  root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', o.mode === 'new' ? '기자 만들기' : '외형 꾸미기');
  const card = el('div', 'card');
  const stage = el('div', 'stage');
  const title = el('div', 'title');
  title.append(el('small', '', 'MEDICAL QUEST'), el('b', '', o.mode === 'new' ? '의학기자 키우기' : '외형 꾸미기'));
  const ped = el('div', 'pedestal');
  const preview = el('canvas', 'preview'); preview.width = CW; preview.height = CH;
  const pg = preview.getContext('2d')!; pg.imageSmoothingEnabled = false;
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
  form.append(nameField, sections);
  const actions = el('div', 'actions');
  if (o.mode === 'edit') actions.append(button('secondary', '취소', () => { stop(); o.onCancel(); }));
  const go = button('primary', o.mode === 'new' ? '첫 출근하기' : '저장하기', () => finish());
  actions.append(go);
  form.append(actions, el('p', 'note', '외형은 언제든 왼쪽 위 기자 정보에서 다시 바꿀 수 있어요. 도시 코트는 옷가게가 열리면 얻을 수 있어요.'));
  card.append(stage, form);
  root.append(card);
  document.body.append(root);

  function group(label: string, body: HTMLElement): HTMLElement { const f = el('div', 'f'); f.style.display = 'grid'; f.style.gap = '7px'; f.append(el('span', 'lab', label), body); return f; }

  function render(): void {
    sections.textContent = '';
    const presetRow = el('div', 'opts');
    for (const p of presets) {
      const b = button('opt preset', '', () => { if (preset === p) return; preset = p; look = { ...defaultAppearance(p), outfit: o.owned.includes(look.outfit) ? look.outfit : 'reporter' }; render(); });
      b.setAttribute('aria-pressed', String(preset === p));
      b.append(pixelCanvas(portrait(defaultAppearance(p))), el('span', '', presetNames[p]));
      presetRow.append(b);
    }
    sections.append(group('기자 타입', presetRow));
    const chips = <K extends string>(ids: K[], table: Record<string, string>, cur: K, set: (v: K) => void, disabled: (v: K) => boolean = () => false) => {
      const row = el('div', 'opts');
      for (const id of ids) {
        const b = button('opt', table[id] ?? id, () => { set(id); render(); });
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
        b.style.background = color(id); b.title = table[id] ?? id; b.setAttribute('aria-pressed', String(cur === id));
        b.append(el('span', '', table[id] ?? id));
        row.append(b);
      }
      return row;
    };
    sections.append(group('머리 모양', chips<HairId>(hairFor(preset), hairStyles, look.hair, v => { look.hair = v; })));
    sections.append(group(preset === 'alien' ? '안테나·털 색' : '머리 색', swatches<HairColorId>(Object.keys(hairColors) as HairColorId[], hairColors, hairSwatch, look.hairColor, v => { look.hairColor = v; })));
    sections.append(group('피부', swatches<SkinId>(skinFor(preset), skinColors, skinSwatch, look.skin, v => { look.skin = v; })));
    sections.append(group('표정', chips<FaceId>(Object.keys(faceStyles) as FaceId[], faceStyles, look.face, v => { look.face = v; })));
    sections.append(group('옷', chips<OutfitId>(Object.keys(outfits) as OutfitId[], outfits, look.outfit, v => { look.outfit = v; }, v => !o.owned.includes(v))));
  }

  let raf = 0;
  const loop = (now: number) => {
    const t = (now - t0) / 1000;
    if (auto) dirIndex = Math.floor(t / 1.6) % 4;
    const frame = WALK_CYCLE[Math.floor(t * 7) % 4]!;
    pg.clearRect(0, 0, CW, CH);
    pg.drawImage(characterFrame(look, dirs[dirIndex]!, frame), 0, 0);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  const stop = () => { cancelAnimationFrame(raf); root.remove(); };
  function finish(): void {
    const n = name.trim() || '새 기자';
    stop(); o.onDone(n.slice(0, 12), preset, { ...look });
  }
  t0 = performance.now();
  render();
  if (o.mode === 'new') { input.select(); }
  go.focus({ preventScroll: true });
}
