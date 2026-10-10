import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 568, height: 320 }, { width: 844, height: 390 }]) {
  test(`creator ${viewport.width}x${viewport.height}: fits screen and every option is reachable`, async ({ browser }) => {
    const page = await browser.newPage({ viewport, hasTouch: true, isMobile: true, deviceScaleFactor: 3 });
    await page.goto('/');
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(null)))));
    const measurements = await page.evaluate(() => {
      const rect = (q: string) => { const r = document.querySelector(q)!.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
      return { card: rect('.creator .card'), stage: rect('.creator .stage'), preview: rect('.creator .preview'), pedestal: rect('.creator .pedestal'), actions: rect('.creator .actions'), width: innerWidth, height: innerHeight };
    });
    if (process.env.MQ_CREATOR_CAPTURE) {
      await mkdir('artifacts', { recursive: true });
      await page.screenshot({ path: `artifacts/creator-${process.env.MQ_CREATOR_CAPTURE}-${viewport.width}.png` });
      await writeFile(`artifacts/creator-${process.env.MQ_CREATOR_CAPTURE}-${viewport.width}.json`, JSON.stringify(measurements, null, 2));
    }
    expect(measurements.card.x).toBeGreaterThanOrEqual(0);
    expect(measurements.card.y).toBeGreaterThanOrEqual(0);
    expect(measurements.card.right).toBeLessThanOrEqual(viewport.width);
    expect(measurements.card.bottom).toBeLessThanOrEqual(viewport.height);
    expect(measurements.preview.y).toBeGreaterThanOrEqual(measurements.stage.y);
    expect(measurements.preview.bottom).toBeLessThanOrEqual(measurements.stage.bottom);
    expect(Math.abs(measurements.preview.y + measurements.preview.height * 33 / 34 - (measurements.pedestal.y + measurements.pedestal.height / 2))).toBeLessThan(2);
    const go = page.getByRole('button', { name: '첫 출근하기' });
    await expect(go).toBeInViewport();
    const buttons = page.locator('.creator form button:not(:disabled)');
    for (let i = 0; i < await buttons.count(); i++) {
      const button = buttons.nth(i);
      await button.scrollIntoViewIfNeeded();
      await expect(button).toBeInViewport();
      const box = (await button.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    await page.getByRole('button', { name: '여성 기자', exact: true }).tap();
    await page.getByRole('button', { name: '젤리 펌 보브', exact: true }).tap();
    await expect(page.getByRole('button', { name: '젤리 펌 보브', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(go).toBeInViewport();
    await go.tap();
    await expect(page.locator('.hud')).toBeVisible();
    await page.close();
  });
}

test('creator keeps all controls inside with enlarged text and safe area margins', async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2.625, hasTouch: true, isMobile: true });
  await page.goto('/');
  await page.addStyleTag({ content: ':root { font-size: 200%; --safe-t: 24px; --safe-b: 20px; --safe-l: 8px; --safe-r: 8px; }' });
  for (const name of ['남성 기자', '여성 기자', '외계인 기자']) {
    const b = page.getByRole('button', { name, exact: true });
    await b.scrollIntoViewIfNeeded(); await expect(b).toBeInViewport();
    const r = (await b.boundingBox())!; expect(r.x + r.width).toBeLessThanOrEqual(390); expect(r.x).toBeGreaterThanOrEqual(0);
  }
  const go = page.getByRole('button', { name: '첫 출근하기' });
  await expect(go).toBeInViewport();
  const r = (await go.boundingBox())!; expect(r.y + r.height).toBeLessThanOrEqual(824);
  await go.tap(); await expect(page.locator('.hud')).toBeVisible();
  await page.close();
});

test('creator adapts to a shrinking visual viewport and restores on keyboard dismissal', async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
  await page.goto('/');
  await page.evaluate(() => { const v = window.visualViewport!; Object.defineProperty(v, 'height', { value: 320, configurable: true }); v.dispatchEvent(new Event('resize')); });
  await expect(page.locator('.creator')).toHaveClass(/compact/);
  const go = page.getByRole('button', { name: '첫 출근하기' });
  const r = (await go.boundingBox())!; expect(r.y + r.height).toBeLessThanOrEqual(320);
  await page.getByLabel('기자 이름').fill('작은화면');
  await page.evaluate(() => { const v = window.visualViewport!; Object.defineProperty(v, 'height', { value: 844, configurable: true }); v.dispatchEvent(new Event('resize')); });
  await expect(page.locator('.creator')).not.toHaveClass(/compact/);
  await go.tap(); await expect(page.locator('.chip .name')).toHaveText('작은화면');
  await page.close();
});
