import { defaultAppearance,hairStyles,hairColors,faceStyles,skinColors,outfits,starterOutfits,type Appearance } from '../domain/appearance';
import { avatarPortrait,type Facing } from '../game/art/avatar';
import { cafeMenu } from '../domain/cafe';
import Phaser from 'phaser';
import { GameApplication } from '../application/game';
import { IndexedSaveStore, acquireWriter } from '../infrastructure/save-store';
import { WorkplaceScene } from '../game/scenes/WorkplaceScene';
import { workplaceText } from '../content/foundation';
import { type Preset } from '../domain/state';
import { doorFor,rooms, targetInRange } from '../domain/world';
import '../ui/styles/main.css';
import noticesUrl from '../../public/assets/runtime/THIRD_PARTY_NOTICES.txt?url';

const root = document.querySelector<HTMLDivElement>('#app')!;
const icon = (paths: string) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
root.innerHTML = `<main class="game-shell">
<section class="world-frame" aria-label="편집국 탐색"><div id="world"></div></section>
<header class="hud-header">
<button id="profile-toggle" class="profile-chip" aria-label="기자 정보"><span class="portrait"><span id="portrait-sprite"></span></span><span><strong id="reporter">새 기자</strong><small>수습 기자 · Lv.1</small></span></button>
<div class="hud-tools"><button id="journal-toggle" class="icon-button" aria-label="취재 수첩">${icon('<path d="M5 3h14v18H5zM8 7h8M8 11h8M8 15h5"/>')}<span>수첩</span></button><button id="menu-toggle" class="icon-button" aria-label="메뉴">${icon('<path d="M4 6h16M4 12h16M4 18h16"/>')}<span>메뉴</span></button></div>
</header>
<section class="objective-track" aria-label="현재 목표"><button id="tracker-toggle" aria-expanded="true"><span>첫 출근</span><span id="tracker-chevron" aria-hidden="true">−</span></button><p id="objective-text">편집장에게 인사하기</p></section>
<div id="location" class="location-tag">유로프라자 · 편집국</div>
<div id="readonly" hidden></div>
<button id="interact" class="context-action" aria-label="가까운 곳 조사" hidden><span id="interaction-label">조사</span><small> E </small></button>
<p id="status" class="toast" role="status" aria-live="polite">편집국을 준비하는 중…</p>
<section id="storage-controls" class="menu-list" hidden><button id="save">현재 위치 저장</button><button id="export">저장 내보내기</button><button id="import">저장 불러오기</button><button id="backup">이전 저장 복구</button></section>
<input id="file" type="file" accept="application/json,.json" hidden>
<dialog id="panel" aria-labelledby="panel-title"><header class="panel-header"><button id="panel-back" aria-label="뒤로" hidden>‹</button><h2 id="panel-title"></h2><button id="panel-close" aria-label="닫기">×</button></header><div id="panel-body"></div><p id="dialog-error" role="alert"></p><div id="panel-actions" class="dialog-actions"></div></dialog>
</main>`;
const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const status = element('status');
let toastTimer: number | undefined;
function message(text: string, error = false): void { if(toastTimer)window.clearTimeout(toastTimer); status.textContent=text; status.classList.toggle('error',error);status.classList.add('visible'); if(!error)toastTimer=window.setTimeout(()=>status.classList.remove('visible'),3600); }
const errorText = (error: unknown) => error instanceof Error ? error.message : '처리하지 못했습니다.';
const dialog = element<HTMLDialogElement>('panel');
const body = element('panel-body'), actions = element('panel-actions'), panelError = element('dialog-error');
let app: GameApplication;
let engine: Phaser.Game | undefined;
let focusBefore: HTMLElement | null = null;
const storageControls=element('storage-controls');
const storageButtons={save:element<HTMLButtonElement>('save'),export:element<HTMLButtonElement>('export'),import:element<HTMLButtonElement>('import'),backup:element<HTMLButtonElement>('backup')};
function openPanel(title: string, back?: () => void): void {
  if(!dialog.open)focusBefore = document.activeElement as HTMLElement;
  element('panel-back').hidden=!back; element('panel-back').onclick=back ?? null;
  element('panel-close').hidden=!app.snapshot.started && app.writable;
  app.mode = 'dialog'; app.setDirectionInput(0,0); app.cancelSteps();
  if (engine?.input.keyboard) { engine.scene.getScene('workplace').input.keyboard?.resetKeys(); engine.input.keyboard.enabled = false; }
  dialog.classList.remove('avatar-panel');
  element('panel-title').textContent = title; body.replaceChildren(); actions.replaceChildren(); panelError.textContent = '';
  if (!dialog.open) dialog.showModal();
}
function closePanel(): void {
  if (!app || (!app.snapshot.started && app.writable)) return;
  dialog.close(); app.mode = 'world';
  if (engine?.input.keyboard) { engine.scene.getScene('workplace').input.keyboard?.resetKeys(); engine.input.keyboard.enabled = true; }
  if (focusBefore?.isConnected && focusBefore !== document.body) focusBefore.focus();
  else engine?.canvas.focus();
}
function action(label: string, fn: () => void | Promise<void>, primary = false): HTMLButtonElement {
  const button = document.createElement('button'); button.textContent = label; if (primary) button.className = 'primary';
  button.addEventListener('click', async () => {
    button.disabled = true;
    try { await fn(); } catch (error) { panelError.textContent = errorText(error); } finally { button.disabled = false; }
  }); actions.append(button); return button;
}
function paragraph(text: string): void { const p = document.createElement('p'); p.textContent = text; body.append(p); }
function render(): void {
  const state = app.snapshot;
  element('location').textContent = rooms[state.safeLocation.room].title;
  element('reporter').textContent = state.avatar.name;
  const portrait=element('portrait-sprite');portrait.style.backgroundImage=`url(${avatarPortrait(state.avatar)})`;portrait.style.backgroundSize='33px 44px';portrait.style.backgroundPosition='center top';portrait.dataset.appearance=JSON.stringify({preset:state.avatar.preset,appearance:state.avatar.appearance});
  element('objective-text').textContent=state.safeLocation.room==='newsroom' ? !state.inspected.includes('newsroom.editor') ? '편집장에게 인사하기' : !state.inspected.includes('newsroom.device') ? '탐사 장치 살펴보기' : '로비를 지나 동네 둘러보기' : state.safeLocation.room==='lobby' ? '출입구를 지나 논현로로 나가기' : state.safeLocation.room==='street' ? '비투비씨에서 잠시 쉬어가기' : '카운터에서 음료 주문하기';
}
async function inspect(id: string): Promise<void> {
  if (app.mode !== 'world') return;
  if (['exit', 'return', 'street-exit', 'building-return', 'cafe-enter', 'cafe-exit'].includes(id)) { await app.execute({ type: 'travel', target: id }); message('새 장소에 도착했어요. 자동 저장했습니다.'); return; }
  await app.execute({ type: 'inspect', target: id });
  if (id === 'barista') {
    openPanel('비투비씨 · 오늘의 메뉴');
    paragraph(`첫 방문 커피 한 잔은 무료입니다. 물도 언제든 무료예요. 현재 보유 골드: ${app.snapshot.gold}G. 음료 가격은 게임용입니다.`);
    for (const item of cafeMenu) {
      const button = action(`${item.title} · ${item.price}G`, async () => {
        await app.execute({ type: 'order', itemId: item.id, commandId: crypto.randomUUID() });
        closePanel(); message(`${item.title}를 받았어요. 주문과 잔액을 저장했습니다.`);
      }, item.price === 0);
      button.disabled = (item.once && app.snapshot.cafe.welcomeUsed) || app.snapshot.gold < item.price;
    }
    action('메뉴 닫기', closePanel); return;
  }
  if (id === 'table') {
    openPanel('비투비씨 · 창가 자리'); paragraph('창가에 앉아 지나가는 사람들을 바라보고 수첩을 펼쳐 보세요. 머무르는 데 비용은 들지 않습니다.');
    action('여기서 잠시 쉬기', async () => { await app.execute({ type: 'rest', target: 'table' }); closePanel(); message('창가에서 잠시 쉬었어요. 밖으로 나가 다시 걸어볼까요?'); }, true);
    action('일어나기', closePanel); return;
  }
  const text = workplaceText[id]; if (!text) return;
  openPanel(text.title); paragraph(text.body); action('계속 둘러보기', closePanel, true);
  message('조사 기록을 저장했어요.');
}
function safely(fn: () => Promise<void>): void { void fn().catch(error => { const text=errorText(error);if(dialog.open)panelError.textContent=text;message(text,true); }); }
element('panel-close').addEventListener('click',closePanel);
dialog.addEventListener('cancel', event => { event.preventDefault(); closePanel(); });

async function boot(): Promise<void> {
  const writer = await acquireWriter();
  window.addEventListener('pagehide', writer.release, { once: true });
  window.addEventListener('pageshow', event => { if (event.persisted) window.location.reload(); });
  const store = await IndexedSaveStore.open();
  try { app = await GameApplication.open(store, writer.writable); }
  catch (error) {
    message(`${errorText(error)} 원본은 보존했습니다.`, true);
    for (const button of root.querySelectorAll<HTMLButtonElement>('button')) button.disabled = true;
    element('panel-title').textContent = '저장 기록을 열지 못했어요';
    paragraph('손상되었거나 지원하지 않는 버전의 원본을 덮어쓰지 않았습니다. 원본을 파일로 보관하거나 이전 정상 기록을 복구할 수 있습니다.');
    actions.replaceChildren();
    action('원본 저장 내보내기', async () => {
      const url = URL.createObjectURL(new Blob([JSON.stringify(await store.raw(), null, 2)], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = 'medical-quest-original.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    if (writer.writable) for (const backup of await store.backups()) action(`정상 저장 #${backup.revision} 복구`, async () => { await store.recover(backup); window.location.reload(); });
    element('panel-close').addEventListener('click',closePanel);
dialog.addEventListener('cancel', event => event.preventDefault()); dialog.showModal(); return;
  }
  if (!writer.writable) {
    const banner = element('readonly'); banner.hidden = false;
    banner.textContent = '읽기 전용입니다. 다른 플레이 창을 닫고 새로고침하세요. 브라우저가 쓰기 잠금을 지원하지 않아도 읽기 전용으로 열립니다.';
    for (const button of root.querySelectorAll<HTMLButtonElement>('button')) if (!['export','menu-toggle','journal-toggle','profile-toggle','tracker-toggle','panel-close','panel-back'].includes(button.id)) button.disabled = true;
  }
  engine = new Phaser.Game({ type: Phaser.AUTO, parent: 'world', width: 640, height: 360, backgroundColor: '#253b38', pixelArt: true,
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [new WorkplaceScene(app, id => safely(() => inspect(id)), id => { const button=element('interact');button.hidden=!id; const target=rooms[app.room].targets.find(t=>t.id===id);element('interaction-label').textContent=target?.label ?? '조사'; })], banner: false,
    callbacks: { postBoot: game => { game.canvas.tabIndex = 0; game.canvas.setAttribute('aria-label', '편집국 이동 영역. 방향키 또는 WASD로 이동하고 E로 조사합니다.'); if (!app.snapshot.started && writer.writable) showStart(); else { app.mode = 'world'; game.canvas.focus(); } } },
  });
  app.subscribe(render); render();
  message(writer.writable ? '준비됐어요. 화면을 눌러 이동하고, 가까운 대상을 조사해 보세요.' : '읽기 전용으로 저장 기록을 확인할 수 있습니다.');
  function editor(preset:Preset,initial:Appearance,owned:string[]) {
    let species=preset, facing:Facing='down';
    const layout=document.createElement('div');layout.className='avatar-editor';
    const previewPanel=document.createElement('div');previewPanel.className='avatar-preview-panel';
    const preview=document.createElement('div');preview.id='avatar-preview';preview.className='avatar-live-preview';previewPanel.append(preview);
    const turns=document.createElement('div');turns.className='avatar-turns';
    const fields=document.createElement('div');fields.className='avatar-fields';layout.append(previewPanel,fields);
    const controls={} as Record<keyof Appearance,HTMLSelectElement>;
    const labelNames={hairId:'머리 모양',faceId:'얼굴',skinId:'피부색',hairColor:'머리 색',outfitId:'기본 옷'};
    const read=():Appearance=>({hairId:controls.hairId.value as Appearance['hairId'],faceId:controls.faceId.value as Appearance['faceId'],skinId:controls.skinId.value as Appearance['skinId'],hairColor:controls.hairColor.value as Appearance['hairColor'],outfitId:controls.outfitId.value as Appearance['outfitId']});
    const update=()=>{const look={preset:species,appearance:read()};preview.style.backgroundImage=`url(${avatarPortrait(look,facing)})`;preview.dataset.appearance=JSON.stringify(look);};
    const catalogs={hairId:hairStyles,faceId:faceStyles,skinId:skinColors,hairColor:hairColors,outfitId:outfits};
    for(const key of Object.keys(labelNames) as (keyof Appearance)[]){
      const row=document.createElement('div');row.className='form-row';const label=document.createElement('label');const select=document.createElement('select');select.id='appearance-'+key;label.htmlFor=select.id;label.textContent=labelNames[key];controls[key]=select;select.addEventListener('change',update);row.append(label,select);fields.append(row);
    }
    const populate=(appearance:Appearance)=>{
      for(const key of Object.keys(controls) as (keyof Appearance)[]){const select=controls[key];select.replaceChildren();for(const [id,title]of Object.entries(catalogs[key])){
        if(key==='outfitId'&&!owned.includes(id))continue;
        if(key==='hairId'&&(species==='alien'?!['buds','tuft','ears'].includes(id):!['short','bob','wave'].includes(id)))continue;
        if(key==='skinId'&&!(species==='alien'?['mint','lilac','sky','peach']:['peach','honey','tan','deep']).includes(id))continue;
        const option=document.createElement('option');option.value=id;option.textContent=title;select.append(option);
      }select.value=appearance[key];}update();
    };
    for(const [direction,label] of [['left','왼쪽 보기'],['down','정면 보기'],['right','오른쪽 보기'],['up','뒷모습 보기']] as const){const button=document.createElement('button');button.textContent={left:'←',down:'◎',right:'→',up:'↟'}[direction];button.setAttribute('aria-label',label);button.onclick=()=>{facing=direction;update();};turns.append(button);}
    previewPanel.append(turns);populate(initial);body.append(layout);dialog.classList.add('avatar-panel');
    return {read,setPreset:(next:Preset)=>{species=next;populate(defaultAppearance(next));}};
  }
  function showStart(): void {
    openPanel('나의 첫 출근');
    paragraph('나만의 기자를 골라보세요. 외형은 능력에 영향을 주지 않습니다.');
    const row=document.createElement('div');row.className='identity-fields';
    const nameLabel=document.createElement('label');nameLabel.textContent='기자 이름';nameLabel.htmlFor='name';
    const name=document.createElement('input');name.id='name';name.maxLength=20;name.placeholder='새 기자';name.autocomplete='off';
    const presetLabel=document.createElement('label');presetLabel.textContent='기본 외형';presetLabel.htmlFor='preset';
    const select=document.createElement('select');select.id='preset';for(const [id,title]of [['male','인간 남성'],['female','인간 여성'],['alien','외계생명체']]){const option=document.createElement('option');option.value=id!;option.textContent=title!;select.append(option);}
    const nameRow=document.createElement('div');nameRow.append(nameLabel,name);const speciesRow=document.createElement('div');speciesRow.append(presetLabel,select);row.append(nameRow,speciesRow);body.append(row);
    const appearance=editor('male',defaultAppearance('male'),starterOutfits);
    select.addEventListener('change',()=>appearance.setPreset(select.value as Preset));
    action('이 모습으로 출근',async()=>{await app.execute({type:'start',preset:select.value as Preset,name:name.value,appearance:appearance.read()});closePanel();engine!.canvas.focus();},true);
    action('기본으로 바로 시작',async()=>{await app.execute({type:'start',preset:'male',name:'새 기자'});closePanel();engine!.canvas.focus();});
  }
  function showAppearance():void {
    openPanel('외형 꾸미기',showProfile);
    const controls=editor(app.snapshot.avatar.preset,app.snapshot.avatar.appearance,app.snapshot.ownedCosmeticIds);
    action('이 외형으로 적용',async()=>{await app.execute({type:'appearance',appearance:controls.read()});closePanel();message('외형을 바꿨어요. 아바타와 캐릭터에 반영했습니다.');},true);
    action('취소',closePanel);
  }
  function showMenu(): void {
    openPanel('메뉴');
    const list=document.createElement('div');list.className='menu-list';body.append(list);
    const item=(label:string,description:string,fn:()=>void)=>{const button=document.createElement('button');const title=document.createElement('strong');title.textContent=label;const text=document.createElement('small');text.textContent=description;button.append(title,text);button.onclick=fn;list.append(button);};
    item('기록·저장','저장 · 파일 백업 · 복구',showStorage);
    item('조작 안내','이동과 조사 방법',()=>{openPanel('조작 안내',showMenu);paragraph('화면의 빈 곳을 클릭하거나 터치하면 그곳으로 걸어갑니다. 대상 표식을 누르면 다가가 조사합니다. 건물은 문까지 걸어가면 들어갑니다. PC에서는 방향키/WASD로 이동하고 E로 조사할 수 있어요. 메뉴를 여는 동안 이동은 멈춥니다.');paragraph('조사·주문·장소 전환 때 자동 저장합니다. 이동만 한 뒤 끝낼 때는 메뉴 → 기록·저장에서 현재 위치를 저장하세요.');});
    const credits=document.createElement('a');credits.href=noticesUrl;credits.target='_blank';credits.rel='noopener';credits.textContent='© 2026 진우주 · 구성요소 고지';credits.className='menu-credit';body.append(credits);
  }
  function showStorage(): void {
    openPanel('기록·저장',showMenu); paragraph('조사·주문·장소 전환은 자동 저장됩니다. 이동만 한 뒤 종료할 때는 현재 위치를 저장하세요.');
    paragraph(`마지막 저장: ${new Date(app.snapshot.updatedAt).toLocaleTimeString('ko-KR')} · 브라우저 기록은 영구 보장되지 않으므로 파일로 백업할 수 있습니다.`);
    storageControls.hidden=false;body.append(storageControls);
  }
  function showJournal(): void { openPanel('취재 수첩');paragraph(element('objective-text').textContent!);paragraph(`관찰 기록 ${app.snapshot.inspected.length}곳. 첫 취재 의뢰는 준비 중입니다.`); }
  function showProfile(): void { openPanel('기자 정보');paragraph(`${app.snapshot.avatar.name} · 수습 기자`);paragraph(`골드 ${app.snapshot.gold}G · XP ${app.snapshot.totalXp}`);const button=action('외형 꾸미기',showAppearance,true);button.disabled=!app.writable; }
  element('menu-toggle').addEventListener('click',showMenu);
  element('journal-toggle').addEventListener('click',showJournal);
  element('profile-toggle').addEventListener('click',showProfile);
  element('tracker-toggle').addEventListener('click',()=>{const folded=!element('objective-text').hidden;element('objective-text').hidden=folded;element('tracker-toggle').setAttribute('aria-expanded',String(!folded));element('tracker-chevron').textContent=folded?'+':'−';});
  storageButtons.save.addEventListener('click', () => safely(async () => { await app.execute({ type: 'save' }); closePanel();message('현재 위치를 저장했어요. 다시 열어도 여기서 이어집니다.'); }));
  element('interact').addEventListener('click', () => {
    const state = app.snapshot;
    const target = rooms[state.safeLocation.room].targets.filter(t => !doorFor(state.safeLocation.room,t.id) && targetInRange(state.safeLocation.room, app.position, t.id)).sort((a,b)=>Math.hypot(a.x-app.position.x,a.y-app.position.y)-Math.hypot(b.x-app.position.x,b.y-app.position.y))[0];
    if (target) safely(() => inspect(target.id)); else message('표식 가까이 이동해 주세요.');
  });
  storageButtons.export.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(app.snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'medical-quest-save.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    message('마지막 저장 기록을 내보냈어요. 이동 중인 위치는 먼저 저장해 주세요.');
  });
  const file = element<HTMLInputElement>('file');
  storageButtons.import.addEventListener('click', () => file.click());
  file.addEventListener('change', () => safely(async () => {
    const selected = file.files?.[0]; file.value = ''; if (!selected) return;
    if (selected.size > 256 * 1024) throw new Error('저장 파일은 256KB 이하여야 합니다.');
    const imported: unknown = JSON.parse(await selected.text());
    openPanel('저장 기록을 불러올까요?'); paragraph('현재 기록은 이전 저장으로 보관합니다. 선택한 파일로 진행 상태와 위치를 바꿉니다.');
    action('불러오기', async () => { await app.execute({ type: 'import', state: imported }); closePanel(); if (!app.snapshot.started) showStart(); message('파일의 기록을 불러왔어요.'); }, true); action('취소', closePanel);
  }));
  storageButtons.backup.addEventListener('click', () => safely(async () => {
    const backups = await store.backups(); openPanel('이전 저장으로 돌아가기');
    paragraph(backups.length ? '최근 정상 기록 두 개를 보관합니다. 복구 전 현재 기록도 보관합니다.' : '아직 이전 저장 기록이 없습니다.');
    for (const previous of backups) action(`저장 #${previous.revision} 복구`, async () => { await app.execute({ type: 'import', state: previous }); closePanel(); if (!app.snapshot.started) showStart(); message('이전 저장을 복구했어요.'); });
    action('닫기', closePanel);
  }));
}
void boot().catch(error => { message(`${errorText(error)} 기존 저장을 덮어쓰지 않았습니다.`, true); for (const button of root.querySelectorAll<HTMLButtonElement>('button')) button.disabled = true; });
