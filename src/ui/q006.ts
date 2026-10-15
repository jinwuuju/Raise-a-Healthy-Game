import type { Game } from '../application/game';
import { q6ArticleAccess, q6CompareDone, q6Ready } from '../domain/q006';
import { q6Text, supplyOrder, type Q6Evidence, type SupplyCard } from '../domain/q006-state';
import { button, el } from './dom';
import { openSheet } from './sheet';

const roomLabel: Record<string, string> = { heart: '우심방', rv: '우심실', lv: '좌심실', aorta: '대동맥굴' };

/** The desk hosts source-based materials, the heart-muscle supply route board and, afterwards, the article (D099). */
export function openQ6(game: Game, onPublished: () => void): void {
  let unsubscribe = () => {};
  openSheet('Q006 취재 · ' + q6Text.title, (c, close) => {
    c.parentElement!.classList.add('article-sheet'); c.classList.add('keep-open');
    const error = el('p', 'save-message'); error.setAttribute('role', 'alert');
    const updateError = () => { error.textContent = game.lastError ?? ''; }; unsubscribe = game.subscribe(updateError); updateError();
    const status = el('p', 'article-status'); status.setAttribute('role', 'status');
    const body = el('div', 'q3-body q5-body q6-body'); c.append(el('p', 'article-question', q6Text.question), el('p', 'muted', q6Text.disclaimer), error, body, status);
    const sources = (parent: HTMLElement, ids: string[]) => {
      const refs = el('details', 'article-sources'); refs.append(el('summary', '', '근거와 확인 날짜'));
      for (const source of q6Text.sources.filter(s => ids.includes(s.id))) {
        const a = el('a', '', source.title); a.href = source.url; a.target = '_blank'; a.rel = 'noopener'; refs.append(a, el('p', 'muted', source.section + ' · 확인 ' + source.checked));
      }
      parent.append(refs);
    };
    const attempt = (fn: () => void) => { try { fn(); } catch (e) { status.textContent = e instanceof Error ? e.message : '취재를 처리하지 못했어요.'; } };
    const board = (editing: boolean) => {
      const q = game.state.q006, section = el('section', 'signal-board supply-board'); section.setAttribute('aria-label', '심장 근육 배송 노선 도해');
      const complete = q.order.length === supplyOrder.length;
      const chip = el('p', 'supply-status' + (complete ? ' done' : ''), complete ? q6Text.board.complete : q6Text.board.missing);
      section.append(el('h3', '', q6Text.board.title), el('p', 'supply-main', q6Text.board.main), chip);
      const list = el('ol', 'signal-stages');
      for (const stage of q6Text.board.stages) {
        const item = el('li', 'signal-stage'); item.append(el('h4', '', stage.stage + ' · ' + stage.label));
        const placed = q.order.filter(id => q6Text.notes.find(n => n.id === id)!.stage === stage.stage);
        for (const id of placed) { const n = q6Text.notes.find(n => n.id === id)!, card = el('div', 'signal-card'); card.append(el('b', '', n.card), el('span', '', '· ' + roomLabel[n.room]!)); item.append(card); }
        if (!placed.length) item.append(el('p', 'muted', '비어 있는 칸'));
        item.classList.toggle('filled', placed.length > 0); list.append(item);
      }
      section.append(list);
      if (editing && !complete) {
        const pool = el('div', 'signal-pool'); pool.setAttribute('aria-label', '직접 취재한 배송 카드');
        const placeCard = (id: SupplyCard | 'body') => attempt(() => {
          game.placeQ6(id); status.textContent = game.state.q006.order.length === supplyOrder.length ? '심장 근육 배송 노선을 모두 이었어요. 첫 문장과 한계를 골라 주세요.' : '알맞은 칸에 놓았어요.';
          render(); body.querySelector<HTMLElement>('button.signal-pick, fieldset button')?.focus({ preventScroll: true });
        });
        for (const n of q6Text.notes) {
          if (q.order.includes(n.id as SupplyCard)) continue;
          const b = button('secondary signal-pick', n.card, () => placeCard(n.id as SupplyCard));
          b.append(el('span', 'sub', ' · ' + roomLabel[n.room]!)); pool.append(b);
        }
        const decoy = button('secondary signal-pick supply-decoy', q6Text.board.decoy.card, () => placeCard('body'));
        decoy.append(el('span', 'sub', ' · Q004 주 노선')); pool.append(decoy);
        section.append(pool);
      }
      if (editing && q.order.length) section.append(button('secondary', '노선 다시 놓기', () => attempt(() => { game.clearQ6Order(); status.textContent = '카드를 처음부터 다시 놓아요. 취재 기록은 그대로예요.'; render(); body.querySelector<HTMLElement>('button.signal-pick')?.focus({ preventScroll: true }); })));
      return section;
    };
    const render = () => {
      body.replaceChildren();
      if (!q6Ready(game.state)) {
        if (!q6CompareDone(game.state)) { body.append(el('p', '', '심장 근육 공급 노선의 다섯 곳을 살펴보고, 대동맥굴 앞 공급 관찰기에서 더 일할 때를 비교해 주세요.')); return; }
        const material = q6Text.materials.find(m => !game.state.q006.notes.includes(m.id as Q6Evidence))!;
        const heading = el('h3', '', material.title); heading.tabIndex = -1;
        body.append(heading, el('p', '', material.text));
        for (const card of material.cards) { const box = el('section', 'q3-material'); box.append(el('h4', '', card.title), el('p', '', card.text)); body.append(box); }
        sources(body, material.src);
        if (game.state.at.room === 'newsroom') body.append(button('primary', '이 자료를 취재 메모로 남기기', () => attempt(() => { game.recordQ6(material.id as Q6Evidence); render(); body.querySelector<HTMLElement>('h3, button.signal-pick')?.focus({ preventScroll: true }); })));
        else body.append(el('p', 'muted', '내 자리 가까이에서 자료 취재를 이어가 주세요.'));
        return;
      }
      const q = game.state.q006, access = q6ArticleAccess(game.state), editing = !access && !q.publishedAt;
      const preview = el('article', 'article-paper'); preview.setAttribute('aria-label', '심장 근육 공급 기사 미리보기');
      const lead = q6Text.article.leads.find(x => x.id === q.lead), limit = q6Text.article.limitations.find(x => x.id === q.limit);
      preview.append(el('small', 'article-masthead', '메디컬 데스크 · 팩트체크'), el('h3', '', lead?.title ?? q6Text.title), el('p', 'article-byline', game.state.avatar.name + ' 기자'), el('p', '', lead?.text ?? '첫 문장을 골라 주세요.'));
      preview.append(el('h4', '', '심장 근육 배송 노선'), el('p', 'muted', q6Text.board.main), el('p', '', q.order.length === supplyOrder.length ? q.order.map(id => q6Text.notes.find(n => n.id === id)!.card).join(' → ') : '배송 카드를 순서대로 놓으면 도해가 기사에 들어가요.'));
      preview.append(el('h4', '', '쉴 때와 더 일할 때'), el('p', '', q6Text.comparison.work.text), el('h4', '', '팩트체크'), el('p', '', q6Text.article.factcheck));
      for (const material of q6Text.materials) preview.append(el('h4', '', material.title.slice(4)), el('p', '', material.text));
      preview.append(el('p', '', limit?.text ?? '기사에서 모형의 한계를 밝혀 주세요.')); sources(preview, q6Text.sources.map(s => s.id));
      if (q.publishedAt) {
        body.append(el('h3', '', '심장 근육 공급 기사를 발행했어요'), el('p', 'article-reply', q6Text.article.reply), board(false));
        if (game.state.at.room === 'newsroom') { const expected = game.state.reactions.count; body.append(button('primary', '다시 발행 · 새 독자 반응', () => attempt(() => { if (game.reprintArticle(expected, 'Q006')) onPublished(); }))); }
        body.append(preview); return;
      }
      if (access) { body.append(el('p', '', access), board(false), preview); return; }
      body.append(board(editing));
      if (q.order.length === supplyOrder.length) {
        for (const [slot, title, choices] of [['lead', '첫 문장', q6Text.article.leads], ['limit', '모형의 한계', q6Text.article.limitations]] as const) {
          const field = el('fieldset', 'article-leads'); field.append(el('legend', '', title));
          for (const choice of choices) {
            const b = button('article-lead', choice.label, () => attempt(() => { game.selectQ6(slot, choice.id); render(); [...body.querySelectorAll('button')].find(b => b.textContent === choice.label)?.focus({ preventScroll: true }); }));
            b.setAttribute('aria-pressed', String(q[slot] === choice.id)); field.append(b);
          }
          body.append(field);
        }
      }
      body.append(preview, button('secondary', '편집장에게 초안 보여주기', () => attempt(() => {
        game.checkQ6(); render(); status.textContent = game.state.q006.checked ? '배송 노선과 모형의 한계를 확인했어요. 발행해 주세요.' : '배송 카드를 모두 놓고 첫 문장과 모형의 한계를 골라 주세요.';
        body.querySelector<HTMLElement>(game.state.q006.checked ? 'button.q6-publish' : 'button.signal-pick, fieldset button')?.focus({ preventScroll: true });
      })));
      const publish = button('primary q6-publish', '게임 속 신문에 발행', () => attempt(() => { if (game.publishQ6()) onPublished(); })); publish.disabled = !q.checked; body.append(publish);
    };
    c.append(button('secondary', '월드로 돌아가기', close)); render();
  }, () => unsubscribe());
}
