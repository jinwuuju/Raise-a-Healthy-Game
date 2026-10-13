import { REAL_CYCLE, ecg } from '../domain/cardiac';
import { el } from './dom';

/** Beat starts (seconds) of the fictional irregular strip B: no repeating interval, drawn for teaching only. */
const AF_BEATS = [0.18, 0.74, 1.62, 2.08, 2.97, 3.4];
const SECONDS = 4;
const gauss = (c: number, m: number, w: number, a: number) => a * Math.exp(-(((c - m) / w) ** 2));

/** Educational trace values: A repeats the game's regular P-QRS-T; B has fine baseline waves and irregular QRS gaps. */
export function stripValue(kind: 'regular' | 'irregular', t: number): number {
  if (kind === 'regular') return ecg(t % REAL_CYCLE);
  let v = 0.035 * Math.sin(t * 41) + 0.025 * Math.sin(t * 67 + 1.3) + 0.02 * Math.sin(t * 29 + 2.1);
  for (const b of AF_BEATS) { const c = t - b; if (c > -0.05 && c < 0.6) v += gauss(c, 0.006, 0.006, -0.12) + gauss(c, 0.02, 0.007, 1) + gauss(c, 0.033, 0.007, -0.26) + gauss(c, 0.28, 0.033, 0.27); }
  return v;
}

export function ecgStrip(kind: 'regular' | 'irregular', label: string): HTMLCanvasElement {
  const cv = el('canvas', 'ecg-strip'); cv.width = 640; cv.height = 120; cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', label);
  const g = cv.getContext('2d');
  if (!g) return cv;
  g.fillStyle = '#1c1424'; g.fillRect(0, 0, 640, 120);
  g.strokeStyle = 'rgba(240,214,160,0.12)'; g.lineWidth = 1;
  for (let x = 0; x <= 640; x += 32) { g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, 120); g.stroke(); }
  for (let y = 0; y <= 120; y += 24) { g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(640, y + 0.5); g.stroke(); }
  g.strokeStyle = kind === 'regular' ? '#7fdcca' : '#f1cf8b'; g.lineWidth = 2; g.beginPath();
  for (let x = 0; x <= 640; x++) { const y = 84 - stripValue(kind, (x / 640) * SECONDS) * 60; if (x) g.lineTo(x, y); else g.moveTo(x, y); }
  g.stroke();
  return cv;
}
