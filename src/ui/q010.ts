import type { Game } from '../application/game';
import { coreIds, q10ArticleAccess, q10BoardDone, q10CoreLeft } from '../domain/q010';
import { NEED, q10Claims, q10Text } from '../domain/q010-state';
import { discoveries } from '../domain/heart';
import { roomNames } from '../domain/mastery';
import { button, el } from './dom';
import { openSheet } from './sheet';

/** D108 Q010 desk: the special-issue checklist, the claim and evidence board, the easy special article and graduation. */
export function openQ10(game: Game, onPublished: () => void): void {
  let unsubscribe = () => {};
  openSheet('Q010 취재 · ' + q10Text.title, (c, close) => {
    c.parentElement!.classList.add('article-sheet'); c.classList.add('keep-open');
    const error = el('p', 'save-message'); error.setAttribute('role', 'alert');
    const updateError = () => { error.textContent = game.lastError ?? ''; }; unsubscribe = game.subscribe(updateError); updateError();
    const status = el('p', 'article-status'); status.setAttribute('role', 'status');
    const body = el('div', 'q3-body q5-body q6-body q7-body q8-body q10-body'); c.append(el('p', 'article-question', q10Text.question), el('p', 'muted', q10Text.disclaimer), error, body, status);
    const b = q10Text.board, a = q10Text.article, sp = q10Text.special;
    const sources = (parent: HTMLElement, ids: string[]) => {
      const refs = el('details', 'article-sources'); refs.append(el('summary', '', '근거와 확인 날짜'));
      for (const source of q10Text.sources.filter(s => ids.includes(s.id))) {
        const link = el('a', '', source.title); link.href = source.url; link.target = '_blank'; link.rel = 'noopener'; refs.append(link, el('p', 'muted', source.section + ' · 확인 ' + source.checked));
      }
      parent.append(refs);
    };
    const attempt = (fn: () => void) => { try { fn(); } catch (e) { status.textContent = e instanceof Error ? e.message : '취재를 처리하지 못했어요.'; } };
    const focusFirst = (sel: string) => body.querySelector<HTMLElement>(sel)?.focus({ preventScroll: true });
    const evidenceCard = (id: string) => b.evidence.find(e => e.id === id)!;
    const checklist = () => {
      const q = game.state.q010, left = q10CoreLeft(game.state), box = el('section', 'signal-board special-checklist'); box.setAttribute('aria-label', '졸업 특집호 준비');
      box.append(el('h3', '', '졸업 특집호 준비'));
      const run = el('div', 'signal-stage' + (q.runDone ? ' filled' : '')); run.append(el('h4', '', '1 · ' + sp.runTitle + (q.runDone ? ' · 완주' : '')), el('p', 'muted', sp.runText));
      const core = el('div', 'signal-stage' + (left.length ? '' : ' filled')); core.append(el('h4', '', '2 · ' + sp.coreTitle + ' · ' + (coreIds.length - left.length) + '/' + coreIds.length), el('p', 'muted', sp.coreText));
      if (left.length) { const rooms = [...new Set(left.map(id => roomNames[discoveries[id]!.room]!))]; core.append(el('p', '', '아직 별이 없는 곳 · ' + rooms.join(', '))); }
      box.append(run, core);
      return box;
    };
    const board = (editing: boolean) => {
      const q = game.state.q010, section = el('section', 'signal-board special-board'); section.setAttribute('aria-label', b.title);
      section.append(el('h3', '', '3 · ' + b.title));
      const claim = el('div', 'signal-stage' + (q.claim ? ' filled' : '')); claim.append(el('h4', '', b.claimTitle));
      if (q.claim) claim.append(el('p', 'signal-card', q10Claims.find(x => x.id === q.claim)!.card)); else claim.append(el('p', 'muted', '비어 있는 칸'));
      if (editing && !q.claim) {
        const pool = el('div', 'signal-pool'); pool.setAttribute('aria-label', '답 문장 카드');
        for (const x of q10Claims) pool.append(button('secondary signal-pick q10-claim', x.card, () => attempt(() => { game.claimQ10(x.id); status.textContent = '좋아요. 이 문장을 받칠 내 기록 두 장을 골라 주세요.'; render(); focusFirst('button.q10-evidence'); })));
        claim.append(pool);
      }
      const ev = el('div', 'signal-stage' + (q.evidence.length === NEED ? ' filled' : '')); ev.append(el('h4', '', b.evidenceTitle + ' (' + q.evidence.length + '/' + NEED + ')'));
      if (q.evidence.length) { const list = el('ol', 'signal-stages'); for (const id of q.evidence) { const li = el('li', 'signal-card', evidenceCard(id).card); li.append(el('span', 'muted', ' · ' + evidenceCard(id).quest)); list.append(li); } ev.append(list); }
      else ev.append(el('p', 'muted', q.claim ? '비어 있는 칸' : b.needClaim));
      if (editing && q.claim && q.evidence.length < NEED) {
        const pool = el('div', 'signal-pool'); pool.setAttribute('aria-label', '내 기록 카드');
        for (const e of b.evidence) if (!q.evidence.includes(e.id)) pool.append(button('secondary signal-pick q10-evidence', e.card + ' · ' + e.quest, () => attempt(() => {
          game.evidenceQ10(e.id);
          status.textContent = game.state.q010.evidence.length === NEED ? '근거 두 장이 문장을 받쳐요. 첫 문장과 비유, 그 한계를 골라 주세요.' : '이 문장을 받치는 기록이에요. 한 장 더 골라 주세요.';
          render(); focusFirst('button.q10-evidence, fieldset button');
        })));
        ev.append(pool);
      }
      section.append(claim, ev);
      if (editing && q.claim) section.append(button('secondary', '근거 다시 고르기', () => attempt(() => { game.clearQ10Board(); status.textContent = '문장과 근거를 처음부터 다시 골라요. 특집 준비 기록은 그대로예요.'; render(); focusFirst('button.q10-claim'); })));
      return section;
    };
    const graduation = () => {
      const g = q10Text.graduation, box = el('section', 'signal-board graduation'); box.setAttribute('aria-label', g.title);
      box.append(el('h3', '', g.title), el('p', '', g.rank), el('p', '', g.advanced), el('p', '', g.invite), el('p', 'muted', g.later));
      return box;
    };
    const render = () => {
      body.replaceChildren();
      const q = game.state.q010, access = q10ArticleAccess(game.state), editing = !access && !q.publishedAt;
      if (!q.publishedAt) body.append(checklist());
      if (access && !q.claim && !q.publishedAt) { body.append(el('p', '', access)); return; }
      const preview = el('article', 'article-paper'); preview.setAttribute('aria-label', '졸업 특집 기사 미리보기');
      const lead = a.leads.find(x => x.id === q.lead), analogy = a.analogies.find(x => x.id === q.analogy), limit = a.limitations.find(x => x.id === q.limit);
      const claim = q10Claims.find(x => x.id === q.claim);
      preview.append(el('small', 'article-masthead', '메디컬 데스크 · 심장 졸업 특집호'), el('h3', '', lead?.title ?? q10Text.title), el('p', 'article-byline', game.state.avatar.name + ' 기자'), el('p', '', lead?.text ?? '첫 문장을 골라 주세요.'));
      preview.append(el('h4', '', '독자 질문에 답하는 한 문장'), el('p', '', claim?.card ?? '답 문장을 골라 주세요.'));
      preview.append(el('h4', '', a.seen)); if (q.evidence.length) for (const id of q.evidence) preview.append(el('p', '', evidenceCard(id).card + ' (' + evidenceCard(id).quest + ' 취재)')); else preview.append(el('p', 'muted', '내 기록을 고르면 여기에 들어가요.'));
      preview.append(el('h4', '', a.explained), el('p', '', analogy?.text ?? '비유를 골라 주세요.'));
      preview.append(el('h4', '', '팩트체크'), el('p', '', a.factcheck), el('p', '', limit?.text ?? '비유나 모형의 한계를 밝혀 주세요.')); sources(preview, q10Text.sources.map(s => s.id));
      if (q.publishedAt) {
        body.append(graduation(), el('h3', '', '졸업 특집 기사를 발행했어요'), el('p', 'article-reply', a.reply), board(false));
        if (game.state.at.room === 'newsroom') { const expected = game.state.reactions.count; body.append(button('primary', '다시 발행 · 새 독자 반응', () => attempt(() => { if (game.reprintArticle(expected, 'Q010')) onPublished(); }))); }
        body.append(preview); return;
      }
      if (access) { body.append(el('p', '', access), board(false), preview); return; }
      body.append(board(editing));
      if (q10BoardDone(game.state)) {
        for (const [slot, title, choices] of [['lead', '첫 문장', a.leads], ['analogy', '쉬운 비유', a.analogies], ['limit', '한계 밝히기', a.limitations]] as const) {
          const field = el('fieldset', 'article-leads'); field.append(el('legend', '', title));
          for (const choice of choices) {
            const btn = button('article-lead', choice.label, () => attempt(() => { game.selectQ10(slot, choice.id); render(); [...body.querySelectorAll('button')].find(x => x.textContent === choice.label)?.focus({ preventScroll: true }); }));
            btn.setAttribute('aria-pressed', String(q[slot] === choice.id)); field.append(btn);
          }
          body.append(field);
        }
      }
      body.append(preview, button('secondary', '편집장에게 초안 보여주기', () => attempt(() => {
        game.checkQ10(); render(); status.textContent = game.state.q010.checked ? '근거 있는 답 문장과 비유·한계를 확인했어요. 졸업 특집호를 발행해 주세요.' : '답 문장과 근거 두 장, 첫 문장·비유·한계를 골라 주세요.';
        focusFirst(game.state.q010.checked ? 'button.q10-publish' : 'button.signal-pick, fieldset button');
      })));
      const publish = button('primary q10-publish', '졸업 특집호 발행', () => attempt(() => { if (game.publishQ10()) onPublished(); })); publish.disabled = !q.checked; body.append(publish);
    };
    c.append(button('secondary', '월드로 돌아가기', close)); render();
  }, () => unsubscribe());
}
