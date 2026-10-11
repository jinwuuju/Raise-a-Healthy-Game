import type { Game } from '../application/game';
import { q3ArticleAccess, q3CompareDone, q3Ready } from '../domain/q003';
import { q3Text, type Q3Evidence } from '../domain/q003-state';
import { button, el } from './dom';
import { openSheet } from './sheet';

/** The desk hosts source-based reporting materials and, afterwards, the article. */
export function openQ3(game: Game, onPublished: () => void): void {
  let unsubscribe = () => {};
  openSheet('Q003 취재 · ' + q3Text.title, (c, close) => {
    c.parentElement!.classList.add('article-sheet'); c.classList.add('keep-open');
    const error = el('p', 'save-message'); error.setAttribute('role', 'alert');
    const updateError = () => { error.textContent = game.lastError ?? ''; }; unsubscribe = game.subscribe(updateError); updateError();
    const status = el('p', 'article-status'); status.setAttribute('role', 'status');
    const body = el('div', 'q3-body'); c.append(el('p', 'article-question', q3Text.question), el('p', 'muted', q3Text.disclaimer), error, body, status);
    const sources = (parent: HTMLElement, ids: string[]) => {
      const refs = el('details', 'article-sources'); refs.append(el('summary', '', '근거와 확인 날짜'));
      for (const source of q3Text.sources.filter(s => ids.includes(s.id))) {
        const a = el('a', '', source.title); a.href = source.url; a.target = '_blank'; a.rel = 'noopener'; refs.append(a, el('p', 'muted', source.section + ' · 확인 ' + source.checked));
      }
      parent.append(refs);
    };
    const attempt = (fn: () => void) => { try { fn(); } catch (e) { status.textContent = e instanceof Error ? e.message : '취재를 처리하지 못했어요.'; } };
    const render = () => {
      body.replaceChildren();
      if (!q3Ready(game.state)) {
        if (!q3CompareDone(game.state)) { body.append(el('p', '', '정상 판막 두 곳을 살펴보고 우심방 삼첨판 앞에서 협착·역류를 비교해 주세요.')); return; }
        const material = q3Text.materials.find(m => !game.state.q003.notes.includes(m.id as Q3Evidence))!;
        const heading = el('h3', '', material.title); heading.tabIndex = -1;
        body.append(heading, el('p', '', material.text));
        for (const card of material.cards) { const box = el('section', 'q3-material'); box.append(el('h4', '', card.title), el('p', '', card.text)); body.append(box); }
        sources(body, material.src);
        if (game.state.at.room === 'newsroom') body.append(button('primary', '이 자료를 취재 메모로 남기기', () => attempt(() => { game.recordQ3(material.id as Q3Evidence); render(); const next = body.querySelector<HTMLElement>('h3, fieldset button'); next?.focus({ preventScroll: true }); })));
        else body.append(el('p', 'muted', '내 자리 가까이에서 자료 취재를 이어가 주세요.'));
        return;
      }
      const a = game.state.q003, preview = el('article', 'article-paper'); preview.setAttribute('aria-label', '팩트체크 기사 미리보기');
      const update = () => {
        const a = game.state.q003, lead = q3Text.article.leads.find(x => x.id === a.lead), limit = q3Text.article.limitations.find(x => x.id === a.limit);
        preview.replaceChildren(el('small', 'article-masthead', '메디컬 데스크 · 팩트체크'), el('h3', '', lead?.title ?? q3Text.title), el('p', '', lead?.text ?? '첫 문장을 골라 주세요.'), el('h4', '', '직접 비교한 판막'), el('p', '', q3Text.article.factcheck));
        for (const material of q3Text.materials) preview.append(el('h4', '', material.title.slice(4)), el('p', '', material.text));
        preview.append(el('p', '', limit?.text ?? '기사에서 모형의 한계를 밝혀 주세요.')); sources(preview, q3Text.sources.map(s => s.id));
      };
      if (a.publishedAt) {
        body.append(el('h3', '', '판막 팩트체크 기사를 발행했어요'), el('p', 'article-reply', q3Text.article.reply), preview);
        if (game.state.at.room === 'newsroom') {
          const expected = game.state.reactions.count;
          body.append(button('primary', '다시 발행 · 새 독자 반응', () => attempt(() => { if (game.reprintArticle(expected, 'Q003')) onPublished(); })));
        }
        update(); return;
      }
      const access = q3ArticleAccess(game.state);
      if (access) { body.append(el('p', '', access), preview); update(); return; }
      for (const [slot, title, choices] of [['lead', '첫 문장', q3Text.article.leads], ['limit', '모형의 한계', q3Text.article.limitations]] as const) {
        const field = el('fieldset', 'article-leads'); field.append(el('legend', '', title));
        for (const choice of choices) {
          const b = button('article-lead', choice.label, () => attempt(() => { game.selectQ3(slot, choice.id); render(); [...body.querySelectorAll('button')].find(b => b.textContent === choice.label)?.focus({ preventScroll: true }); }));
          b.setAttribute('aria-pressed', String(a[slot] === choice.id)); field.append(b);
        }
        body.append(field);
      }
      body.append(preview, button('secondary', '편집장에게 초안 보여주기', () => attempt(() => {
        game.checkQ3(); render(); status.textContent = game.state.q003.checked ? '취재 근거와 모형의 한계를 확인했어요. 발행해 주세요.' : '첫 문장과 모형의 한계를 골라 주세요.'; body.querySelector<HTMLElement>(game.state.q003.checked ? 'button.primary' : 'fieldset button')?.focus({ preventScroll: true });
      })));
      const publish = button('primary', '게임 속 신문에 발행', () => attempt(() => { if (game.publishQ3()) onPublished(); })); publish.disabled = !a.checked; body.append(publish); update();
    };
    c.append(button('secondary', '월드로 돌아가기', close)); render();
  }, () => unsubscribe());
}
