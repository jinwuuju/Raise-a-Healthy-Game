import type { Game } from '../application/game';
import { q5ArticleAccess, q5CompareDone, q5Ready } from '../domain/q005';
import { q5Text, signalOrder, type Q5Evidence, type SignalCard } from '../domain/q005-state';
import { button, el } from './dom';
import { ecgStrip } from './ecg-strip';
import { openSheet } from './sheet';

const roomLabel: Record<string, string> = { heart: '우심방', rv: '우심실', la: '좌심방', lv: '좌심실' };

/** The desk hosts source-based materials, the arrival-order board and, afterwards, the article (D077). */
export function openQ5(game: Game, onPublished: () => void): void {
  let unsubscribe = () => {};
  openSheet('Q005 취재 · ' + q5Text.title, (c, close) => {
    c.parentElement!.classList.add('article-sheet'); c.classList.add('keep-open');
    const error = el('p', 'save-message'); error.setAttribute('role', 'alert');
    const updateError = () => { error.textContent = game.lastError ?? ''; }; unsubscribe = game.subscribe(updateError); updateError();
    const status = el('p', 'article-status'); status.setAttribute('role', 'status');
    const body = el('div', 'q3-body q5-body'); c.append(el('p', 'article-question', q5Text.question), el('p', 'muted', q5Text.disclaimer), error, body, status);
    const sources = (parent: HTMLElement, ids: string[]) => {
      const refs = el('details', 'article-sources'); refs.append(el('summary', '', '근거와 확인 날짜'));
      for (const source of q5Text.sources.filter(s => ids.includes(s.id))) {
        const a = el('a', '', source.title); a.href = source.url; a.target = '_blank'; a.rel = 'noopener'; refs.append(a, el('p', 'muted', source.section + ' · 확인 ' + source.checked));
      }
      parent.append(refs);
    };
    const attempt = (fn: () => void) => { try { fn(); } catch (e) { status.textContent = e instanceof Error ? e.message : '취재를 처리하지 못했어요.'; } };
    const strips = (parent: HTMLElement) => {
      const [a, b] = q5Text.materials.find(m => m.id === 'tests')!.cards;
      parent.append(ecgStrip('regular', a!.title + ' · 교육용 가상 그림'), ecgStrip('irregular', b!.title + ' · 교육용 가상 그림'));
    };
    const board = (editing: boolean) => {
      const q = game.state.q005, section = el('section', 'signal-board'); section.setAttribute('aria-label', '신호 도착 순서 도해');
      section.append(el('h3', '', q5Text.board.title), el('p', 'muted', q5Text.board.motionNote));
      const list = el('ol', 'signal-stages');
      for (const stage of q5Text.board.stages) {
        const item = el('li', 'signal-stage'); item.append(el('h4', '', stage.stage + ' · ' + stage.label));
        const placed = q.order.filter(id => q5Text.notes.find(n => n.id === id)!.stage === stage.stage);
        for (const id of placed) { const n = q5Text.notes.find(n => n.id === id)!, card = el('div', 'signal-card'); card.append(el('b', '', n.card), el('span', '', '→ ' + n.motion)); item.append(card); }
        if (!placed.length) item.append(el('p', 'muted', '비어 있는 칸'));
        item.classList.toggle('filled', placed.length > 0); list.append(item);
      }
      section.append(list);
      if (editing && q.order.length < signalOrder.length) {
        const pool = el('div', 'signal-pool'); pool.setAttribute('aria-label', '직접 취재한 신호 카드');
        for (const n of q5Text.notes) {
          if (q.order.includes(n.id as SignalCard)) continue;
          const b = button('secondary signal-pick', n.card, () => attempt(() => {
            game.placeQ5(n.id as SignalCard); status.textContent = game.state.q005.order.length === signalOrder.length ? '신호가 지나는 순서를 모두 놓았어요. 첫 문장과 한계를 골라 주세요.' : '알맞은 칸에 놓았어요.';
            render(); body.querySelector<HTMLElement>('button.signal-pick, fieldset button')?.focus({ preventScroll: true });
          }));
          b.append(el('span', 'sub', ' · ' + roomLabel[n.room]!)); pool.append(b);
        }
        section.append(pool);
      }
      if (editing && q.order.length) section.append(button('secondary', '순서 다시 놓기', () => attempt(() => { game.clearQ5Order(); status.textContent = '카드를 처음부터 다시 놓아요. 취재 기록은 그대로예요.'; render(); body.querySelector<HTMLElement>('button.signal-pick')?.focus({ preventScroll: true }); })));
      return section;
    };
    const render = () => {
      body.replaceChildren();
      if (!q5Ready(game.state)) {
        if (!q5CompareDone(game.state)) { body.append(el('p', '', '박동 신호가 지나는 다섯 곳을 살펴보고, 우심방 동방결절 앞 신호 관찰기에서 심방세동을 비교해 주세요.')); return; }
        const material = q5Text.materials.find(m => !game.state.q005.notes.includes(m.id as Q5Evidence))!;
        const heading = el('h3', '', material.title); heading.tabIndex = -1;
        body.append(heading, el('p', '', material.text));
        for (const card of material.cards) { const box = el('section', 'q3-material'); box.append(el('h4', '', card.title), el('p', '', card.text)); body.append(box); }
        if (material.id === 'tests') strips(body);
        sources(body, material.src);
        if (game.state.at.room === 'newsroom') body.append(button('primary', '이 자료를 취재 메모로 남기기', () => attempt(() => { game.recordQ5(material.id as Q5Evidence); render(); body.querySelector<HTMLElement>('h3, button.signal-pick')?.focus({ preventScroll: true }); })));
        else body.append(el('p', 'muted', '내 자리 가까이에서 자료 취재를 이어가 주세요.'));
        return;
      }
      const q = game.state.q005, access = q5ArticleAccess(game.state), editing = !access && !q.publishedAt;
      const preview = el('article', 'article-paper'); preview.setAttribute('aria-label', '박동 신호 기사 미리보기');
      const lead = q5Text.article.leads.find(x => x.id === q.lead), limit = q5Text.article.limitations.find(x => x.id === q.limit);
      preview.append(el('small', 'article-masthead', '메디컬 데스크 · 팩트체크'), el('h3', '', lead?.title ?? q5Text.title), el('p', 'article-byline', game.state.avatar.name + ' 기자'), el('p', '', lead?.text ?? '첫 문장을 골라 주세요.'));
      preview.append(el('h4', '', '신호가 지나는 순서'), el('p', '', q.order.length === signalOrder.length ? q.order.map(id => q5Text.notes.find(n => n.id === id)!.card).join(' → ') : '신호 카드를 순서대로 놓으면 도해가 기사에 들어가요.'));
      preview.append(el('h4', '', '같은 우심방에서 비교한 박자'), el('p', '', q5Text.comparison.af.text), el('h4', '', '팩트체크'), el('p', '', q5Text.article.factcheck));
      for (const material of q5Text.materials) preview.append(el('h4', '', material.title.slice(4)), el('p', '', material.text));
      preview.append(el('p', '', limit?.text ?? '기사에서 모형의 한계를 밝혀 주세요.')); sources(preview, q5Text.sources.map(s => s.id));
      if (q.publishedAt) {
        body.append(el('h3', '', '박동 신호 기사를 발행했어요'), el('p', 'article-reply', q5Text.article.reply), board(false));
        if (game.state.at.room === 'newsroom') { const expected = game.state.reactions.count; body.append(button('primary', '다시 발행 · 새 독자 반응', () => attempt(() => { if (game.reprintArticle(expected, 'Q005')) onPublished(); }))); }
        body.append(preview); return;
      }
      if (access) { body.append(el('p', '', access), board(false), preview); return; }
      body.append(board(editing));
      if (q.order.length === signalOrder.length) {
        for (const [slot, title, choices] of [['lead', '첫 문장', q5Text.article.leads], ['limit', '모형의 한계', q5Text.article.limitations]] as const) {
          const field = el('fieldset', 'article-leads'); field.append(el('legend', '', title));
          for (const choice of choices) {
            const b = button('article-lead', choice.label, () => attempt(() => { game.selectQ5(slot, choice.id); render(); [...body.querySelectorAll('button')].find(b => b.textContent === choice.label)?.focus({ preventScroll: true }); }));
            b.setAttribute('aria-pressed', String(q[slot] === choice.id)); field.append(b);
          }
          body.append(field);
        }
      }
      body.append(preview, button('secondary', '편집장에게 초안 보여주기', () => attempt(() => {
        game.checkQ5(); render(); status.textContent = game.state.q005.checked ? '신호 순서와 모형의 한계를 확인했어요. 발행해 주세요.' : '신호 카드를 모두 놓고 첫 문장과 모형의 한계를 골라 주세요.';
        body.querySelector<HTMLElement>(game.state.q005.checked ? 'button.q5-publish' : 'button.signal-pick, fieldset button')?.focus({ preventScroll: true });
      })));
      const publish = button('primary q5-publish', '게임 속 신문에 발행', () => attempt(() => { if (game.publishQ5()) onPublished(); })); publish.disabled = !q.checked; body.append(publish);
    };
    c.append(button('secondary', '월드로 돌아가기', close)); render();
  }, () => unsubscribe());
}
