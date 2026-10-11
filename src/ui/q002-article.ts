import type { Game } from '../application/game';
import { q2Access, q2Feedback } from '../domain/q002';
import { q2Text, type ChamberId } from '../domain/q002-state';
import { button, el } from './dom';
import { openSheet } from './sheet';

export function openQ2Article(game: Game, onPublished: () => void): void {
  let unsubscribe = () => {};
  openSheet('Q002 기사 · ' + q2Text.title, (c, close) => {
    const sheet = c.parentElement!; sheet.classList.add('article-sheet'); c.classList.add('keep-open');
    const status = el('p', 'article-status'); status.setAttribute('role', 'status');
    const error = el('p', 'save-message'); error.setAttribute('role', 'alert');
    const updateError = () => { error.textContent = game.lastError ?? ''; error.classList.toggle('hidden', !game.lastError); };
    unsubscribe = game.subscribe(updateError); updateError();
    c.append(el('p', 'article-question', q2Text.question), el('p', 'muted', q2Text.disclaimer), error);
    const layout = el('div', 'article-layout'), edit = el('div', 'article-edit'), preview = el('article', 'article-paper');
    preview.setAttribute('aria-label', '도해 기사 미리보기'); layout.append(edit, preview); c.append(layout, status);
    const footer = el('div', 'article-actions keep-open'); sheet.append(footer);
    const render = () => {
      const a = game.state.q002, lead = q2Text.leads.find(l => l.id === a.lead);
      preview.replaceChildren(el('small', 'article-masthead', '메디컬 데스크 · ' + (a.publishedAt ? '도해 기사' : '초안')), el('h3', '', lead?.title ?? q2Text.title), el('p', 'article-byline', game.state.avatar.name + ' 기자'), el('p', '', lead?.text ?? '첫 문장을 골라 주세요.'));
      for (const note of q2Text.notes) {
        const card = q2Text.notes.find(n => n.id === a.cards[note.id as ChamberId]);
        preview.append(el('h4', '', note.name), el('p', 'q2-route', card?.route ?? '취재한 주소 카드를 붙여 주세요.'), el('p', '', card?.text ?? ''));
      }
      preview.append(el('p', '', q2Text.ending));
      const refs = el('details', 'article-sources'); refs.append(el('summary', '', '기사의 출처와 단순화 한계'));
      for (const src of q2Text.sources) { const link = el('a', '', src.title); link.href = src.url; link.target = '_blank'; link.rel = 'noopener'; const p = el('p'); p.append(link); refs.append(p); }
      q2Text.simplification.forEach(limit => refs.append(el('p', '', limit))); preview.append(refs);
    };
    const attempt = (command: () => void) => { try { command(); } catch (e) { status.textContent = e instanceof Error ? e.message : '기사를 처리하지 못했어요.'; } };
    if (game.state.q002.publishedAt) {
      edit.append(el('h3', '', '네 방의 도해 기사를 발행했어요'), el('p', 'article-reply', q2Text.reply));
      footer.append(button('secondary', '월드로 돌아가기', close));
      if (game.state.at.room === 'newsroom') {
        const expected = game.state.reactions.count;
        footer.append(button('primary', '다시 발행 · 새 독자 반응', () => attempt(() => { if (game.reprintArticle(expected, 'Q002')) onPublished(); })));
      }
      render(); return;
    }
    const why = q2Access(game.state);
    if (why) { edit.append(el('p', '', why)); footer.append(button('secondary', '닫기', close)); render(); return; }
    edit.append(el('h3', '', '주소 카드로 만드는 도해 기사'), el('p', 'muted', '직접 취재한 네 방의 카드를 기사에 붙여요. 고른 문장과 카드는 자동 저장됩니다.'));
    const check = button('secondary', '편집장에게 초안 보여주기', () => attempt(() => {
      game.checkQ2(); status.textContent = '편집장 · ' + (q2Feedback(game.state).join(' ') || '네 방과 출입구가 연결됐어요. 발행해 주세요.');
      publish.disabled = !game.state.q002.checked; if (!publish.disabled) publish.focus({ preventScroll: true });
    }));
    const publish = button('primary', '게임 속 신문에 발행', () => attempt(() => { if (game.publishQ2()) onPublished(); })); publish.disabled = !game.state.q002.checked;
    const change = (slot: ChamberId | 'lead', id: string | null) => attempt(() => {
      game.selectQ2(slot, id); status.textContent = '초안을 수정했어요. 편집장에게 출입구를 확인받아 주세요.'; publish.disabled = !game.state.q002.checked; render();
    });
    const leads = el('fieldset', 'article-leads'); leads.append(el('legend', '', '1 · 첫 문장'));
    for (const lead of q2Text.leads) {
      const b = button('article-lead', lead.label, () => { change('lead', lead.id); leads.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); });
      b.setAttribute('aria-pressed', String(game.state.q002.lead === lead.id)); leads.append(b);
    }
    edit.append(leads);
    for (const note of q2Text.notes) {
      const label = el('label', 'article-field'), input = el('select'); label.append(el('span', '', note.name + '의 주소 카드')); input.setAttribute('aria-label', note.name + '의 주소 카드');
      const blank = el('option', '', '관찰 카드 선택'); blank.value = ''; input.append(blank);
      for (const card of q2Text.notes) { const opt = el('option', '', card.name + ' · ' + card.route); opt.value = card.id; input.append(opt); }
      input.value = game.state.q002.cards[note.id as ChamberId] ?? '';
      input.addEventListener('change', () => change(note.id as ChamberId, input.value || null)); label.append(input); edit.append(label);
    }
    footer.append(check, publish); render();
  }, () => unsubscribe());
}
