import simulation from '../../data/balance/model-simulation.v0.1.json';
import type { Game } from '../application/game';
import { articleFeedback, conceptsUnlocked, progressOf, readyForArticle, requiredTasks, taskProgress } from '../domain/campaign';
import { campaignContent, questById, questIds, rewardFor, type QuestId, type Task } from '../domain/content';
import { heartAnatomy } from '../domain/anatomy';
import { drawHeartAnatomy, HEART_ANATOMY_WIDTH, HEART_ANATOMY_HEIGHT } from '../art/campaign';
import { nearestWorkbenchSlot, workbenchNodes } from './workbench-layout';
import { button, el } from './dom';
import { openSheet } from './sheet';
import './campaign.css';

type Update = () => void;
const slots = ['observation', 'mechanism', 'conclusion'] as const;
const slotNames = ['직접 관찰', '관계를 설명하는 기전', '독자에게 전할 결론'];
const workbenchNames: Record<Task['kind'], string> = { flow:'배달 길 연결',match:'방의 주소 붙이기',valves:'방향 문 시험',routes:'배송 노선 연결',sequence:'신호 편집기',supply:'공급 가지 추적',compare:'한 조건씩 비교',records:'기록 확인 작업대',synthesis:'순환 설명 지도',planning:'특집 근거 편집판' };
const workbenchGuides: Record<Task['kind'], string> = {
  flow:'길을 누르고 연결 타일을 놓아요. 도해의 화살표를 따라 표식이 도착하는지 재생해 보세요.',
  match:'받는 방과 보내는 방의 주소를 붙여요. 오른쪽·왼쪽은 몸 주인의 기준이며 화면 좌우와 다를 수 있어요.',
  valves:'각 문을 눌러 통과 방향을 바꿔요. 정방향과 역방향을 각각 재생해 문이 하는 일을 관찰해요.',
  routes:'출발지의 배송 주소를 정해요. 폐로 가는 길과 몸으로 가는 길은 돌아오는 경로까지 이어져야 해요.',
  sequence:'신호 조각을 순서 칸에 놓고 앞뒤 버튼으로 편집해요. 빛은 전기 신호이며 혈액 표식과 달라요.',
  supply:'대동맥에서 갈라지는 가지를 눌러 배달 경로를 추적해요. 심장 안의 혈액과 심장근육의 공급을 구분해요.',
  compare:'넓은 폭·같은 짧은 길이를 먼저 기록해요. 그 뒤 폭만 바꾸어 같은 조건끼리 비교해요.',
  records:'기록의 숫자뿐 아니라 시간·준비·도구를 펼쳐 보세요. 다음 취재 행동을 확인 칸에 붙여요.',
  synthesis:'이번에는 다른 출발점에서 시작해요. 지도에 다음 목적지를 놓아 한 고리로 이어 주세요.',
  planning:'독자 질문마다 필요한 근거 묶음을 배정해요. 마지막에는 모형의 한계와 출처도 함께 편집해요.',
};

function badge(): HTMLElement { return el('p','campaign-badge','검수 전 모형 · 전문 의료 검수 전'); }
function sourceList(ids: string[], limitations: string): HTMLElement {
  const details=el('details','campaign-sources'), summary=el('summary','','출처와 이 모형의 한계'); details.append(summary,el('p','',limitations));
  for(const id of ids) { const source=campaignContent.sources.find(s=>s.id===id)??heartAnatomy.sources.find(s=>s.id===id); if(!source)continue; const a=el('a','',('publisher' in source?source.publisher+' · ':'')+source.title);a.href=source.url;a.target='_blank';a.rel='noopener noreferrer';details.append(a,el('small','',('section' in source?source.section+' · ':'')+'본문 확인 '+source.checkedAt)); }
  details.append(el('p','campaign-muted',campaignContent.disclaimer));return details;
}
function saveStatus(game: Game): HTMLElement {
  const status=el('p',game.lastError?'campaign-save campaign-error':'campaign-save',game.lastError?'저장 오류: '+game.lastError+' 방금 작업은 적용하지 않았어요. 메뉴의 기록·저장에서 재시도하거나 기록을 파일로 보관해 주세요.':'변경할 때마다 기록을 저장해요. 닫았다가 이어서 할 수 있어요.');
  if(game.lastError)status.setAttribute('role','alert');return status;
}
function errorText(error: unknown): string {return error instanceof Error?error.message:'이 작업을 마치지 못했어요.';}
function enhanceSheet(content: HTMLElement): void { content.classList.add('campaign-panel');content.closest('.sheet')?.classList.add('campaign-sheet'); }
function preserveFocus(root: HTMLElement, render: () => void): void {
  const focused=document.activeElement as HTMLElement|null,key=focused?.dataset.campaignFocus;render();
  if(key)root.querySelectorAll<HTMLElement>('[data-campaign-focus]').forEach(e=>{if(e.dataset.campaignFocus===key)e.focus({preventScroll:true});});
}
function focusKey<T extends HTMLElement>(e:T,key:string):T {e.dataset.campaignFocus=key;return e;}
function entryEvidence(game:Game,id:QuestId):HTMLElement {
  const q=questById(id),p=progressOf(game.state,id),box=el('details','campaign-evidence');box.append(el('summary','','모은 관찰과 적용 기록 · '+p.evidence.length+'건'));
  for(const evidence of q.observations){const got=p.evidence.includes(evidence.id),row=el('div','campaign-evidence-row');row.append(el('p',got?'':'campaign-muted',(got?'✓ ':'○ ')+evidence.title+' — '+(got?evidence.text:'모형의 표식을 관찰하면 여기에 남아요.')));if(got){const key=id+':'+evidence.id,pin=button('',game.state.home.pins.includes(key)?'핀 해제':'근거 핀',()=>{try{game.pinEvidence(key);pin.textContent=game.state.home.pins.includes(key)?'핀 해제':'근거 핀';pin.setAttribute('aria-pressed',String(game.state.home.pins.includes(key)));}catch(e){row.append(el('p','campaign-error',errorText(e)));}});pin.setAttribute('aria-pressed',String(game.state.home.pins.includes(key)));row.append(pin);}box.append(row);}
  for(const task of q.tasks)if(p.evidence.includes(task.evidenceId))box.append(el('p','','✓ '+task.title+' — '+task.feedback));return box;
}

/** All manipulations go through Game. The panel retains only viewing and playback state. */
export function openTaskPanel(game:Game,id:QuestId,onUpdate:Update=()=>{}):void {
  const q=questById(id);let selectedTask=q.tasks.find(t=>requiredTasks(game.state,id).includes(t)&&!taskProgress(game.state,id,t.id).solved)?.id??'apply',selectedSlot=0,message='',slow=false,reverse=false,playing=false,startedAt=0,frame=0,feedback: 'idle'|'blocked'|'done'='idle';
  let paint:()=>void=()=>{};
  openSheet(id+' · '+workbenchNames[q.tasks[0]!.kind],(content,close)=>{
    enhanceSheet(content);
    const run=(action:()=>void,redraw=true)=>{try{action();onUpdate();}catch(e){message=errorText(e);}if(redraw)preserveFocus(content,render);};
    const render=()=>{
      cancelAnimationFrame(frame);content.replaceChildren();const def=q.tasks.find(t=>t.id===selectedTask)??q.tasks[0]!,p=taskProgress(game.state,id,def.id),progress=progressOf(game.state,id),observed=q.observations.every(e=>progress.evidence.includes(e.id));selectedSlot=Math.min(selectedSlot,def.slots.length-1);
      content.append(badge(),el('p','campaign-question','독자 질문 · '+q.question));
      const tabs=el('div','campaign-tabs');tabs.setAttribute('aria-label','모형 배치');
      for(const task of requiredTasks(game.state,id)){const tp=taskProgress(game.state,id,task.id);const tab=focusKey(button('campaign-tab'+(task.id===selectedTask?' selected':''),(tp.solved?'✓ ':'')+(task.id==='apply'?'첫 모형':task.id==='transfer'?'새 배치':'시연 뒤 새 배치'),()=>{selectedTask=task.id;selectedSlot=0;playing=false;feedback='idle';message='';render();},task.title),'task-'+task.id);tab.setAttribute('aria-pressed',String(task.id===selectedTask));tabs.append(tab);}content.append(tabs);
      if(!observed)content.append(el('p','campaign-warning','두 곳의 표식을 먼저 관찰해 주세요. 귀환하거나 창을 닫아도 현재 취재를 이어갈 수 있어요.'));
      const layout=el('div','campaign-workbench'),visual=el('div','campaign-visual');visual.append(el('h3','',workbenchNames[def.kind]),el('small','campaign-muted',def.kind==='match'?'심장 절개 개념도 · 이름은 몸 주인의 좌우 기준':'취재 작업대 모형 · 해부 구조와 탐험 지도는 도감에서'),el('p','campaign-muted',workbenchGuides[def.kind]));
      const canvas=el('canvas','campaign-diagram');canvas.width=176;canvas.height=112;canvas.setAttribute('role','button');canvas.tabIndex=0;focusKey(canvas,'diagram');canvas.setAttribute('aria-label','모형 지도. 눌러 조작할 곳을 선택해요. 방향키로 곳을 바꾸고 Enter로 배치를 바꿀 수 있어요.');
      visual.append(canvas);const caption=el('p','campaign-diagram-caption');visual.append(caption);
      const controls=el('div','campaign-controls');
      const play=focusKey(button('campaign-primary','▶ 배치 재생 · 근거 기록',()=>run(()=>{const r=game.testTask(id,def.id);message=r.message;feedback=r.solved?'done':'blocked';playing=true;startedAt=performance.now();})), 'play');play.disabled=!observed;controls.append(play);
      const speed=focusKey(button('',slow?'느린 재생 켜짐':'느린 재생',()=>{slow=!slow;speed.textContent=slow?'느린 재생 켜짐':'느린 재생';speed.setAttribute('aria-pressed',String(slow));}),'speed');speed.setAttribute('aria-pressed',String(slow));controls.append(speed);
      if(def.kind==='valves'){const backwards=focusKey(button('',reverse?'역방향 시험 중':'역방향도 보기',()=>{reverse=!reverse;playing=true;startedAt=performance.now();backwards.textContent=reverse?'정방향으로 보기':'역방향도 보기';backwards.setAttribute('aria-pressed',String(reverse));cancelAnimationFrame(frame);paint();}),'reverse');backwards.setAttribute('aria-pressed',String(reverse));controls.append(backwards);}
      visual.append(controls);layout.append(visual);
      const manip=el('div','campaign-manip');
      if(def.kind==='records'){
        const records=el('div','campaign-records');records.append(el('h3','','가상 배달 기록'),el('p','campaign-muted',q.offer));
        for(const [name,value]of [['A',String(simulation.virtualRecords[0])],['B',String(simulation.virtualRecords[1])]]){const card=el('details','campaign-record');card.append(el('summary','','기록 '+(def.id==='apply'?name:name==='A'?'C':'D')+' · 표식 '+value+'개'),el('p','','게임용 표식 수예요. 실제 혈압이나 환자 기록이 아니에요.'),el('p','','한 기록은 이동 직후, 다른 기록은 쉬고 난 뒤예요. 시간·준비·도구를 확인하고 같은 조건의 여러 기록으로 비교할 취재 계획이 필요해요.'));records.append(card);}manip.append(records);
      }
      const selectSlot=(index:number)=>{selectedSlot=index;preserveFocus(content,render);};
      const choose=(index:number,value:string)=>{if(p.solved)return;run(()=>{game.chooseTask(id,def.id,index,value);feedback='idle';playing=false;message=def.choices.find(c=>c.id===value)?.explanation??'';});};
      const cycle=(index:number)=>{const at=def.choices.findIndex(c=>c.id===taskProgress(game.state,id,def.id).choices[index]);choose(index,def.choices[(at+1)%def.choices.length]!.id);};
      const addresses=el('div','campaign-slots campaign-kind-'+def.kind);addresses.setAttribute('aria-label','조작할 곳');
      def.slots.forEach((slot,index)=>{
        const row=el('div','campaign-slot-row'),choice=def.choices.find(c=>c.id===p.choices[index]),pick=focusKey(button('campaign-slot'+(index===selectedSlot?' selected':''), '',()=>def.kind==='valves'?cycle(index):selectSlot(index),slot.label+' · '+(choice?.label??'아직 배치하지 않음')),'slot-'+index);pick.disabled=!observed||p.solved;pick.setAttribute('aria-pressed',String(index===selectedSlot));pick.append(el('span','campaign-slot-num',String(index+1)),el('span','campaign-slot-label',slot.label),el('strong','',choice?.label??(def.kind==='flow'?'＋ 길 놓기':'＋ 배치하기')));row.append(pick);
        if(def.kind==='sequence'&&choice){const order=el('div','campaign-order');for(const delta of[-1,1]){const b=focusKey(button('',delta<0?'↑':'↓',()=>run(()=>{const values=taskProgress(game.state,id,def.id).choices,other=index+delta;if(!values[other]){message='먼저 옆 칸에도 신호를 놓아 주세요.';return;}game.chooseTask(id,def.id,index,values[other]!);game.chooseTask(id,def.id,other,values[index]!);selectedSlot=other;feedback='idle';playing=false;}),slot.label+(delta<0?' 앞 순서로':' 뒤 순서로')),'move-'+index+'-'+delta);b.disabled=p.solved||index+delta<0||index+delta>=def.slots.length;order.append(b);}row.append(order);}addresses.append(row);
      });manip.append(addresses);
      if(def.kind==='compare'){
        const baseline=focusKey(button('campaign-baseline','기준 조건 놓기 · 넓은 폭 / 같은 길이',()=>run(()=>{def.baseline!.forEach((c,i)=>game.chooseTask(id,def.id,i,c));feedback='idle';playing=false;message='기준 조건을 놓았어요. 재생해서 먼저 기록해 주세요.';})),'baseline');baseline.disabled=!observed||p.solved;manip.append(baseline);
        const trials=el('div','campaign-trials');trials.append(el('span',p.trials.includes('baseline')?'recorded':'','기준 기록 '+(p.trials.includes('baseline')?simulation.compare.baselineMarkers+'개 ✓':'아직 없음')),el('span',p.trials.includes('changed')?'recorded':'','변경 기록 '+(p.trials.includes('changed')?simulation.compare.changedMarkers+'개 ✓':'아직 없음')));manip.append(trials,el('p','campaign-muted','표식 개수는 게임 수치예요. 실제 혈류량을 계산하지 않아요.'));
      }
      const palette=el('fieldset','campaign-palette');palette.append(el('legend','',def.kind==='valves'?'문을 누르거나 통과 방향을 직접 선택':def.slots[selectedSlot]!.label+'에 놓을 조각'));
      const available=def.kind==='compare'?def.choices.filter(c=>def.slots[selectedSlot]!.label.includes('폭')?['wide','narrow'].includes(c.id):['short','long'].includes(c.id)):def.choices;
      for(const choice of available){const option=focusKey(button('campaign-choice'+(p.choices[selectedSlot]===choice.id?' selected':''),choice.label,()=>choose(selectedSlot,choice.id),choice.label+' 배치'),'choice-'+choice.id);option.disabled=!observed||p.solved;option.setAttribute('aria-pressed',String(p.choices[selectedSlot]===choice.id));if(def.kind==='flow')option.classList.add('campaign-pipe');palette.append(option);}manip.append(palette);layout.append(manip);content.append(layout);
      canvas.addEventListener('click',e=>{if(p.solved||!observed)return;const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*176,y=(e.clientY-r.top)/r.height*112;const nearest=nearestWorkbenchSlot(def,{x,y});selectedSlot=nearest;if(def.kind==='flow'||def.kind==='valves')cycle(nearest);else render();});
      canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowUp','ArrowRight','ArrowDown','Enter',' '].includes(e.key)){e.preventDefault();e.stopPropagation();if(e.key==='Enter'||e.key===' '){if(!p.solved&&observed)cycle(selectedSlot);}else {selectedSlot=(selectedSlot+(e.key==='ArrowLeft'||e.key==='ArrowUp'?-1:1)+def.slots.length)%def.slots.length;render();content.querySelector<HTMLCanvasElement>('.campaign-diagram')?.focus();}}});
      const feedbackBox=el('p','campaign-feedback'+(feedback==='done'?' success':''),message||(p.solved?'✓ '+def.feedback:'배치한 뒤 재생하면 표식이 어디까지 가는지 확인할 수 있어요.'));feedbackBox.setAttribute('role','status');feedbackBox.setAttribute('aria-live','polite');content.append(feedbackBox);
      if(p.hint>0){const hints=el('aside','campaign-hint');def.hints.slice(0,Math.min(p.hint,2)).forEach(h=>hints.append(el('p','',h)));if(p.demonstrated)hints.append(el('p','',def.demonstration));content.append(hints);}
      const help=el('div','campaign-help');const hint=focusKey(button('','취재 힌트 · 무료',()=>run(()=>{game.hintTask(id,def.id);message='힌트를 수첩에 남겼어요. 비용과 보상 차감은 없어요.';})),'hint');hint.disabled=!observed||p.solved||p.hint>=2;help.append(hint);
      if(def.id==='apply'){const demo=focusKey(button('','첫 모형 시연 보기 · 무료',()=>run(()=>{game.demonstrateTask(id,def.id);message=def.demonstration;feedback='done';playing=true;startedAt=performance.now();})),'demonstration');demo.disabled=!observed||p.demonstrated;help.append(demo);}help.append(button('','심장 구조 도감',()=>openAtlas(game)),button('','중단하고 월드로',close));content.append(help);
      if(readyForArticle(game.state,id))content.append(el('p','campaign-complete','✓ 기사 근거가 모였어요. 귀환 장치로 편집국에 돌아가 내 책상에서 기사를 써 주세요.'));
      content.append(entryEvidence(game,id),sourceList(q.sources,q.limitations),saveStatus(game));
      paint=()=>{
        if(!canvas.isConnected)return;const now=performance.now(),elapsed=playing?(now-startedAt)/(slow?1400:650):0;
        drawWorkbench(canvas,def,taskProgress(game.state,id,def.id).choices,selectedSlot,playing?elapsed:null,feedback,reverse);
        caption.textContent=def.kind==='sequence'?'빛 = 전기 신호 · 수축/혈액과 별도 표시 · 모형 시간':def.kind==='valves'?(reverse?'역방향 시험 · 문에서 멈추는지 보세요':'정방향 시험 · 화살표는 현재 경로 방향'):def.kind==='flow'?'타일의 열린 면이 이웃 길과 맞아야 표식이 이어져요':'기하·크기·시간을 단순화한 관계 모형 · 실제 해부 배치와 다름';
        if(playing&&elapsed>def.scene.links.length+3){playing=false;}if(playing)frame=requestAnimationFrame(paint);
      };paint();
    };render();
  },()=>{cancelAnimationFrame(frame);onUpdate();},{dismissOnContentClick:false});
}

type Point={x:number;y:number};
function drawWorkbench(canvas:HTMLCanvasElement,t:Task,choices:string[],selected:number,elapsed:number|null,feedback:'idle'|'blocked'|'done',reverse:boolean):void {
  const g=canvas.getContext('2d')!;g.imageSmoothingEnabled=false;g.fillStyle='#132b32';g.fillRect(0,0,176,112);g.fillStyle='#1d3a42';for(let x=0;x<176;x+=8)for(let y=0;y<112;y+=8)g.fillRect(x,y,1,1);
  const line=(a:Point,b:Point,color:string,width=2)=>{g.strokeStyle=color;g.lineWidth=width;g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();};
  const box=(x:number,y:number,w:number,h:number,fill:string)=>{g.fillStyle='#0c1e25';g.fillRect(x-1,y-1,w+2,h+2);g.fillStyle=fill;g.fillRect(x,y,w,h);};
  const label=(text:string,x:number,y:number,color='#e0eee7')=>{g.fillStyle=color;g.font='6px sans-serif';g.textAlign='center';g.fillText(text,x,y);};
  const nodes=workbenchNodes(t);
  let path=t.scene.links.map(([a,b])=>[nodes.get(a)!,nodes.get(b)!] as [Point,Point]);
  if(t.kind==='routes'||t.kind==='synthesis')path=t.slots.map((s,i)=>[nodes.get(s.id)!,nodes.get(t.slots[(i+1)%t.slots.length]!.id)!]);
  for(const [a,b]of path){line(a,b,'#41616a',4);line(a,b,'#829f9a',1);}
  for(const [a,b]of path){const x=Math.round((a.x+b.x)/2),y=Math.round((a.y+b.y)/2),dx=b.x-a.x,dy=b.y-a.y;g.fillStyle='#bac0a1';if(Math.abs(dx)>Math.abs(dy)){const sign=Math.sign(dx);g.fillRect(x-sign*2,y-2,2,5);g.fillRect(x,y-1,2,3);}else{const sign=Math.sign(dy);g.fillRect(x-2,y-sign*2,5,2);g.fillRect(x-1,y,3,2);}}
  if(t.kind==='supply'){
    g.fillStyle='#132b32';g.fillRect(0,0,176,112);const root={x:t.id==='transfer'?144:32,y:24},heart={x:t.id==='transfer'?40:128,y:80},body={x:t.id==='transfer'?128:48,y:80};
    line(root,heart,choices[0]==='coronary'?'#f5ad70':'#5e7780',4);line(root,body,choices[0]==='body-only'?'#f5ad70':'#5e7780',4);box(root.x-12,root.y-8,24,16,'#bf7967');label('대동맥',root.x,root.y+2);box(heart.x-18,heart.y-12,36,24,'#ba6264');label('심장근육',heart.x,heart.y+2);box(body.x-12,body.y-8,24,16,'#517d87');label('몸',body.x,body.y+2);label('관상동맥',Math.round((root.x+heart.x)/2),Math.round((root.y+heart.y)/2)-7);if(choices[0]==='inside'){box(heart.x-6,heart.y-6,12,12,'#f5ad70');label('방 안',heart.x,heart.y+17);}path=choices[0]==='body-only'?[[root,body]]:[[root,heart]];
  }else if(t.kind==='compare'){
    g.fillStyle='#132b32';g.fillRect(0,0,176,112);const narrow=choices.includes('narrow'),long=choices.includes('long'),length=long?140:104,x=(176-length)/2,height=narrow?12:28;box(x,48-height/2,length,height,'#477a88');line({x:x+4,y:48},{x:x+length-4,y:48},'#f5ad70',2);label((narrow?'좁은':'넓은')+' 폭 · '+(long?'긴 길이':'같은 짧은 길이'),88,22);label('게임 표식 비교 · 실제 혈류량 아님',88,100);path=[[{x:x+4,y:48},{x:x+length-4,y:48}]];
  }else if(t.kind==='records'){
    g.fillStyle='#132b32';g.fillRect(0,0,176,112);for(let i=0;i<2;i++){box(16+i*80,16,64,72,'#d5d5b5');label((i?'B':'A')+' · '+simulation.virtualRecords[i]+'개',48+i*80,30,'#244047');for(let n=0;n<(i?10:7);n++)box(28+i*80+(n%4)*10,40+Math.floor(n/4)*10,5,5,'#517d87');label('가상 기록',48+i*80,79,'#244047');}label(choices.includes('conditions')?'시간 · 준비 · 도구 확인 중':'조건 기록을 먼저 펼쳐요',88,104);path=[[{x:48,y:34},{x:128,y:34}]];
  }else for(const [index,slot]of t.slots.entries()){
    const n=nodes.get(slot.id)!,value=choices[index]??'';if(index===selected){g.fillStyle='#e7c976';g.fillRect(n.x-13,n.y-13,26,26);}box(n.x-11,n.y-11,22,22,value?'#355661':'#223d49');
    if(t.kind==='flow'){
      const directions:Record<string,string[]>={es:['e','s'],sw:['s','w'],wn:['w','n'],ne:['n','e'],ew:['e','w'],ns:['n','s']};for(const d of directions[value]??[]){const end={x:n.x+(d==='e'?11:d==='w'?-11:0),y:n.y+(d==='s'?11:d==='n'?-11:0)};line(n,end,'#96c9c3',5);line(n,end,'#d7e5d0',1);}if(!value)label('＋',n.x,n.y+3);
    }else if(t.kind==='valves'){const mode=value==='both'?'↔':value==='reverse'?'←':value==='forward'?'→':'？';g.fillStyle='#e7c976';g.font='16px sans-serif';g.textAlign='center';g.fillText(mode,n.x,n.y+6);label('문 '+(index+1),n.x,n.y+24);
    }else {const labelMap:Record<string,string>={ra:'우심방',rv:'우심실',la:'좌심방',lv:'좌심실',lung:'폐',body:'몸',sa:'동방결절',atria:'심방',av:'지연',ventricles:'심실',structure:'구조',flow:'흐름',signal:'신호',supply:'공급',limit:'한계'};label(labelMap[value]??(value?'근거':'＋'),n.x,n.y+3);label(String(index+1),n.x,n.y-15,'#e7c976');}
  }
  if(t.kind!=='compare'&&t.kind!=='records'&&t.kind!=='supply'&&t.kind!=='routes'&&t.kind!=='synthesis')for(const id of['start','end']){const n=nodes.get(id)!;box(n.x-4,n.y-4,8,8,id==='start'?'#e7c976':'#82c5a9');label(id==='start'?(t.kind==='sequence'?'신호 출발':'출발'):'도착',n.x,Math.min(108,n.y+13));}
  if(elapsed!==null){
    let route=reverse?[...path].reverse().map(([a,b])=>[b,a] as[Point,Point]):path,stop=route.length;
    if(t.kind==='flow')for(let i=0;i<t.slots.length;i++){const n=nodes.get(t.slots[i]!.id)!,before=nodes.get(t.scene.links[i]![0])!,after=nodes.get(t.scene.links[i+1]![1])!,directions=choices[i]??'',direction=(other:Point)=>Math.abs(other.x-n.x)>Math.abs(other.y-n.y)?other.x>n.x?'e':'w':other.y>n.y?'s':'n';if(!directions.includes(direction(before))||!directions.includes(direction(after))){stop=i+1;break;}}
    else if(t.kind==='valves'){const blocked=t.slots.findIndex((_,i)=>reverse?!['reverse','both'].includes(choices[i]!):!['forward','both'].includes(choices[i]!));if(blocked>=0)stop=reverse?t.slots.length-blocked:blocked+1;}
    else if(feedback==='blocked'&&t.kind!=='compare'){const wrong=t.slots.findIndex((s,i)=>!s.answer.includes(choices[i]!));if(wrong>=0)stop=Math.min(wrong+1,route.length);}
    const part=Math.min(Math.max(elapsed,0),Math.max(0,stop-.03)),index=Math.min(route.length-1,Math.floor(part)),portion=part-index,[a,b]=route[index]??route[0]!;const x=Math.round(a.x+(b.x-a.x)*portion),y=Math.round(a.y+(b.y-a.y)*portion);
    box(x-3,y-3,6,6,t.kind==='sequence'?'#ffe68b':feedback==='blocked'&&part>=stop-.04?'#d7867c':'#f5bd6d');if(t.kind==='sequence'){g.fillStyle='#fbe9ba';g.fillRect(x-1,y-6,2,12);g.fillRect(x-6,y-1,12,2);}
  }
}

export function openArticlePanel(game:Game,id:QuestId,onUpdate:Update=()=>{}):void {
  const q=questById(id);let message='',busy=false;
  openSheet(id+' · 기사 편집',(content,close)=>{
    enhanceSheet(content);
    const render=()=>{
      content.replaceChildren();const p=progressOf(game.state,id);content.append(badge(),el('p','campaign-question','독자 질문 · '+q.question));
      const status=el('p','campaign-feedback',message||(p.published?'발행된 기사예요. 다시 편집해도 보상은 한 번만 지급해요.':'모은 근거를 관찰 → 기전 → 결론으로 연결해요.'));status.setAttribute('role','status');content.append(status);
      if(!readyForArticle(game.state,id))content.append(el('p','campaign-warning','모형 적용과 새 배치 취재를 먼저 끝내면 발행할 수 있어요. 지금 작성한 초안은 그대로 남아요.'));
      const edit=el('div','campaign-article-layout'),cards=el('div','campaign-article-editor');
      const save=(change:()=>void,redraw=true)=>{try{change();onUpdate();message=game.lastError?'저장 오류: '+game.lastError:'초안을 저장했어요.';}catch(e){message=errorText(e);}if(redraw)preserveFocus(content,render);else{updatePreview();status.textContent=message;status.classList.toggle('campaign-error',!!game.lastError);}};
      const headline=el('fieldset','campaign-headlines');headline.append(el('legend','','제목 정하기'));[q.headline,q.alternateHeadline].forEach((text,index)=>{const pick=focusKey(button(p.draft.headline===index?'selected':'',text,()=>save(()=>game.saveDraft(id,{...progressOf(game.state,id).draft,headline:index}))), 'headline-'+index);pick.setAttribute('aria-pressed',String(p.draft.headline===index));headline.append(pick);});cards.append(headline);
      slots.forEach((slot,index)=>{
        const field=el('fieldset','campaign-card-bank');field.append(el('legend','',String(index+1)+' · '+slotNames[index]));
        for(const card of q.cards.filter(c=>c.slot===slot)){
          const missing=card.evidenceIds.filter(e=>!p.evidence.includes(e)),pick=focusKey(button('campaign-article-card'+(p.draft.slots[index]===card.id?' selected':''),'',()=>save(()=>{const old=progressOf(game.state,id).draft,next=[...old.slots];next[index]=card.id;game.saveDraft(id,{...old,slots:next});}),card.text),'article-'+card.id);pick.setAttribute('aria-pressed',String(p.draft.slots[index]===card.id));pick.append(el('span','',card.text),el('small','campaign-muted',card.evidenceIds.length?(missing.length?'근거 '+missing.length+'건을 아직 취재하지 않았어요.':'근거 '+card.evidenceIds.length+'건 연결'):'근거 없는 문장 · 출처를 확인해 보세요.'));field.append(pick);
        }cards.append(field);
      });
      const noteLabel=el('label','campaign-note-label','나의 취재 메모 · 선택'),note=focusKey(el('textarea','campaign-note'),'note');note.value=p.draft.note;note.rows=4;note.maxLength=2000;note.placeholder='관찰에서 배운 점이나 다음에 물어볼 것을 적어 보세요.';noteLabel.append(note);cards.append(noteLabel);note.addEventListener('input',()=>save(()=>game.saveDraft(id,{...progressOf(game.state,id).draft,note:note.value}),false));
      const preview=el('article','campaign-newspaper');preview.setAttribute('aria-label','기사 미리보기');
      const updatePreview=()=>{const draft=progressOf(game.state,id).draft;preview.replaceChildren(el('p','campaign-paper-masthead','건강 취재부 · 첫 특집호'),el('small','campaign-muted','검수 전 모형 취재 기록'),el('h3','',draft.headline?q.alternateHeadline:q.headline),el('p','campaign-paper-byline',game.state.avatar.name+' 기자 · '+id));slots.forEach((_,index)=>{const card=q.cards.find(c=>c.id===draft.slots[index]);preview.append(el('p',card?'':'campaign-muted',card?.text??slotNames[index]+' 문장을 연결해 주세요.'));});if(draft.note)preview.append(el('p','campaign-paper-note','취재 메모: '+draft.note));preview.append(el('h4','','모형의 한계'),el('p','campaign-paper-limits',q.limitations),sourceList(q.sources,q.limitations));};updatePreview();edit.append(cards,preview);content.append(edit);
      const actions=el('div','campaign-help'),check=focusKey(button('','편집 연결 살펴보기',()=>{message=articleFeedback(game.state,id)??'관찰·기전·결론이 근거로 이어져 있어요. 발행할 준비가 되었어요.';preserveFocus(content,render);}),'review');actions.append(check);
      const publish=focusKey(button('campaign-primary',p.published?'수정 기사 발행 · 추가 보상 없음':'신문 발행',()=>{
        if(busy)return;busy=true;publish.disabled=true;
        try{const before=progressOf(game.state,id).published;game.publishArticle(id);onUpdate();const reward=rewardFor(id);message=before?'수정 기사를 보관했어요. 보상은 다시 지급하지 않아요.':q.debrief+' · '+reward.gold+'G · '+reward.xp+'XP (이번 취재 전체)'+(id==='Q010'?' · 첫 특집호 완성! 신입 기자로 승진했어요.':' · '+q.unlockText);}
        catch(e){message=errorText(e);}finally{busy=false;preserveFocus(content,render);}
      }),'publish');publish.disabled=!readyForArticle(game.state,id)||busy;actions.append(publish,button('','초안 남기고 월드로',close));content.append(actions,entryEvidence(game,id),saveStatus(game));
    };render();
  },onUpdate,{dismissOnContentClick:false});
}

export function openAtlas(game:Game):void {
  let search='',frame=0,moving=false,selected='ra',network='blood',filter='all',start=0;let repaint:()=>void=()=>{};
  openSheet('관찰 도감',(content)=>{
    enhanceSheet(content);content.append(badge(),el('p','campaign-muted','심장 구조와 개념 목록은 처음부터 무료로 열 수 있어요. 취재로 확인한 근거에는 별도 기록이 남아요.'));
    const anatomy=el('section','campaign-anatomy');anatomy.append(el('h3','','심장 구조 펼치기'),el('p','campaign-muted',heartAnatomy.view));
    const anatomyLayout=el('div','campaign-anatomy-layout'),anatomyView=el('div','campaign-anatomy-view'),canvas=el('canvas','campaign-anatomy-canvas');canvas.width=HEART_ANATOMY_WIDTH;canvas.height=HEART_ANATOMY_HEIGHT;canvas.setAttribute('role','img');canvas.setAttribute('aria-label','심장 절개 개념도. 화면 왼쪽은 사람의 오른쪽. 방·판막·혈관·전도계를 아래 구조 목록에서 자세히 확인할 수 있어요.');
    anatomyView.append(el('div','campaign-orientation','화면 왼쪽: 사람의 오른쪽　│　화면 오른쪽: 사람의 왼쪽'),canvas);
    const switches=el('div','campaign-controls');
    const redraw=()=>{cancelAnimationFrame(frame);const g=canvas.getContext('2d')!;g.fillStyle='#f2e8d3';g.fillRect(0,0,canvas.width,canvas.height);drawHeartAnatomy(g,0,0,1,moving?(performance.now()-start)/800:0,network==='signal'?[selected,'signal']:[selected,'coronary']);if(moving)frame=requestAnimationFrame(redraw);};
    repaint=redraw;
    for(const [id,label]of[['blood','혈액 경로'],['signal','전기 신호']]){const b=button(network===id?'selected':'',label!,()=>{network=id!;[...switches.querySelectorAll<HTMLButtonElement>('[data-network]')].forEach(b=>{b.classList.toggle('selected',b.dataset.network===network);b.setAttribute('aria-pressed',String(b.dataset.network===network));});description.textContent=heartAnatomy.legend[network==='signal'?'signal':'blood'];redraw();});b.dataset.network=id;b.setAttribute('aria-pressed',String(network===id));switches.append(b);}
    const motion=button('','움직이는 도해 재생',()=>{moving=!moving;start=performance.now();motion.textContent=moving?'도해 멈추기':'움직이는 도해 재생';motion.setAttribute('aria-pressed',String(moving));redraw();});motion.setAttribute('aria-pressed','false');switches.append(motion);anatomyView.append(switches);
    const description=el('p','campaign-muted',heartAnatomy.legend.blood);anatomyView.append(description);
    const detail=el('div','campaign-anatomy-detail');anatomyView.append(detail);
    const structures=el('div','campaign-anatomy-structures'),filters=el('div','campaign-tabs');filters.setAttribute('aria-label','심장 구조 종류');
    const list=el('div','campaign-landmarks');const renderLandmarks=()=>{list.replaceChildren();heartAnatomy.landmarks.filter(n=>filter==='all'||n.kind===filter).forEach(n=>{const b=button('campaign-landmark'+(selected===n.id?' selected':''),n.title,()=>{selected=n.id;renderDetail();renderLandmarks();list.querySelector<HTMLButtonElement>('[aria-pressed=true]')?.focus({preventScroll:true});redraw();});b.setAttribute('aria-pressed',String(selected===n.id));list.append(b);});};
    const renderDetail=()=>{const landmark=heartAnatomy.landmarks.find(n=>n.id===selected)!;detail.replaceChildren(el('h4','',landmark.title),el('p','',landmark.text),sourceList(landmark.sources,heartAnatomy.limitations));};
    for(const [id,label]of[['all','전체'],['chamber','네 방'],['valve','네 판막'],['vessel','혈관'],['tissue','중격'],['conduction','전도계']]){const b=button(id===filter?'selected':'',label!,()=>{filter=id!;[...filters.querySelectorAll<HTMLButtonElement>('button')].forEach(b=>{b.classList.toggle('selected',b.dataset.filter===filter);b.setAttribute('aria-pressed',String(b.dataset.filter===filter));});renderLandmarks();});b.dataset.filter=id;b.setAttribute('aria-pressed',String(id===filter));filters.append(b);}structures.append(filters,list,el('p','campaign-muted','탐험 구역의 길은 기자가 이동하는 게임 동선이에요. 혈관이나 혈액의 길과 구분해요.'));anatomyLayout.append(anatomyView,structures);anatomy.append(anatomyLayout);content.append(anatomy);renderDetail();renderLandmarks();repaint();
    content.append(el('h3','','취재 개념과 나의 기록'));
    const label=el('label','campaign-search','개념 찾기'),input=el('input');input.type='search';input.placeholder='순환, 판막, 신호…';label.append(input);content.append(label);const results=el('div','campaign-atlas-grid');content.append(results);
    const render=()=>{results.replaceChildren();const unlocked=conceptsUnlocked(game.state),list=campaignContent.concepts.filter(c=>c.title.includes(search)||c.text.includes(search));
      if(!list.length)results.append(el('p','','아직 이 이름의 개념은 없어요. 다른 이름으로 찾아보세요.'));
      for(const concept of list){const earned=unlocked.some(c=>c.id===concept.id),card=el('section','campaign-atlas-card');card.append(el('h3','',concept.title),el('small',earned?'campaign-earned':'campaign-muted',earned?'✓ 취재·발행 기록 있음':'무료 개념 목록 · 아직 취재 기록 없음'),el('p','',concept.text));if(earned&&game.state.campaign.purchased.includes('equipment.bookcase')){const favorite=button('',game.state.home.favorites.includes(concept.id)?'★ 즐겨찾기 해제':'☆ 즐겨찾기',()=>{try{game.favoriteConcept(concept.id);render();}catch(e){card.append(el('p','campaign-error',errorText(e)));}});favorite.setAttribute('aria-pressed',String(game.state.home.favorites.includes(concept.id)));card.append(favorite);}card.append(sourceList(concept.sources,concept.limitations));results.append(card);}
    };input.addEventListener('input',()=>{search=input.value.trim();render();});render();
  },()=>{cancelAnimationFrame(frame);},{dismissOnContentClick:false});
}

export function openArchive(game:Game):void {
  openSheet('기사 보관함',(content)=>{
    enhanceSheet(content);content.append(badge(),el('p','campaign-muted','발행한 취재 기록과 그 근거가 함께 보관돼요. 같은 취재의 보상은 한 번만 지급돼요.'));const published=questIds.filter(id=>progressOf(game.state,id).published);
    if(!published.length){content.append(el('p','campaign-warning','첫 기사가 아직 없어요. 모형 취재를 마치고 편집국 내 책상에서 신문을 발행해 보세요.'));return;}
    for(const id of published){const q=questById(id),p=progressOf(game.state,id),draft=p.publishedDraft??p.draft,article=el('details','campaign-archive');article.append(el('summary','',id+' · '+(draft.headline?q.alternateHeadline:q.headline)),el('p','campaign-muted',q.title+' · 발행본 '+p.articleRevision+' · '+(p.publishedAt?.slice(0,10)??'')));draft.slots.forEach(c=>article.append(el('p','',q.cards.find(card=>card.id===c)?.text??'')));if(draft.note)article.append(el('p','campaign-paper-note','취재 메모: '+draft.note));article.append(sourceList(q.sources,q.limitations),entryEvidence(game,id));content.append(article);}
  },()=>{},{dismissOnContentClick:false});
}
