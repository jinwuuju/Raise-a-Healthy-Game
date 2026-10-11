import { expect, test, type Page } from '@playwright/test';
import content from '../../data/content/cardio-campaign.v0.1.json' with { type: 'json' };
import type { Game } from '../../src/application/game';
import type { World } from '../../src/game/world';
import type { RoomId } from '../../src/world/types';

type Hook = { game: Game; world: World };
const snapshot = (page:Page) => page.evaluate(() => (window as unknown as {__mq:Hook}).__mq.game.state);
async function finish(page:Page) {
  for (let i=0;i<16 && await page.locator('.dialog').count();i++) { if(await page.locator('.dialog .choices').count()) return; await page.keyboard.press('e'); await page.waitForTimeout(75); }
}
async function tapTarget(page:Page,id:string) {
  await page.evaluate(id => { const w=(window as unknown as {__mq:Hook}).__mq.world; const t=w.room.targets.find(t=>t.id===id)!; const n=t.npc?w.npcs.find(n=>n.id===t.npc):null; w.tap(n?{x:n.x,y:n.y}:t); },id);
}
async function warp(page:Page,room:RoomId) {
  await page.evaluate(room=> { const mq=(window as unknown as {__mq:Hook}).__mq; mq.game.enter(room,room==='newsroom'?212:224,room==='newsroom'?176:258,'up'); const at=mq.game.state.at; mq.world.setRoom(room,at.x,at.y,at.facing); },room);
  await page.waitForTimeout(200);
}
async function boot(page:Page) {
  await page.goto('/'); await page.getByRole('button',{name:'첫 출근하기'}).click();
  await Promise.all([page.waitForEvent('load'), page.evaluate(()=> { const mq=(window as unknown as {__mq:Hook}).__mq; const s=mq.game.state; mq.game.importState({...s,flags:['met-editor','reported-back'],cafe:{...s.cafe,welcomeUsed:true}}); location.reload(); })]);
  await page.waitForFunction(()=> !!(window as unknown as {__mq?:Hook}).__mq?.world);
}
async function accept(page:Page,id:string) {
  await tapTarget(page,'editor'); await expect(page.locator('.dialog')).toBeVisible({timeout:10000}); await finish(page);
  await page.locator('.choice').filter({hasText:'취재 맡기'}).click(); await finish(page);
  await expect.poll(async()=> (await snapshot(page)).campaign.active).toBe(id);
}
async function observe(page:Page,id:string,region:RoomId) {
  await warp(page,region);
  for(const target of id==='Q001'?['heart-out','heart-in']:['investigation-a','investigation-b']) {
    await tapTarget(page,target); await expect(page.locator('.dialog')).toBeVisible({timeout:12000}); await finish(page); await expect(page.locator('.dialog')).toHaveCount(0);
  }
}
async function workbench(page:Page) {
  await page.getByRole('button',{name:'취재 수첩',exact:true}).click();
  await page.getByRole('button',{name:'연결 장치의 기록 이어 보기'}).click();
}
async function solvePanel(page:Page,q:typeof content.quests[number],demo=false) {
  await workbench(page);
  if(q.id==='Q001') await page.screenshot({path:'artifacts/p3/puzzle-desktop.png'});
  if(demo) await page.getByRole('button',{name:'첫 모형 시연 보기 · 무료'}).click();
  for(const task of q.tasks.slice(demo?1:0,demo?3:2)) {
    await page.locator('[data-campaign-focus="task-'+task.id+'"]').click();
    await page.getByRole('button',{name:'취재 힌트 · 무료'}).click();
    if(task.baseline) { await page.getByRole('button',{name:'기준 조건 놓기 · 넓은 폭 / 같은 길이'}).click(); await page.getByRole('button',{name:'▶ 배치 재생 · 근거 기록'}).click(); await expect(page.locator('.campaign-feedback')).toContainText('기준 조건'); }
    for(const [i,slot] of task.slots.entries()) {
      await page.locator('[data-campaign-focus="slot-'+i+'"]').click();
      await page.locator('[data-campaign-focus="choice-'+slot.answer[0]+'"]').click();
    }
    await page.getByRole('button',{name:'▶ 배치 재생 · 근거 기록'}).click();
    await expect.poll(async()=> (await snapshot(page)).campaign.records[q.id as keyof Hook['game']['state']['campaign']['records']]?.tasks[task.id]?.solved).toBe(true);
  }
  await page.getByRole('button',{name:'중단하고 월드로'}).click();
}
async function publishPanel(page:Page,q:typeof content.quests[number]) {
  await warp(page,'newsroom'); await page.getByRole('button',{name:'취재 수첩',exact:true}).click();
  await page.getByRole('button',{name:'내 책상에서 기사 쓰기'}).click();
  for(const card of q.acceptedLinks[0]!) await page.locator('[data-campaign-focus="article-'+card+'"]').click();
  if(q.id==='Q001') await page.screenshot({path:'artifacts/p3/article-desktop.png'});
  await page.getByRole('button',{name:'신문 발행',exact:true}).click();
  await expect.poll(async()=> (await snapshot(page)).campaign.records[q.id as keyof Hook['game']['state']['campaign']['records']]?.published).toBe(true);
  await page.getByRole('button',{name:'초안 남기고 월드로'}).click();
}

test('ten investigations through visible workbenches and articles reach Lv.10 without purchases; reload preserves archive',async({page})=>{
  test.setTimeout(240000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await boot(page);
  for(const q of content.quests) {
    console.info('Visible campaign stage', q.id);
    await accept(page,q.id); await observe(page,q.id,q.region as RoomId); await solvePanel(page,q,q.id==='Q001'); await publishPanel(page,q);
  }
  const s=await snapshot(page); expect([s.totalXp,s.gold]).toEqual([2700,2270]);expect(s.campaign.purchased).toHaveLength(0);
  await page.reload();await page.getByRole('button',{name:'취재 수첩',exact:true}).click();await page.getByRole('button',{name:'발행 기사 보관함 · 10/10'}).click();
  await expect(page.locator('.campaign-archive')).toHaveCount(10);await expect(page.getByRole('dialog')).toContainText('검수 전 모형');expect(errors).toEqual([]);
});

for(const [width,height] of [[390,844],[844,390]] as const)test('mobile workbench draft, keyboard focus and anatomy '+width+'×'+height,async({browser})=>{
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:2,hasTouch:true,isMobile:true});await boot(page);await accept(page,'Q001');await observe(page,'Q001','heart');await workbench(page);
  await page.locator('[data-campaign-focus="slot-0"]').click();await page.locator('[data-campaign-focus="choice-es"]').click();await page.getByRole('button',{name:'▶ 배치 재생 · 근거 기록'}).click();
  await expect(page.locator('.campaign-feedback')).toContainText('막혔어요');await page.screenshot({path:'artifacts/p3/puzzle-'+width+'.png'});
  const metrics=await page.evaluate(()=> {const sheet=document.querySelector('.sheet')!;const r=sheet.getBoundingClientRect();return{right:r.right,bottom:r.bottom,width:innerWidth,height:innerHeight,overflow:sheet.scrollWidth>sheet.clientWidth};});
  expect(metrics.right).toBeLessThanOrEqual(metrics.width);expect(metrics.bottom).toBeLessThanOrEqual(metrics.height);expect(metrics.overflow).toBe(false);
  await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);await page.reload();await workbench(page);
  expect((await snapshot(page)).campaign.records.Q001!.tasks.apply!.choices[0]).toBe('es');await page.keyboard.press('Escape');await page.getByRole('button',{name:'취재 수첩',exact:true}).click();await page.getByRole('button',{name:'심장 구조·관찰 도감'}).click();await expect(page.getByRole('dialog')).toContainText('화면 왼쪽');await page.close();
});
