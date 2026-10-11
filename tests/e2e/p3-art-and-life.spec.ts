import { expect, test, type Page } from '@playwright/test';
import type { Game } from '../../src/application/game';
import type { World } from '../../src/game/world';
import type { RoomId } from '../../src/world/types';

type Hook={game:Game;world:World};
async function fixture(page:Page) {
  await page.goto('/');await page.getByRole('button',{name:'첫 출근하기'}).click();
  await Promise.all([page.waitForEvent('load'),page.evaluate(async()=>{
    // Fixture setup exercises domain/public commands; the UI tests below perform actual user inputs.
    // @ts-expect-error Vite serves this verified source module in the development test server.
    const c=await import('/src/domain/campaign.ts');
    // @ts-expect-error Vite source module, not a production browser API.
    const content=await import('/src/domain/content.ts');
    const mq=(window as unknown as {__mq:Hook}).__mq;let s={...mq.game.state,flags:['met-editor','reported-back'],cafe:{...mq.game.state.cafe,welcomeUsed:true}};
    for(const id of content.questIds) {const q=content.questById(id);s=c.acceptInvestigation(s,id);s={...s,at:{room:q.region,x:224,y:258,facing:'up'}};for(const o of q.observations)s=c.observeInvestigation(s,id,o.id);for(const task of q.tasks.slice(0,2)){if(task.baseline){task.baseline.forEach((v:string,i:number)=>{s=c.chooseTask(s,id,task.id,i,v);});s=c.testTask(s,id,task.id).state;}task.slots.forEach((slot:{answer:string[]},i:number)=>{s=c.chooseTask(s,id,task.id,i,slot.answer[0]);});s=c.testTask(s,id,task.id).state;}s={...s,at:{room:'newsroom',x:212,y:176,facing:'down'}};s=c.saveDraft(s,id,{headline:0,slots:q.acceptedLinks[0],note:''});s=c.publishArticle(s,id);}
    mq.game.importState(s);location.reload();
  })]);await page.waitForFunction(()=>!!(window as unknown as {__mq?:Hook}).__mq?.world);
}
async function room(page:Page,id:RoomId) {
  await page.evaluate(id=>{const mq=(window as unknown as {__mq:Hook}).__mq;const x=id==='home'||id==='store'?208:224;mq.game.enter(id,x,id==='newsroom'?176:258,'up');mq.world.setRoom(id,x,id==='newsroom'?176:258,'up');},id);
}
async function target(page:Page,id:string){await page.evaluate(id=>{const w=(window as unknown as {__mq:Hook}).__mq.world;w.tap(w.room.targets.find(t=>t.id===id)!);},id);}

test('P3 pixel art renders all heart districts, 24 distinct furniture sprites and shared anatomy',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await fixture(page);
  for(const id of ['heart','heart-chambers','heart-valves','heart-circulation','heart-signal','heart-supply','heart-conditions','store','home'] as const){await room(page,id);await page.waitForTimeout(250);await page.screenshot({path:'artifacts/p3/'+id+'.png'});}
  const sprites=await page.evaluate(async()=>{
    // @ts-expect-error Vite source served in isolated test profile.
    const art=await import('/src/art/furniture.ts');
    // @ts-expect-error Vite source served in isolated test profile.
    const life=await import('/src/domain/life.ts');
    const cv=document.createElement('canvas');cv.width=864;cv.height=600;cv.style.cssText='position:fixed;inset:0;z-index:100;background:#e9dcc9;image-rendering:pixelated';cv.id='art-contact';document.body.append(cv);const g=cv.getContext('2d')!;g.fillStyle='#e9dcc9';g.fillRect(0,0,cv.width,cv.height);g.imageSmoothingEnabled=false;
    const hashes:string[]=[];life.furniture.forEach((f:{id:string;title:string},i:number)=>{const sprite=art.furnitureSprite(f.id);hashes.push(sprite.c.toDataURL());const x=(i%6)*144,y=Math.floor(i/6)*145;g.drawImage(sprite.c,x+12,y+12,sprite.c.width*2,sprite.c.height*2);g.fillStyle='#3c4250';g.font='14px sans-serif';g.fillText(f.title,x+12,y+136);});return {count:hashes.length,unique:new Set(hashes).size};
  });expect(sprites).toEqual({count:24,unique:24});await page.locator('#art-contact').screenshot({path:'artifacts/p3/furniture-contact.png'});await page.locator('#art-contact').evaluate(e=>e.remove());
  await page.getByRole('button',{name:'취재 수첩',exact:true}).click();await page.getByRole('button',{name:'심장 구조·관찰 도감'}).click();await page.getByRole('button',{name:'전도계',exact:true}).click();await page.getByRole('button',{name:'히스속',exact:true}).click();await expect(page.locator('.campaign-anatomy-detail')).toContainText('MedlinePlus');await page.getByRole('button',{name:'전기 신호',exact:true}).click();await page.screenshot({path:'artifacts/p3/anatomy.png'});expect(errors).toEqual([]);
});

for(const [width,height]of [[390,844],[844,390]] as const)test('optional shop, wardrobe and home are usable and persistent '+width+'×'+height,async({browser})=>{
  const page=await browser.newPage({viewport:{width,height},hasTouch:true,isMobile:true,deviceScaleFactor:2});await fixture(page);await room(page,'store');await target(page,'shop-catalog');await expect(page.getByRole('dialog',{name:'오비트 테일러 · 취재 준비실'})).toBeVisible({timeout:10000});
  await page.locator('[data-life-key="item:outfit.coat"]').click();await page.locator('[data-life-key="buy:outfit.coat"]').click();await expect(page.locator('.life-notice')).toContainText('구매·저장 완료');await page.locator('[data-life-key="equip:outfit.coat"]').click();await page.screenshot({path:'artifacts/p3/shop-'+width+'.png'});await page.keyboard.press('Escape');
  await room(page,'home');await target(page,'home-edit');await expect(page.getByRole('dialog',{name:'가구와 공간 꾸미기'})).toBeVisible({timeout:10000});await page.getByLabel('배치할 가구').selectOption('desk');await page.locator('[data-life-key="store"]').click();await page.getByLabel('가로 칸',{exact:true}).fill('4');await page.getByLabel('가로 칸',{exact:true}).press('Tab');await page.getByLabel('세로 칸',{exact:true}).fill('2');await page.getByLabel('세로 칸',{exact:true}).press('Tab');await page.locator('[data-life-key="rotate"]').click();await page.locator('[data-life-key="place"]').click();await expect(page.locator('.life-notice')).toContainText('배치·저장 완료');await page.screenshot({path:'artifacts/p3/home-editor-'+width+'.png'});
  const bounds=await page.evaluate(()=>{const e=document.querySelector('.sheet')!,r=e.getBoundingClientRect();return{right:r.right,bottom:r.bottom,w:innerWidth,h:innerHeight,overflow:e.scrollWidth>e.clientWidth};});expect(bounds.right).toBeLessThanOrEqual(bounds.w);expect(bounds.bottom).toBeLessThanOrEqual(bounds.h);expect(bounds.overflow).toBe(false);await page.keyboard.press('Escape');await page.reload();
  const s=await page.evaluate(()=> (window as unknown as {__mq:Hook}).__mq.game.state);expect(s.avatar.look.outfit).toBe('coat');expect(s.gold).toBe(2070);expect(s.home.placements.find(p=>p.id==='desk')).toMatchObject({x:3,y:1,rotated:true});expect(s.totalXp).toBe(2700);await page.close();
});

test('all seven heart districts connect by walking through labeled corridors',async({page})=>{
  test.setTimeout(60000);await fixture(page);await room(page,'heart');
  for(const to of ['heart-chambers','heart-valves','heart-circulation','heart-signal','heart-supply','heart-conditions']){
    await page.evaluate(to=>{const w=(window as unknown as {__mq:Hook}).__mq.world;const d=w.room.doors.find(d=>d.to===to)!;w.tap({x:d.zone.x+d.zone.w/2,y:d.zone.y+d.zone.h/2});},to);
    await expect.poll(()=>page.evaluate(()=>(window as unknown as {__mq:Hook}).__mq.world.roomId),{timeout:9000}).toBe(to);await page.waitForTimeout(700);
  }
  await target(page,'heart-map');await expect(page.getByRole('dialog',{name:'심장 탐험 지도'})).toBeVisible();await page.getByRole('button',{name:/심장 모형 입구/}).click();await expect.poll(()=>page.evaluate(()=>(window as unknown as {__mq:Hook}).__mq.world.roomId)).toBe('heart');
});
