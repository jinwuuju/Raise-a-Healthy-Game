import { button, el } from './dom';

let current: { close: () => void } | null = null;

export function sheetOpen(): boolean { return current !== null; }
export function closeSheet(): void { current?.close(); }

export function openSheet(title: string, build: (content: HTMLElement, close: () => void) => void, onClose: () => void = () => {}): void {
  current?.close();
  const before = document.activeElement as HTMLElement | null;
  const scrim = el('div', 'scrim');
  const sheet = el('section', 'sheet');
  sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true'); sheet.setAttribute('aria-label', title);
  const head = el('header');
  head.append(el('h2', '', title));
  const close = () => {
    if (!scrim.isConnected) return;
    scrim.remove(); document.removeEventListener('keydown', onKey, true); current = null; onClose(); before?.focus?.();
  };
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } };
  const x = button('x', '✕', close, '닫기');
  head.append(x);
  const content = el('div', 'content');
  sheet.append(head, content);
  scrim.append(sheet);
  scrim.addEventListener('pointerdown', e => { if (e.target === scrim) close(); });
  sheet.addEventListener('pointerdown', e => e.stopPropagation());
  document.addEventListener('keydown', onKey, true);
  build(content, close);
  document.body.append(scrim);
  current = { close };
  x.focus();
}
