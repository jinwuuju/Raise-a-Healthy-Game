import type { Game } from '../application/game';
import { q13ArticleAccess, q13BoardDone, q13Ready } from '../domain/q013';
import { binOf, flowBins, flowCards, q13Text, type FlowBin, type FlowCard, type Q13Decoy } from '../domain/q013-state';
import { button, el } from './dom';
import { openSheet } from './sheet';

/** Pool order of the movement cards: mixed with the decoy so the answer is not the reading order. */
const POOL: (FlowCard | Q13Decoy)[] = ['up', 'tide', 'follow', 'gather', 'divide'];

/** D117 Q013 desk: sort each movement into the air flow or the mucus flow, then an easy article with a lead, an analogy and its limit. */
export function openQ13(game: Game, onPublished: () => void): void {
  let unsubscribe = () => {};
  openSheet('Q013 취재 · ' + q13Text.title, (c, close) => {
    c.parentElement!.classList.add('article-sheet'); c.classList.add('keep-open');
    const error = el('p', 'save-message'); error.setAttribute('role', 'alert');
    const updateError = () => { error.textContent = game.lastError ?? ''; }; unsubscribe = game.subscribe(updateError); updateError();
    const status = el('p', 'article-status'); status.setAttribute('role', 'status');
    const body = el('div', 'q3-body q5-body q6-body q7-body q8-body q9-body q11-body q12-body q13-body'); c.append(el('p', 'article-question', q13Text.question), el('p', 'muted', q13Text.disclaimer), error, body, status);
    const b = q13Text.board, a = q13Text.article;
    const sources = (parent: HTMLElement, ids: string[]) => {
      const refs = el('details', 'article-sources'); refs.append(el('summary', '', '근거와 확인 날짜'));
      for (const source of q13Text.sources.filter(s => ids.includes(s.id))) {
        const link = el('a', '', source.title); link.href = source.url; link.target = '_blank'; link.rel = 'noopener'; refs.append(link, el('p', 'muted', source.section + ' · 확인 ' + source.checked));
      }
      parent.append(refs);
    };
    const attempt = (fn: () => void) => { try { fn(); } catch (e) { status.textContent = e instanceof Error ? e.message : '취재를 처리하지 못했어요.'; } };
    const card = (id: string) => b.cards.find(x => x.id === id)!;
    const binName = (id: string) => b.bins.find(x => x.id === id)!.label;
    const sceneName = (id: string) => q13Text.notes.find(n => n.id === id)!.name.replace('장면 · ', '');
    const focusFirst = (sel: string) => body.querySelector<HTMLElement>(sel)?.focus({ preventScroll: true });
    const board = (editing: boolean) => {
      const q = game.state.q013, section = el('section', 'signal-board supply-board circulation-board flow-board'); section.setAttribute('aria-label', b.title);
      section.append(el('h3', '', b.title), el('p', 'muted', b.intro));
      for (const bin of flowBins) {
        const col = el('div', 'flow-bin'); col.setAttribute('aria-label', binName(bin));
        const list = el('ul', 'signal-stages');
        const placed = flowCards.filter(id => q.sorted.includes(id) && binOf(id) === bin);
        for (const id of placed) { const li = el('li', 'signal-card'); li.append(el('strong', '', card(id).card), el('span', 'muted', ' · ' + b.seen + ': ' + card(id).scenes.map(sceneName).join(', '))); list.append(li); }
        if (!placed.length) list.append(el('li', 'signal-card muted', editing ? '아직 비어 있어요' : '?'));
        col.append(el('h4', '', binName(bin)), list); section.append(col);
      }
      if (editing && !q13BoardDone(game.state)) {
        const pool = el('div', 'signal-pool flow-pool'); pool.setAttribute('aria-label', '움직임 카드');
        for (const id of POOL) {
          if ((q.sorted as string[]).includes(id)) continue;
          const text = id === 'follow' ? b.decoys[0]!.card : card(id).card, row = el('div', 'flow-card');
          row.append(el('p', '', text));
          for (const bin of flowBins) {
            const btn = button('secondary signal-pick q13-card', binName(bin), () => attempt(() => {
              game.sortQ13(id, bin as FlowBin);
              status.textContent = q13BoardDone(game.state) ? '두 흐름을 모두 나눴어요. 첫 문장과 비유, 그 한계를 골라 주세요.' : '맞아요. ' + binName(bin) + '에 놓았어요. 다음 움직임을 나눠요.';
              render(); focusFirst('button.q13-card, fieldset button');
            }));
            btn.setAttribute('aria-label', text + ' → ' + binName(bin)); row.append(btn);
          }
          pool.append(row);
        }
        section.append(pool);
      }
      if (editing && q.sorted.length) section.append(button('secondary', '다시 나누기', () => attempt(() => { game.clearQ13Board(); status.textContent = '두 흐름을 처음부터 다시 나눠요. 취재 기록은 그대로예요.'; render(); focusFirst('button.q13-card'); })));
      return section;
    };
    const render = () => {
      body.replaceChildren();
      if (!q13Ready(game.state)) { body.append(el('p', '', '바디스코프에서 호흡기를 골라 기관과 기관지의 네 장면을 보고, 기관 한가운데 두 흐름 관찰기에서 세 가지 숨을 비교하고 와 주세요.')); return; }
      const q = game.state.q013, access = q13ArticleAccess(game.state), editing = !access && !q.publishedAt;
      const preview = el('article', 'article-paper'); preview.setAttribute('aria-label', '두 개의 흐름 기사 미리보기');
      const lead = a.leads.find(x => x.id === q.lead), analogy = a.analogies.find(x => x.id === q.analogy), limit = a.limitations.find(x => x.id === q.limit);
      preview.append(el('small', 'article-masthead', '메디컬 데스크 · 호흡기 · 쉬운 설명'), el('h3', '', lead?.title ?? q13Text.title), el('p', 'article-byline', game.state.avatar.name + ' 기자'), el('p', '', lead?.text ?? '첫 문장을 골라 주세요.'));
      preview.append(el('h4', '', b.seen)); for (const n of q13Text.notes) preview.append(el('p', '', n.text));
      for (const bin of flowBins) {
        preview.append(el('h4', '', binName(bin)));
        const items = el('ul', 'article-steps'), placed = flowCards.filter(id => q.sorted.includes(id) && binOf(id) === bin);
        for (const id of placed) items.append(el('li', '', card(id).card));
        if (!placed.length) items.append(el('li', 'muted', '(움직임을 나눠 주세요)'));
        preview.append(items);
      }
      preview.append(el('p', '', analogy?.text ?? '비유를 골라 주세요.'));
      preview.append(el('h4', '', '팩트체크'), el('p', '', a.factcheck), el('p', '', limit?.text ?? '비유나 모형의 한계를 밝혀 주세요.'), el('p', 'muted', a.next)); sources(preview, q13Text.sources.map(s => s.id));
      if (q.publishedAt) {
        body.append(el('h3', '', '두 개의 흐름 기사를 발행했어요'), el('p', 'article-reply', a.reply), board(false));
        if (game.state.at.room === 'newsroom') { const expected = game.state.reactions.count; body.append(button('primary', '다시 발행 · 새 독자 반응', () => attempt(() => { if (game.reprintArticle(expected, 'Q013')) onPublished(); }))); }
        body.append(preview); return;
      }
      if (access) { body.append(el('p', '', access), board(false), preview); return; }
      body.append(board(editing));
      if (q13BoardDone(game.state)) {
        for (const [slot, title, choices] of [['lead', '첫 문장', a.leads], ['analogy', '쉬운 비유', a.analogies], ['limit', '한계 밝히기', a.limitations]] as const) {
          const field = el('fieldset', 'article-leads'); field.append(el('legend', '', title));
          for (const choice of choices) {
            const btn = button('article-lead', choice.label, () => attempt(() => { game.selectQ13(slot, choice.id); render(); [...body.querySelectorAll('button')].find(x => x.textContent === choice.label)?.focus({ preventScroll: true }); }));
            btn.setAttribute('aria-pressed', String(q[slot] === choice.id)); field.append(btn);
          }
          body.append(field);
        }
      }
      body.append(preview, button('secondary', '편집장에게 초안 보여주기', () => attempt(() => {
        game.checkQ13(); render(); status.textContent = game.state.q013.checked ? '두 흐름과 비유, 그 한계를 확인했어요. 발행해 주세요.' : '움직임을 두 흐름으로 모두 나누고 첫 문장·비유·한계를 골라 주세요.';
        focusFirst(game.state.q013.checked ? 'button.q13-publish' : 'button.q13-card, fieldset button');
      })));
      const publish = button('primary q13-publish', '게임 속 신문에 발행', () => attempt(() => { if (game.publishQ13()) onPublished(); })); publish.disabled = !q.checked; body.append(publish);
    };
    c.append(button('secondary', '월드로 돌아가기', close)); render();
  }, () => unsubscribe());
}
