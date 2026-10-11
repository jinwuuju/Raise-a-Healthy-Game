import type { Game } from '../application/game';
import { q4Access } from '../domain/q004';
import { q4Text, type RouteId } from '../domain/q004-state';
import { button,el } from './dom';
import { openSheet } from './sheet';

export function openQ4(game:Game,onPublished:()=>void):void {
  let unsubscribe=()=>{};
  openSheet('Q004 노선 기사 · '+q4Text.title,(c,close)=>{
    const sheet=c.parentElement!;sheet.classList.add('article-sheet','route-sheet');c.classList.add('keep-open');
    const save=el('p','save-message');save.setAttribute('role','alert');
    const status=el('p','article-status');status.setAttribute('role','status');
    const body=el('div','q4-body');c.append(el('p','article-question',q4Text.question),el('p','muted',q4Text.disclaimer),save,body,status);
    const updateSave=()=>{save.textContent=game.lastError??'';};unsubscribe=game.subscribe(updateSave);updateSave();
    const attempt=(fn:()=>void)=>{try{fn();}catch(e){status.textContent=e instanceof Error?e.message:'노선 기사를 처리하지 못했어요.';}};
    const refs=(parent:HTMLElement)=>{
      const d=el('details','article-sources');d.append(el('summary','','출처와 모형의 한계'));
      for(const source of q4Text.sources){const a=el('a','',source.title);a.href=source.url;a.target='_blank';a.rel='noopener';d.append(a,el('p','muted',source.section+' · 확인 '+source.checked));}
      q4Text.simplification.forEach(x=>d.append(el('p','muted',x)));parent.append(d);
    };
    const render=()=>{
      body.replaceChildren();const s=game.state,q=s.q004,access=q4Access(s),editing=!access&&!q.publishedAt;
      const board=el('section','route-board');board.setAttribute('aria-label','두 순환 연결 도해');
      const order:RouteId[]=q.lead==='systemic'?['systemic','pulmonary']:['pulmonary','systemic'];
      for(const id of order){
        const route=q4Text.routes[id], row=el('div','route-card '+id);row.classList.toggle('attached',q.routes[id]);
        row.append(el('h3','',route.label));const list=el('ol','route-stops');
        route.stops.forEach((stop,i)=>{const item=el('li');if(i)item.append(el('span','route-arrow','↓'));item.append(el('b','',stop));list.append(item);});row.append(list);
        if(editing){const b=button('secondary',route.label+(q.routes[id]?' 카드 붙임':' 카드 붙이기'),()=>attempt(()=>{game.placeQ4Route(id);render();body.querySelector<HTMLElement>('.route-card:not(.attached) button, button.route-join')?.focus({preventScroll:true});}));b.disabled=q.routes[id];row.append(b);}
        else if(!q.routes[id])row.append(el('p','muted','직접 취재한 카드로 이어질 노선'));
        board.append(row);
      }
      for(const [index,id]of order.entries()){
        const bridge=el('p','route-bridge',q.joined?q4Text.bridges[id==='pulmonary'?0:1]!:'심장 안의 연결 · '+(index===0?'두 카드를 붙여 이어 보세요':'한 바퀴로 연결돼요'));
        bridge.classList.toggle('joined',q.joined);board.append(bridge);
      }
      body.append(board);
      if(q.publishedAt){
        body.append(el('h3','','두 순환 노선 기사를 발행했어요'),el('p','article-reply',q4Text.article.reply));
        if(s.at.room==='newsroom'){const count=s.reactions.count;body.append(button('primary','다시 발행 · 새 독자 반응',()=>attempt(()=>{if(game.reprintArticle(count,'Q004'))onPublished();})));}
      }else if(editing){
        const join=button('secondary route-join',q.joined?'두 순환 연결 완료':'두 순환 연결하기',()=>attempt(()=>{game.joinQ4();render();body.querySelector<HTMLElement>('fieldset button')?.focus({preventScroll:true});}));join.disabled=q.joined||!q.routes.pulmonary||!q.routes.systemic;body.append(join);
        for(const [slot,title,choices]of [['lead','출발점을 골라 설명하기',q4Text.article.leads],['limit','모형의 한계',q4Text.article.limitations]]as const){
          const field=el('fieldset','article-leads');field.append(el('legend','',title));
          for(const choice of choices){const b=button('article-lead',choice.label,()=>attempt(()=>{game.selectQ4(slot,choice.id);render();[...body.querySelectorAll('button')].find(b=>b.textContent===choice.label)?.focus({preventScroll:true});}));b.setAttribute('aria-pressed',String(q[slot]===choice.id));field.append(b);}body.append(field);
        }
        body.append(button('secondary','편집장에게 초안 보여주기',()=>attempt(()=>{game.checkQ4();render();status.textContent=game.state.q004.checked?'두 노선의 연결과 모형의 한계를 확인했어요.':'두 노선 카드를 붙여 연결하고, 첫 문장과 한계를 골라 주세요.';body.querySelector<HTMLElement>(game.state.q004.checked?'button.q4-publish':'button.route-join')?.focus({preventScroll:true});})));
        const pub=button('primary q4-publish','게임 속 신문에 발행',()=>attempt(()=>{if(game.publishQ4())onPublished();}));pub.disabled=!q.checked;body.append(pub);
      }else body.append(el('p','',access??''));
      const paper=el('article','article-paper');paper.setAttribute('aria-label','순환 기사 미리보기');
      const lead=q4Text.article.leads.find(x=>x.id===q.lead),limit=q4Text.article.limitations.find(x=>x.id===q.limit);
      paper.append(el('h3','',lead?.title??q4Text.title),el('p','article-byline',s.avatar.name+' 기자'),el('p','',lead?.text??'두 순환의 직접 취재 기록으로 기사를 이어가요.'),el('p','',q4Text.article.factcheck),el('p','',limit?.text??'이동 축약과 모형의 범위를 기사에 밝혀 주세요.'));
      refs(paper);body.append(paper);
    };
    c.append(button('secondary','월드로 돌아가기',close));render();
  },()=>unsubscribe());
}
