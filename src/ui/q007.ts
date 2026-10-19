import type { Game } from '../application/game';
import { q7ArticleAccess, q7BoardDone, q7CompareDone, q7Ready } from '../domain/q007';
import { chainOrder, q7Text, type ChainCard, type PairCard, type Q7Evidence } from '../domain/q007-state';
import { button, el } from './dom';
import { openSheet } from './sheet';

/** D108 Q007 desk: source-based materials, the passage comparison board (one-change pair + chain) and the easy article. */
export function openQ7(game: Game, onPublished: () => void): void {
  let unsubscribe = () => {};
  openSheet('Q007 취재 · ' + q7Text.title, (c, close) => {
    c.parentElement!.classList.add('article-sheet'); c.classList.add('keep-open');
    const error = el('p', 'save-message'); error.setAttribute('role', 'alert');
    const updateError = () => { error.textContent = game.lastError ?? ''; }; unsubscribe = game.subscribe(updateError); updateError();
    const status = el('p', 'article-status'); status.setAttribute('role', 'status');
    const body = el('div', 'q3-body q5-body q6-body q7-body'); c.append(el('p', 'article-question', q7Text.question), el('p', 'muted', q7Text.disclaimer), error, body, status);
    const sources = (parent: HTMLElement, ids: string[]) => {
      const refs = el('details', 'article-sources'); refs.append(el('summary', '', '근거와 확인 날짜'));
      for (const source of q7Text.sources.filter(s => ids.includes(s.id))) {
        const a = el('a', '', source.title); a.href = source.url; a.target = '_blank'; a.rel = 'noopener'; refs.append(a, el('p', 'muted', source.section + ' · 확인 ' + source.checked));
      }
      parent.append(refs);
    };
    const attempt = (fn: () => void) => { try { fn(); } catch (e) { status.textContent = e instanceof Error ? e.message : '취재를 처리하지 못했어요.'; } };
    const chainCard = (id: ChainCard) => q7Text.board.chain.find(x => x.id === id)!.card;
    const pairCard = (id: PairCard) => q7Text.board.pairs.find(x => x.id === id)!.card;
    const board = (editing: boolean) => {
      const q = game.state.q007, b = q7Text.board, section = el('section', 'signal-board supply-board passage-board'); section.setAttribute('aria-label', b.title);
      section.append(el('h3', '', b.title));
      // 1 · one change only
      const pair = el('div', 'signal-stage' + (q.pair ? ' filled' : '')); pair.append(el('h4', '', b.pairTitle));
      const row = el('div', 'signal-card'); row.append(el('b', '', b.base), el('span', '', ' ↔ ' + (q.pair ? pairCard(q.pair) : '?'))); pair.append(row);
      if (editing && !q.pair) {
        const pool = el('div', 'signal-pool'); pool.setAttribute('aria-label', '비교할 짝 카드');
        for (const p of b.pairs) pool.append(button('secondary signal-pick passage-pair', p.card, () => attempt(() => { game.pairQ7(p.id as PairCard); status.textContent = '하나만 바꾼 짝이에요. 이제 달라진 순서를 놓아요.'; render(); body.querySelector<HTMLElement>('button.passage-chain')?.focus({ preventScroll: true }); })));
        pair.append(pool);
      }
      // 2 · cause-and-effect chain
      const chain = el('div', 'signal-stage' + (q.chain.length === chainOrder.length ? ' filled' : '')); chain.append(el('h4', '', b.chainTitle));
      const list = el('ol', 'signal-stages'); for (const id of q.chain) list.append(el('li', 'signal-card', chainCard(id)));
      if (!q.chain.length) chain.append(el('p', 'muted', '비어 있는 칸')); else chain.append(list);
      if (editing && q.pair && q.chain.length < chainOrder.length) {
        const pool = el('div', 'signal-pool'); pool.setAttribute('aria-label', '변화 카드');
        const place = (id: ChainCard | 'cut') => attempt(() => { game.chainQ7(id); status.textContent = game.state.q007.chain.length === chainOrder.length ? '통로 비교 도해를 다 놓았어요. 첫 문장과 한계를 골라 주세요.' : '알맞은 차례에 놓았어요.'; render(); body.querySelector<HTMLElement>('button.passage-chain, fieldset button')?.focus({ preventScroll: true }); });
        for (const x of b.chain) if (!q.chain.includes(x.id as ChainCard)) pool.append(button('secondary signal-pick passage-chain', x.card, () => place(x.id as ChainCard)));
        pool.append(button('secondary signal-pick passage-chain supply-decoy', b.decoy.card, () => place('cut')));
        chain.append(pool);
      }
      section.append(pair, chain);
      if (editing && (q.pair || q.chain.length)) section.append(button('secondary', '도해 다시 놓기', () => attempt(() => { game.clearQ7Board(); status.textContent = '카드를 처음부터 다시 놓아요. 취재 기록은 그대로예요.'; render(); body.querySelector<HTMLElement>('button.signal-pick')?.focus({ preventScroll: true }); })));
      return section;
    };
    const render = () => {
      body.replaceChildren();
      if (!q7Ready(game.state)) {
        if (!q7CompareDone(game.state)) { body.append(el('p', '', '대동맥굴의 두 관상동맥 입구를 다시 보고, 통로 관찰기에서 조금 좁아짐과 많이 좁아짐을 차례로 비교해 주세요.')); return; }
        const material = q7Text.materials.find(m => !game.state.q007.notes.includes(m.id as Q7Evidence))!;
        const heading = el('h3', '', material.title); heading.tabIndex = -1;
        body.append(heading, el('p', '', material.text));
        for (const card of material.cards) { const box = el('section', 'q3-material'); box.append(el('h4', '', card.title), el('p', '', card.text)); body.append(box); }
        sources(body, material.src);
        if (game.state.at.room === 'newsroom') body.append(button('primary', '이 자료를 취재 메모로 남기기', () => attempt(() => { game.recordQ7(material.id as Q7Evidence); render(); body.querySelector<HTMLElement>('h3, button.signal-pick')?.focus({ preventScroll: true }); })));
        else body.append(el('p', 'muted', '내 자리 가까이에서 자료 취재를 이어가 주세요.'));
        return;
      }
      const q = game.state.q007, access = q7ArticleAccess(game.state), editing = !access && !q.publishedAt;
      const preview = el('article', 'article-paper'); preview.setAttribute('aria-label', '통로 비교 기사 미리보기');
      const lead = q7Text.article.leads.find(x => x.id === q.lead), limit = q7Text.article.limitations.find(x => x.id === q.limit);
      preview.append(el('small', 'article-masthead', '메디컬 데스크 · 쉬운 설명 · 팩트체크'), el('h3', '', lead?.title ?? q7Text.title), el('p', 'article-byline', game.state.avatar.name + ' 기자'), el('p', '', lead?.text ?? '첫 문장을 골라 주세요.'));
      preview.append(el('h4', '', '통로 폭 하나만 바꾼 비교'), el('p', '', q.pair ? q7Text.board.base + ' ↔ ' + pairCard(q.pair) : '비교 짝을 고르면 도해가 기사에 들어가요.'),
        el('p', '', q.chain.length === chainOrder.length ? q.chain.map(chainCard).join(' → ') : '달라진 순서를 놓아 주세요.'), el('p', 'muted', q7Text.singleVariable));
      preview.append(el('h4', '', '팩트체크'), el('p', '', q7Text.article.factcheck));
      for (const material of q7Text.materials) preview.append(el('h4', '', material.title.slice(4)), el('p', '', material.text));
      preview.append(el('p', '', limit?.text ?? '기사에서 모형의 한계를 밝혀 주세요.')); sources(preview, q7Text.sources.map(s => s.id));
      if (q.publishedAt) {
        body.append(el('h3', '', '통로 비교 기사를 발행했어요'), el('p', 'article-reply', q7Text.article.reply), board(false));
        if (game.state.at.room === 'newsroom') { const expected = game.state.reactions.count; body.append(button('primary', '다시 발행 · 새 독자 반응', () => attempt(() => { if (game.reprintArticle(expected, 'Q007')) onPublished(); }))); }
        body.append(preview); return;
      }
      if (access) { body.append(el('p', '', access), board(false), preview); return; }
      body.append(board(editing));
      if (q7BoardDone(game.state)) {
        for (const [slot, title, choices] of [['lead', '첫 문장', q7Text.article.leads], ['limit', '모형의 한계', q7Text.article.limitations]] as const) {
          const field = el('fieldset', 'article-leads'); field.append(el('legend', '', title));
          for (const choice of choices) {
            const b = button('article-lead', choice.label, () => attempt(() => { game.selectQ7(slot, choice.id); render(); [...body.querySelectorAll('button')].find(b => b.textContent === choice.label)?.focus({ preventScroll: true }); }));
            b.setAttribute('aria-pressed', String(q[slot] === choice.id)); field.append(b);
          }
          body.append(field);
        }
      }
      body.append(preview, button('secondary', '편집장에게 초안 보여주기', () => attempt(() => {
        game.checkQ7(); render(); status.textContent = game.state.q007.checked ? '하나만 바꾼 비교와 모형의 한계를 확인했어요. 발행해 주세요.' : '비교 짝과 순서를 놓고 첫 문장과 모형의 한계를 골라 주세요.';
        body.querySelector<HTMLElement>(game.state.q007.checked ? 'button.q7-publish' : 'button.signal-pick, fieldset button')?.focus({ preventScroll: true });
      })));
      const publish = button('primary q7-publish', '게임 속 신문에 발행', () => attempt(() => { if (game.publishQ7()) onPublished(); })); publish.disabled = !q.checked; body.append(publish);
    };
    c.append(button('secondary', '월드로 돌아가기', close)); render();
  }, () => unsubscribe());
}
