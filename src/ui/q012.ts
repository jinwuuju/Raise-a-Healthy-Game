import type { Game } from '../application/game';
import { q12ArticleAccess, q12BoardDone, q12Ready } from '../domain/q012';
import { stepOrder, q12Text, type Q12Decoy, type SwallowStep } from '../domain/q012-state';
import { button, el } from './dom';
import { openSheet } from './sheet';

/** Pool order of the step cards: mixed with the decoy so the answer is not the reading order. */
const POOL: (SwallowStep | Q12Decoy)[] = ['down', 'both', 'open', 'arrive', 'close'];

/** D113 Q012 desk: put the steps of one swallow in order, then an easy article with a lead, an analogy and its limit. */
export function openQ12(game: Game, onPublished: () => void): void {
  let unsubscribe = () => {};
  openSheet('Q012 취재 · ' + q12Text.title, (c, close) => {
    c.parentElement!.classList.add('article-sheet'); c.classList.add('keep-open');
    const error = el('p', 'save-message'); error.setAttribute('role', 'alert');
    const updateError = () => { error.textContent = game.lastError ?? ''; }; unsubscribe = game.subscribe(updateError); updateError();
    const status = el('p', 'article-status'); status.setAttribute('role', 'status');
    const body = el('div', 'q3-body q5-body q6-body q7-body q8-body q9-body q11-body q12-body'); c.append(el('p', 'article-question', q12Text.question), el('p', 'muted', q12Text.disclaimer), error, body, status);
    const b = q12Text.board, a = q12Text.article;
    const sources = (parent: HTMLElement, ids: string[]) => {
      const refs = el('details', 'article-sources'); refs.append(el('summary', '', '근거와 확인 날짜'));
      for (const source of q12Text.sources.filter(s => ids.includes(s.id))) {
        const link = el('a', '', source.title); link.href = source.url; link.target = '_blank'; link.rel = 'noopener'; refs.append(link, el('p', 'muted', source.section + ' · 확인 ' + source.checked));
      }
      parent.append(refs);
    };
    const attempt = (fn: () => void) => { try { fn(); } catch (e) { status.textContent = e instanceof Error ? e.message : '취재를 처리하지 못했어요.'; } };
    const step = (id: string) => b.steps.find(s => s.id === id)!;
    const sceneName = (id: string) => q12Text.notes.find(n => n.id === id)!.name.replace('장면 · ', '');
    const focusFirst = (sel: string) => body.querySelector<HTMLElement>(sel)?.focus({ preventScroll: true });
    const board = (editing: boolean) => {
      const q = game.state.q012, section = el('section', 'signal-board supply-board circulation-board'); section.setAttribute('aria-label', b.title);
      section.append(el('h3', '', b.title), el('p', 'muted', b.intro));
      const list = el('ol', 'signal-stages');
      stepOrder.forEach((id, i) => {
        const placed = q.order[i], li = el('li', 'signal-card' + (placed ? '' : ' muted'));
        if (placed) li.append(el('strong', '', step(placed).card), el('span', 'muted', ' · ' + b.seen + ': ' + step(placed).scenes.map(sceneName).join(', ')));
        else li.append(el('span', 'muted', i === q.order.length && editing ? '다음: 이 차례에 일어나는 일을 골라요' : '?'));
        list.append(li);
      });
      section.append(list);
      if (editing && q.order.length < stepOrder.length) {
        const pool = el('div', 'signal-pool'); pool.setAttribute('aria-label', '삼킴 카드');
        for (const id of POOL) {
          const used = (q.order as string[]).includes(id);
          const label = id === 'both' ? b.decoys[0]!.card : step(id).card;
          const btn = button('secondary signal-pick q12-card', label, () => attempt(() => {
            game.placeQ12(id);
            status.textContent = game.state.q012.order.length === stepOrder.length ? '삼킴 한 번을 순서대로 놓았어요. 첫 문장과 비유, 그 한계를 골라 주세요.' : '맞는 차례예요. 다음에 일어나는 일을 골라요.';
            render(); focusFirst('button.q12-card:not([disabled]), fieldset button');
          }));
          btn.disabled = used; pool.append(btn);
        }
        section.append(pool);
      }
      if (editing && q.order.length) section.append(button('secondary', '순서 다시 놓기', () => attempt(() => { game.clearQ12Board(); status.textContent = '삼킴의 순서를 처음부터 다시 놓아요. 취재 기록은 그대로예요.'; render(); focusFirst('button.q12-card'); })));
      return section;
    };
    const render = () => {
      body.replaceChildren();
      if (!q12Ready(game.state)) { body.append(el('p', '', '바디스코프에서 호흡기를 골라 목구멍과 공기 길 입구의 네 장면을 보고, 식도 입구 앞 갈림길 관찰기에서 세 가지를 비교하고 와 주세요.')); return; }
      const q = game.state.q012, access = q12ArticleAccess(game.state), editing = !access && !q.publishedAt;
      const preview = el('article', 'article-paper'); preview.setAttribute('aria-label', '갈라지는 길 기사 미리보기');
      const lead = a.leads.find(x => x.id === q.lead), analogy = a.analogies.find(x => x.id === q.analogy), limit = a.limitations.find(x => x.id === q.limit);
      preview.append(el('small', 'article-masthead', '메디컬 데스크 · 호흡기 · 쉬운 설명'), el('h3', '', lead?.title ?? q12Text.title), el('p', 'article-byline', game.state.avatar.name + ' 기자'), el('p', '', lead?.text ?? '첫 문장을 골라 주세요.'));
      preview.append(el('h4', '', b.seen)); for (const n of q12Text.notes) preview.append(el('p', '', n.text));
      preview.append(el('h4', '', b.title));
      const steps = el('ol', 'article-steps'); stepOrder.forEach((id, i) => steps.append(el('li', q.order[i] ? '' : 'muted', q.order[i] ? step(id).card : '(차례를 놓아 주세요)'))); preview.append(steps);
      preview.append(el('p', '', analogy?.text ?? '비유를 골라 주세요.'));
      preview.append(el('h4', '', '팩트체크'), el('p', '', a.factcheck), el('p', '', limit?.text ?? '비유나 모형의 한계를 밝혀 주세요.'), el('p', 'muted', a.next)); sources(preview, q12Text.sources.map(s => s.id));
      if (q.publishedAt) {
        body.append(el('h3', '', '갈라지는 길 기사를 발행했어요'), el('p', 'article-reply', a.reply), board(false));
        if (game.state.at.room === 'newsroom') { const expected = game.state.reactions.count; body.append(button('primary', '다시 발행 · 새 독자 반응', () => attempt(() => { if (game.reprintArticle(expected, 'Q012')) onPublished(); }))); }
        body.append(preview); return;
      }
      if (access) { body.append(el('p', '', access), board(false), preview); return; }
      body.append(board(editing));
      if (q12BoardDone(game.state)) {
        for (const [slot, title, choices] of [['lead', '첫 문장', a.leads], ['analogy', '쉬운 비유', a.analogies], ['limit', '한계 밝히기', a.limitations]] as const) {
          const field = el('fieldset', 'article-leads'); field.append(el('legend', '', title));
          for (const choice of choices) {
            const btn = button('article-lead', choice.label, () => attempt(() => { game.selectQ12(slot, choice.id); render(); [...body.querySelectorAll('button')].find(x => x.textContent === choice.label)?.focus({ preventScroll: true }); }));
            btn.setAttribute('aria-pressed', String(q[slot] === choice.id)); field.append(btn);
          }
          body.append(field);
        }
      }
      body.append(preview, button('secondary', '편집장에게 초안 보여주기', () => attempt(() => {
        game.checkQ12(); render(); status.textContent = game.state.q012.checked ? '삼킴의 순서와 비유, 그 한계를 확인했어요. 발행해 주세요.' : '삼킴 한 번을 순서대로 놓고 첫 문장·비유·한계를 골라 주세요.';
        focusFirst(game.state.q012.checked ? 'button.q12-publish' : 'button.q12-card:not([disabled]), fieldset button');
      })));
      const publish = button('primary q12-publish', '게임 속 신문에 발행', () => attempt(() => { if (game.publishQ12()) onPublished(); })); publish.disabled = !q.checked; body.append(publish);
    };
    c.append(button('secondary', '월드로 돌아가기', close)); render();
  }, () => unsubscribe());
}
