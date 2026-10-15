import {expect,test,type Page} from '@playwright/test';
import type {GameState} from '../../src/domain/state';
type Hook={world:{roomId:string;tap(p:{x:number;y:number}):void};game:{state:GameState;importState(s:unknown):void}};
const state=(p:Page)=>p.evaluate(()=>(window as unknown as {__mq:Hook}).__mq.game.state);
const room=(p:Page)=>p.evaluate(()=>(window as unknown as {__mq:Hook}).__mq.world.roomId);
const tap=(p:Page,x:number,y:number)=>p.evaluate(([x,y])=>(window as unknown as {__mq:Hook}).__mq.world.tap({x:x!,y:y!}),[x,y]);
async function seed(p:Page,ready=false){
  await p.emulateMedia({reducedMotion:'reduce'});await p.goto('/');await p.getByRole('button',{name:'첫 출근하기'}).click();
  await Promise.all([p.waitForEvent('load'),p.evaluate(ready=>{
    const mq=(window as unknown as {__mq:Hook}).__mq,s=mq.game.state;
    mq.game.importState({...s,totalXp:450,gold:370,ledger:['quest.Q001.observe','quest.Q001.first','quest.Q002.first','quest.Q003.first'],
      flags:['met-editor','reported-back','q001-accepted','q001-entered','q001-observed','q001-briefed','heart-guided'],
      inspected:['q001:heart-in','q001:heart-out','q002:heart','q002:rv','q002:la','q002:lv'],cafe:{...s.cafe,welcomeUsed:true},
      article:{lead:'question',returning:'heart-in',outgoing:'heart-out',extra:null,checked:true,publishedAt:'2026-10-11T00:00:00Z'},
      q002:{accepted:true,reported:true,lead:'addresses',cards:{heart:'heart',rv:'rv',la:'la',lv:'lv'},checked:true,publishedAt:'2026-10-11T00:01:00Z'},
      q003:{accepted:true,mode:'normal',notes:['tricuspid','pulmonary','stenosis','regurgitation','causes','tests','care'],lead:'compare',limit:'model',checked:true,publishedAt:'2026-10-12T00:00:00Z'},
      q004:{accepted:ready,notes:ready?['pulmonary-out','gas','pulmonary-return','systemic-out','body-route','systemic-return']:[],crossedBody:ready,routes:{pulmonary:false,systemic:false},joined:false,lead:null,limit:null,checked:false,publishedAt:null}});location.reload();
  },ready)]);await p.waitForFunction(()=>!!(window as unknown as {__mq?:Hook}).__mq?.world);await p.waitForTimeout(250);
}
async function choices(p:Page){for(let i=0;i<15&&!await p.locator('.dialog .choices').count();i++){await p.keyboard.press('e');await p.waitForTimeout(120);}}
async function inspect(p:Page,x:number,y:number,id:string){await tap(p,x,y);await expect(p.locator('.dialog')).toBeVisible({timeout:18000});for(let i=0;i<10&&await p.locator('.dialog').count();i++){await p.keyboard.press('e');await p.waitForTimeout(120);}await expect.poll(async()=>((await state(p)).q004.notes as string[]).includes(id)).toBe(true);}
async function article(p:Page){await p.keyboard.press('j');await p.getByRole('tab',{name:'지금 할 일'}).click();await p.getByRole('button',{name:'두 순환 노선 기사 이어서'}).click();return p.getByRole('dialog',{name:'Q004 노선 기사 · 두 갈래 배송 노선'});}
async function compose(p:Page){const file=p.getByRole('dialog',{name:'Q004 노선 기사 · 두 갈래 배송 노선'});await file.getByRole('button',{name:'폐순환 카드 붙이기'}).click();await file.getByRole('button',{name:'온몸순환 카드 붙이기'}).click();await file.getByRole('button',{name:'두 순환 연결하기'}).click();await file.getByRole('button',{name:'폐로 향하는 길부터 설명'}).click();await file.getByRole('button',{name:'이동 축약을 밝히기'}).click();await file.getByRole('button',{name:'편집장에게 초안 보여주기'}).click();await file.getByRole('button',{name:'게임 속 신문에 발행'}).click();}

test('Q004: commission and six observations through both circuits, actual body exit, article and Lv.5',async({page})=>{
  test.setTimeout(180000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await seed(page);
  await tap(page, 256, 80);await expect(page.locator('.dialog')).toBeVisible({timeout:10000});await choices(page);await page.getByRole('button',{name:/두 순환 취재 맡기/}).click();
  await tap(page, 464, 118);await expect(page.locator('.dialog')).toBeVisible({timeout:12000});await choices(page);await page.getByRole('button',{name:/심장 속으로 들어가기/}).click();await page.getByRole('button',{name:'바로 들어가기'}).click();
  await expect.poll(()=>room(page)).toBe('heart');await page.waitForTimeout(200);
  await tap(page,300,412);await expect.poll(()=>room(page),{timeout:20000}).toBe('rv');await page.waitForTimeout(200);await inspect(page,388,100,'pulmonary-out');
  await tap(page,388,12);await expect.poll(()=>room(page),{timeout:20000}).toBe('lung');await page.waitForTimeout(200);await inspect(page,330,190,'gas');
  await tap(page,548,176);await expect.poll(()=>room(page),{timeout:25000}).toBe('la');await page.waitForTimeout(200);await inspect(page,324,150,'pulmonary-return');
  await tap(page,270,372);await expect.poll(()=>room(page),{timeout:20000}).toBe('lv');await page.waitForTimeout(200);await inspect(page,192,98,'systemic-out');
  await tap(page,192,12);await expect.poll(()=>room(page),{timeout:20000}).toBe('aorta');await page.waitForTimeout(200);await inspect(page,208,104,'body-route');
  expect((await state(page)).q004.crossedBody).toBe(false);
  await tap(page,208,12);await expect.poll(()=>room(page),{timeout:10000}).toBe('heart');await page.waitForTimeout(200);expect((await state(page)).q004.crossedBody).toBe(true);await inspect(page,182,92,'systemic-return');
  await tap(page,280,128);await expect(page.locator('.dialog')).toBeVisible({timeout:12000});await choices(page);await page.getByRole('button',{name:/돌아가기/}).click();await expect.poll(()=>room(page)).toBe('newsroom');await page.waitForTimeout(200);
  await article(page);await compose(page);const result=page.getByRole('dialog',{name:'발행 결과 · 독자 반응'});await expect(result).toContainText('Q004');expect((await state(page)).totalXp).toBe(700);
  await result.getByRole('button',{name:'월드로 돌아가기'}).click();await expect(page.locator('.chip .rank')).toContainText('Lv.5');expect(errors).toEqual([]);
});

for(const [width,height]of [[390,844],[844,390]]as const)test(`Q004 ${width}×${height}: both cards, bridges, alternate starting point, save/resume, review and reprint`,async({browser})=>{
  const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true,deviceScaleFactor:3});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await seed(page,true);let file=await article(page);
  await expect(file.getByRole('button',{name:'두 순환 연결하기'})).toBeDisabled();await file.getByRole('button',{name:'폐순환 카드 붙이기'}).tap();
  await page.reload();file=await article(page);await expect(file.getByRole('button',{name:'폐순환 카드 붙임'})).toBeDisabled();await file.getByRole('button',{name:'온몸순환 카드 붙이기'}).tap();await file.getByRole('button',{name:'두 순환 연결하기'}).tap();
  await expect(file.locator('.route-bridge.joined')).toHaveCount(2);await file.getByRole('button',{name:'온몸으로 향하는 길부터 설명'}).tap();await expect(file.locator('.route-card').first()).toHaveClass(/systemic/);await file.getByRole('button',{name:'모형의 범위를 밝히기'}).tap();
  await page.screenshot({path:`artifacts/q004-routes-${width}.png`});await file.getByRole('button',{name:'편집장에게 초안 보여주기'}).tap();const pub=file.getByRole('button',{name:'게임 속 신문에 발행'});await expect(pub).toBeFocused();await pub.tap();
  const result=page.getByRole('dialog',{name:'발행 결과 · 독자 반응'});await expect(result).toBeVisible();const gold=(await state(page)).gold;await page.reload();await expect(result).toContainText('Q004');expect((await state(page)).gold).toBe(gold);
  await result.getByRole('button',{name:'기사 다시 읽기'}).tap();await expect(file).toContainText('두 순환 노선 기사를 발행했어요');await file.getByRole('button',{name:'다시 발행 · 새 독자 반응'}).tap();await expect(result).toContainText('Q004');expect((await state(page)).totalXp).toBe(700);expect((await state(page)).gold).toBeGreaterThan(gold);
  await result.getByRole('button',{name:'월드로 돌아가기'}).tap();await page.keyboard.press('j');await page.getByRole('tab',{name:'취재 파일'}).click();await page.locator('[data-group=q004]>summary').click();await expect(page.getByRole('tabpanel',{name:'취재 파일'})).toContainText('온몸 축약 전환 기록 있음');expect(errors).toEqual([]);await page.close();
});

test('Q004 200% text keeps the route board contained, keyboard publishing works, and outside the office it is read-only',async({page})=>{
  await seed(page,true);await page.evaluate(()=>document.documentElement.style.fontSize='200%');let file=await article(page);
  const bounds=await file.evaluate(el=>({client:el.clientWidth,scroll:el.scrollWidth}));expect(bounds.scroll-bounds.client).toBeLessThan(2);
  await file.getByRole('button',{name:'폐순환 카드 붙이기'}).click();await file.getByRole('button',{name:'온몸순환 카드 붙이기'}).click();await file.getByRole('button',{name:'두 순환 연결하기'}).click();
  await file.getByRole('button',{name:'폐로 향하는 길부터 설명'}).click();await file.getByRole('button',{name:'이동 축약을 밝히기'}).click();await file.getByRole('button',{name:'편집장에게 초안 보여주기'}).click();await expect(file.getByRole('button',{name:'게임 속 신문에 발행'})).toBeFocused();
  await page.keyboard.press('Escape');
  await Promise.all([page.waitForEvent('load'),page.evaluate(()=>{const mq=(window as unknown as {__mq:Hook}).__mq;mq.game.importState({...mq.game.state,at:{room:'lung',x:26,y:176,facing:'right'}});location.reload();})]);
  await page.waitForFunction(()=>(window as unknown as {__mq:Hook}).__mq?.world?.roomId==='lung');file=await article(page);await expect(file).toContainText('편집국에서');
  await expect(file.getByRole('button',{name:'게임 속 신문에 발행'})).toHaveCount(0);await expect(file.getByRole('button',{name:'두 순환 연결하기'})).toHaveCount(0);
});
