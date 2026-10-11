import { button, el } from './dom';
import { trapTab } from './focus';

let current: { close: () => void } | null = null;

export function sheetOpen(): boolean { return current !== null; }
export function closeSheet(): void { current?.close(); }

export function openSheet(title: string, build: (content: HTMLElement, close: () => void) => void, onClose: () => void = () => {}, options: { dismissOnOutside?: boolean; onDismiss?: () => void; blockRepeatedActivation?: boolean; returnFocus?: HTMLElement | null } = {}): void {
  current?.close();
  const before = options.returnFocus === undefined ? document.activeElement as HTMLElement | null : options.returnFocus;
  const scrim = el('div', 'scrim');
  const sheet = el('section', 'sheet');
  sheet.tabIndex = -1;
  sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true'); sheet.setAttribute('aria-label', title);
  const head = el('header');
  head.append(el('h2', '', title));
  const close = () => {
    if (!scrim.isConnected) return;
    scrim.remove(); document.removeEventListener('keydown', onKey, true); current = null; onClose(); before?.focus?.();
  };
  const dismiss = () => options.onDismiss ? options.onDismiss() : close();
  const onKey = (e: KeyboardEvent) => {
    trapTab(sheet, e);
    if (e.repeat && (e.key === 'Escape' || (options.blockRepeatedActivation && ['Enter', ' '].includes(e.key)))) { e.preventDefault(); e.stopPropagation(); return; }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); dismiss(); }
  };
  const x = button('x', '✕', dismiss, '닫기');
  head.append(x);
  const content = el('div', 'content');
  sheet.append(head, content);
  scrim.append(sheet);
  scrim.addEventListener('pointerdown', e => { if (e.target === scrim && options.dismissOnOutside !== false) dismiss(); });
  sheet.addEventListener('pointerdown', e => e.stopPropagation());
  // Tapping anywhere that is not a control closes the window (scroll gestures do not produce a click).
  sheet.addEventListener('click', e => {
    const t = e.target as Element | null;
    if (options.dismissOnOutside !== false && !t?.closest?.('button, a, input, select, textarea, label, summary, [role=button], .seg, .opts, .keep-open')) dismiss();
  });
  document.addEventListener('keydown', onKey, true);
  build(content, close);
  document.body.append(scrim);
  current = { close };
  x.focus();
}
