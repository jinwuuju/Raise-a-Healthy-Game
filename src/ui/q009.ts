import type { Game } from '../application/game';
import { q9ArticleAccess, q9BoardDone, q9Ready } from '../domain/q009';
import { chainOrder, q9Text, slotOrder, type ChainCard, type DecoyCard, type RoomCard } from '../domain/q009-state';
import { button, el } from './dom';
import { openSheet } from './sheet';

/** Pool order for the loop cards: mixed with the decoys so the answer is not the reading order (design 03 Q009: no replay). */
const POOL: (ChainCard | DecoyCard)[] = ['lung', 'cross', 'la', 'ra', 'body', 'skip', 'rv', 'lv'];

/** D108 Q009 desk: read a picture drawn facing the person, join one loop with evidence, then an easy article with an analogy. */
export function openQ9(game: Game, onPublished: () => void): void {
  let unsubscribe = () => {};
  openSheet('Q009 취재 · ' + q9Text.title, (c, close) => {
    c.parentElement!.classList.add('article-sheet'); c.classList.add('keep-open');
    const error = el('p', 'save-message'); error.setAttribute('role', 'alert');
    const updateError = () => { error.textContent = game.lastError ?? ''; }; unsubscribe = game.subscribe(updateError); updateError();
    const status = el('p', 'article-status'); status.setAttribute('role', 'status');
    const body = el('div', 'q3-body q5-body q6-body q7-body q8-body q9-body'); c.append(el('p', 'article-question', q9Text.question), el('p', 'muted', q9Text.disclaimer), error, body, status);
    const b = q9Text.board, a = q9Text.article;
    const sources = (parent: HTMLElement, ids: string[]) => {
      const refs = el('details', 'article-sources'); refs.append(el('summary', '', '근거와 확인 날짜'));
      for (const source of q9Text.sources.filter(s => ids.includes(s.id))) {
        const link = el('a', '', source.title); link.href = source.url; link.target = '_blank'; link.rel = 'noopener'; refs.append(link, el('p', 'muted', source.section + ' · 확인 ' + source.checked));
      }
      parent.append(refs);
    };
    const attempt = (fn: () => void) => { try { fn(); } catch (e) { status.textContent = e instanceof Error ? e.message : '취재를 처리하지 못했어요.'; } };
    const roomName = (id: RoomCard) => b.rooms.find(r => r.id === id)!.name;
    const chainCard = (id: ChainCard) => b.chain.find(x => x.id === id)!;
    const noteName = (id: string) => q9Text.notes.find(n => n.id === id)!.name;
    const focusFirst = (sel: string) => body.querySelector<HTMLElement>(sel)?.focus({ preventScroll: true });
    const board = (editing: boolean) => {
      const q = game.state.q009, section = el('section', 'signal-board supply-board circulation-board'); section.setAttribute('aria-label', b.title);
      section.append(el('h3', '', b.title), el('p', 'muted', b.picture));
      // 1 · the reader's picture, drawn facing the person
      const pic = el('div', 'signal-stage' + (q.slots.length === slotOrder.length ? ' filled' : ''));
      pic.append(el('h4', '', b.slotTitle + ' (' + q.slots.length + '/' + slotOrder.length + ')'));
      const grid = el('div', 'q9-picture'); grid.setAttribute('aria-label', '독자가 보낸 심장 그림');
      grid.style.display = 'grid'; grid.style.gridTemplateColumns = '1fr 1fr'; grid.style.gap = '6px';
      // Grid reading order: top row (left, right), then bottom row (left, right).
      for (const slotId of ['pic-lt', 'pic-rt', 'pic-lb', 'pic-rb']) {
        const i = b.slots.findIndex(x => x.id === slotId), slot = b.slots[i]!, filled = q.slots[i];
        const cell = el('p', 'signal-card' + (filled ? '' : ' muted'), slot.label + ' · ' + (filled ? roomName(filled) : i === q.slots.length && editing ? '다음 칸' : '?'));
        grid.append(cell);
      }
      pic.append(grid, el('p', 'muted', '그림 속 사람은 나를 마주 보고 서 있어요.'));
      if (editing && q.slots.length < slotOrder.length) {
        const next = b.slots[q.slots.length]!;
        pic.append(el('p', '', '다음 칸 · ' + next.label));
        const pool = el('div', 'signal-pool'); pool.setAttribute('aria-label', '방 이름 카드');
        for (const r of b.rooms) if (!q.slots.includes(r.id as RoomCard)) pool.append(button('secondary signal-pick q9-room', r.name, () => attempt(() => {
          game.slotQ9(r.id as RoomCard);
          status.textContent = game.state.q009.slots.length === slotOrder.length ? '그림의 네 칸을 모두 읽었어요. 이제 그림 위에 피가 도는 한 바퀴를 이어요.' : '맞아요. 다음 칸으로 가요.';
          render(); focusFirst('button.q9-room, button.q9-link');
        })));
        pic.append(pool);
      }
      // 2 · one loop on the picture; every link shows the evidence it rests on
      const loop = el('div', 'signal-stage' + (q.chain.length === chainOrder.length ? ' filled' : ''));
      loop.append(el('h4', '', b.chainTitle + ' (' + q.chain.length + '/' + chainOrder.length + ')'));
      if (!q.chain.length) loop.append(el('p', 'muted', q.slots.length === slotOrder.length ? '비어 있는 길' : b.needSlots));
      else { const list = el('ol', 'signal-stages'); for (const id of q.chain) { const li = el('li', 'signal-card', chainCard(id).card); li.append(el('span', 'muted', ' · ' + noteName(chainCard(id).evidence))); list.append(li); } loop.append(list); }
      if (q.chain.length === chainOrder.length) loop.append(el('p', '', b.twice));
      if (editing && q.slots.length === slotOrder.length && q.chain.length < chainOrder.length) {
        const pool = el('div', 'signal-pool'); pool.setAttribute('aria-label', '연결 카드');
        for (const id of POOL) {
          if ((chainOrder as string[]).includes(id) && q.chain.includes(id as ChainCard)) continue;
          const label = b.chain.find(x => x.id === id)?.card ?? b.decoys.find(x => x.id === id)!.card;
          pool.append(button('secondary signal-pick q9-link', label, () => attempt(() => {
            game.chainQ9(id);
            status.textContent = game.state.q009.chain.length === chainOrder.length ? '한 바퀴를 근거와 함께 이었어요. 첫 문장과 비유, 그 한계를 골라 주세요.' : '근거가 있는 연결이에요. 다음 곳을 이어요.';
            render(); focusFirst('button.q9-link, fieldset button');
          })));
        }
        loop.append(pool);
      }
      section.append(pic, loop);
      if (editing && (q.slots.length || q.chain.length)) section.append(button('secondary', '그림 다시 읽기', () => attempt(() => { game.clearQ9Board(); status.textContent = '그림과 길을 처음부터 다시 놓아요. 근거 기록은 그대로예요.'; render(); focusFirst('button.signal-pick'); })));
      return section;
    };
    const render = () => {
      body.replaceChildren();
      if (!q9Ready(game.state)) { body.append(el('p', '', '바디스코프로 심장에 들어가 근거 네 곳(우심방의 가운데 벽, 우심실 출구, 폐의 교환, 좌심실 출구)을 다시 보고 와 주세요.')); return; }
      const q = game.state.q009, access = q9ArticleAccess(game.state), editing = !access && !q.publishedAt;
      const preview = el('article', 'article-paper'); preview.setAttribute('aria-label', '순환 설명 기사 미리보기');
      const lead = a.leads.find(x => x.id === q.lead), analogy = a.analogies.find(x => x.id === q.analogy), limit = a.limitations.find(x => x.id === q.limit);
      preview.append(el('small', 'article-masthead', '메디컬 데스크 · 쉬운 설명 · 팩트체크'), el('h3', '', lead?.title ?? q9Text.title), el('p', 'article-byline', game.state.avatar.name + ' 기자'), el('p', '', lead?.text ?? '첫 문장을 골라 주세요.'));
      preview.append(el('h4', '', a.seen)); for (const n of q9Text.notes) preview.append(el('p', '', n.text));
      preview.append(el('h4', '', a.explained), el('p', '', analogy?.text ?? '비유를 골라 주세요.'),
        el('p', '', q.chain.length === chainOrder.length ? q.chain.map(id => chainCard(id).card.split(' · ')[0]).join(' → ') + ' → 다시 우심방' : '한 바퀴를 이으면 길이 기사에 들어가요.'), el('p', '', b.twice));
      preview.append(el('h4', '', '팩트체크'), el('p', '', a.factcheck), el('p', '', limit?.text ?? '비유나 모형의 한계를 밝혀 주세요.')); sources(preview, q9Text.sources.map(s => s.id));
      if (q.publishedAt) {
        body.append(el('h3', '', '순환 설명 기사를 발행했어요'), el('p', 'article-reply', a.reply), board(false));
        if (game.state.at.room === 'newsroom') { const expected = game.state.reactions.count; body.append(button('primary', '다시 발행 · 새 독자 반응', () => attempt(() => { if (game.reprintArticle(expected, 'Q009')) onPublished(); }))); }
        body.append(preview); return;
      }
      if (access) { body.append(el('p', '', access), board(false), preview); return; }
      body.append(board(editing));
      if (q9BoardDone(game.state)) {
        for (const [slot, title, choices] of [['lead', '첫 문장', a.leads], ['analogy', '쉬운 비유', a.analogies], ['limit', '한계 밝히기', a.limitations]] as const) {
          const field = el('fieldset', 'article-leads'); field.append(el('legend', '', title));
          for (const choice of choices) {
            const btn = button('article-lead', choice.label, () => attempt(() => { game.selectQ9(slot, choice.id); render(); [...body.querySelectorAll('button')].find(x => x.textContent === choice.label)?.focus({ preventScroll: true }); }));
            btn.setAttribute('aria-pressed', String(q[slot] === choice.id)); field.append(btn);
          }
          body.append(field);
        }
      }
      body.append(preview, button('secondary', '편집장에게 초안 보여주기', () => attempt(() => {
        game.checkQ9(); render(); status.textContent = game.state.q009.checked ? '그림 읽기, 근거 있는 한 바퀴, 비유와 그 한계를 확인했어요. 발행해 주세요.' : '그림의 네 칸과 한 바퀴를 잇고 첫 문장·비유·한계를 골라 주세요.';
        focusFirst(game.state.q009.checked ? 'button.q9-publish' : 'button.signal-pick, fieldset button');
      })));
      const publish = button('primary q9-publish', '게임 속 신문에 발행', () => attempt(() => { if (game.publishQ9()) onPublished(); })); publish.disabled = !q.checked; body.append(publish);
    };
    c.append(button('secondary', '월드로 돌아가기', close)); render();
  }, () => unsubscribe());
}
