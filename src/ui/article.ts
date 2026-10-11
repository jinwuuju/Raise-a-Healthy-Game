import entry from '../../data/content/q001-entry.v0.1.json';
import heart from '../../data/content/heart-interior.v0.1.json';
import type { Game } from '../application/game';
import { articleAccess, articleFeedback } from '../domain/article';
import { articleText, type ArticleSlot } from '../domain/article-state';
import { discovered, discoveries } from '../domain/heart';
import { button, el } from './dom';
import { openSheet } from './sheet';

/** The editor reads state and sends commands through Game; each choice is saved immediately. */
export function openArticle(game: Game, onPublished: () => void): void {
  let unsubscribe = () => {};
  openSheet('첫 기사 · ' + entry.title, (c, close) => {
    const sheet = c.parentElement!; sheet.classList.add('article-sheet'); c.classList.add('keep-open');
    const status = el('p', 'article-status'); status.setAttribute('role', 'status');
    const saveError = el('p', 'save-message'); saveError.setAttribute('role', 'alert');
    const updateSave = () => { saveError.textContent = game.lastError ?? ''; saveError.classList.toggle('hidden', !game.lastError); };
    unsubscribe = game.subscribe(updateSave); updateSave();
    c.append(el('p', 'article-question', '독자 하윤의 질문 · “심장은 피를 보내기만 하나요? 보낸 피는 어디로 가요?”'),
      el('p', 'muted', articleText.disclaimer), saveError);
    const layout = el('div', 'article-layout');
    const editing = el('div', 'article-edit');
    const preview = el('article', 'article-paper'); preview.setAttribute('aria-label', '기사 미리보기');
    layout.append(editing, preview); c.append(layout, status);
    const footer = el('div', 'article-actions keep-open'); sheet.append(footer);
    const renderPreview = () => {
      const a = game.state.article, lead = articleText.leads.find(l => l.id === a.lead);
      preview.replaceChildren(el('small', 'article-masthead', '메디컬 데스크 · ' + (a.publishedAt ? '첫 호' : '초안')),
        el('h3', '', lead?.title ?? '하윤 독자에게 전할 이야기'), el('p', 'article-byline', game.state.avatar.name + ' 기자'));
      preview.append(el('p', '', lead?.text ?? '첫 문장을 고르면 여기에서 기사가 시작돼요.'));
      for (const [slot, label] of [['returning', '돌아오는 피'], ['outgoing', '폐로 향하는 피']] as const) {
        preview.append(el('h4', '', label));
        const note = articleText.evidence.find(e => e.id === a[slot]);
        preview.append(el('p', '', note?.text ?? '내가 얻은 관찰 카드를 붙여 주세요.'));
      }
      preview.append(el('p', '', articleText.ending));
      if (a.extra) {
        const d = discoveries[a.extra]!;
        const aside = el('aside'); aside.append(el('h4', '', '탐험 메모 · ' + d.name), el('p', '', d.text)); preview.append(aside);
      }
      const refs = new Set<string>(articleText.sourceIds);
      for (const id of [a.returning, a.outgoing]) articleText.evidence.find(e => e.id === id)?.src.forEach(id => refs.add(id));
      if (a.extra) discoveries[a.extra]!.src.forEach(id => refs.add(id));
      const sources = el('details', 'article-sources'); sources.append(el('summary', '', '기사의 출처와 한계'));
      for (const id of refs) {
        const source = [...entry.sources, ...heart.sources].find(s => s.id === id);
        if (!source) continue;
        const p = el('p'), a = el('a', '', source.title); a.href = source.url; a.target = '_blank'; a.rel = 'noopener'; p.append(a); sources.append(p);
      }
      for (const limit of articleText.simplification) sources.append(el('p', '', limit));
      sources.append(el('p', '', articleText.disclaimer)); preview.append(sources);
    };
    const showPublished = () => {
      editing.replaceChildren(el('h3', '', '첫 기사를 발행했어요'), el('p', '', '관찰 20XP + 기사 80XP · 총 100XP / 100G'),
        el('p', 'article-reply', articleText.readerReply), el('p', 'muted', '언제든 취재 수첩에서 다시 읽을 수 있어요.'));
      footer.replaceChildren(button('secondary', '월드로 돌아가기', close)); status.textContent = '게임 속 신문에 실렸어요.';
      if (game.state.at.room === 'newsroom') {
        const expectedCount = game.state.reactions.count;
        footer.append(button('primary', '다시 발행 · 새 독자 반응', () => {
          try { if (game.reprintArticle(expectedCount)) onPublished(); }
          catch (e) { status.textContent = e instanceof Error ? e.message : '다시 발행하지 못했어요.'; }
        }));
      }
      renderPreview();
    };
    if (game.state.article.publishedAt) { showPublished(); return; }
    const why = articleAccess(game.state);
    if (why) {
      editing.append(el('h3', '', '취재 초안'), el('p', '', why)); footer.append(button('secondary', '닫기', close)); renderPreview(); return;
    }
    editing.append(el('h3', '', '내 관찰을 기사로'), el('p', 'muted', '첫 문장과 두 관찰을 골라 주세요. 선택할 때마다 초안이 저장돼요. 추가 메모는 넣지 않아도 괜찮아요.'));
    const check = button('secondary', '편집장에게 초안 보여주기', () => {
      try {
        game.checkArticle();
        const feedback = articleFeedback(game.state);
        status.textContent = '편집장 · ' + (feedback.length ? feedback.join(' ') : articleText.feedback.ready);
        publish.disabled = !game.state.article.checked;
        if (game.state.article.checked) publish.focus({ preventScroll: true });
      } catch (e) { status.textContent = e instanceof Error ? e.message : '초안을 확인하지 못했어요.'; }
    });
    const publish = button('primary', '게임 속 신문에 발행', () => {
      try {
        if (game.publishArticle()) { onPublished(); return; }
        showPublished(); footer.querySelector('button')?.focus({ preventScroll: true });
      } catch (e) { status.textContent = e instanceof Error ? e.message : '발행하지 못했어요.'; }
    });
    publish.disabled = !game.state.article.checked;
    const change = (slot: ArticleSlot, id: string | null) => {
      try { game.selectArticle(slot, id); status.textContent = '초안을 수정했어요. 편집장에게 보여 주세요.'; publish.disabled = !game.state.article.checked; renderPreview(); }
      catch (e) { status.textContent = e instanceof Error ? e.message : '초안을 저장하지 못했어요.'; }
    };
    const leads = el('fieldset', 'article-leads'); leads.append(el('legend', '', '1 · 첫 문장'));
    for (const lead of articleText.leads) {
      const b = button('article-lead', lead.label, () => {
        change('lead', lead.id);
        leads.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      });
      b.append(el('span', '', lead.title)); b.setAttribute('aria-pressed', String(game.state.article.lead === lead.id)); leads.append(b);
    }
    editing.append(leads);
    const select = (slot: ArticleSlot, title: string, choices: { id: string; label: string }[], optional = false) => {
      const label = el('label', 'article-field'); label.append(el('span', '', title));
      const input = el('select'); input.setAttribute('aria-label', title);
      input.append(el('option', '', optional ? '추가 메모 없이 발행' : '관찰 카드 선택')); input.options[0]!.value = '';
      for (const choice of choices) { const o = el('option', '', choice.label); o.value = choice.id; input.append(o); }
      input.value = game.state.article[slot] ?? '';
      input.addEventListener('change', () => change(slot, input.value || null)); label.append(input); editing.append(label);
    };
    select('returning', '2 · 돌아오는 피의 근거', articleText.evidence);
    select('outgoing', '3 · 폐로 향하는 피의 근거', articleText.evidence);
    select('extra', '더 발견한 구조 · 선택 메모', discovered(game.state).map(id => ({ id, label: discoveries[id]!.name })), true);
    footer.append(check, publish); renderPreview();
    if (game.state.article.checked) status.textContent = '편집장 · ' + articleText.feedback.ready;
  }, () => unsubscribe());
}
