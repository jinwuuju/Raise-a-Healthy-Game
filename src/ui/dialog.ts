import { portrait } from '../art/character';
import type { Look } from '../domain/appearance';
import type { Line } from '../application/story';
import { button, el, pixelCanvas } from './dom';

export type Choice = { id: string; label: string; sub: string; disabled: boolean };

export class Dialog {
  private root: HTMLElement | null = null;
  private lines: Line[] = [];
  private index = 0;
  private typing = 0;
  private full = '';
  private textEl: HTMLElement | null = null;
  private choices: Choice[] = [];
  private done: ((v: string | null) => void) | null = null;
  constructor(private lookOf: (npc: string | null) => Look | null) {}

  get open(): boolean { return this.root !== null; }

  show(lines: Line[], choices: Choice[] = []): Promise<string | null> {
    this.close(null);
    this.lines = lines; this.index = 0; this.choices = choices;
    return new Promise(resolve => { this.done = resolve; this.render(); });
  }

  /** Keyboard / tap: finish typing, then go to the next line. */
  advance(): void {
    if (!this.root) return;
    if (this.typing) { this.finishTyping(); return; }
    if (this.index < this.lines.length - 1) { this.index++; this.render(); return; }
    if (this.choices.length) return;
    this.close(null);
  }

  close(v: string | null): void {
    if (this.typing) { clearInterval(this.typing); this.typing = 0; }
    this.root?.remove(); this.root = null;
    const d = this.done; this.done = null; d?.(v);
  }

  private finishTyping(): void {
    clearInterval(this.typing); this.typing = 0;
    if (this.textEl) this.textEl.textContent = this.full;
    this.showChoicesIfLast();
  }

  private render(): void {
    const line = this.lines[this.index];
    if (!line) { this.close(null); return; }
    this.root?.remove();
    const root = el('div', 'dialog glass');
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-live', 'polite');
    const look = this.lookOf(line.npc);
    const face = el('div', 'face');
    if (look) face.append(pixelCanvas(portrait(look))); else face.classList.add('hidden');
    const body = el('div', 'body');
    body.append(el('span', 'who', line.who));
    const text = el('div', 'text'); body.append(text);
    root.append(face, body);
    const next = el('div', 'next', '▼'); root.append(next);
    root.addEventListener('click', () => this.advance());
    document.body.append(root);
    this.root = root; this.textEl = text; this.full = line.text;
    let i = 0;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { text.textContent = this.full; this.showChoicesIfLast(); return; }
    this.typing = window.setInterval(() => {
      i += 2; text.textContent = this.full.slice(0, i);
      if (i >= this.full.length) this.finishTyping();
    }, 28);
  }

  private showChoicesIfLast(): void {
    if (!this.root || this.index < this.lines.length - 1 || !this.choices.length || this.root.querySelector('.choices')) return;
    this.root.querySelector('.next')?.remove();
    const box = el('div', 'choices');
    for (const c of this.choices) {
      const b = button('choice', '', () => this.close(c.id));
      b.append(el('span', '', c.label), el('small', '', c.sub));
      b.disabled = c.disabled;
      box.append(b);
    }
    box.append(button('choice ghost', '그만두기', () => this.close(null)));
    this.root.querySelector('.body')!.append(box);
    (box.querySelector('button:not(:disabled)') as HTMLButtonElement | null)?.focus();
  }
}
