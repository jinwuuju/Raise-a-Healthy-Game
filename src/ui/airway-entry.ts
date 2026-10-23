import entry from '../../data/content/organ-entry.v0.1.json';
import space from '../../data/content/respiratory-space.v0.1.json';
import { entryFace, entryNostril, NOSE_POSITION, NOSTRIL_POSITION } from '../art/airway-entry';
import { airwayGround } from '../game/airway-view';
import { rooms } from '../world/rooms';
import { button, el } from './dom';
import { openSheet } from './sheet';

/*
 * D112 nostril entry film (design 20 section 2, D072 rules): about 4.2 seconds from the face to a nostril, through the
 * hairs at the entrance into the nasal cavity, with breath specks going in. Presentation only: the caller commits the
 * entry once this promise settles; skipping or Escape enters at once; reduced motion shows still frames; a hidden tab
 * pauses the film.
 */
export function showAirwayEntry(returnFocus: HTMLElement): Promise<void> {
  const text = entry.airway;
  return new Promise(resolve => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const face = entryFace(), close = entryNostril();
    let inside: HTMLCanvasElement | null = null;
    let raf = 0, elapsed = 0, previous = performance.now(), done = false;
    let finish = () => {}, dispose = () => {};
    openSheet('호흡기로 들어가기', (content, closeSheet) => {
      const sheet = content.parentElement!; sheet.classList.add('organ-entry', 'airway-entry');
      sheet.querySelector('.x')?.setAttribute('aria-label', '연출 건너뛰고 들어가기');
      const stage = el('div', 'entry-stage'), cv = el('canvas');
      cv.setAttribute('aria-label', '얼굴에서 콧구멍으로 확대하고 코털이 난 입구를 지나 코안으로 들어가는 모형');
      stage.append(cv);
      const caption = el('p', 'entry-caption'); caption.setAttribute('role', 'status');
      const route = el('p', 'entry-route', text.route);
      const disclaimer = el('p', 'entry-disclaimer', space.disclaimer + ' · ' + text.limit);
      const skip = button('primary', '바로 들어가기', () => finish());
      const footer = el('div', 'entry-footer'); footer.append(route, disclaimer, skip);
      content.append(stage, caption, footer);
      finish = () => { if (!done) { done = true; closeSheet(); } };
      const draw = (now: number) => {
        if (done) return;
        if (!document.hidden) elapsed += Math.min(100, Math.max(0, now - previous));
        previous = now;
        const step = elapsed < 900 ? 'face' : elapsed < 1800 ? 'zoom' : elapsed < 3300 ? 'nostril' : 'enter';
        if (sheet.dataset.step !== step) { sheet.dataset.step = step; caption.textContent = text.captions[step]; }
        const r = Math.min(3, window.devicePixelRatio || 1), W = Math.max(1, Math.round(stage.clientWidth * r)), H = Math.max(1, Math.round(stage.clientHeight * r));
        if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
        const g = cv.getContext('2d')!; g.imageSmoothingEnabled = false;
        g.fillStyle = '#100e1b'; g.fillRect(0, 0, W, H);
        const grid = Math.max(16, Math.round(16 * r)); g.fillStyle = '#1d2634';
        for (let x = 0; x < W; x += grid) for (let y = 0; y < H; y += grid) g.fillRect(x, y, 1, 1);
        const still = motion.matches, t = elapsed / 1000;
        if (step === 'face' || step === 'zoom') {
          const base = Math.max(1, Math.floor(Math.min(W / 120, H / 150)));
          const u = Math.min(1, Math.max(0, (elapsed - 900) / 900)), ease = u * u * (3 - 2 * u);
          const scale = still ? base : Math.round(base + ease * base * 3);
          const pan = still ? 0 : ease, cx = 48 + (NOSE_POSITION.x - 48) * pan, cy = 62 + (NOSE_POSITION.y - 62) * pan;
          const ox = Math.round(W / 2 - cx * scale), oy = Math.round(H / 2 - cy * scale);
          g.drawImage(face, ox, oy, face.width * scale, face.height * scale);
          g.strokeStyle = '#f1cf8b'; g.lineWidth = Math.max(1, base);
          g.strokeRect(Math.round(ox + (NOSE_POSITION.x - 12) * scale), Math.round(oy + (NOSE_POSITION.y - 9) * scale), 24 * scale, 16 * scale);
        } else {
          const fit = Math.max(1, Math.floor(Math.min(W / 100, H / 84)));
          const dive = still || step !== 'enter' ? 0 : Math.min(1, (elapsed - 3300) / 900);
          const s = fit + Math.round(dive * dive * fit * 6);
          const fx = 48 + (NOSTRIL_POSITION.x - 48) * Math.min(1, dive * 1.5), fy = 40 + (NOSTRIL_POSITION.y - 40) * Math.min(1, dive * 1.5);
          const ox = Math.round(W / 2 - fx * s), oy = Math.round(H / 2 - fy * s);
          g.drawImage(close, ox, oy, close.width * s, close.height * s);
          // Breath specks drawn in through both nostrils (breathing in).
          for (let i = 0; i < 16; i++) {
            const n = i % 2 ? NOSTRIL_POSITION.x : 96 - NOSTRIL_POSITION.x, a = (i * 2.399) % (Math.PI * 2);
            const p = still ? (i % 5) / 5 : (t * 0.55 + i / 16) % 1, R = 30 * (1 - p);
            const x = ox + (n + Math.cos(a) * R) * s, y = oy + (NOSTRIL_POSITION.y + 12 + Math.abs(Math.sin(a)) * R * 0.7 - p * 12) * s;
            g.fillStyle = `rgba(226,246,255,${(0.25 + 0.6 * p).toFixed(3)})`; g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(s * 0.8)), Math.max(1, Math.round(s * 0.8)));
          }
          if (step === 'enter') {
            const dark = still ? 0.85 : Math.min(1, dive * 1.4);
            g.fillStyle = `rgba(16,14,27,${dark.toFixed(3)})`; g.fillRect(0, 0, W, H);
            // The nasal cavity the reporter arrives in (the real room art), faded in at the end.
            const show = still ? 1 : Math.max(0, (dive - 0.55) / 0.45);
            if (show > 0) {
              inside ??= airwayGround(rooms.nose);
              const k = Math.max(1, Math.floor(Math.min(W / inside.width, H / inside.height) * 2) / 2);
              g.globalAlpha = show; g.drawImage(inside, Math.round(W / 2 - inside.width * k / 2), Math.round(H / 2 - inside.height * k / 2), inside.width * k, inside.height * k); g.globalAlpha = 1;
            }
          }
        }
        if (elapsed >= 4200) { finish(); return; }
        raf = requestAnimationFrame(draw);
      };
      const resetClock = () => { previous = performance.now(); };
      document.addEventListener('visibilitychange', resetClock);
      dispose = () => { done = true; cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', resetClock); resolve(); };
      sheet.dataset.review = entry.status;
      raf = requestAnimationFrame(now => { skip.focus({ preventScroll: true }); draw(now); });
    }, () => dispose(), { dismissOnOutside: false, onDismiss: () => finish(), blockRepeatedActivation: true, returnFocus });
  });
}
