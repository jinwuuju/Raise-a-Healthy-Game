import { el } from './dom';

/** Mobile counterpart of E/Space. Touch is handled directly, with synthesized clicks suppressed. */
export class ConfirmControl {
  readonly root = el('button', 'mobile-confirm hidden');
  private ignoreClickUntil = 0;
  private shown = false;

  constructor(onConfirm: () => void) {
    this.root.type = 'button'; this.root.id = 'mobile-confirm';
    this.root.setAttribute('aria-label', '확인');
    this.root.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 12 4 4 8-9"/></svg><span>확인</span>';
    this.root.addEventListener('pointerdown', e => e.stopPropagation());
    this.root.addEventListener('touchstart', e => {
      e.preventDefault(); e.stopPropagation();
      if (this.root.disabled) return;
      this.ignoreClickUntil = performance.now() + 700;
      onConfirm();
    }, { passive: false });
    this.root.addEventListener('click', e => {
      e.stopPropagation();
      if ((e.detail === 0 || performance.now() >= this.ignoreClickUntil) && !this.root.disabled) onConfirm();
    });
    document.body.append(this.root);
  }

  setState(visible: boolean, enabled: boolean, description: string): void {
    if (this.shown !== visible) this.root.classList.toggle('hidden', !visible);
    this.shown = visible;
    if (this.root.disabled === enabled) this.root.disabled = !enabled;
    if (this.root.title !== description) { this.root.title = description; this.root.setAttribute('aria-description', description); }
  }
  get visible(): boolean { return this.shown; }
}
