import { expect, test, type Page } from '@playwright/test';

type Hook = { world: { roomId: string; tap(p: { x: number; y: number }): void; player: { x: number; y: number } }; game: { state: object; importState(s: object): void } };
const room = (p: Page) => p.evaluate(() => (window as unknown as { __mq: Hook }).__mq.world.roomId);
const player = (p: Page) => p.evaluate(() => { const w = (window as unknown as { __mq: Hook }).__mq.world; return { x: w.player.x, y: w.player.y }; });
async function tap(p: Page, x: number, y: number) { await p.evaluate(([x, y]) => (window as unknown as { __mq: Hook }).__mq.world.tap({ x: x!, y: y! }), [x, y]); }
async function seed(p: Page, id: string, x: number, y: number) {
  await p.evaluate(({ id, x, y }) => { const h = (window as unknown as { __mq: Hook }).__mq; h.game.importState({ ...h.game.state, at: { room: id, x, y, facing: 'up' } }); }, { id, x, y });
  await p.reload(); await expect.poll(() => room(p)).toBe(id); await p.waitForTimeout(400);
}
async function go(p: Page, x: number, y: number, to: string, timeout = 15000) { await tap(p, x, y); await expect.poll(() => room(p), { timeout }).toBe(to); await p.waitForTimeout(450); }
async function walkTo(p: Page, x: number, y: number) {
  await tap(p, x, y);
  await expect.poll(async () => { const q = await player(p); return Math.hypot(q.x - x, q.y - y) < 10; }, { timeout: 25000 }).toBe(true);
  await p.waitForTimeout(300);
}
async function pickFloor(p: Page, label: RegExp, to: string) {
  await tap(p, 132, 84); await expect(p.locator('.dialog')).toBeVisible({ timeout: 8000 });
  await p.keyboard.press('e'); await p.getByRole('button', { name: label }).click();
  await expect.poll(() => room(p)).toBe(to); await p.waitForTimeout(400);
}

for (const [width, height] of [[1280, 900], [390, 844], [844, 390]]) test(`Euro Plaza D094 route ${width}x${height}`, async ({ page }) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: width!, height: height! });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/'); await page.getByRole('button', { name: '첫 출근하기' }).click();
  await seed(page, 'lobby', 240, 324);
  await page.screenshot({ path: `artifacts/d094-lobby-${width}.png` });
  // Lobby → lift hall: arriving at the bottom, the lift doors are straight ahead in the back wall.
  await go(page, 56, 38, 'lifthall');
  await page.screenshot({ path: `artifacts/d094-lifthall-${width}.png` });
  await page.reload(); await expect.poll(() => room(page)).toBe('lifthall'); await page.waitForTimeout(400);
  await go(page, 96, 84, 'lift1');
  await pickFloor(page, /4층 · 라운지/, 'lift4');
  await page.reload(); await expect.poll(() => room(page)).toBe('lift4'); await page.waitForTimeout(400);
  await go(page, 80, 155, 'floor4');
  await page.screenshot({ path: `artifacts/d094-landing-${width}.png` });
  // Open office: no door, fade or room swap at its edge; aisles between and behind the islands; meeting rooms through their openings.
  await walkTo(page, 120, 312); expect(await room(page)).toBe('floor4');
  await page.screenshot({ path: `artifacts/d094-office-${width}.png` });
  await walkTo(page, 200, 436);
  await walkTo(page, 60, 72); expect(await room(page)).toBe('floor4');
  await page.screenshot({ path: `artifacts/d094-meeting-a-${width}.png` });
  await walkTo(page, 230, 190);
  await walkTo(page, 240, 72);
  await page.screenshot({ path: `artifacts/d094-meeting-b-${width}.png` });
  // Lounge stays a separate map entered from the corridor.
  await go(page, 476, 416, 'lounge');
  await page.screenshot({ path: `artifacts/d094-lounge-${width}.png` });
  await go(page, 4, 176, 'floor4');
  await go(page, 416, 52, 'newsroom');
  await page.screenshot({ path: `artifacts/d094-inner-${width}.png` });
  await go(page, 336, 442, 'floor4');
  await go(page, 416, 523, 'lift4');
  await pickFloor(page, /1층 · 로비/, 'lift1');
  await go(page, 80, 155, 'lifthall');
  await go(page, 72, 187, 'lobby');
  expect(errors).toEqual([]);
});

test('older saves inside rebuilt walls reopen at a safe point', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/'); await page.getByRole('button', { name: '첫 출근하기' }).click(); await page.waitForTimeout(300);
  for (const [id, x, y, expected] of [['floor4', 288, 176, 'floor4'], ['outeroffice', 348, 176, 'floor4'], ['lobby', 8, 96, 'lobby'], ['lounge', 372, 176, 'lounge']] as const) {
    await page.evaluate(({ id, x, y }) => {
      const raw = JSON.parse(localStorage.getItem('medical-quest.v4.current')!);
      raw.at = { room: id, x, y, facing: 'up' }; localStorage.setItem('medical-quest.v4.current', JSON.stringify(raw));
    }, { id, x, y });
    await page.reload(); await expect.poll(() => room(page)).toBe(expected);
  }
  expect(errors).toEqual([]);
});

test('render full room plans from the actual game assets', async ({ page }) => {
  await page.goto('/');
  const images = await page.evaluate(async () => {
    const roomPath = '/src/world/rooms.ts', groundPath = '/src/art/ground.ts', propsPath = '/src/art/props.ts', euroPath = '/src/art/euro-interior.ts';
    const { rooms } = await import(roomPath), { bakeGround } = await import(groundPath), { propSprite } = await import(propsPath), { drawGlassFace } = await import(euroPath);
    const characterPath = '/src/art/character.ts', avatarPath = '/src/art/avatar.ts';
    const { characterFrame } = await import(characterPath), { AX, AY } = await import(avatarPath);
    const result: Record<string, string> = {};
    for (const id of ['lobby', 'lifthall', 'floor4', 'lounge', 'newsroom']) {
      const r = rooms[id], c = document.createElement('canvas'); c.width = r.cols * 32; c.height = r.rows * 32;
      const g = c.getContext('2d')!; g.imageSmoothingEnabled = false; g.scale(2, 2); g.drawImage(bakeGround(r), 0, 0);
      const actors = [
        ...r.props.map((p: { kind: string; v: number; x: number; y: number }) => ({ y: p.y, draw: () => { const s = propSprite(p.kind, p.v); g.drawImage(s.c, p.x - s.ax, p.y - s.ay); } })),
        ...r.npcs.map((n: { look: unknown; facing: string; x: number; y: number }) => ({ y: n.y, draw: () => g.drawImage(characterFrame(n.look, n.facing, 0), n.x - AX, n.y - AY) })),
        ...(r.interior?.glass ?? []).map((gl: { x: number; y: number; w: number; h: number }) => ({ y: gl.y + gl.h, draw: () => drawGlassFace(g, gl, 0, 0) })),
      ];
      for (const a of actors.sort((a, b) => a.y - b.y)) a.draw();
      result[id] = c.toDataURL('image/png').split(',')[1]!;
    }
    return result;
  });
  const { writeFileSync } = await import('node:fs');
  for (const [id, png] of Object.entries(images)) writeFileSync(`artifacts/d094-plan-${id}.png`, Buffer.from(png, 'base64'));
  expect(Object.keys(images)).toHaveLength(5);
});
