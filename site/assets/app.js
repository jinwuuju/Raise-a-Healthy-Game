'use strict';
const data = window.DESIGN_DATA;
const byId = id => document.getElementById(id);
function node(tag, text, className) { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (className) el.className = className; return el; }
let avatar = 'male', outfitColor = '#4c9680';
const avatarText = {male:['지구에서 온 수습 기자','오늘의 첫 취재가 기다리고 있어요.'],female:['호기심 많은 수습 기자','발견한 이야기를 세상에 전해 볼까요?'],alien:['별에서 온 교환 기자','지구인의 몸은 어떻게 움직이는 걸까?']};
function drawAvatar() {
 const alien = avatar === 'alien', female = avatar === 'female';
 const skin = alien ? '#b9cf8d' : '#e9b894', hair = alien ? '#789366' : '#655049';
 const r = (x,y,w,h,c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
 let s = r(7,45,22,2,'#b6c7ab')+r(10,43,17,2,'#a9bda0');
 if (alien) s+=r(10,3,2,7,hair)+r(24,3,2,7,hair)+r(8,2,5,2,skin)+r(23,2,5,2,skin);
 if (female) s+=r(7,11,23,21,hair);
 s+=r(9,9,19,16,skin)+r(7,14,2,7,skin)+r(28,14,2,7,skin);
 if(!alien) s+=r(9,8,19,6,hair)+r(7,11,4,7,hair)+r(24,11,6,5,hair);
 s+=r(12,17,3,3,'#394c3b')+r(23,17,3,3,'#394c3b')+r(18,23,3,1,'#ad725e');
 s+=r(11,26,17,13,outfitColor)+r(8,27,3,11,skin)+r(28,27,3,11,skin)+r(15,26,3,3,'#f4ead5');
 s+=r(12,39,6,5,'#4f6069')+r(22,39,6,5,'#4f6069')+r(10,43,9,3,'#574d45')+r(22,43,9,3,'#574d45');
 s+=r(24,26,2,12,'#cfaf72')+r(25,33,7,7,'#b18750')+r(26,33,5,2,'#e2c995');
 byId('avatar-preview').innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 52" shape-rendering="crispEdges" aria-hidden="true">${s}</svg>`;
 byId('avatar-preview').setAttribute('aria-label',avatarText[avatar][0]+'의 픽셀 콘셉트');
 byId('avatar-name').textContent=avatarText[avatar][0];byId('avatar-description').textContent=avatarText[avatar][1];
}
document.querySelectorAll('[data-avatar]').forEach(button=>button.addEventListener('click',()=>{avatar=button.dataset.avatar;document.querySelectorAll('[data-avatar]').forEach(b=>{const yes=b===button;b.classList.toggle('active',yes);b.setAttribute('aria-pressed',String(yes));});drawAvatar();}));
document.querySelectorAll('[data-color]').forEach(button=>button.addEventListener('click',()=>{outfitColor=button.dataset.color;document.querySelectorAll('[data-color]').forEach(b=>{const yes=b===button;b.classList.toggle('selected',yes);b.setAttribute('aria-pressed',String(yes));});drawAvatar();}));
drawAvatar();
let activeHub='all';
function renderAtlas(){
 const q=byId('atlas-search').value.trim().toLocaleLowerCase();
 const found=data.atlas.entries.filter(e=>(activeHub==='all'||e.hubId===activeHub)&&(e.title+' '+data.atlas.hubs.find(h=>h.id===e.hubId).title).toLocaleLowerCase().includes(q));
 byId('atlas-count').textContent=`${found.length}개 탐험 주제`;
 byId('atlas-results').replaceChildren(...found.map(e=>{const card=node('div',undefined,'atlas-item');card.append(node('strong',e.title),node('span',`입문 Lv.${e.introMin}–${e.introMax} · 기초정보는 처음부터`));return card;}));
 if(!found.length)byId('atlas-results').append(node('p','일치하는 항목이 없습니다. 다른 이름이나 전체 영역으로 찾아보세요.','empty'));
}
[{id:'all',title:'전체'},...data.atlas.hubs].forEach(h=>{const b=node('button',h.title,`filter${h.id==='all'?' active':''}`);b.type='button';b.setAttribute('aria-pressed',String(h.id==='all'));b.addEventListener('click',()=>{activeHub=h.id;byId('hub-filters').querySelectorAll('button').forEach(el=>{el.classList.toggle('active',el===b);el.setAttribute('aria-pressed',String(el===b));});renderAtlas();});byId('hub-filters').append(b);});
byId('atlas-search').addEventListener('input',renderAtlas);renderAtlas();
function renderLevel(){const r=data.levels.rows[Number(byId('level-range').value)-1];byId('level-value').value=r.level;byId('level-rank').textContent=r.rankTarget+' · 권장 성장 구간';byId('level-title').textContent=r.playBeat;byId('level-action').textContent=r.playerAction;byId('level-xp').textContent=`누적 ${r.cumulativeXp.toLocaleString()} XP · ${r.xpToNext===null?'최고 레벨':`다음 레벨 ${r.xpToNext.toLocaleString()} XP`} · 설계 가설`;byId('level-journalism').textContent=r.journalismFocus;byId('level-life').textContent=r.lifeBeat;}
byId('level-range').addEventListener('input',renderLevel);renderLevel();
const budgets={work:[['취재 노트',250],['편집용 책상',600]],home:[['취재 노트',250],['일상 의상',200],['작은 내 집',1500]],style:[['의상',350],['가구',400],['취재 노트',250]],save:[]};
function renderBudget(){const items=budgets[byId('budget-path').value];byId('budget-items').replaceChildren(...items.map(([name,price])=>{const el=node('div',undefined,'budget-row');el.append(node('span',name),node('span',`− ${price.toLocaleString()} G`));return el;}));if(!items.length)byId('budget-items').append(node('p','기본 옷과 무료 숙소로도 모험을 이어갈 수 있어요.','caption'));byId('budget-balance').textContent=(2270-items.reduce((sum,item)=>sum+item[1],0)).toLocaleString()+' G';}
byId('budget-path').addEventListener('change',renderBudget);renderBudget();
function renderDocs(){const q=byId('doc-search').value.trim().toLocaleLowerCase();const docs=data.docs.filter(d=>(d.title+' '+d.text).toLocaleLowerCase().includes(q));byId('doc-count').textContent=`${docs.length}개의 설계 문서`;byId('doc-list').replaceChildren(...docs.map(d=>{const a=node('a',undefined,'doc-link');a.href=d.href;const text=node('div');text.append(node('strong',d.title),node('small',d.category+' · 원문 전체 읽기'));a.append(node('span',String(d.index).padStart(2,'0'),'doc-index'),text,node('span','↗'));return a;}));if(!docs.length)byId('doc-list').append(node('p','검색 결과가 없습니다. 다른 키워드로 찾아보세요.','empty'));}
byId('doc-search').addEventListener('input',renderDocs);renderDocs();
