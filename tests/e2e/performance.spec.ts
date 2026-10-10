import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

test('pathfinding workload and bounded avatar cache', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const pathUrl = '/src/world/path.ts', artUrl = '/src/art/character.ts', lookUrl = '/src/domain/appearance.ts';
    const { findPath } = await import(/* @vite-ignore */ pathUrl);
    const art = await import(/* @vite-ignore */ artUrl);
    const looks = await import(/* @vite-ignore */ lookUrl);
    const samples: number[] = [];
    for (let trial = 0; trial < 5; trial++) {
      const t = performance.now();
      for (let i = 0; i < 400; i++) {
        findPath('newsroom', { x: 212, y: 176 }, { x: 240, y: 176 });
        findPath('street', { x: 292, y: 254 }, { x: 116, y: 403 });
      }
      samples.push(performance.now() - t);
    }
    const original = art.characterFrame(looks.defaultAppearance('male'), 'down', 0);
    const pixels = (c: HTMLCanvasElement) => [...c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data];
    const before = pixels(original);
    for (const preset of looks.presets) for (const hair of looks.hairFor(preset)) for (const hairColor of Object.keys(looks.hairColors)) {
      const look = { ...looks.defaultAppearance(preset), hair, hairColor };
      for (const dir of ['down', 'up', 'left', 'right']) for (let f = 0; f < 4; f++) art.characterFrame(look, dir, f);
    }
    const after = pixels(art.characterFrame(looks.defaultAppearance('male'), 'down', 0));
    return { path800CallsMs: samples, cache: art.characterCacheStats?.() ?? null, samePixels: before.every((v, i) => v === after[i]) };
  });
  expect(result.samePixels).toBe(true);
  if (!process.env.MQ_AUDIT_BASELINE) expect(result.cache?.size).toBeLessThanOrEqual(256);
  if (process.env.MQ_AUDIT_METRICS) {
    await mkdir('artifacts', { recursive: true });
    await writeFile(process.env.MQ_AUDIT_METRICS, JSON.stringify(result, null, 2));
    await page.evaluate(async () => {
      const artUrl = '/src/art/character.ts', lookUrl = '/src/domain/appearance.ts';
      const art = await import(/* @vite-ignore */ artUrl), looks = await import(/* @vite-ignore */ lookUrl);
      const c = document.createElement('canvas'); c.id = 'audit-sprites'; c.width = 800; c.height = 570;
      const g = c.getContext('2d')!; g.imageSmoothingEnabled = false; g.fillStyle = '#272333'; g.fillRect(0, 0, c.width, c.height);
      const dirs = ['down', 'up', 'right', 'left'], frames = [0, 1, 0, 2, 0];
      for (let row = 0; row < dirs.length; row++) for (let col = 0; col < frames.length; col++) {
        const sprite = art.characterFrame(looks.defaultAppearance('male'), dirs[row], frames[col]);
        g.drawImage(sprite, col * 150 + 40, row * 135 + 15, sprite.width * 3, sprite.height * 3);
        g.font = '12px sans-serif'; g.fillStyle = '#fff'; g.fillText(dirs[row] + ' · ' + frames[col], col * 150 + 40, row * 135 + 125);
      }
      document.body.replaceChildren(c); c.style.cssText = 'position:fixed;top:0;left:0;width:800px;height:570px';
    });
    await page.locator('#audit-sprites').screenshot({ path: 'artifacts/walk-cycles.png' });
  }
});
