import type { Game } from '../application/game';
import { outfits } from '../domain/appearance';
import { jinuItems, tailorItems } from '../domain/shop';
import { notebookRecords } from '../application/notebook';
import { heartText, inspectLabels, lookText, objective, q1Text } from '../application/story';
import { discoveries, discoveryIds, roomProgress } from '../domain/heart';
import { hints, maxStars, nextLocked, roomStars, starsOf, totalStars } from '../domain/mastery';
import { sightings } from '../domain/heart-run';
import { Q1, Q1_OBSERVATIONS, q1Seen } from '../domain/quest';
import { q2Text } from '../domain/q002-state';
import { q3Text } from '../domain/q003-state';
import { q3Ready } from '../domain/q003';
import { q4Text } from '../domain/q004-state';
import { q5Normal, q5Text, type Q5Evidence } from '../domain/q005-state';
import { q5Ready } from '../domain/q005';
import { q6Normal, q6Text, type Q6Evidence } from '../domain/q006-state';
import { q6Ready } from '../domain/q006';
import { q7Normal, q7Text, type Q7Evidence } from '../domain/q007-state';
import { q7Ready } from '../domain/q007';
import { q8Normal, q8Text, type Q8Evidence } from '../domain/q008-state';
import { q8Ready } from '../domain/q008';
import { latestReaction, type Reaction } from '../domain/reaction-state';
import { CRAVE_NAMES, lunchDate, lunchHudText } from '../domain/lunch';
import { heartRoute } from '../world/heart-rooms';
import { rooms } from '../world/rooms';
import { isHeartRoom, type RoomId } from '../world/types';
import { button, el } from './dom';
import { openSheet } from './sheet';

const tabs = ['지금 할 일', '취재 파일', '발행 기사', '인체 탐험', '동네·생활'] as const;
let selectedTab = 0;
const expanded = new Map<string, boolean>();
type Actions = { article: () => void; q002: () => void; q003: () => void; q004: () => void; q005: () => void; q006: () => void; q007: () => void; q008: () => void; reaction: (r: Reaction) => void; map: () => void; lunch: (date?: string) => void; lunchDex: (target: HTMLElement) => void };

export function openNotebook(game: Game, room: RoomId, actions: Actions, tab?: number): void {
  if (tab !== undefined && tab >= 0 && tab < tabs.length) selectedTab = tab;
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
    overview.append(el('span', '', '취재 근거 ' + records.evidence.length + '/2' + (s.q002.accepted ? ' · Q002 ' + records.q2Evidence.length + '/4' : '') + (s.q004.accepted ? ' · Q004 '+s.q004.notes.length+'/6' : '') + (s.q005.accepted ? ' · Q005 ' + q5Normal.filter(id => s.q005.notes.includes(id)).length + '/5' : '') + (s.q006.accepted ? ' · Q006 ' + q6Normal.filter(id => s.q006.notes.includes(id)).length + '/5' : '') + (s.q007.accepted ? ' · Q007 ' + q7Normal.filter(id => s.q007.notes.includes(id)).length + '/2' : '') + (s.q008.accepted ? ' · Q008 ' + q8Normal.filter(id => s.q008.notes.includes(id)).length + '/2' : '')), el('span', '', '탐험 구조 ' + Object.values(records.anatomy).flat().length + '/' + discoveryIds.length), el('span', '', '발행 기사 ' + (Number(!!s.article.publishedAt) + Number(!!s.q002.publishedAt) + Number(!!s.q003.publishedAt) + Number(!!s.q004.publishedAt) + Number(!!s.q005.publishedAt) + Number(!!s.q006.publishedAt) + Number(!!s.q007.publishedAt) + Number(!!s.q008.publishedAt)) + '편'));
    current.append(overview);
    if (s.flags.includes(Q1.briefed)) current.append(action(s.article.publishedAt ? '첫 기사와 독자 답장 읽기' : '첫 기사 쓰기 · 초안 이어서', actions.article));
    else current.append(button('row notebook-link', '취재 파일 확인하기', () => choose(1)));
    if (s.q002.reported) current.append(action(s.q002.publishedAt ? '네 방의 도해 기사 읽기' : '네 방의 도해 기사 쓰기 · 초안 이어서', actions.q002));
    if (s.q003.accepted) current.append(action(s.q003.publishedAt ? '판막 팩트체크 기사 읽기' : '판막 취재 자료와 기사 이어서', actions.q003));
    if(s.q004.accepted)current.append(action(s.q004.publishedAt?'두 순환 노선 기사 읽기':'두 순환 노선 기사 이어서',actions.q004));
    if (s.q005.accepted) current.append(action(s.q005.publishedAt ? '박동 신호 기사 읽기' : '박동 신호 자료와 기사 이어서', actions.q005));
    if (s.q006.accepted) current.append(action(s.q006.publishedAt ? '심장 근육 공급 기사 읽기' : '심장 근육 공급 자료와 기사 이어서', actions.q006));
    if (s.q008.accepted) current.append(action(s.q008.publishedAt ? '혈압 기록 기사 읽기' : '혈압 기록 자료와 기사 이어서', actions.q008));
    if (s.q007.accepted) current.append(action(s.q007.publishedAt ? '통로 비교 기사 읽기' : '통로 비교 자료와 기사 이어서', actions.q007));
    const latest = latestReaction(s);
    if (latest) current.append(action('최근 독자 반응 · ' + latest.score + '점', () => actions.reaction(latest)));
    const lunchLine = lunchHudText(s, Date.now());
    if (lunchLine) current.append(action(lunchLine, () => actions.lunch()));
    if (room === 'district' || isHeartRoom(room)) current.append(action('현재 장소 지도 보기', actions.map));
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
    if (s.q002.accepted) fold(file, 'q002', 'Q002 · ' + q2Text.title + (s.q002.publishedAt ? ' · 발행 완료' : ' · 취재 중'), body => {
      body.append(el('p', 'notebook-question', q2Text.question), el('p', '', '주소 카드 ' + records.q2Evidence.length + '/4 · ' + (s.q002.reported ? '편집장 보고 완료' : '네 방 취재 후 편집장에게 보고')));
      for (const note of q2Text.notes) {
        if (!records.q2Evidence.includes('q002:' + note.id)) { body.append(el('p', 'muted', note.name + ' · 출구 앞에서 취재할 주소')); continue; }
        fold(body, 'q002-' + note.id, note.name + '의 출입구', detail => { detail.append(el('p', '', note.route), el('p', '', note.text)); sources(detail, note.src, q2Text.sources); });
      }
      if (s.q002.reported) body.append(action(s.q002.publishedAt ? '도해 기사 읽기' : '도해 기사 쓰기 · 초안 이어서', actions.q002));
      body.append(el('p', 'muted', q2Text.disclaimer));
    }, true);

    if (s.q003.accepted) fold(file, 'q003', 'Q003 · ' + q3Text.title, body => {
      body.append(el('p', 'notebook-question', q3Text.question));
      for (const note of q3Text.normal.filter(n => s.q003.notes.includes(n.id as 'tricuspid' | 'pulmonary'))) fold(body, 'q003-' + note.id, note.name, detail => { detail.append(el('p', '', note.text)); sources(detail, note.src, q3Text.sources); });
      for (const m of q3Text.materials.filter(m => s.q003.notes.includes(m.id as 'causes' | 'tests' | 'care'))) fold(body, 'q003-' + m.id, m.title, detail => { detail.append(el('p', '', m.text)); m.cards.forEach(card => detail.append(el('h4', '', card.title), el('p', '', card.text))); sources(detail, m.src, q3Text.sources); });
      body.append(button('row notebook-link', '판막 비교 기록은 인체 탐험에서 보기', () => choose(3)), action(s.q003.publishedAt ? '팩트체크 기사 읽기' : '자료 취재·기사 이어서', actions.q003), el('p', 'muted', q3Text.disclaimer));
    });
    if(s.q004.accepted)fold(file,'q004','Q004 · '+q4Text.title,body=>{
      body.append(el('p','notebook-question',q4Text.question),el('p','','직접 관찰 '+s.q004.notes.length+'/6 · 온몸 축약 전환 '+(s.q004.crossedBody?'기록 있음':'아직')));
      for(const note of q4Text.notes){
        if(!s.q004.notes.includes(note.id as typeof s.q004.notes[number])){body.append(el('p','muted',note.name+' · 아직'));continue;}
        fold(body,'q004-'+note.id,note.name,detail=>{detail.append(el('p','',note.text));sources(detail,note.src,q4Text.sources);});
      }
      body.append(action(s.q004.publishedAt?'노선 기사 읽기':'노선 기사 이어서',actions.q004),el('p','muted',q4Text.disclaimer));
    });
    if (s.q005.accepted) fold(file, 'q005', 'Q005 · ' + q5Text.title + (s.q005.publishedAt ? ' · 발행 완료' : ' · 취재 중'), body => {
      body.append(el('p', 'notebook-question', q5Text.question), el('p', '', '신호 관찰 ' + q5Normal.filter(id => s.q005.notes.includes(id)).length + '/5 · 심방세동 비교 ' + (s.q005.notes.includes('af') ? '기록 있음' : '아직')));
      for (const note of q5Text.notes) {
        if (!s.q005.notes.includes(note.id as Q5Evidence)) { body.append(el('p', 'muted', note.name + ' · 아직')); continue; }
        fold(body, 'q005-' + note.id, note.name, detail => { detail.append(el('p', '', note.text), el('p', 'muted', '이어지는 움직임 · ' + note.motion)); sources(detail, note.src, q5Text.sources); });
      }
      for (const m of q5Text.materials.filter(m => s.q005.notes.includes(m.id as Q5Evidence))) fold(body, 'q005-' + m.id, m.title, detail => { detail.append(el('p', '', m.text)); m.cards.forEach(card => detail.append(el('h4', '', card.title), el('p', '', card.text))); sources(detail, m.src, q5Text.sources); });
      body.append(button('row notebook-link', '심방세동 비교 기록은 인체 탐험에서 보기', () => choose(3)), action(s.q005.publishedAt ? '박동 신호 기사 읽기' : '자료 취재·기사 이어서', actions.q005), el('p', 'muted', q5Text.disclaimer));
    });
    if (s.q008.accepted) fold(file, 'q008', 'Q008 · ' + q8Text.title + (s.q008.publishedAt ? ' · 발행 완료' : ' · 취재 중'), body => {
      body.append(el('p', 'notebook-question', q8Text.question), el('p', '', '정상 기준 ' + q8Normal.filter(id => s.q008.notes.includes(id)).length + '/2 · 혈압 비교 ' + (s.q008.notes.includes('high') ? '기록 있음' : s.q008.notes.includes('moved') ? '막 움직인 뒤까지' : '아직')));
      for (const note of q8Text.notes) {
        if (!s.q008.notes.includes(note.id as Q8Evidence)) { body.append(el('p', 'muted', note.name + ' · 아직')); continue; }
        fold(body, 'q008-' + note.id, note.name, detail => { detail.append(el('p', '', note.text)); sources(detail, note.src, q8Text.sources); });
      }
      for (const m of q8Text.materials.filter(m => s.q008.notes.includes(m.id as Q8Evidence))) fold(body, 'q008-' + m.id, m.title, detail => { detail.append(el('p', '', m.text)); m.cards.forEach(card => detail.append(el('h4', '', card.title), el('p', '', card.text))); sources(detail, m.src, q8Text.sources); });
      body.append(button('row notebook-link', '혈압 비교 기록은 인체 탐험에서 보기', () => choose(3)), action(s.q008.publishedAt ? '혈압 기록 기사 읽기' : '자료 취재·기사 이어서', actions.q008), el('p', 'muted', q8Text.disclaimer));
    });
    if (s.q007.accepted) fold(file, 'q007', 'Q007 · ' + q7Text.title + (s.q007.publishedAt ? ' · 발행 완료' : ' · 취재 중'), body => {
      body.append(el('p', 'notebook-question', q7Text.question), el('p', '', '정상 기준 ' + q7Normal.filter(id => s.q007.notes.includes(id)).length + '/2 · 통로 비교 ' + (s.q007.notes.includes('narrow') ? '기록 있음' : s.q007.notes.includes('mild') ? '조금 좁아짐까지' : '아직')));
      for (const note of q7Text.notes) {
        if (!s.q007.notes.includes(note.id as Q7Evidence)) { body.append(el('p', 'muted', note.name + ' · 아직')); continue; }
        fold(body, 'q007-' + note.id, note.name, detail => { detail.append(el('p', '', note.text)); sources(detail, note.src, q7Text.sources); });
      }
      for (const m of q7Text.materials.filter(m => s.q007.notes.includes(m.id as Q7Evidence))) fold(body, 'q007-' + m.id, m.title, detail => { detail.append(el('p', '', m.text)); m.cards.forEach(card => detail.append(el('h4', '', card.title), el('p', '', card.text))); sources(detail, m.src, q7Text.sources); });
      body.append(button('row notebook-link', '통로 비교 기록은 인체 탐험에서 보기', () => choose(3)), action(s.q007.publishedAt ? '통로 비교 기사 읽기' : '자료 취재·기사 이어서', actions.q007), el('p', 'muted', q7Text.disclaimer));
    });
    if (s.q006.accepted) fold(file, 'q006', 'Q006 · ' + q6Text.title + (s.q006.publishedAt ? ' · 발행 완료' : ' · 취재 중'), body => {
      body.append(el('p', 'notebook-question', q6Text.question), el('p', '', '공급 노선 관찰 ' + q6Normal.filter(id => s.q006.notes.includes(id)).length + '/5 · 더 일할 때 비교 ' + (s.q006.notes.includes('work') ? '기록 있음' : '아직')));
      for (const note of q6Text.notes) {
        if (!s.q006.notes.includes(note.id as Q6Evidence)) { body.append(el('p', 'muted', note.name + ' · 아직')); continue; }
        fold(body, 'q006-' + note.id, note.name, detail => { detail.append(el('p', '', note.text)); sources(detail, note.src, q6Text.sources); });
      }
      for (const m of q6Text.materials.filter(m => s.q006.notes.includes(m.id as Q6Evidence))) fold(body, 'q006-' + m.id, m.title, detail => { detail.append(el('p', '', m.text)); m.cards.forEach(card => detail.append(el('h4', '', card.title), el('p', '', card.text))); sources(detail, m.src, q6Text.sources); });
      body.append(button('row notebook-link', '공급 비교 기록은 인체 탐험에서 보기', () => choose(3)), action(s.q006.publishedAt ? '심장 근육 공급 기사 읽기' : '자료 취재·기사 이어서', actions.q006), el('p', 'muted', q6Text.disclaimer));
    });
    const archive = panels[2]!; archive.append(el('h3', '', '발행 기사와 독자 반응'));
    if (!s.article.publishedAt) archive.append(el('p', 'muted', '첫 기사를 발행하면 기사와 발행별 독자 반응이 이곳에 보관돼요.'));
    else {
      archive.append(el('p', '', 'Q001 · ' + q1Text.title), action('첫 기사와 독자 답장 읽기', actions.article));
      if (s.q002.publishedAt) archive.append(el('p', '', 'Q002 · ' + q2Text.title), action('네 방의 도해 기사와 독자 답장 읽기', actions.q002));
      if (s.q003.publishedAt) archive.append(el('p', '', 'Q003 · ' + q3Text.title), action('판막 팩트체크 기사와 독자 답장 읽기', actions.q003));
      if(s.q004.publishedAt)archive.append(el('p','','Q004 · '+q4Text.title),action('두 순환 노선 기사와 독자 답장 읽기',actions.q004));
      if (s.q005.publishedAt) archive.append(el('p', '', 'Q005 · ' + q5Text.title), action('박동 신호 기사와 독자 답장 읽기', actions.q005));
      if (s.q006.publishedAt) archive.append(el('p', '', 'Q006 · ' + q6Text.title), action('심장 근육 공급 기사와 독자 답장 읽기', actions.q006));
      if (s.q008.publishedAt) archive.append(el('p', '', 'Q008 · ' + q8Text.title), action('혈압 기록 기사와 독자 답장 읽기', actions.q008));
      if (s.q007.publishedAt) archive.append(el('p', '', 'Q007 · ' + q7Text.title), action('통로 비교 기사와 독자 답장 읽기', actions.q007));
      archive.append(el('p', 'muted', '독자 반응은 당시 기록이에요. 다시 보기로 새 점수나 보상이 생기지 않아요.'));
      if (!latest) archive.append(el('p', 'muted', '이전 발행 · 독자 반응 점수 기록 없음. 기사와 기존 진척은 보존했어요.'));
      const renderResult = (parent: HTMLElement, r: Reaction) => parent.append(action(`${r.questId ?? 'Q001'} · ${r.round}번째 발행 · ${r.score}점 · 응원금 ${r.bonusGold}G`, () => actions.reaction(r)));
      if (latest) renderResult(archive, latest);
      const earlier = s.reactions.results.slice(0, -1).reverse();
      if (earlier.length) fold(archive, 'earlier-reactions', '지난 발행 반응 · ' + earlier.length + '건', body => earlier.forEach(r => renderResult(body, r)));
      if (s.reactions.count > s.reactions.results.length) archive.append(el('p', 'muted', `반응 상세는 최근 ${s.reactions.results.length}회 보관 · 누적 ${s.reactions.count}회 발행`));
    }

    const atlas = panels[3]!; atlas.append(el('h3', '', '인체 탐험'));
    if (!s.flags.includes(Q1.entered) && !Object.keys(records.anatomy).length) atlas.append(el('p', 'muted', '바디스코프로 들어가 발견한 구조를 여기에 기록해요.'));
    else {
      fold(atlas, 'organ-heart', '심장 탐사 · ' + Object.values(records.anatomy).flat().length + '/' + discoveryIds.length + ' · 별 ' + totalStars(s) + '/' + maxStars(), heart => {
        const lock = nextLocked(s);
        heart.append(el('p', 'muted', '기록한 구조는 다시 가면 이름표가 가려진 확인 문제가 나와요. 유형마다 맞히면 별 1개(최대 3개).' + (lock ? ' 다음 해금: ' + lock.title + ' · 별 ' + totalStars(s) + '/' + lock.unlockStars : ' 모든 구조가 열렸어요.')));
        heart.append(el('p', 'muted', '필수 취재 관찰 A/B는 취재 파일에 있어요. 여기에는 별도로 발견한 구조만 모아요.'));
        for (const roomId of heartRoute) {
          const pr = roomProgress(s, roomId), title = rooms[roomId].title.split(' · ').pop()!;
          const rs = roomStars(s, roomId);
          fold(heart, 'room-' + roomId, title + ' · ' + pr.found + '/' + pr.total + ' · ★' + rs.stars + '/' + rs.max + (rs.medal ? ' · 메달' : ''), body => {
            for (const key of records.anatomy[roomId] ?? []) {
              const id = key.slice(3), d = discoveries[id]!;
              const st = starsOf(s, id);
              fold(body, id, d.name + ' · ' + '★'.repeat(st) + '☆'.repeat(3 - st), detail => { detail.append(el('p', 'muted', '단서 · ' + hints[id]), el('p', '', d.text)); sources(detail, d.src); });
            }
            if (pr.total > pr.found) body.append(el('p', 'muted', '미발견 구조 ' + (pr.total - pr.found) + '곳 · 방을 걸으며 이름표를 찾아보세요.'));
          });
        }
      }, true);
      const h = s.heartRun, mm = (n: number) => Math.floor(n / 60) + ':' + String(n % 60).padStart(2, '0');
      fold(atlas, 'heart-run', '혈류 배달 런 · ' + h.runs + '번', body => {
        body.append(el('p', '', h.runs ? '최고 기록 ' + (h.best !== null ? mm(h.best) : '-') + ' · 최고 등급 ' + (h.bestGrade ?? '-') + ' · 경유지 만점 ' + h.perfect + '번 · 지금까지 ' + h.goldEarned.toLocaleString('ko-KR') + 'G' : '우심방의 안내 로봇 바디에게 말을 걸면 배달을 시작해요. 매번 골드를 받고, 처음 해낸 일(첫 배달·첫 S등급·새 목격)엔 경험치도 받아요.'));
        body.append(el('p', '', h.muscle.runs ? '심장 근육 배달 ' + h.muscle.runs + '번 · 최고 기록 ' + (h.muscle.best !== null ? mm(h.muscle.best) : '-')
          : s.q006.publishedAt ? '심장 근육 배달 · 바디에게서 시작해요. 대동맥 뿌리의 관상동맥 입구 → 심실 벽 근육 → 관상정맥동으로 돌아오는 Q006 노선이에요.' : '심장 근육 배달 · Q006 취재를 마치면 열려요.'));
        body.append(el('p', 'muted', '혈액 속 목격 · ' + h.seen.length + '/' + sightings.length + '종'));
        for (const x of sightings) {
          if (h.seen.includes(x.id)) fold(body, 'sight-' + x.id, x.name, d => d.append(el('p', '', x.text)));
          else body.append(el('p', 'muted', '??? · 배달하다 보면 언젠가 지나가요'));
        }
      });
      atlas.append(el('p', 'muted', heartText.disclaimer));
      if (s.q003.accepted) fold(atlas, 'heart-disease-compare', '심장 · 질환 비교 (Q003 취재 초안)', body => {
        for (const mode of ['stenosis', 'regurgitation'] as const) if (s.q003.notes.includes(mode)) fold(body, 'compare-' + mode, q3Text.comparison[mode].label, detail => { detail.append(el('p', '', q3Text.comparison[mode].text), el('p', 'muted', q3Text.layerLimit)); sources(detail, ['nhlbi-valve-types'], q3Text.sources); });
        body.append(el('p', 'muted', q3Text.disclaimer), el('p', 'muted', '합병증 연결 기관 · 준비 중'), button('row notebook-link', q3Ready(s) ? '취재 파일의 근거 확인하기' : '자료 취재 위치 확인하기', () => choose(1)));
      });
    }

    if (s.q005.notes.includes('af')) fold(atlas, 'heart-rhythm-compare', '심장 · 박자 비교 (Q005 취재 초안)', body => {
      fold(body, 'compare-af', q5Text.comparison.af.label, detail => { detail.append(el('p', '', q5Text.comparison.af.text), el('p', 'muted', q5Text.layerLimit)); sources(detail, ['nhlbi-af', 'nhlbi-af-causes'], q5Text.sources); });
      body.append(el('p', 'muted', q5Text.disclaimer), el('p', 'muted', '합병증 연결 · 심장 심화 과정(준비 중)'), button('row notebook-link', q5Ready(s) ? '취재 파일의 근거 확인하기' : '자료 취재 위치 확인하기', () => choose(1)));
    });
    if (s.q006.notes.includes('work')) fold(atlas, 'heart-supply-compare', '심장 · 공급 비교 (Q006 취재 초안)', body => {
      fold(body, 'compare-work', q6Text.comparison.work.label, detail => { detail.append(el('p', '', q6Text.comparison.work.text), el('p', 'muted', q6Text.layerLimit)); sources(detail, ['openstax-exercise', 'openstax-coronary'], q6Text.sources); });
      body.append(el('p', 'muted', q6Text.disclaimer), el('p', 'muted', '정상 심장의 조건 비교예요 · 통로 조건 비교는 Q007 통로 비교에서'), button('row notebook-link', q6Ready(s) ? '취재 파일의 근거 확인하기' : '자료 취재 위치 확인하기', () => choose(1)));
    });
    if (s.q007.notes.includes('mild')) fold(atlas, 'heart-passage-compare', '심장 · 통로 비교 (Q007 죽상동맥경화 기초 초안)', body => {
      for (const mode of ['mild', 'narrow'] as const) if (s.q007.notes.includes(mode)) fold(body, 'passage-' + mode, q7Text.comparison[mode].label, detail => { detail.append(el('p', '', q7Text.comparison[mode].text), el('p', 'muted', q7Text.layerLimit)); sources(detail, ['nhlbi-ath-what'], q7Text.sources); });
      body.append(el('p', 'muted', q7Text.singleVariable), el('p', 'muted', q7Text.disclaimer), el('p', 'muted', '다른 기관(뇌·다리 등)과의 연결 · 준비 중'), button('row notebook-link', q7Ready(s) ? '취재 파일의 근거 확인하기' : '자료 취재 위치 확인하기', () => choose(1)));
    });
    if (s.q008.notes.includes('moved')) fold(atlas, 'heart-pressure-compare', '심장 · 혈압 비교 (Q008 고혈압 기초 초안)', body => {
      for (const mode of ['moved', 'high'] as const) if (s.q008.notes.includes(mode)) fold(body, 'pressure-' + mode, q8Text.comparison[mode].label, detail => { detail.append(el('p', '', q8Text.comparison[mode].text), el('p', 'muted', q8Text.layerLimit)); sources(detail, ['nhlbi-hbp-what', 'nhlbi-hbp-diagnosis'], q8Text.sources); });
      body.append(el('p', 'muted', q8Text.singleVariable), el('p', 'muted', q8Text.disclaimer), el('p', 'muted', '다른 기관(뇌·콩팥·눈 등)과의 연결 · 심장 심화 과정(준비 중)'), button('row notebook-link', q8Ready(s) ? '취재 파일의 근거 확인하기' : '자료 취재 위치 확인하기', () => choose(1)));
    });
    const life = panels[4]!; life.append(el('h3', '', '동네·생활 기록'));
    const placeNames = { office: '편집국', neighborhood: '동네와 로비', cafe: '비투비씨 카페', shops: '진U 편의점·오비트 테일러' };
    for (const [id, label] of Object.entries(placeNames) as [keyof typeof placeNames, string][]) fold(life, 'place-' + id, label + ' · 장소 기록 ' + records.local[id].length + '건', body => {
      if (id === 'shops') {
        const bag = jinuItems.filter(i => s.shop.bag[i.id]).map(i => i.title + ' ' + s.shop.bag[i.id] + '개');
        const bought = tailorItems.filter(i => s.ledger.includes('shop.tailor.' + i.id)).map(i => outfits[i.id]);
        body.append(el('p', '', '진U 가방 · ' + (bag.length ? bag.join(', ') : '아직 산 물건이 없어요') + ' (계산 ' + s.shop.jinuCount + '회)'));
        body.append(el('p', '', '오비트 테일러에서 산 옷 · ' + (bought.length ? bought.join(', ') : '아직 없어요') + ' · 옷장 ' + s.owned.length + '벌'));
        body.append(el('p', 'muted', '산 물건과 옷은 기록과 모습만 바꿔요. 경험치나 취재 실력은 바뀌지 않아요.'));
      }
      if (id === 'cafe') body.append(el('p', '', '첫 방문 커피 ' + (s.cafe.welcomeUsed ? '받음' : '아직') + ' · 주문 ' + s.cafe.orderCount + '회 · 창가 쉬기 ' + (s.cafe.restedAt ? '기록 있음' : '아직')));
      for (const key of records.local[id]) fold(body, 'place-note-' + key, inspectLabels[key] ?? '장소 기록', detail => detail.append(el('p', '', lookText[key] ?? '살펴본 장소입니다.')));
      if (!records.local[id].length) body.append(el('p', 'muted', '아직 살펴본 장소 기록이 없어요.'));
    });
    // 오늘의 점심 기록·도감(D085): 지난 기록 본문은 이 탭에만 둔다. 카드는 읽기 전용으로 다시 연다.
    const lunchDays = [...s.lunch.days].reverse().filter(d => d.outcome);
    fold(life, 'lunch', '오늘의 점심 · 기록 ' + lunchDays.length + '일 · 도감 ' + s.lunch.dex.length + '종', body => {
      if (!lunchDays.length) body.append(el('p', 'muted', '아직 점심 기록이 없어요. 매일 11:30 전에 고를 수 있어요.'));
      const plan = s.lunch.plan;
      if (plan && plan.date >= lunchDate(Date.now())) {
        const [, pm, pd] = plan.date.split('-').map(Number);
        body.append(el('p', 'notebook-goal', pm + '월 ' + pd + '일 점심 고민 · ‘' + CRAVE_NAMES[plan.crave] + '’' + (plan.menu ? ' · 메뉴도 생각해 둠' : '') + ' (주문은 그날 11:30 전)'));
      }
      for (const d of lunchDays.slice(0, 30)) {
        const [, mo, da] = d.date.split('-').map(Number);
        const title = mo + '월 ' + da + '일 · ' + (d.outcome === 'ordered' ? d.menuName : d.skip === 'auto' ? '건너뜀(11:30 지남)' : '건너뜀') + (d.report ? (d.report.hit ? ' · 과장 신고 적중' : ' · 과장 신고') : '');
        fold(body, 'lunch-' + d.date, title, detail => {
          detail.append(el('p', '', (d.crave ? CRAVE_NAMES[d.crave] + ' · ' : '') + (d.outcome === 'ordered' ? '주문 요령 ' + d.tips.length + '개' : '보상·불이익 없음')));
          detail.append(button('row notebook-link', '점심 카드 다시 보기', () => { close(); actions.lunch(d.date); }));
        });
      }
      if (lunchDays.length > 30) body.append(el('p', 'muted', '최근 30일만 보여 줘요. 저장 파일에는 최근 120일이 남아요.'));
      const dex = el('div', 'lunch-dex-box'); dex.append(button('row notebook-link', '점심 도감 그림 보기', () => { dex.replaceChildren(el('p', 'muted', '불러오는 중…')); actions.lunchDex(dex); }));
      body.append(dex);
    });
    if (records.legacy.length) fold(life, 'legacy-notes', '이전 버전·기타 보존 기록 ' + records.legacy.length + '건', body => body.append(el('p', 'muted', '이 버전에서 상세 내용을 찾지 못한 기록도 저장 파일에는 그대로 보존돼요.')));
    choose(selectedTab);
  });
}
