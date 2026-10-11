import { el } from './dom';

/*
 * On-screen movement ball for touch screens (D058), in the spirit of mobile RPG thumb sticks:
 * put a thumb on the ball at the bottom left and slide it; the reporter walks that way, slower near
 * the centre and at full speed at the rim. Uses touch events where they exist (most reliable on iOS
 * Safari and in-app browsers) and pointer events otherwise. It only reports a vector; it never moves
 * the world or changes game state itself.
 */
export class Joystick {
  readonly root = el('div', 'joystick hidden');
  private base = el('div', 'base');
  private knob = el('div', 'knob');
  private touchId: number | null = null;
  private pointerId = -1;
  private v = { x: 0, y: 0 };
  private center = { x: 0, y: 0, r: 1 };

  constructor(parent: HTMLElement) {
    for (const d of ['up', 'down', 'left', 'right']) this.base.append(el('i', 'arrow ' + d));
    this.base.append(this.knob);
    this.root.append(this.base);
    this.root.setAttribute('aria-hidden', 'true');
    parent.append(this.root);
    const useTouch = 'ontouchstart' in window;
    if (useTouch) {
      this.root.addEventListener('touchstart', e => {
        e.preventDefault(); e.stopPropagation();
        if (this.touchId !== null) return;
        const t = e.changedTouches[0];
        if (!t) return;
        this.touchId = t.identifier; this.begin(t.clientX, t.clientY);
      }, { passive: false });
      window.addEventListener('touchmove', e => {
        const t = this.find(e.changedTouches);
        if (!t) return;
        e.preventDefault(); this.move(t.clientX, t.clientY);
      }, { passive: false });
      const end = (e: TouchEvent) => { if (this.find(e.changedTouches)) this.reset(); };
      window.addEventListener('touchend', end); window.addEventListener('touchcancel', end);
    } else {
      this.root.addEventListener('pointerdown', e => {
        e.preventDefault(); e.stopPropagation();
        this.pointerId = e.pointerId; this.root.setPointerCapture(e.pointerId); this.begin(e.clientX, e.clientY);
      });
      this.root.addEventListener('pointermove', e => { if (e.pointerId === this.pointerId) this.move(e.clientX, e.clientY); });
      const end = (e: PointerEvent) => { if (e.pointerId === this.pointerId) this.reset(); };
      this.root.addEventListener('pointerup', end); this.root.addEventListener('pointercancel', end); this.root.addEventListener('lostpointercapture', end);
    }
    this.root.addEventListener('contextmenu', e => e.preventDefault());
  }

  private find(list: TouchList): Touch | null {
    if (this.touchId === null) return null;
    for (let i = 0; i < list.length; i++) if (list[i]!.identifier === this.touchId) return list[i]!;
    return null;
  }

  private begin(x: number, y: number): void {
    const r = this.base.getBoundingClientRect();
    this.center = { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width * 0.36 };
    this.root.classList.add('active');
    this.move(x, y);
  }

  private move(x: number, y: number): void {
    let dx = x - this.center.x, dy = y - this.center.y;
    const len = Math.hypot(dx, dy), max = this.center.r;
    if (len > max) { dx *= max / len; dy *= max / len; }
    this.knob.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
    const k = Math.min(1, len / max);
    // Small dead zone so a resting thumb does not drift; then a gentle curve up to full speed.
    if (k < 0.18) this.v = { x: 0, y: 0 };
    else { const s = Math.min(1, (k - 0.18) / 0.62); const a = Math.atan2(dy, dx); this.v = { x: Math.cos(a) * (0.35 + 0.65 * s), y: Math.sin(a) * (0.35 + 0.65 * s) }; }
  }

  reset(): void {
    this.touchId = null; this.pointerId = -1; this.v = { x: 0, y: 0 };
    this.knob.style.transform = '';
    this.root.classList.remove('active');
  }

  get vector(): { x: number; y: number } { return this.v; }
  get active(): boolean { return this.touchId !== null || this.pointerId !== -1; }
  setVisible(on: boolean): void { this.root.classList.toggle('hidden', !on); if (!on) this.reset(); }
}
