import body from '../../data/content/body-map.v0.1.json';
import heart from '../../data/content/heart-interior.v0.1.json';
import text from '../../data/content/organ-entry.v0.1.json';
import { entryBody, entryHeart, HEART_POSITION } from '../art/entry';
import { squeeze } from '../domain/cardiac';
import { button, el } from './dom';
import { openSheet } from './sheet';

/** Presentation only. The caller commits entry once this promise settles. */
export function showOrganEntry(returnFocus: HTMLElement): Promise<void> {
  return new Promise(resolve => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const whole = entryBody(), frames = Array.from({ length: 5 }, (_, i) => entryHeart(i));
    let raf = 0, elapsed = 0, previous = performance.now(), done = false;
    let finish = () => {}, dispose = () => {};
    openSheet('심장으로 들어가기', (content, close) => {
      const sheet = content.parentElement!; sheet.classList.add('organ-entry');
      sheet.querySelector('.x')?.setAttribute('aria-label', '연출 건너뛰고 들어가기');
      const stage = el('div', 'entry-stage'), cv = el('canvas');
      cv.setAttribute('aria-label', '전신에서 가슴의 심장으로 확대하고 상대정맥을 통해 우심방으로 진입하는 모형');
      stage.append(cv);
      const caption = el('p', 'entry-caption'); caption.setAttribute('role', 'status');
      const route = el('p', 'entry-route', text.route);
      const disclaimer = el('p', 'entry-disclaimer', body.disclaimer + ' · ' + text.limit);
      const skip = button('primary', '바로 들어가기', () => finish());
      const footer = el('div', 'entry-footer'); footer.append(route, disclaimer, skip);
      content.append(stage, caption, footer);
      finish = () => { if (!done) { done = true; close(); } };
      const draw = (now: number) => {
        if (done) return;
        // Backgrounding pauses the film; it cannot silently consume the introduction.
        if (!document.hidden) elapsed += Math.min(100, Math.max(0, now - previous));
        previous = now;
        const step = elapsed < 900 ? 'body' : elapsed < 1800 ? 'zoom' : elapsed < 3500 ? 'beat' : 'enter';
        if (sheet.dataset.step !== step) {
          sheet.dataset.step = step;
          caption.textContent = text.captions[step];
        }
        const r = Math.min(3, window.devicePixelRatio || 1), W = Math.max(1, Math.round(stage.clientWidth * r)), H = Math.max(1, Math.round(stage.clientHeight * r));
        if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
        const g = cv.getContext('2d')!; g.imageSmoothingEnabled = false;
        g.fillStyle = '#100e1b'; g.fillRect(0, 0, W, H);
        const grid = Math.max(16, Math.round(16 * r)); g.fillStyle = '#1d2634';
        for (let x = 0; x < W; x += grid) for (let y = 0; y < H; y += grid) g.fillRect(x, y, 1, 1);
        const base = Math.max(1, Math.floor(Math.min(W / 192, H / 240)));
        const t = Math.min(1, Math.max(0, (elapsed - 900) / 900)), ease = t * t * (3 - 2 * t);
        const scale = motion.matches ? base : Math.max(base, Math.round(base + ease * (Math.max(2, Math.floor(Math.min(W / 85, H / 100))) * 3 - base)));
        const pan = motion.matches ? 0 : ease;
        const cx = 80 + (HEART_POSITION.x - 80) * pan, cy = 112 + (HEART_POSITION.y - 112) * pan;
        const ox = Math.round(W / 2 - cx * scale), oy = Math.round(H / 2 - cy * scale);
        if (step === 'body' || step === 'zoom') {
          g.drawImage(whole, ox, oy, whole.width * scale, whole.height * scale);
          g.strokeStyle = '#f1cf8b'; g.lineWidth = Math.max(1, base);
          g.strokeRect(Math.round(ox + (HEART_POSITION.x - 15) * scale), Math.round(oy + (HEART_POSITION.y - 17) * scale), 30 * scale, 34 * scale);
        } else {
          const k = motion.matches ? 0 : Math.round(squeeze('ventricles', elapsed / 1000) * 4);
          const img = frames[k]!;
          const dive = motion.matches ? 0 : Math.max(0, (elapsed - 3500) / 700);
          const s = Math.max(1, Math.floor(Math.min(W / 85, H / 100))) + Math.round(dive * base * 8);
          const x = Math.round(W / 2 - (32 - dive * 16) * s), y = Math.round(H / 2 - (40 - dive * 28) * s);
          g.drawImage(img, x, y, img.width * s, img.height * s);
          if (step === 'enter') {
            g.fillStyle = '#7ff0f2'; g.fillRect(x + 15 * s, y + 8 * s, 3 * s, 14 * s);
            g.fillStyle = `rgba(16,14,27,${Math.max(0, (dive - .6) / .4)})`; g.fillRect(0, 0, W, H);
          }
        }
        if (elapsed >= 4200) { finish(); return; }
        raf = requestAnimationFrame(draw);
      };
      const resetClock = () => { previous = performance.now(); };
      document.addEventListener('visibilitychange', resetClock);
      dispose = () => { done = true; cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', resetClock); resolve(); };
      // Keep the draft data and its source contract attached to the view.
      sheet.dataset.review = heart.status;
      raf = requestAnimationFrame(now => { skip.focus({ preventScroll: true }); draw(now); });
    }, () => dispose(), { dismissOnOutside: false, onDismiss: () => finish(), blockRepeatedActivation: true, returnFocus });
  });
}
