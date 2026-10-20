import type { Game } from '../application/game';
import { q8ArticleAccess, q8BoardDone, q8CompareDone, q8Ready } from '../domain/q008';
import { q8Text, recordPicks, type Q8Evidence, type RecordCard, type VerdictCard } from '../domain/q008-state';
import { button, el } from './dom';
import { openSheet } from './sheet';

/** Qualitative bar for a record card (no numbers in the basic course). */
const bar = (level: number) => '▮'.repeat(level) + '▯'.repeat(Math.max(0, 5 - level));
const word = (level: number) => (level >= 4 ? '큼' : '보통');

/** D108 Q008 desk: source-based materials, the blood-pressure record board (same-condition records + verdict) and the easy article. */
export function openQ8(game: Game, onPublished: () => void): void {
  let unsubscribe = () => {};
  openSheet('Q008 취재 · ' + q8Text.title, (c, close) => {
    c.parentElement!.classList.add('article-sheet'); c.classList.add('keep-open');
    const error = el('p', 'save-message'); error.setAttribute('role', 'alert');
    const updateError = () => { error.textContent = game.lastError ?? ''; }; unsubscribe = game.subscribe(updateError); updateError();
    const status = el('p', 'article-status'); status.setAttribute('role', 'status');
    const body = el('div', 'q3-body q5-body q6-body q7-body q8-body'); c.append(el('p', 'article-question', q8Text.question), el('p', 'muted', q8Text.disclaimer), error, body, status);
    const sources = (parent: HTMLElement, ids: string[]) => {
      const refs = el('details', 'article-sources'); refs.append(el('summary', '', '근거와 확인 날짜'));
      for (const source of q8Text.sources.filter(s => ids.includes(s.id))) {
        const a = el('a', '', source.title); a.href = source.url; a.target = '_blank'; a.rel = 'noopener'; refs.append(a, el('p', 'muted', source.section + ' · 확인 ' + source.checked));
      }
      parent.append(refs);
    };
    const attempt = (fn: () => void) => { try { fn(); } catch (e) { status.textContent = e instanceof Error ? e.message : '취재를 처리하지 못했어요.'; } };
    const record = (id: RecordCard) => q8Text.board.records.find(x => x.id === id)!;
    const recordLine = (id: RecordCard) => { const r = record(id); return r.card + ' · 벽을 미는 힘 ' + word(r.level); };
    const verdict = (id: VerdictCard) => q8Text.board.verdicts.find(x => x.id === id)!.card;
    const board = (editing: boolean) => {
      const q = game.state.q008, b = q8Text.board, section = el('section', 'signal-board supply-board pressure-board'); section.setAttribute('aria-label', b.title);
      section.append(el('h3', '', b.title), el('p', 'muted', b.person));
      // 1 · records taken under the same resting condition
      const picks = el('div', 'signal-stage' + (q.picks.length === recordPicks.length ? ' filled' : '')); picks.append(el('h4', '', b.pickTitle + ' (' + q.picks.length + '/' + recordPicks.length + ')'));
      const list = el('ol', 'signal-stages'); for (const id of q.picks) { const li = el('li', 'signal-card', recordLine(id)); li.append(el('span', 'muted', ' ' + bar(record(id).level))); list.append(li); }
      if (!q.picks.length) picks.append(el('p', 'muted', '비어 있는 칸')); else picks.append(list);
      if (editing && q.picks.length < recordPicks.length) {
        const pool = el('div', 'signal-pool'); pool.setAttribute('aria-label', '혈압 기록 카드');
        for (const r of b.records) if (!q.picks.includes(r.id as RecordCard)) {
          const btn = button('secondary signal-pick pressure-record', r.card, () => attempt(() => {
            game.pickQ8(r.id as RecordCard);
            status.textContent = game.state.q008.picks.length === recordPicks.length ? '같은 조건에서 잰 기록 세 장을 모았어요. 이제 기사에 쓸 판단을 골라요.' : '같은 조건의 기록이에요. 더 골라 주세요.';
            render(); body.querySelector<HTMLElement>('button.pressure-record, button.pressure-verdict')?.focus({ preventScroll: true });
          }));
          btn.setAttribute('aria-label', r.card + ' · 벽을 미는 힘 ' + word(r.level)); btn.append(el('span', 'muted', ' ' + bar(r.level)));
          pool.append(btn);
        }
        picks.append(pool);
      }
      // 2 · observation, not diagnosis
      const judge = el('div', 'signal-stage' + (q.verdict ? ' filled' : '')); judge.append(el('h4', '', b.verdictTitle));
      if (q.verdict) judge.append(el('p', 'signal-card', verdict(q.verdict))); else judge.append(el('p', 'muted', '비어 있는 칸'));
      if (editing && !q.verdict) {
        const pool = el('div', 'signal-pool'); pool.setAttribute('aria-label', '판단 카드');
        for (const v of b.verdicts) pool.append(button('secondary signal-pick pressure-verdict', v.card, () => attempt(() => { game.verdictQ8(v.id as VerdictCard); status.textContent = '관찰과 판단을 구분했어요. 첫 문장과 한계를 골라 주세요.'; render(); body.querySelector<HTMLElement>('fieldset button')?.focus({ preventScroll: true }); })));
        judge.append(pool);
      }
      section.append(picks, judge);
      if (editing && (q.picks.length || q.verdict)) section.append(button('secondary', '도해 다시 놓기', () => attempt(() => { game.clearQ8Board(); status.textContent = '카드를 처음부터 다시 골라요. 취재 기록은 그대로예요.'; render(); body.querySelector<HTMLElement>('button.signal-pick')?.focus({ preventScroll: true }); })));
      return section;
    };
    const render = () => {
      body.replaceChildren();
      if (!q8Ready(game.state)) {
        if (!q8CompareDone(game.state)) { body.append(el('p', '', '왼심실과 대동맥에서 심장이 짤 때와 쉴 때를 보고, 오름대동맥 앞 혈압 관찰기에서 막 움직인 뒤와 쉬어도 계속 높음을 차례로 비교해 주세요.')); return; }
        const material = q8Text.materials.find(m => !game.state.q008.notes.includes(m.id as Q8Evidence))!;
        const heading = el('h3', '', material.title); heading.tabIndex = -1;
        body.append(heading, el('p', '', material.text));
        for (const card of material.cards) { const box = el('section', 'q3-material'); box.append(el('h4', '', card.title), el('p', '', card.text)); body.append(box); }
        sources(body, material.src);
        if (game.state.at.room === 'newsroom') body.append(button('primary', '이 자료를 취재 메모로 남기기', () => attempt(() => { game.recordQ8(material.id as Q8Evidence); render(); body.querySelector<HTMLElement>('h3, button.signal-pick')?.focus({ preventScroll: true }); })));
        else body.append(el('p', 'muted', '내 자리 가까이에서 자료 취재를 이어가 주세요.'));
        return;
      }
      const q = game.state.q008, access = q8ArticleAccess(game.state), editing = !access && !q.publishedAt;
      const preview = el('article', 'article-paper'); preview.setAttribute('aria-label', '혈압 기록 기사 미리보기');
      const lead = q8Text.article.leads.find(x => x.id === q.lead), limit = q8Text.article.limitations.find(x => x.id === q.limit);
      preview.append(el('small', 'article-masthead', '메디컬 데스크 · 쉬운 설명 · 팩트체크'), el('h3', '', lead?.title ?? q8Text.title), el('p', 'article-byline', game.state.avatar.name + ' 기자'), el('p', '', lead?.text ?? '첫 문장을 골라 주세요.'));
      preview.append(el('h4', '', '같은 조건의 기록끼리'), el('p', '', q.picks.length === recordPicks.length ? q.picks.map(id => record(id).card).join(' / ') : '기록 카드를 고르면 도해가 기사에 들어가요.'),
        el('p', '', q.verdict ? verdict(q.verdict) : '기사에 쓸 판단을 골라 주세요.'), el('p', 'muted', q8Text.singleVariable));
      preview.append(el('h4', '', '팩트체크'), el('p', '', q8Text.article.factcheck));
      for (const material of q8Text.materials) preview.append(el('h4', '', material.title.slice(4)), el('p', '', material.text));
      preview.append(el('p', '', limit?.text ?? '기사에서 모형의 한계를 밝혀 주세요.')); sources(preview, q8Text.sources.map(s => s.id));
      if (q.publishedAt) {
        body.append(el('h3', '', '혈압 기록 기사를 발행했어요'), el('p', 'article-reply', q8Text.article.reply), board(false));
        if (game.state.at.room === 'newsroom') { const expected = game.state.reactions.count; body.append(button('primary', '다시 발행 · 새 독자 반응', () => attempt(() => { if (game.reprintArticle(expected, 'Q008')) onPublished(); }))); }
        body.append(preview); return;
      }
      if (access) { body.append(el('p', '', access), board(false), preview); return; }
      body.append(board(editing));
      if (q8BoardDone(game.state)) {
        for (const [slot, title, choices] of [['lead', '첫 문장', q8Text.article.leads], ['limit', '모형의 한계', q8Text.article.limitations]] as const) {
          const field = el('fieldset', 'article-leads'); field.append(el('legend', '', title));
          for (const choice of choices) {
            const b = button('article-lead', choice.label, () => attempt(() => { game.selectQ8(slot, choice.id); render(); [...body.querySelectorAll('button')].find(b => b.textContent === choice.label)?.focus({ preventScroll: true }); }));
            b.setAttribute('aria-pressed', String(q[slot] === choice.id)); field.append(b);
          }
          body.append(field);
        }
      }
      body.append(preview, button('secondary', '편집장에게 초안 보여주기', () => attempt(() => {
        game.checkQ8(); render(); status.textContent = game.state.q008.checked ? '같은 조건의 기록과 관찰·판단 구분, 모형의 한계를 확인했어요. 발행해 주세요.' : '기록 세 장과 판단을 고르고 첫 문장과 모형의 한계를 골라 주세요.';
        body.querySelector<HTMLElement>(game.state.q008.checked ? 'button.q8-publish' : 'button.signal-pick, fieldset button')?.focus({ preventScroll: true });
      })));
      const publish = button('primary q8-publish', '게임 속 신문에 발행', () => attempt(() => { if (game.publishQ8()) onPublished(); })); publish.disabled = !q.checked; body.append(publish);
    };
    c.append(button('secondary', '월드로 돌아가기', close)); render();
  }, () => unsubscribe());
}
