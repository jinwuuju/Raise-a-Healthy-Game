// Render district-preview.html views to PNG with Playwright (local reference images, artifacts/ is Git-ignored).
// Usage: node tools/district/shoot.mjs name 'hash-params' [more name 'params' ...]
import { chromium } from 'playwright';
import { resolve } from 'node:path';
const page0 = 'file://' + resolve('artifacts/map-ref/district-preview.html');
const args = process.argv.slice(2);
const b = await chromium.launch();
for (let i = 0; i < args.length; i += 2) {
  const name = args[i], hash = args[i + 1];
  const q = Object.fromEntries(new URLSearchParams(hash));
  const n = Math.round((+(q.half ?? 1100)) * 2 * (+(q.ppm ?? 0.5)));
  const p = await b.newPage({ viewport: { width: n, height: n } });
  p.on('pageerror', e => console.log('pageerror', e.message));
  await p.goto(page0 + '#' + hash);
  await p.waitForFunction(() => window.DONE === true, null, { timeout: 120000 });
  await p.screenshot({ path: `artifacts/map-ref/${name}.png` });
  console.log(name, n + 'px', JSON.stringify(await p.evaluate(() => ({ m: window.METRICS ?? null, z: window.SATZ ?? null }))));
  await p.close();
}
await b.close();
