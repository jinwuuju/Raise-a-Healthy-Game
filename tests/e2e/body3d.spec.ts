import { expect, test, type Page } from '@playwright/test';

/* D118 Bodyscope 3D outer model: opened from the Bodyscope and the map, turned, layered, and explained by tapping. */
type Hook = { world: { roomId: string; setRoom(r: string, x: number, y: number, f: string): void }; game: { state: Record<string, unknown>; importState(s: object): void; enter(r: string, x: number, y: number, f: string): void } };
type B3 = { ready: boolean; view: string; selected: string | null; camera: { position: { x: number; y: number; z: number } }; markers(): { id: string; x: number; y: number; behind: boolean }[]; layers(): string[] };
const b3 = (p: Page) => p.evaluate(() => { const h = (window as unknown as { __body3d: B3 }).__body3d; return { ready: h.ready, view: h.view, selected: h.selected, cam: { ...h.camera.position }, markers: h.markers(), layers: h.layers() }; });

async function boot(p: Page, fixture: 'q010' | 'q014') {
  await p.emulateMedia({ reducedMotion: 'reduce' });
  await p.goto('/'); await p.getByRole('button', { name: '첫 출근하기' }).click(); await p.waitForTimeout(300);
  await Promise.all([p.waitForEvent('load'), p.evaluate(async fixture => {
    const mod = await import(/* @vite-ignore */ '/tests/helpers/' + fixture + '-fixture.ts');
    const h = (window as unknown as { __mq: Hook }).__mq, s = fixture === 'q010' ? mod.q10Fixture() : mod.q14Fixture();
    h.game.importState({ ...s, at: { room: 'newsroom', x: 464, y: 152, facing: 'up' }, saveId: (h.game.state as unknown as { saveId: string }).saveId });
    location.reload();
  }, fixture)]);
  await p.waitForFunction(() => !!(window as unknown as { __mq?: Hook }).__mq?.world); await p.waitForTimeout(600);
}
async function goTo(p: Page, room: string, id: string) {
  await p.evaluate(async ({ room, id }) => {
    const { rooms } = await import(/* @vite-ignore */ '/src/world/rooms.ts' as string), { canStand } = await import(/* @vite-ignore */ '/src/world/collision.ts' as string);
    const t = rooms[room].targets.find((x: { id: string }) => x.id === id);
    let q = { x: t.x, y: t.y };
    outer: for (let r = 2; r <= t.r; r += 2) for (let a = 0; a < 16; a++) { const c = { x: Math.round(t.x + Math.cos(a / 16 * Math.PI * 2) * r), y: Math.round(t.y + Math.sin(a / 16 * Math.PI * 2) * r) }; if (canStand(room, c)) { q = c; break outer; } }
    const h = (window as unknown as { __mq: Hook }).__mq; const moved = h.world.roomId !== room;
    h.world.setRoom(room, q.x, q.y, 'down'); if (moved) h.game.enter(room, q.x, q.y, 'down');
  }, { room, id });
  await p.waitForTimeout(250);
}
const press = async (p: Page) => { await p.locator('#view').focus(); await p.keyboard.press('e'); await p.waitForTimeout(300); };
const colours = (p: Page) => p.evaluate(() => {
  const c = document.querySelector('.body3d-stage canvas') as HTMLCanvasElement, g = document.createElement('canvas'); g.width = 160; g.height = 120;
  const x = g.getContext('2d')!; x.drawImage(c, 0, 0, 160, 120); const d = x.getImageData(0, 0, 160, 120).data, set = new Set<number>(); let lit = 0;
  for (let i = 0; i < d.length; i += 4) { set.add(((d[i]! >> 3) << 10) | ((d[i + 1]! >> 3) << 5) | (d[i + 2]! >> 3)); if (d[i]! + d[i + 1]! + d[i + 2]! > 150) lit++; }
  return { colours: set.size, lit: lit / (160 * 120) };
});

test('3D outer model from the Bodyscope: views, notes by list and by tapping, turning, layers, the map button (D118)', async ({ page }) => {
  test.setTimeout(180000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await boot(page, 'q014');
  await goTo(page, 'newsroom', 'device'); await press(page);
  await page.getByRole('button', { name: /3D 외형 모형 보기/ }).click();
  const sheet = page.getByRole('dialog', { name: '바디스코프 3D 외형 모형' }); await expect(sheet).toBeVisible();
  await page.waitForFunction(() => (window as unknown as { __body3d?: B3 }).__body3d?.ready, null, { timeout: 120000 });
  await page.waitForTimeout(500);
  await expect(sheet).toContainText('검수 전 모형');
  let s = await b3(page);
  expect(s.view).toBe('body'); expect(s.layers).toContain('skin');
  expect((await colours(page)).colours).toBeGreaterThan(40);
  await page.screenshot({ path: 'artifacts/d118-body3d-body.png' });

  // Heart: markers on the model, a note from the list, then a tap on the middle of the heart.
  await sheet.locator('.body3d-views').getByRole('button', { name: '심장', exact: true }).click(); await page.waitForTimeout(600);
  s = await b3(page); expect(s.layers).toEqual(['heart']);
  const box = (await sheet.locator('.body3d-stage canvas').boundingBox())!;
  expect(s.markers.length).toBeGreaterThan(8);
  for (const m of s.markers) { expect(m.x).toBeGreaterThan(0); expect(m.x).toBeLessThan(box.width); expect(m.y).toBeGreaterThan(0); expect(m.y).toBeLessThan(box.height); }
  const c = await colours(page); expect(c.colours).toBeGreaterThan(60); expect(c.lit).toBeGreaterThan(0.08);
  await sheet.locator('.body3d-list').getByRole('button', { name: '좌심실', exact: true }).click();
  await expect(sheet.locator('.body3d-note')).toContainText('좌심실'); await expect(sheet.locator('.body3d-note')).toContainText('대동맥');
  expect((await b3(page)).selected).toBe('lv');
  await page.screenshot({ path: 'artifacts/d118-body3d-heart.png' });
  await sheet.locator('.body3d-tools').getByRole('button', { name: '이 범위의 처음 시점으로' }).click(); await page.waitForTimeout(400);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await page.waitForTimeout(300);
  const tapped = (await b3(page)).selected; expect(['lv', 'rv', 'ra', 'la', 'auricle', 'aorta', 'pulmonary-trunk', 'lad', 'rca', 'lcx', 'svc', 'ivc', 'pulmonary-veins']).toContain(tapped);
  // Dragging turns the model; the tools turn it too.
  const before = (await b3(page)).cam;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 160, box.y + box.height / 2 + 20, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(300);
  const after = (await b3(page)).cam; expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeGreaterThan(5);
  expect((await b3(page)).selected).toBe(tapped); // a drag is not a tap
  await sheet.getByRole('button', { name: '뒤에서 보기' }).click(); await page.waitForTimeout(300);
  expect((await b3(page)).cam.z).toBeLessThan(0);
  await page.screenshot({ path: 'artifacts/d118-body3d-heart-back.png' });
  // Layers: hiding the heart hides its markers.
  await sheet.locator('.body3d-layers').getByRole('button', { name: '심장·혈관' }).click(); await page.waitForTimeout(200);
  expect((await b3(page)).markers.length).toBe(0);

  // Airway: rings, bronchi, lungs and their notes.
  await sheet.locator('.body3d-views').getByRole('button', { name: '호흡기', exact: true }).click(); await page.waitForTimeout(600);
  s = await b3(page); expect(s.layers).toEqual(expect.arrayContaining(['lungs', 'airway', 'diaphragm']));
  await sheet.locator('.body3d-list').getByRole('button', { name: 'C자 연골 고리', exact: true }).click();
  await expect(sheet.locator('.body3d-note')).toContainText('식도');
  await sheet.locator('.body3d-list').getByRole('button', { name: '오른폐', exact: true }).click();
  await expect(sheet.locator('.body3d-note')).toContainText('세 엽');
  await page.screenshot({ path: 'artifacts/d118-body3d-airway.png' });
  await sheet.locator('.body3d-views').getByRole('button', { name: '가슴 속', exact: true }).click(); await page.waitForTimeout(600);
  await page.screenshot({ path: 'artifacts/d118-body3d-chest.png' });
  await page.keyboard.press('Escape'); await expect(sheet).toBeHidden();

  // The same model from the Bodyscope map inside the airway, and back to the map.
  await goTo(page, 'trachea', 'rx-c-ring'); await page.locator('#view').focus(); await page.keyboard.press('m');
  const map = page.getByRole('dialog', { name: '바디스코프 지도' }); await expect(map).toBeVisible();
  await map.getByRole('button', { name: '인체', exact: true }).click();
  await map.getByRole('button', { name: '자세히 보기 · 3D 외형 모형' }).click();
  await expect(sheet).toBeVisible(); await page.waitForFunction(() => (window as unknown as { __body3d?: B3 }).__body3d?.ready, null, { timeout: 120000 });
  await sheet.getByRole('button', { name: '바디스코프 지도로 돌아가기' }).click();
  await expect(page.getByRole('dialog', { name: '바디스코프 지도' })).toBeVisible();
  await page.keyboard.press('Escape');
  expect(errors).toEqual([]);
});

test('Before the heart graduation the airway part stays grey and closed; phones keep the sheet on screen (D118)', async ({ page }) => {
  test.setTimeout(180000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await boot(page, 'q010');
  await goTo(page, 'newsroom', 'device'); await press(page);
  await page.getByRole('button', { name: /3D 외형 모형 보기/ }).click();
  const sheet = page.getByRole('dialog', { name: '바디스코프 3D 외형 모형' });
  await page.waitForFunction(() => (window as unknown as { __body3d?: B3 }).__body3d?.ready, null, { timeout: 120000 });
  expect((await b3(page)).view).toBe('heart');
  await expect(sheet.locator('.body3d-views').getByRole('button', { name: /호흡기/ })).toBeDisabled();
  await sheet.locator('.body3d-views').getByRole('button', { name: '가슴 속', exact: true }).click(); await page.waitForTimeout(400);
  await expect(sheet.locator('.body3d-list')).not.toContainText('기관');
  await expect(sheet.locator('.body3d-list')).toContainText('호흡기');
  await sheet.locator('.body3d-list').getByRole('button', { name: '호흡기', exact: true }).click();
  await expect(sheet.locator('.body3d-note')).toContainText('심장 졸업 특집호');
  await page.keyboard.press('Escape');
  const audit = () => page.evaluate(() => {
    const out: string[] = [];
    for (const root of Array.from(document.querySelectorAll('.sheet'))) {
      const rr = root.getBoundingClientRect(); if (rr.bottom > innerHeight + 1 || rr.top < -1 || rr.right > innerWidth + 1 || rr.left < -1) out.push('offscreen');
      for (const e of Array.from(root.querySelectorAll('*')) as HTMLElement[]) {
        const cs = getComputedStyle(e); if (cs.display === 'none' || (!e.clientHeight && !e.clientWidth)) continue;
        if ((cs.overflowY === 'hidden' || cs.overflowY === 'clip') && e.scrollHeight > e.clientHeight + 2) out.push('clipY ' + e.className);
        if ((cs.overflowX === 'hidden' || cs.overflowX === 'clip') && e.scrollWidth > e.clientWidth + 2) out.push('clipX ' + e.className);
      }
      for (const b of Array.from(root.querySelectorAll('.body3d-tools button, .body3d-views button, .body3d-layers button')) as HTMLElement[]) { const r = b.getBoundingClientRect(); if (r.width && (r.height < 40 || r.width < 40)) out.push('small ' + b.textContent); }
      const st = root.querySelector('.body3d-stage') as HTMLElement | null, cv = st?.querySelector('canvas');
      if (st && cv && Math.abs(st.getBoundingClientRect().width - cv.getBoundingClientRect().width) > 2) out.push('canvas width');
    }
    if (document.documentElement.scrollWidth > innerWidth + 1) out.push('page overflow');
    return out;
  });
  for (const [w, h] of [[390, 844], [844, 390], [1440, 760]] as [number, number][]) {
    await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(200);
    await page.evaluate(async () => { const m = await import(/* @vite-ignore */ '/src/ui/body3d.ts' as string); m.openBody3d({ airwayOpen: true, start: 'chest' }); });
    await page.waitForFunction(() => (window as unknown as { __body3d?: B3 }).__body3d?.ready, null, { timeout: 120000 }); await page.waitForTimeout(300);
    expect(await audit(), w + 'x' + h).toEqual([]);
    expect((await colours(page)).colours).toBeGreaterThan(30);
    if (w === 390) await page.screenshot({ path: 'artifacts/d118-body3d-390.png' });
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  }
  expect(errors).toEqual([]);
});
