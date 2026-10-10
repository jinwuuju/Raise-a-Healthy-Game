import { Buffer } from 'node:buffer';
import { test, expect, type Page } from '@playwright/test';
import type { GameState } from '../../src/domain/state';
async function saved(page: Page): Promise<GameState> {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const req = indexedDB.open('medical-quest-foundation', 1);
    req.onsuccess = () => {
      const db = req.result; const tx = db.transaction('saves'); const get = tx.objectStore('saves').get('current');
      get.onsuccess = () => { resolve(get.result); db.close(); }; get.onerror = () => reject(get.error);
    };
    req.onerror = () => reject(req.error);
  }));
}
async function start(page: Page, preset = 'male'): Promise<void> {
  await page.goto('/'); await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByLabel('기자 이름', { exact: true }).fill('테스트 기자');
  await page.getByLabel('기본 외형', { exact: true }).selectOption(preset);
  await page.getByRole('button', { name: '이 모습으로 출근' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
}
async function openStorage(page:Page):Promise<void> {
  await page.getByRole('button',{name:'메뉴',exact:true}).click();
  await page.getByRole('button',{name:'기록·저장',exact:false}).click();
}
async function saveCurrent(page:Page):Promise<void> { await openStorage(page);await page.getByRole('button',{name:'현재 위치 저장',exact:true}).click(); }
async function steps(page:Page,name:string,count:number):Promise<void> {
  await expect(page.getByRole('dialog')).not.toBeVisible();
  const key:Record<string,string>={'왼쪽으로 이동':'ArrowLeft','오른쪽으로 이동':'ArrowRight','위로 이동':'ArrowUp','아래로 이동':'ArrowDown'};
  await page.locator('canvas').focus();await page.keyboard.down(key[name]!);
  await page.waitForTimeout((count*24+1.12)/112*1000);
  await page.keyboard.up(key[name]!);
  await expect.poll(()=>page.locator('#world').getAttribute('data-moving')).toBe('false');
}
async function go(page:Page,x:number,y:number,expectedRoom?:string):Promise<void>{
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.waitForFunction(()=>document.getElementById('world')?.dataset.cameraX!==undefined);
  await expect.poll(()=>page.locator('#world').getAttribute('data-moving')).toBe('false');
  await page.waitForTimeout(500);
  const point=await page.locator('#world').evaluate((el,p)=>{const d=(el as HTMLElement).dataset;return{x:(p.x-Number(d.cameraX))*Number(d.zoom),y:(p.y-Number(d.cameraY))*Number(d.zoom)};},{x,y});
  await page.locator('canvas').click({position:point});
  if(expectedRoom)await expect(page.locator('#location')).toHaveText(expectedRoom);
  else await expect.poll(async()=>Math.hypot(Number(await page.locator('#world').getAttribute('data-player-x'))-x,Number(await page.locator('#world').getAttribute('data-player-y'))-y)).toBeLessThan(1);
}
for (const preset of ['male', 'female', 'alien']) test(`preset ${preset}: start / save / reload`, async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await start(page, preset);
  await steps(page, '왼쪽으로 이동', 2);
  await saveCurrent(page);
  await expect(page.getByRole('status')).toContainText('현재 위치를 저장');
  const before = await saved(page); expect(before.avatar.preset).toBe(preset); expect(before.safeLocation.x).toBeGreaterThan(266); expect(before.safeLocation.x).toBeLessThan(278);
  await page.reload(); await expect(page.getByRole('status')).toContainText('준비됐어요');
  expect(await saved(page)).toEqual(before);
  expect(errors).toEqual([]);
});
test('inspection, modal focus and input lock, collision, room transition and reload', async ({ page }) => {
  await start(page);
  await steps(page, '위로 이동', 3);
  await page.getByRole('button', { name: '가까운 곳 조사' }).click();
  await expect(page.getByRole('dialog')).toContainText('편집장');
  const before = await saved(page);
  await page.keyboard.down('ArrowUp'); await page.waitForTimeout(150); await page.keyboard.up('ArrowUp');
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => document.querySelector('dialog')!.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).not.toBeVisible();
  await saveCurrent(page);
  expect((await saved(page)).safeLocation).toEqual(before.safeLocation);
  await steps(page, '위로 이동', 5); await saveCurrent(page);
  await expect.poll(async () => (await saved(page)).safeLocation.y).toBeGreaterThanOrEqual(163);
  await go(page,565,296,'유로프라자 · 1층 로비');
  await expect(page.locator('#location')).toHaveText('유로프라자 · 1층 로비');
  await page.reload(); await expect(page.locator('#location')).toHaveText('유로프라자 · 1층 로비');
  await go(page,48,230,'유로프라자 · 편집국');
  await expect(page.locator('#location')).toHaveText('유로프라자 · 편집국');
});
test('a second tab cannot write; closing the owner and reloading transfers ownership', async ({ page, context }) => {
  await start(page, 'alien');
  const second = await context.newPage(); await second.goto('/');
  await expect(second.locator('#readonly')).toBeVisible();
  await openStorage(second);await expect(second.getByRole('button', { name: '현재 위치 저장' })).toBeDisabled();
  const before = await saved(second); await page.close(); await second.reload();
  await expect(second.locator('#readonly')).not.toBeVisible();
  await openStorage(second);await expect(second.getByRole('button', { name: '현재 위치 저장' })).toBeEnabled();
  expect((await saved(second)).avatar).toEqual(before.avatar);
});
test('malformed and newer file imports preserve current state; backups restore a normal snapshot', async ({ page }) => {
  await start(page); const before = await saved(page);
  await page.locator('#file').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ ...before, schemaVersion: 999 })) });
  await page.getByRole('button', { name: '불러오기', exact: true }).click();
  await expect(page.locator('#dialog-error')).toContainText('지원하지 않는');
  expect(await saved(page)).toEqual(before);
  await page.getByRole('button', { name: '취소', exact: true }).click();
  await steps(page, '왼쪽으로 이동', 2); await saveCurrent(page);
  await expect(page.getByRole('status')).toContainText('현재 위치');
  await openStorage(page);await page.getByRole('button', { name: '이전 저장 복구' }).click();
  await page.getByRole('button', { name: `저장 #${before.revision} 복구`, exact: true }).click();
  await expect(page.getByRole('status')).toContainText('이전 저장을 복구');
  expect((await saved(page)).safeLocation).toEqual(before.safeLocation);
});
test('small screen and 200% text keep the native dialog actions reachable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/');
  await page.addStyleTag({ content: ':root { font-size: 200%; }' });
  const button = page.getByRole('button', { name: '기본으로 바로 시작' });
  await button.scrollIntoViewIfNeeded(); await expect(button).toBeInViewport(); await button.click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('an actual browser storage write failure preserves the last committed snapshot', async ({ page }) => {
  await start(page); const before = await saved(page);
  await steps(page, '왼쪽으로 이동', 1);
  await page.evaluate(() => {
    const original = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = function (...args: Parameters<typeof original>) {
      if (args[1] === 'readwrite') throw new DOMException('storage failure fixture', 'QuotaExceededError');
      return original.apply(this, args);
    };
  });
  await saveCurrent(page);
  await expect(page.getByRole('status')).toContainText('storage failure');
  await expect(page.locator('#dialog-error')).toContainText('storage failure');
  expect(await saved(page)).toEqual(before);
  await page.reload(); await expect(page.getByRole('status')).toContainText('준비됐어요');
  expect(await saved(page)).toEqual(before);
});
test('corrupt stored data stays intact until explicit backup recovery', async ({ page }) => {
  await start(page); await saveCurrent(page);
  await expect(page.getByRole('status')).toContainText('현재 위치');
  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    const r = indexedDB.open('medical-quest-foundation'); r.onsuccess = () => {
      const db = r.result; const tx = db.transaction('saves', 'readwrite');
      tx.objectStore('saves').put({ schemaVersion: 999, original: 'preserve this' }, 'current');
      tx.oncomplete = () => { db.close(); resolve(); }; tx.onabort = () => reject(tx.error);
    };
  }));
  await page.reload(); await expect(page.getByRole('dialog')).toContainText('저장 기록을 열지');
  expect(await saved(page)).toMatchObject({ schemaVersion: 999 });
  await page.getByRole('button', { name: '정상 저장 #1 복구', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('준비됐어요');
  expect((await saved(page)).avatar.name).toBe('테스트 기자');
  const original = await page.evaluate(() => new Promise(resolve => {
    const r = indexedDB.open('medical-quest-foundation'); r.onsuccess = () => {
      const db = r.result; const q = db.transaction('saves').objectStore('saves').get('damaged-original');
      q.onsuccess = () => { resolve(q.result); db.close(); };
    };
  }));
  expect(original).toMatchObject({ schemaVersion: 999, original: 'preserve this' });
});
test('keyboard walking works and a runtime screenshot is captured', async ({ page }) => {
  await start(page); await page.locator('canvas').focus();
  await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(200); await page.keyboard.up('ArrowLeft');
  await saveCurrent(page);
  await expect(page.getByRole('status')).toContainText('현재 위치');
  expect((await saved(page)).safeLocation.x).toBeLessThan(310);
  await page.screenshot({ path: 'artifacts/p1-workplace.png', fullPage: true });
});
test('IndexedDB commits an isolated reward fixture with ledger and rejects a stale writer atomically', async ({ page }) => {
  await start(page);
  const result = await page.evaluate(async () => {
    const storePath = '/src/infrastructure/save-store.ts'; const domainPath = '/src/domain/state.ts';
    const { IndexedSaveStore } = await import(storePath); const { grantOnce } = await import(domainPath);
    const a = await IndexedSaveStore.open(), b = await IndexedSaveStore.open();
    const original = await a.load();
    const next = grantOnce(original, 'fixture.first', { xp: 100, gold: 100 }); next.revision++;
    const outcomes = await Promise.allSettled([a.commit(next, original.revision), b.commit(next, original.revision)]);
    const committed = await a.load(); const repeat = grantOnce(committed, 'fixture.first', { xp: 100, gold: 100 });
    return { outcomes: outcomes.map(o => o.status), committed, unchanged: repeat === committed };
  });
  expect(result.outcomes.sort()).toEqual(['fulfilled', 'rejected']);
  expect(result.committed).toMatchObject({ totalXp: 100, gold: 100, completionLedger: ['fixture.first'] });
  expect(result.unchanged).toBe(true);
});
test('office -> lobby -> 200m street model -> B2BC cafe: free order, sitting and saved return', async ({ page }) => {
  test.setTimeout(90000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await start(page);
  await go(page,565,296,'유로프라자 · 1층 로비');
  await expect(page.locator('#location')).toHaveText('유로프라자 · 1층 로비');
  await go(page,400,296);await go(page,565,296,'논현로 · 을지병원 사거리');
  await expect(page.locator('#location')).toHaveText('논현로 · 을지병원 사거리');
  await expect.poll(async () => (await saved(page)).safeLocation.room).toBe('street');
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'artifacts/p1-europlaza-street.png' });
  const first = await page.locator('canvas').screenshot(); await page.waitForTimeout(600); const second = await page.locator('canvas').screenshot();
  expect(first.equals(second)).toBe(false); // Moving traffic/pedestrians render without changing saved player progress.
  await go(page,480,718);await go(page,280,699,'비투비씨 · 카페');
  await expect(page.locator('#location')).toHaveText('비투비씨 · 카페');
  await steps(page, '위로 이동', 3); await page.getByRole('button', { name: '가까운 곳 조사' }).click();
  await expect(page.getByRole('dialog')).toContainText('오늘의 메뉴');
  await expect(page.getByRole('button', { name: '카페라테 · 25G', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '첫 방문 아메리카노 · 0G', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('아메리카노를 받았');
  expect((await saved(page)).cafe).toMatchObject({ welcomeUsed: true, orderCount: 1 });
  expect((await saved(page)).totalXp).toBe(0); expect((await saved(page)).gold).toBe(0);
  await page.reload(); await expect(page.locator('#location')).toHaveText('비투비씨 · 카페');
  await page.getByRole('button', { name: '가까운 곳 조사' }).click();
  await expect(page.getByRole('button', { name: '첫 방문 아메리카노 · 0G', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '물 한 잔 · 0G', exact: true }).click();
  await go(page,138,260);
  await page.getByRole('button', { name: '가까운 곳 조사' }).click();
  await page.getByRole('button', { name: '여기서 잠시 쉬기', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('창가에서 잠시');
  expect((await saved(page)).cafe.restedAt).not.toBeNull();
  await page.screenshot({ path: 'artifacts/p1-b2bc-interior.png' });
  await go(page,400,270);await go(page,565,296,'논현로 · 을지병원 사거리');
  await expect(page.locator('#location')).toHaveText('논현로 · 을지병원 사거리');
  expect((await saved(page)).safeLocation).toEqual({ room: 'street', x: 280, y: 723 });
  await page.screenshot({ path: 'artifacts/p1-b2bc-exterior.png' });
  expect(errors).toEqual([]);
});
test('schema 1 migrates to appearance schema 3 on save and preserves the original in IndexedDB', async ({ page }) => {
  await start(page); const current = await saved(page);
  const legacy = { ...current, schemaVersion: 1, contentVersion: 'foundation-1', balanceVersion: 'none', gold: 80 };
  await page.evaluate(value => new Promise<void>((resolve, reject) => {
    const r = indexedDB.open('medical-quest-foundation'); r.onsuccess = () => {
      const db = r.result, tx = db.transaction('saves', 'readwrite'); tx.objectStore('saves').put(value, 'current');
      tx.oncomplete = () => { db.close(); resolve(); }; tx.onabort = () => reject(tx.error);
    };
  }), legacy);
  await page.reload(); await expect(page.getByRole('status')).toContainText('준비됐어요');
  await saveCurrent(page);
  await expect(page.getByRole('status')).toContainText('현재 위치');
  expect(await saved(page)).toMatchObject({ schemaVersion: 3, gold: 80, avatar: current.avatar });
  const original = await page.evaluate(() => new Promise(resolve => {
    const r = indexedDB.open('medical-quest-foundation'); r.onsuccess = () => {
      const db = r.result, q = db.transaction('saves').objectStore('saves').get('schema1-original');
      q.onsuccess = () => { resolve(q.result); db.close(); };
    };
  }));
  expect(original).toEqual(legacy);
});
test('compact HUD hides management actions behind menu and preserves keyboard/context input',async({page})=>{
  await start(page);
  await expect(page.locator('[data-move]')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'현재 위치 저장',exact:true})).not.toBeVisible();
  await expect(page.getByRole('button',{name:'가까운 곳 조사'})).not.toBeVisible();
  await page.getByRole('button',{name:'메뉴',exact:true}).click();
  await expect(page.getByRole('dialog')).toContainText('기록·저장');
  const before=await saved(page);await page.keyboard.down('ArrowRight');await page.waitForTimeout(200);await page.keyboard.up('ArrowRight');
  await page.getByRole('button',{name:'기록·저장',exact:false}).click();
  await expect(page.getByRole('button',{name:'현재 위치 저장',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'현재 위치 저장',exact:true}).click();
  expect((await saved(page)).safeLocation).toEqual(before.safeLocation);
  await steps(page,'위로 이동',3);await expect(page.locator('#interaction-label')).toContainText('편집장');
});
for(const viewport of [{width:390,height:844},{width:844,height:390}])test(`mobile ${viewport.width}x${viewport.height}: HUD, menu and touch walking`,async({browser})=>{
  const context=await browser.newContext({viewport,hasTouch:true,isMobile:true});const page=await context.newPage();
  await start(page);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  for(const id of ['menu-toggle','journal-toggle','profile-toggle']){
    const box=(await page.locator('#'+id).boundingBox())!;expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.x+box.width).toBeLessThanOrEqual(viewport.width);expect(box.y+box.height).toBeLessThanOrEqual(viewport.height);
  }
  await page.getByRole('button',{name:'메뉴',exact:true}).tap();await page.getByRole('button',{name:'기록·저장',exact:false}).tap();
  await expect(page.getByRole('button',{name:'저장 내보내기',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'뒤로',exact:true}).tap();await expect(page.getByRole('dialog')).toContainText('기록·저장');
  await page.getByRole('button',{name:'닫기',exact:true}).tap();
  await page.waitForFunction(()=>document.getElementById('world')?.dataset.cameraX!==undefined);
  const point=await page.locator('#world').evaluate(el=>{const d=(el as HTMLElement).dataset;return{x:(Number(d.playerX)-32-Number(d.cameraX))*Number(d.zoom),y:(Number(d.playerY)-Number(d.cameraY))*Number(d.zoom)};});
  await page.touchscreen.tap(point.x,point.y);await page.waitForTimeout(500);
  expect(Number(await page.locator('#world').getAttribute('data-player-x'))).toBeLessThan(310);
  await page.screenshot({path:`artifacts/ui-mobile-${viewport.width}.png`});await context.close();
});
test('custom creator, wardrobe and HUD use the same saved appearance',async({page})=>{
  await page.goto('/');await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByLabel('기본 외형',{exact:true}).selectOption('alien');
  await page.getByLabel('머리 모양',{exact:true}).selectOption('ears');
  await page.getByLabel('얼굴',{exact:true}).selectOption('bright');
  await page.getByLabel('피부색',{exact:true}).selectOption('lilac');
  await page.getByLabel('머리 색',{exact:true}).selectOption('gold');
  await page.getByLabel('기본 옷',{exact:true}).selectOption('hoodie');
  const frontImage=await page.locator('#avatar-preview').getAttribute('style');
  await page.getByRole('button',{name:'뒷모습 보기',exact:true}).click();
  expect(await page.locator('#avatar-preview').getAttribute('style')).not.toBe(frontImage);
  await page.getByRole('button',{name:'정면 보기',exact:true}).click();
  await page.screenshot({path:'artifacts/avatar-creator.png'});
  await page.getByRole('button',{name:'이 모습으로 출근',exact:true}).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  const state=await saved(page);expect(state.avatar.appearance).toMatchObject({hairId:'ears',faceId:'bright',skinId:'lilac',outfitId:'hoodie'});
  await expect.poll(()=>page.locator('#world').getAttribute('data-appearance')).toBe(await page.locator('#portrait-sprite').getAttribute('data-appearance'));
  await page.getByRole('button',{name:'기자 정보',exact:true}).click();await page.getByRole('button',{name:'외형 꾸미기',exact:true}).click();
  await page.getByLabel('기본 옷',{exact:true}).selectOption('knit');await page.getByLabel('피부색',{exact:true}).selectOption('mint');
  await page.getByRole('button',{name:'이 외형으로 적용',exact:true}).click();await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect.poll(()=>page.locator('#world').getAttribute('data-appearance')).toBe(await page.locator('#portrait-sprite').getAttribute('data-appearance'));
  expect((await saved(page)).avatar.appearance.outfitId).toBe('knit');
  await page.reload();await expect(page.getByRole('status')).toContainText('준비됐어요');
  expect((await saved(page)).avatar.appearance.skinId).toBe('mint');
  await page.getByRole('button',{name:'메뉴',exact:true}).click();
  await expect(page.getByRole('dialog')).not.toContainText('취재 수첩');await expect(page.getByRole('dialog')).not.toContainText('기자 정보');
  await page.getByRole('button',{name:'닫기',exact:true}).click();await page.screenshot({path:'artifacts/avatar-world.png'});
});
test('all four directions have changing walk frames and a walking arrival opens a door',async({page})=>{
  await start(page);await page.locator('canvas').focus();
  for(const [key,direction]of [['ArrowRight','right'],['ArrowDown','down'],['ArrowLeft','left'],['ArrowUp','up']]){
    await page.keyboard.down(key!);await page.waitForTimeout(110);const first=await page.locator('#world').getAttribute('data-walk-frame');await page.waitForTimeout(130);const second=await page.locator('#world').getAttribute('data-walk-frame');
    expect(first).toContain(direction);expect(second).toContain(direction);expect(first).not.toBe(second);await page.keyboard.up(key!);await expect.poll(()=>page.locator('#world').getAttribute('data-moving')).toBe('false');
  }
  await go(page,565,296,'유로프라자 · 1층 로비');
  await page.waitForTimeout(500);await expect(page.locator('#location')).toHaveText('유로프라자 · 1층 로비');
  expect((await saved(page)).safeLocation.room).toBe('lobby');
});
