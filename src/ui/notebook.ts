import type { Game } from '../application/game';
import { notebookRecords } from '../application/notebook';
import { heartText, inspectLabels, lookText, objective, q1Text } from '../application/story';
import { discoveries, discoveryIds, roomProgress } from '../domain/heart';
import { Q1, Q1_OBSERVATIONS, q1Seen } from '../domain/quest';
import { latestReaction, type Reaction } from '../domain/reaction-state';
import { heartRoute } from '../world/heart-rooms';
import { rooms } from '../world/rooms';
import { isHeartRoom, type RoomId } from '../world/types';
import { button, el } from './dom';
import { openSheet } from './sheet';

const tabs = ['지금 할 일', '취재 파일', '발행 기사', '인체 탐험', '동네·생활'] as const;
let selectedTab = 0;
const expanded = new Map<string, boolean>();
type Actions = { article: () => void; reaction: (r: Reaction) => void; map: () => void };

export function openNotebook(game: Game, room: RoomId, actions: Actions): void {
  openSheet('취재 수첩', (c, close) => {
    const s = game.state, records = notebookRecords(s); c.classList.add('keep-open');
    const sheet = c.parentElement!; sheet.classList.add('notebook-sheet');
    const nav = el('nav', 'notebook-tabs'); nav.setAttribute('role', 'tablist'); nav.setAttribute('aria-label', '수첩 분류'); sheet.insertBefore(nav, c);
    const panels = tabs.map((title, i) => {
      const panel = el('section', 'notebook-panel'); panel.id = 'notebook-panel-' + i; panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', 'notebook-tab-' + i); panel.tabIndex = 0; c.append(panel); return panel;
    });
    const choose = (i: number) => {
      selectedTab = i;
      panels.forEach((p, n) => { p.hidden = n !== i; });
      [...nav.children].forEach((node, n) => { const b = node as HTMLButtonElement; b.setAttribute('aria-selected', String(n === i)); b.tabIndex = n === i ? 0 : -1; });
      c.scrollTop = 0;
    };
    tabs.forEach((title, i) => {
      const b = button('', title, () => choose(i)); b.id = 'notebook-tab-' + i; b.setAttribute('role', 'tab'); b.setAttribute('aria-controls', panels[i]!.id);
      b.addEventListener('keydown', e => {
        const next = e.key === 'ArrowRight' ? (i + 1) % tabs.length : e.key === 'ArrowLeft' ? (i + tabs.length - 1) % tabs.length : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : null;
        if (next === null) return; e.preventDefault(); e.stopPropagation(); choose(next); (nav.children[next] as HTMLElement).focus();
      }); nav.append(b);
    });
    const fold = (parent: HTMLElement, key: string, title: string, build: (body: HTMLElement) => void, initial = false) => {
      const details = el('details', 'notebook-fold'); details.dataset.group = key; details.open = expanded.get(key) ?? initial;
      const summary = el('summary', '', title), body = el('div', 'notebook-fold-body'); build(body); details.append(summary, body);
      details.addEventListener('toggle', () => expanded.set(key, details.open)); parent.append(details); return details;
    };
    const action = (label: string, fn: () => void) => button('row notebook-link', label, () => { close(); fn(); });
    const sources = (parent: HTMLElement, ids: string[], bank = heartText.sources) => {
      const list = el('div', 'notebook-sources');
      for (const id of ids) { const source = bank.find(s => s.id === id); if (!source) continue; const a = el('a', '', source.title); a.href = source.url; a.target = '_blank'; a.rel = 'noopener'; list.append(a); }
      parent.append(list);
    };
    // Overview contains pointers, not copies of observation text or article bodies.
    const current = panels[0]!;
    current.append(el('h3', '', '지금 할 일'), el('p', 'notebook-goal', objective(s, room)));
    const overview = el('div', 'notebook-overview');
    overview.append(el('span', '', '취재 근거 ' + records.evidence.length + '/2'), el('span', '', '탐험 구조 ' + Object.values(records.anatomy).flat().length + '/' + discoveryIds.length), el('span', '', '발행 기사 ' + (s.article.publishedAt ? '1편' : '0편')));
    current.append(overview);
    if (s.flags.includes(Q1.briefed)) current.append(action(s.article.publishedAt ? '첫 기사와 독자 답장 읽기' : '첫 기사 쓰기 · 초안 이어서', actions.article));
    else current.append(button('row notebook-link', '취재 파일 확인하기', () => choose(1)));
    const latest = latestReaction(s);
    if (latest) current.append(action('최근 독자 반응 · ' + latest.score + '점', () => actions.reaction(latest)));
    if (room === 'street' || isHeartRoom(room)) current.append(action('현재 장소 지도 보기', actions.map));
    current.append(el('p', 'muted', '분류를 골라 기록을 읽어요. 같은 기록은 한 곳에만 보관하고, 여기서는 필요한 곳으로 바로 이어집니다.'));

    const file = panels[1]!; file.append(el('h3', '', '취재 파일'));
    if (!s.flags.includes(Q1.accepted)) file.append(el('p', 'muted', '아직 맡은 취재가 없어요. 편집장에게 첫 의뢰를 받아 주세요.'));
    else fold(file, 'q001', 'Q001 · ' + q1Text.title + (s.article.publishedAt ? ' · 발행 완료' : ' · 취재 중'), body => {
      body.append(el('p', 'notebook-question', q1Text.offer[1]!.text));
      const checkpoints = el('ol', 'notebook-checkpoints');
      for (const [label, done] of [['의뢰 수락', true], ['필수 관찰 2곳', s.flags.includes(Q1.observed)], ['편집장 보고', s.flags.includes(Q1.briefed)], ['기사 발행', !!s.article.publishedAt]] as const)
        checkpoints.append(el('li', done ? 'done' : '', (done ? '✓ ' : '○ ') + label));
      body.append(checkpoints);
      const seen = q1Seen(s);
      for (const id of Q1_OBSERVATIONS) {
        if (!seen.includes(id)) { body.append(el('p', 'muted', (id === 'heart-in' ? '우심방의 하대정맥 입구' : '우심실의 폐동맥판') + ' · 아직 관찰하지 않았어요')); continue; }
        fold(body, id, q1Text.observations[id].note, detail => {
          detail.append(el('p', '', q1Text.observations[id].text)); sources(detail, id === 'heart-in' ? ['nhlbi-flow'] : ['nhlbi-flow', 'openstax-cycle'], q1Text.sources);
        });
      }
      if (s.flags.includes(Q1.briefed)) body.append(action(s.article.publishedAt ? '발행 기사 보기' : '첫 기사 쓰기 · 초안 이어서', actions.article));
      body.append(el('p', 'muted', q1Text.disclaimer));
    }, true);

    const archive = panels[2]!; archive.append(el('h3', '', '발행 기사와 독자 반응'));
    if (!s.article.publishedAt) archive.append(el('p', 'muted', '첫 기사를 발행하면 기사와 발행별 독자 반응이 이곳에 보관돼요.'));
    else {
      archive.append(el('p', '', 'Q001 · ' + q1Text.title), action('첫 기사와 독자 답장 읽기', actions.article));
      archive.append(el('p', 'muted', '독자 반응은 당시 기록이에요. 다시 보기로 새 점수나 보상이 생기지 않아요.'));
      if (!latest) archive.append(el('p', 'muted', '이전 발행 · 독자 반응 점수 기록 없음. 기사와 기존 진척은 보존했어요.'));
      const renderResult = (parent: HTMLElement, r: Reaction) => parent.append(action(`${r.round}번째 발행 · ${r.score}점 · 응원금 ${r.bonusGold}G`, () => actions.reaction(r)));
      if (latest) renderResult(archive, latest);
      const earlier = s.reactions.results.slice(0, -1).reverse();
      if (earlier.length) fold(archive, 'earlier-reactions', '지난 발행 반응 · ' + earlier.length + '건', body => earlier.forEach(r => renderResult(body, r)));
      if (s.reactions.count > s.reactions.results.length) archive.append(el('p', 'muted', `반응 상세는 최근 ${s.reactions.results.length}회 보관 · 누적 ${s.reactions.count}회 발행`));
    }

    const atlas = panels[3]!; atlas.append(el('h3', '', '인체 탐험'));
    if (!s.flags.includes(Q1.entered) && !Object.keys(records.anatomy).length) atlas.append(el('p', 'muted', '바디스코프로 들어가 발견한 구조를 여기에 기록해요.'));
    else {
      fold(atlas, 'organ-heart', '심장 탐사 · ' + Object.values(records.anatomy).flat().length + '/' + discoveryIds.length, heart => {
        heart.append(el('p', 'muted', '필수 취재 관찰 A/B는 취재 파일에 있어요. 여기에는 별도로 발견한 구조만 모아요.'));
        for (const roomId of heartRoute) {
          const pr = roomProgress(s, roomId), title = rooms[roomId].title.split(' · ').pop()!;
          fold(heart, 'room-' + roomId, title + ' · ' + pr.found + '/' + pr.total, body => {
            for (const key of records.anatomy[roomId] ?? []) {
              const id = key.slice(3), d = discoveries[id]!;
              fold(body, id, d.name, detail => { detail.append(el('p', '', d.text)); sources(detail, d.src); });
            }
            if (pr.total > pr.found) body.append(el('p', 'muted', '미발견 구조 ' + (pr.total - pr.found) + '곳 · 방을 걸으며 이름표를 찾아보세요.'));
          });
        }
      }, true);
      atlas.append(el('p', 'muted', heartText.disclaimer));
    }

    const life = panels[4]!; life.append(el('h3', '', '동네·생활 기록'));
    const placeNames = { office: '편집국', neighborhood: '동네와 로비', cafe: '비투비씨 카페' };
    for (const [id, label] of Object.entries(placeNames) as [keyof typeof placeNames, string][]) fold(life, 'place-' + id, label + ' · 장소 기록 ' + records.local[id].length + '건', body => {
      if (id === 'cafe') body.append(el('p', '', '첫 방문 커피 ' + (s.cafe.welcomeUsed ? '받음' : '아직') + ' · 주문 ' + s.cafe.orderCount + '회 · 창가 쉬기 ' + (s.cafe.restedAt ? '기록 있음' : '아직')));
      for (const key of records.local[id]) fold(body, 'place-note-' + key, inspectLabels[key] ?? '장소 기록', detail => detail.append(el('p', '', lookText[key] ?? '살펴본 장소입니다.')));
      if (!records.local[id].length) body.append(el('p', 'muted', '아직 살펴본 장소 기록이 없어요.'));
    });
    if (records.legacy.length) fold(life, 'legacy-notes', '이전 버전·기타 보존 기록 ' + records.legacy.length + '건', body => body.append(el('p', 'muted', '이 버전에서 상세 내용을 찾지 못한 기록도 저장 파일에는 그대로 보존돼요.')));
    choose(selectedTab);
  });
}
