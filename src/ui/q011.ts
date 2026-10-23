import type { Game } from '../application/game';
import { q11ArticleAccess, q11BoardDone, q11Ready } from '../domain/q011';
import { jobOrder, q11Text, type DecoyCard, type Q11Evidence } from '../domain/q011-state';
import { button, el } from './dom';
import { openSheet } from './sheet';

/** Pool order of the scene cards: mixed with the decoy so the answer is not the walking order. */
const POOL: (Q11Evidence | DecoyCard)[] = ['mucus', 'oxygen', 'hairs', 'wall', 'shelves'];

/** D112 Q011 desk: back each job of the nose with a scene the reporter saw, then an easy article with an analogy and its limit. */
export function openQ11(game: Game, onPublished: () => void): void {
  let unsubscribe = () => {};
  openSheet('Q011 취재 · ' + q11Text.title, (c, close) => {
    c.parentElement!.classList.add('article-sheet'); c.classList.add('keep-open');
    const error = el('p', 'save-message'); error.setAttribute('role', 'alert');
    const updateError = () => { error.textContent = game.lastError ?? ''; }; unsubscribe = game.subscribe(updateError); updateError();
    const status = el('p', 'article-status'); status.setAttribute('role', 'status');
    const body = el('div', 'q3-body q5-body q6-body q7-body q8-body q9-body q11-body'); c.append(el('p', 'article-question', q11Text.question), el('p', 'muted', q11Text.disclaimer), error, body, status);
    const b = q11Text.board, a = q11Text.article;
    const sources = (parent: HTMLElement, ids: string[]) => {
      const refs = el('details', 'article-sources'); refs.append(el('summary', '', '근거와 확인 날짜'));
      for (const source of q11Text.sources.filter(s => ids.includes(s.id))) {
        const link = el('a', '', source.title); link.href = source.url; link.target = '_blank'; link.rel = 'noopener'; refs.append(link, el('p', 'muted', source.section + ' · 확인 ' + source.checked));
      }
      parent.append(refs);
    };
    const attempt = (fn: () => void) => { try { fn(); } catch (e) { status.textContent = e instanceof Error ? e.message : '취재를 처리하지 못했어요.'; } };
    const note = (id: string) => q11Text.notes.find(n => n.id === id)!;
    const focusFirst = (sel: string) => body.querySelector<HTMLElement>(sel)?.focus({ preventScroll: true });
    const board = (editing: boolean) => {
      const q = game.state.q011, section = el('section', 'signal-board supply-board circulation-board'); section.setAttribute('aria-label', b.title);
      section.append(el('h3', '', b.title), el('p', 'muted', b.intro));
      const list = el('ol', 'signal-stages');
      b.jobs.forEach((job, i) => {
        const pick = q.pairs[i], li = el('li', 'signal-card' + (pick ? '' : ' muted'));
        li.append(el('strong', '', job.name + ' · '), document.createTextNode(job.claim + ' '), el('span', 'muted', pick ? '← ' + note(pick).card : i === q.pairs.length && editing ? '← 다음: 이 일을 보여 준 장면을 골라요' : '← ?'));
        list.append(li);
      });
      section.append(list);
      if (editing && q.pairs.length < jobOrder.length) {
        const pool = el('div', 'signal-pool'); pool.setAttribute('aria-label', '장면 카드');
        for (const id of POOL) {
          const label = id === 'oxygen' ? b.decoys[0]!.card : note(id).card;
          pool.append(button('secondary signal-pick q11-card', label, () => attempt(() => {
            game.pairQ11(id);
            status.textContent = game.state.q011.pairs.length === jobOrder.length ? '세 가지 일을 모두 내가 본 장면으로 받쳤어요. 첫 문장과 비유, 그 한계를 골라 주세요.' : '그 장면이 이 일을 보여 줘요. 다음 일로 가요.';
            render(); focusFirst('button.q11-card, fieldset button');
          })));
        }
        section.append(pool);
      }
      if (editing && q.pairs.length) section.append(button('secondary', '장면 다시 붙이기', () => attempt(() => { game.clearQ11Board(); status.textContent = '세 가지 일의 장면을 처음부터 다시 붙여요. 취재 기록은 그대로예요.'; render(); focusFirst('button.q11-card'); })));
      return section;
    };
    const render = () => {
      body.replaceChildren();
      if (!q11Ready(game.state)) { body.append(el('p', '', '바디스코프에서 호흡기를 골라 코안의 네 장면을 보고, 뒤콧구멍 앞 공기 항구 관찰기에서 세 가지 공기를 비교하고 와 주세요.')); return; }
      const q = game.state.q011, access = q11ArticleAccess(game.state), editing = !access && !q.publishedAt;
      const preview = el('article', 'article-paper'); preview.setAttribute('aria-label', '공기 항구 기사 미리보기');
      const lead = a.leads.find(x => x.id === q.lead), analogy = a.analogies.find(x => x.id === q.analogy), limit = a.limitations.find(x => x.id === q.limit);
      preview.append(el('small', 'article-masthead', '메디컬 데스크 · 호흡기 · 쉬운 설명'), el('h3', '', lead?.title ?? q11Text.title), el('p', 'article-byline', game.state.avatar.name + ' 기자'), el('p', '', lead?.text ?? '첫 문장을 골라 주세요.'));
      preview.append(el('h4', '', b.seen)); for (const n of q11Text.notes) preview.append(el('p', '', n.text));
      preview.append(el('h4', '', b.explained));
      b.jobs.forEach((job, i) => preview.append(el('p', '', job.claim + (q.pairs[i] ? ' (본 것: ' + note(q.pairs[i]!).card + ')' : ' (장면을 붙여 주세요)'))));
      preview.append(el('p', '', analogy?.text ?? '비유를 골라 주세요.'));
      preview.append(el('h4', '', '팩트체크'), el('p', '', a.factcheck), el('p', '', limit?.text ?? '비유나 모형의 한계를 밝혀 주세요.'), el('p', 'muted', a.next)); sources(preview, q11Text.sources.map(s => s.id));
      if (q.publishedAt) {
        body.append(el('h3', '', '공기 항구 기사를 발행했어요'), el('p', 'article-reply', a.reply), board(false));
        if (game.state.at.room === 'newsroom') { const expected = game.state.reactions.count; body.append(button('primary', '다시 발행 · 새 독자 반응', () => attempt(() => { if (game.reprintArticle(expected, 'Q011')) onPublished(); }))); }
        body.append(preview); return;
      }
      if (access) { body.append(el('p', '', access), board(false), preview); return; }
      body.append(board(editing));
      if (q11BoardDone(game.state)) {
        for (const [slot, title, choices] of [['lead', '첫 문장', a.leads], ['analogy', '쉬운 비유', a.analogies], ['limit', '한계 밝히기', a.limitations]] as const) {
          const field = el('fieldset', 'article-leads'); field.append(el('legend', '', title));
          for (const choice of choices) {
            const btn = button('article-lead', choice.label, () => attempt(() => { game.selectQ11(slot, choice.id); render(); [...body.querySelectorAll('button')].find(x => x.textContent === choice.label)?.focus({ preventScroll: true }); }));
            btn.setAttribute('aria-pressed', String(q[slot] === choice.id)); field.append(btn);
          }
          body.append(field);
        }
      }
      body.append(preview, button('secondary', '편집장에게 초안 보여주기', () => attempt(() => {
        game.checkQ11(); render(); status.textContent = game.state.q011.checked ? '본 것과 설명, 비유와 그 한계를 확인했어요. 발행해 주세요.' : '세 가지 일에 장면을 붙이고 첫 문장·비유·한계를 골라 주세요.';
        focusFirst(game.state.q011.checked ? 'button.q11-publish' : 'button.q11-card, fieldset button');
      })));
      const publish = button('primary q11-publish', '게임 속 신문에 발행', () => attempt(() => { if (game.publishQ11()) onPublished(); })); publish.disabled = !q.checked; body.append(publish);
    };
    c.append(button('secondary', '월드로 돌아가기', close)); render();
  }, () => unsubscribe());
}
