// Check how well OSM building outlines sit on the imagery: image edge strength sampled along outlines,
// for whole-map shifts of -8..8 m. A sharp peak at (0,0) means OSM and imagery agree.
import { chromium } from 'playwright';
import { resolve } from 'node:path';
const half = +(process.argv[2] ?? 300), ppm = 4, N = half * 2 * ppm;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: N, height: N } });
await p.goto('file://' + resolve('artifacts/map-ref/district-preview.html') + `#half=${half}&ppm=${ppm}&sat=1&satonly=1&rings=0`);
await p.waitForFunction(() => window.DONE === true, null, { timeout: 120000 });
const r = await p.evaluate(({ half, ppm, N }) => {
  const g = document.getElementById('c').getContext('2d'), d = g.getImageData(0, 0, N, N).data;
  const L = new Float32Array(N * N); for (let i = 0; i < N * N; i++) L[i] = d[i * 4] * .3 + d[i * 4 + 1] * .59 + d[i * 4 + 2] * .11;
  const G = new Float32Array(N * N);
  for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) { const i = y * N + x; G[i] = Math.hypot(L[i + 1] - L[i - 1], L[i + N] - L[i - N]); }
  const samples = [];
  for (const bd of PLAN.buildings) for (let k = 0; k + 1 < bd.pts.length; k++) { const [a, c] = [bd.pts[k], bd.pts[k + 1]]; const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
    for (let t = 0; t < len; t += 1) { const x = a[0] + (c[0] - a[0]) * t / len, y = a[1] + (c[1] - a[1]) * t / len; if (Math.abs(x) < half - 10 && Math.abs(y) < half - 10) samples.push([x, y]); } }
  const score = (dx, dy) => { let s = 0; for (const [x, y] of samples) { const px = Math.round((x + dx + half) * ppm), py = Math.round((half - (y + dy)) * ppm); s += G[py * N + px] || 0; } return s / samples.length; };
  const grid = []; let best = { dx: 0, dy: 0, s: -1 };
  for (let dy = -8; dy <= 8; dy++) for (let dx = -8; dx <= 8; dx++) { const s = score(dx, dy); grid.push(s); if (s > best.s) best = { dx, dy, s }; }
  const mean = grid.reduce((a, b) => a + b, 0) / grid.length;
  return { samples: samples.length, best, atZero: score(0, 0), meanAllShifts: mean };
}, { half, ppm, N });
console.log(JSON.stringify(r)); await b.close();
