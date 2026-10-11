import { expect, test, type Page } from '@playwright/test';
import type { GameState } from '../../src/domain/state';

type Hook = { world: { roomId: string; player: { x:number; y:number }; heart: { comparison:string } | null; tap(p:{x:number;y:number}):void }; game:{state:GameState;importState(s:unknown):void} };
const state=(p:Page)=>p.evaluate(()=>(window as unknown as {__mq:Hook}).__mq.game.state);
const room=(p:Page)=>p.evaluate(()=>(window as unknown as {__mq:Hook}).__mq.world.roomId);
const tap=(p:Page,x:number,y:number)=>p.evaluate(([x,y])=>(window as unknown as {__mq:Hook}).__mq.world.tap({x:x!,y:y!}),[x,y]);
async function start(p:Page, patch: Partial<GameState> = {}) {
  await p.emulateMedia({ reducedMotion:'reduce' }); await p.goto('/'); await p.getByRole('button',{name:'첫 출근하기'}).click();
  await Promise.all([p.waitForEvent('load'),p.evaluate(patch=>{
    const mq=(window as unknown as {__mq:Hook}).__mq,s=mq.game.state;
    mq.game.importState({...s,totalXp:250,gold:220,ledger:['quest.Q001.observe','quest.Q001.first','quest.Q002.first'],
      flags:['met-editor','reported-back','q001-accepted','q001-entered','q001-observed','q001-briefed','heart-guided'],
      inspected:['q001:heart-in','q001:heart-out','q002:heart','q002:rv','q002:la','q002:lv'],cafe:{...s.cafe,welcomeUsed:true},
      article:{lead:'question',returning:'heart-in',outgoing:'heart-out',extra:null,checked:true,publishedAt:'2026-10-11T00:00:00Z'},
      q002:{accepted:true,reported:true,lead:'addresses',cards:{heart:'heart',rv:'rv',la:'la',lv:'lv'},checked:true,publishedAt:'2026-10-11T00:01:00Z'},...patch});location.reload();
  },patch)]);
  await p.waitForFunction(()=>!!(window as unknown as {__mq?:Hook}).__mq?.world);
  await p.waitForTimeout(250);
}
async function choices(p:Page) { for(let i=0;i<15&&!await p.locator('.dialog .choices').count();i++){await p.keyboard.press('e');await p.waitForTimeout(120);} }
async function finish(p:Page) { for(let i=0;i<15&&await p.locator('.dialog').count();i++){await p.keyboard.press('e');await p.waitForTimeout(120);} }
async function enter(p:Page) {
  await tap(p,308,118);await expect(p.locator('.dialog')).toBeVisible({timeout:12000});await choices(p);
  await p.getByRole('button',{name:/심장 속으로 들어가기/}).click();await p.getByRole('button',{name:'바로 들어가기'}).click();
  await expect.poll(()=>room(p)).toBe('heart');await p.waitForTimeout(200);
}
async function returnOffice(p:Page,x:number,y:number) {
  await tap(p,x,y);await expect(p.locator('.dialog')).toBeVisible({timeout:20000});await choices(p);
  await p.getByRole('button',{name:/돌아가기/}).click();await expect.poll(()=>room(p)).toBe('newsroom');await p.waitForTimeout(200);
}
async function compare(p:Page) {
  await tap(p,248,350);const view=p.getByRole('dialog',{name:'삼첨판 · 정상과 질환 비교'});await expect(view).toBeVisible({timeout:18000});
  for(const mode of ['협착','역류']) {await view.getByRole('button',{name:mode,exact:true}).click();await view.getByRole('button',{name:mode+' 비교 기록하기'}).click();}
  await p.keyboard.press('Escape');await expect(view).toHaveCount(0);expect((await state(p)).q003.mode).toBe('normal');
}
async function publish(p:Page) {
  const file=p.getByRole('dialog',{name:'Q003 취재 · 거꾸로 열리는 문'});
  for(let i=0;i<3;i++) await file.getByRole('button',{name:'이 자료를 취재 메모로 남기기'}).click();
  await file.getByRole('button',{name:'좁은 문과 새는 문으로 시작'}).click();await file.getByRole('button',{name:'모형의 한계로 마무리'}).click();
  await file.getByRole('button',{name:'편집장에게 초안 보여주기'}).click();await file.getByRole('button',{name:'게임 속 신문에 발행'}).click();
}

test('Q003 six-stage reporting: commission, physical normal valves, same-space comparison, sources, fictional tests, care and factcheck publication',async({page})=>{
  test.setTimeout(180000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await start(page);
  await tap(page,88,80);await expect(page.locator('.dialog')).toBeVisible({timeout:10000});await choices(page);await page.getByRole('button',{name:/판막 취재 맡기/}).click();
  await enter(page);await tap(page,248,350);await expect(page.locator('.dialog')).toBeVisible({timeout:15000});await finish(page);
  expect((await state(page)).q003.notes).toContain('tricuspid');
  await tap(page,300,412);await expect.poll(()=>room(page),{timeout:20000}).toBe('rv');await page.waitForTimeout(200);
  await tap(page,388,100);await expect(page.locator('.dialog')).toBeVisible({timeout:20000});await finish(page);expect((await state(page)).q003.notes).toContain('pulmonary');
  await returnOffice(page,250,430);await enter(page);await compare(page);await returnOffice(page,280,128);
  await tap(page,184,142);await expect(page.getByRole('dialog',{name:'Q003 취재 · 거꾸로 열리는 문'})).toBeVisible({timeout:12000});
  await publish(page);const result=page.getByRole('dialog',{name:'발행 결과 · 독자 반응'});await expect(result).toContainText('Q003');
  const s=await state(page);expect(s.totalXp).toBe(450);expect(s.q003.notes).toHaveLength(7);expect(s.q003.publishedAt).toBeTruthy();
  await result.getByRole('button',{name:'월드로 돌아가기'}).click();await expect(page.locator('.chip .rank')).toContainText('Lv.4');expect(errors).toEqual([]);
});

for(const [width,height] of [[390,844],[844,390]] as const) test(`Q003 ${width}×${height}: distinct layers, static reduced-motion scenes, modal input, notebook ownership, resume and reprint`,async({browser})=>{
  const page=await browser.newPage({viewport:{width,height},hasTouch:true,isMobile:true,deviceScaleFactor:3});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await start(page,{q003:{accepted:true,mode:'normal',notes:['tricuspid','pulmonary'],lead:null,limit:null,checked:false,publishedAt:null},at:{room:'heart',x:248,y:330,facing:'down'}});
  await tap(page,248,350);const view=page.getByRole('dialog',{name:'삼첨판 · 정상과 질환 비교'});await expect(view).toBeVisible();
  const pose=await page.evaluate(()=>({...((window as unknown as {__mq:Hook}).__mq.world.player)}));await page.keyboard.press('ArrowDown');
  await view.getByRole('button',{name:'협착',exact:true}).tap();await expect.poll(()=>page.evaluate(()=>(window as unknown as {__mq:Hook}).__mq.world.heart?.comparison)).toBe('stenosis');
  await expect.poll(()=>view.locator('canvas').evaluateAll(cs=>(cs[0] as HTMLCanvasElement).toDataURL()===(cs[1] as HTMLCanvasElement).toDataURL())).toBe(false);
  await page.screenshot({path:`artifacts/q003-comparison-${width}.png`});
  await view.getByRole('button',{name:'협착 비교 기록하기'}).tap();await page.keyboard.press('Escape');
  expect(await page.evaluate(()=>({...((window as unknown as {__mq:Hook}).__mq.world.player)}))).toEqual(pose);
  await page.reload();expect((await state(page)).q003.notes).toContain('stenosis');await compare(page);
  await returnOffice(page,280,128);await tap(page,184,142);const file=page.getByRole('dialog',{name:'Q003 취재 · 거꾸로 열리는 문'});await expect(file).toBeVisible({timeout:15000});
  await file.getByRole('button',{name:'이 자료를 취재 메모로 남기기'}).tap();await expect(file).toContainText('가상 검사자료');
  await page.reload();await tap(page,184,142);await expect(file).toBeVisible();await expect(file).toContainText('4 · 검사');
  for(let i=0;i<2;i++)await file.getByRole('button',{name:'이 자료를 취재 메모로 남기기'}).tap();
  await file.getByRole('button',{name:'문이 여닫히는 순간으로 시작'}).tap();await file.getByRole('button',{name:'검사 해석의 범위로 마무리'}).tap();
  await file.getByRole('button',{name:'편집장에게 초안 보여주기'}).tap();await file.getByRole('button',{name:'게임 속 신문에 발행'}).tap();
  const result=page.getByRole('dialog',{name:'발행 결과 · 독자 반응'});await expect(result).toBeVisible();const gold=(await state(page)).gold;
  await result.getByRole('button',{name:'기사 다시 읽기'}).tap();await expect(file).toContainText('판막 팩트체크 기사를 발행했어요');expect((await state(page)).gold).toBe(gold);
  await file.getByRole('button',{name:'다시 발행 · 새 독자 반응'}).tap();await expect(result).toContainText('Q003');expect((await state(page)).totalXp).toBe(450);expect((await state(page)).gold).toBeGreaterThan(gold);
  await page.reload();await expect(result).toContainText('Q003');await result.getByRole('button',{name:'월드로 돌아가기'}).tap();
  await page.keyboard.press('j');await page.getByRole('tab',{name:'인체 탐험'}).click();await page.locator('summary').filter({hasText:'질환 비교 (Q003'}).click();await expect(page.getByRole('tabpanel',{name:'인체 탐험'})).toContainText('합병증 연결 기관 · 준비 중');
  expect(errors).toEqual([]);await page.close();
});
