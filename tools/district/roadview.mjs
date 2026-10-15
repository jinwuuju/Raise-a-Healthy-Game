// Capture Kakao roadview reference shots (local only, artifacts/ is Git-ignored; not copied into the game).
// Points are metres east/north of Euro Plaza (Nonhyeon-ro 805). Usage: node tools/district/roadview.mjs points.json
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
const LAT0 = 37.52067, LON0 = 127.02767, MX = 111320 * Math.cos(LAT0 * Math.PI / 180), MY = 110574;
const pts = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const out = 'artifacts/map-ref/roadview', index = [];
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1200, height: 800 } });
for (const pt of pts) {
  const lat = (LAT0 + pt.y / MY).toFixed(6), lon = (LON0 + pt.x / MX).toFixed(6);
  await p.goto(`https://map.kakao.com/link/roadview/${lat},${lon}`, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
  await p.waitForTimeout(2500);
  const m = /panoid=(\d+)/.exec(p.url());
  if (!m) { console.log(pt.id, 'no pano'); index.push({ ...pt, lat, lon, pano: null }); continue; }
  const shots = [];
  for (const h of pt.headings ?? [0, 90, 180, 270]) {
    await p.goto(`https://map.kakao.com/?panoid=${m[1]}&pan=${h}&zoom=0&map_type=TYPE_MAP&map_attribute=ROADVIEW`, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
    await p.waitForTimeout(4000);
    const f = `${pt.id}-h${String(h).padStart(3, '0')}.png`;
    await p.screenshot({ path: `${out}/${f}` }); shots.push({ h, f });
  }
  index.push({ ...pt, lat, lon, pano: m[1], shots }); console.log(pt.id, 'pano', m[1], shots.length);
  writeFileSync(`${out}/index.json`, JSON.stringify(index, null, 1));
}
await b.close();
const html = '<!doctype html><meta charset=utf-8><title>roadview refs</title><style>body{font:14px sans-serif;background:#222;color:#eee}img{width:24%;margin:.2%}</style>' +
  index.map(q => `<h3>${q.id} · ${q.note} · (${q.x}, ${q.y}) m · pano ${q.pano}</h3>` + (q.shots || []).map(s => `<img title='heading ${s.h}' src='${s.f}'>`).join('')).join('');
writeFileSync(`${out}/index.html`, html);
console.log('DONE');
