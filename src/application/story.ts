import heart from '../../data/content/heart-interior.v0.1.json';
import q1 from '../../data/content/q001-entry.v0.1.json';
import { discovered, discoveryIds } from '../domain/heart';
import { Q1, q1CanOffer, q1Seen } from '../domain/quest';
import { articleText } from '../domain/article-state';
import { canOfferQ2, q2Seen } from '../domain/q002';
import { q2Text } from '../domain/q002-state';
import { canOfferQ3, q3NormalDone, q3CompareDone, q3Ready } from '../domain/q003';
import { q3Text } from '../domain/q003-state';
import { canOfferQ4,q4Ready } from '../domain/q004';
import { q4Text } from '../domain/q004-state';
import { canOfferQ5, q5CompareDone, q5NormalDone, q5Ready } from '../domain/q005';
import { q5Normal, q5Text } from '../domain/q005-state';
import { canOfferQ6, q6CompareDone, q6NormalDone, q6Ready } from '../domain/q006';
import { q6Normal, q6Text } from '../domain/q006-state';
import type { GameState } from '../domain/state';
import { isHeartRoom, type RoomId } from '../world/types';

export type Line = { who: string; text: string; npc: string | null };
export type Talk = { lines: Line[]; flag: string | null; action?: 'offer-q1' | 'brief-q1' | 'offer-q2' | 'brief-q2' | 'offer-q3' | 'offer-q4' | 'offer-q5' | 'offer-q6' };
export const q1Text = q1;
export const heartText = heart;

export function objective(s: GameState, room: RoomId): string {
  const has = (f: string) => s.flags.includes(f);
  if (!has('met-editor')) return room === 'newsroom' ? '편집장에게 첫 출근 인사하기' : '편집국으로 돌아가 편집장에게 인사하기';
  if (!s.cafe.welcomeUsed) {
    if (room === 'newsroom') return '아래쪽 문 → 4층 복도 → 엘리베이터로 1층 내려가기';
    if (room === 'floor4' || room === 'outeroffice') return '복도를 따라 아래쪽 4층 입구의 엘리베이터로 가기';
    if (room === 'lounge') return '라운지에서 나와 4층 입구 쪽 엘리베이터로 가기';
    if (room === 'lift1' || room === 'lift4') return '층 선택 패널에서 1층을 고르고 문으로 나가기';
    if (room === 'lifthall') return '통로를 따라 로비로 나가기';
    if (room === 'lobby') return '정문으로 나가 논현로 거리로';
    if (room === 'district' || room === 'street') return '정문 앞 골목에서 서쪽 도산대로25길로 · 북쪽으로 조금 가서 비투비씨 카페 찾아가기';
    return '바리스타에게 첫 방문 커피 받기';
  }
  if (!has('reported-back')) return room === 'newsroom' ? '편집장에게 다녀왔다고 알리기' : '편집국으로 돌아가 편집장에게 알리기';
  if (!has(Q1.accepted)) return room === 'newsroom' ? '편집장에게 첫 취재 의뢰 받기' : '편집국으로 돌아가 편집장에게 첫 취재 받기';
  if (canOfferQ6(s)) return '편집장에게 심장 근육 공급 취재 ‘펌프도 배달이 필요해’ 받기';
  if (s.q006.accepted) {
    if (s.q006.publishedAt) return '심장 근육 공급 기사 발행 완료! 수첩에서 기사·반응 읽기 · 다음 통로 비교 취재는 준비 중';
    if (!q6NormalDone(s)) {
      const note = q6Text.notes.find(n => !s.q006.notes.includes(n.id as typeof q6Normal[number]))!;
      const count = q6Normal.filter(id => s.q006.notes.includes(id)).length + '/5';
      if (!isHeartRoom(room)) return '바디스코프로 심장 근육 공급 노선 찾아가기 (' + count + ')';
      return (room === note.room ? note.name + ' 살펴보기' : '피를 따라 ' + toward(roomNames[note.room]!) + ' · ' + note.name) + ' (' + count + ')';
    }
    if (!q6CompareDone(s)) {
      if (room === 'aorta') return '대동맥굴 앞 공급 관찰기로 쉴 때와 더 일할 때 비교하기';
      return isHeartRoom(room) ? '피를 따라 대동맥으로 · 대동맥굴 앞 공급 관찰기에서 비교하기' : '바디스코프로 들어가 피를 따라 대동맥굴 앞에서 공급 비교하기';
    }
    if (!q6Ready(s)) return '편집국 내 자리에서 필요한 이유→흐르는 때→더 일할 때 자료 취재 이어가기';
    return '내 자리에서 심장 근육 배송 노선 도해와 팩트체크 기사 쓰기';
  }
  if (canOfferQ5(s)) return '편집장에게 박동 신호 취재 ‘박자를 전하는 길’ 받기';
  if (s.q005.accepted) {
    if (s.q005.publishedAt) return '박동 신호 기사 발행 완료! 수첩에서 기사·반응 읽기 · 다음 심근 공급 취재는 준비 중';
    if (!q5NormalDone(s)) {
      const note = q5Text.notes.find(n => !s.q005.notes.includes(n.id as typeof q5Normal[number]))!;
      const count = q5Normal.filter(id => s.q005.notes.includes(id)).length + '/5';
      if (!isHeartRoom(room)) return '바디스코프로 박동 신호가 지나는 곳 찾아가기 (' + count + ')';
      return (room === note.room ? note.name + ' 살펴보기' : '피를 따라 ' + toward(roomNames[note.room]!) + ' · ' + note.name) + ' (' + count + ')';
    }
    if (!q5CompareDone(s)) {
      if (room === 'heart') return '동방결절 앞 신호 관찰기로 고른 박자와 심방세동 비교하기';
      return isHeartRoom(room) ? '피를 따라 한 바퀴 돌거나 귀환 후 다시 들어와 우심방 동방결절 앞에서 신호 비교하기' : '바디스코프로 우심방에 들어가 동방결절 앞에서 신호 비교하기';
    }
    if (!q5Ready(s)) return '편집국 내 자리에서 원인 자료→검사 해석→관리 원리 취재 이어가기';
    return '내 자리에서 신호 도착 순서 도해와 팩트체크 기사 쓰기';
  }
  if (canOfferQ4(s)) return '편집장에게 두 순환 취재 ‘두 갈래 배송 노선’ 받기';
  if (s.q004.accepted) {
    if(s.q004.publishedAt)return '두 순환 기사 발행 완료! 수첩에서 노선과 독자 반응 읽기 · 다음 박동 신호 취재는 준비 중';
    if(q4Ready(s))return '편집국 내 자리에서 두 순환 카드를 연결해 노선 기사 쓰기';
    const note=q4Text.notes.find(n=>!s.q004.notes.includes(n.id as typeof s.q004.notes[number]))!;
    const count=s.q004.notes.length+'/6';
    if(note.id==='systemic-return'&&!s.q004.crossedBody)return '대동맥 위쪽 온몸 출구로 · 온몸 구간을 축약해 우심방으로 ('+count+')';
    if(!isHeartRoom(room))return '바디스코프로 두 순환의 취재 지점 찾아가기 ('+count+')';
    return (room===note.room?note.name+' 살펴보기':'피를 따라 '+toward(roomNames[note.room]!)+' · '+note.name)+' ('+count+')';
  }
  if (canOfferQ3(s)) return '편집장에게 판막 취재 ‘거꾸로 열리는 문’ 받기';
  if (s.q003.accepted) {
    if (s.q003.publishedAt) return '판막 팩트체크 발행 완료! 수첩에서 기사·반응 읽기 · 다음 순환 취재는 준비 중';
    if (!q3NormalDone(s)) {
      const missing = q3Text.normal.find(n => !s.q003.notes.includes(n.id as 'tricuspid' | 'pulmonary'))!;
      return '정상 기준 취재 · ' + missing.name + ' 살펴보기 · ' + (missing.room === 'heart' ? '우심방' : '우심실');
    }
    if (!q3CompareDone(s)) return room === 'heart' ? '삼첨판 앞에서 정상과 협착·역류 비교하기' : '귀환 후 바디스코프로 우심방에 들어가 삼첨판 비교하기';
    if (!q3Ready(s)) return '편집국 내 자리에서 원인 자료→검사 해석→관리 원리 취재 이어가기';
    return '내 자리에서 판막 팩트체크 기사 쓰기 · 모형의 한계 함께 밝히기';
  }
  if (s.article.publishedAt) {
    if (canOfferQ2(s)) return '편집장에게 다음 취재 ‘네 방의 주소’ 받기';
    if (s.q002.accepted && !s.q002.reported) {
      const seen = q2Seen(s);
      if (seen.length === 4) return '네 방 취재 완료! 편집국으로 돌아가 편집장에게 보고하기';
      const note = q2Text.notes.find(n => !seen.includes(n.id as 'heart' | 'rv' | 'la' | 'lv'))!;
      if (!isHeartRoom(room)) return '바디스코프로 네 방의 출입구 취재하기 (' + seen.length + '/4)';
      return (room === note.room ? note.name + '의 출구 앞에서 주소 기록하기' : '피를 따라 ' + note.name + '으로 · 이 방의 출구로 다음 공간에 가요') + ' (' + seen.length + '/4)';
    }
    if (s.q002.reported && !s.q002.publishedAt) return '편집국 내 자리에서 ‘네 방의 주소’ 도해 기사 쓰기';
    if (s.q002.publishedAt) return '두 번째 기사 발행 완료! 편집장에게 다음 판막 취재 받기';
  }
  const record = '탐험 기록 ' + discovered(s).length + '/' + discoveryIds.length;
  if (!has(Q1.observed)) {
    if (isHeartRoom(room)) {
      const seen = q1Seen(s), n = seen.length;
      if (!seen.includes('heart-in')) {
        if (room === 'heart') return '돌아오는 문 찾기 (' + n + '/2) · 온몸을 돈 피가 우심방으로 들어오는 큰 정맥 입구';
        return '우심방의 ‘돌아오는 문’도 봐야 해요 (' + n + '/2) · 피를 따라 한 바퀴 돌거나 귀환 후 다시 들어오기';
      }
      if (room === 'heart') return '내보내는 문 찾기 (1/2) · 삼첨판이 열릴 때 아래 우심실로 내려가기';
      if (room === 'rv') return '내보내는 문 찾기 (1/2) · 우심실 위쪽 출구, 폐동맥판 관찰하기';
      return '내보내는 문은 우심실의 폐동맥판이에요 (1/2) · 귀환 후 다시 들어오면 우심방부터 시작해요';
    }
    return room === 'newsroom' ? '바디스코프 앞에 서서 심장 속으로 들어가기' : '편집국의 바디스코프로 가기';
  }
  if (isHeartRoom(room)) return '관찰 완료! 귀환 장치로 돌아가거나 피를 따라 계속 탐험하기 · ' + record;
  if (!has(Q1.briefed)) return room === 'newsroom' ? '편집장에게 관찰 결과 알리기' : '편집국으로 돌아가 편집장에게 알리기';
  if (!s.article.publishedAt) return room === 'newsroom' ? '내 자리에서 관찰 카드를 붙여 첫 기사 쓰기 · 수첩에서도 열 수 있어요' : '편집국 내 자리로 돌아가 첫 기사 쓰기';
  return '첫 기사 발행 완료! 수첩에서 독자 답장 읽기 · 바디스코프로 더 탐험하기';
}

const say = (who: string, npc: string | null, ...texts: string[]): Line[] => texts.map(text => ({ who, text, npc }));
const roomNames: Record<string, string> = { rv: '우심실', lung: '폐 모세혈관', la: '좌심방', lv: '좌심실', aorta: '대동맥', heart: '우심방' };
/** Korean direction particle: ‘으로’ after a final consonant except ㄹ, otherwise ‘로’. */
export function toward(name: string): string {
  const code = name.charCodeAt(name.length - 1) - 0xac00, jong = code >= 0 && code < 11172 ? code % 28 : 0;
  return name + (jong && jong !== 8 ? '으로' : '로');
}

export function talk(id: string, s: GameState): Talk {
  const name = s.avatar.name;
  const has = (f: string) => s.flags.includes(f);
  switch (id) {
    case 'editor':
      if (canOfferQ6(s)) return { flag: null, action: 'offer-q6', lines: say('편집장', 'editor', ...q6Text.offer) };
      if (s.q006.accepted) return { flag: null, lines: say('편집장', 'editor', objective(s, s.at.room)) };
      if (canOfferQ5(s)) return { flag: null, action: 'offer-q5', lines: say('편집장', 'editor', ...q5Text.offer) };
      if (s.q005.accepted) return { flag: null, lines: say('편집장', 'editor', objective(s, s.at.room)) };
      if(canOfferQ4(s))return {flag:null,action:'offer-q4',lines:say('편집장','editor',...q4Text.offer)};
      if(s.q004.accepted)return {flag:null,lines:say('편집장','editor',objective(s,s.at.room))};
      if (canOfferQ3(s)) return { flag: null, action: 'offer-q3', lines: say('편집장', 'editor', ...q3Text.offer) };
      if (s.q003.accepted) return { flag: null, lines: say('편집장', 'editor', objective(s, s.at.room)) };
      if (canOfferQ2(s)) return { flag: null, action: 'offer-q2', lines: say('편집장', 'editor', ...q2Text.offer) };
      if (s.q002.accepted && !s.q002.reported) return q2Seen(s).length === 4 ? { flag: null, action: 'brief-q2', lines: say('편집장', 'editor', q2Text.brief) } : { flag: null, lines: say('편집장', 'editor', q2Text.waiting) };
      if (s.q002.reported) return { flag: null, lines: say('편집장', 'editor', s.q002.publishedAt ? '네 방을 연결한 도해 기사도 도착했어요. 다음 판막 취재를 준비하고 있어요.' : q2Text.brief) };
      if (!has('met-editor')) return { flag: 'met-editor', lines: say('편집장', 'editor',
        `어서 와요, ${name} 기자. 메디컬 데스크에 온 걸 환영해요.`,
        '여기는 논현로 유로프라자 4층 편집국이에요. 우리는 몸에 관한 궁금증을 직접 취재해서 쉽게 전하는 곳이죠.',
        '첫 취재 전에 동네부터 익혀 둬요. 정문 앞 골목에서 서쪽 도산대로25길로 들어가 북쪽으로 조금 올라가면 비투비씨 카페가 있는데, 첫 커피가 무료예요.') };
      if (!s.cafe.welcomeUsed) return { flag: null, lines: say('편집장', 'editor', '엘리베이터로 내려가 정문으로 나가면 바로 앞 골목이 논현로151길이에요. 서쪽 끝 도산대로25길로 들어가 북쪽으로 조금 올라가면 비투비씨가 있어요. 길 건너 진U 편의점은 정문 바로 맞은편이에요.') };
      if (!has('reported-back')) return { flag: 'reported-back', action: 'offer-q1', lines: say('편집장', 'editor', '커피 맛 괜찮죠? 이제 동네가 조금 익숙해졌을 거예요.') };
      if (q1CanOffer(s)) return { flag: null, action: 'offer-q1', lines: [] };
      if (!has(Q1.observed)) return { flag: null, lines: say('편집장', 'editor', q1.editorWaiting) };
      if (!has(Q1.briefed)) return { flag: null, action: 'brief-q1', lines: say('편집장', 'editor', ...q1.editorBrief) };
      return { flag: null, lines: say('편집장', 'editor', s.article.publishedAt ? articleText.editorPublished : q1.editorDone) };
    case 'ceo':
      return { flag: null, lines: say('대표', 'ceo', `반가워요, ${name} 기자. 취재 의뢰와 기사 이야기는 가운데 자리의 편집장님과 하면 돼요.`, '좋은 기사는 정확한 관찰에서 시작해요. 오늘도 잘 부탁해요.') };
    case 'senior':
      return { flag: 'met-senior', lines: say('선배 기자', 'senior',
        '반가워요! 화면을 누르면 그곳까지 걸어가요. 사람이나 물건을 누르면 다가가서 말을 걸거나 살펴봐요.',
        '대화창은 화면 아무 곳이나 누르면 넘어가요. 그리고 큰길은 초록불일 때만 건널 수 있으니 신호 꼭 봐요!') };
    case 'guard':
      return { flag: null, lines: say('안내 데스크', 'guard', `좋은 하루예요, ${name} 기자님. 정문으로 나가면 바로 논현로예요. 횡단보도는 신호를 지켜 주세요.`) };
    case 'barista':
      return { flag: null, lines: say('바리스타', 'barista', s.cafe.welcomeUsed ? '또 오셨네요! 무엇으로 드릴까요?' : '비투비씨에 오신 걸 환영해요. 첫 방문이시면 아메리카노 한 잔은 무료예요.') };
    case 'guide': {
      const seen = q1Seen(s).length;
      const lines = seen === 0 || !s.flags.includes(Q1.accepted) ? heart.guide : seen === 1 ? [q1.guideOne] : [q1.guideBoth];
      return { flag: null, lines: say('안내 로봇 바디', null, ...lines) };
    }
    default:
      return { flag: null, lines: [] };
  }
}

export const lookText: Record<string, string> = {
  'lobby-tv': '회색 소파 위 큰 TV. 안내 데스크 앞에는 흰 원형 테이블과 좌석이 있고, 맞은편 유리문 너머로 거리가 보인다.',
  'closed-glass': '반투명 유리에 주황색 띠가 둘러진 문. 이쪽은 닫혀 있다. 라운지는 복도에 들어서자마자 오른쪽 벽의 문으로 들어간다.',
  'lift-call': '정면의 금속 엘리베이터 문. 위에 층 표시, 오른쪽에 호출 버튼이 있다. 문 앞으로 걸어가면 탄다.',
  'meeting-a': '반투명 유리로 둘러싼 회의실. 가로로 긴 흰 책상에 주황·초록 의자가 마주 놓였고, 왼쪽 벽에 큰 모니터가 걸려 있다.',
  'meeting-b': '옆 회의실과 유리 칸막이로 나뉜 두 번째 회의실. 긴 책상, 주황·초록 의자, 왼쪽 벽의 큰 모니터.',
  'lounge-table': '노출 천장 아래 긴 목재 테이블과 높은 의자. 창에는 블라인드가 있고, 한쪽에는 회색 수납장과 작업대가 놓여 있다.',
  'corridor-guide': '복도 왼쪽은 문 없이 이어지는 바깥 사무실, 그 뒤쪽 벽에는 유리 회의실 두 곳. 복도 끝 문으로 들어가면 안쪽 사무실과 내 자리가 나온다. 엘리베이터는 복도 아래 4층 입구 쪽이다.',
  'outer-desks': '긴 공용 책상 두 줄. 한 줄에 양쪽으로 여섯 자리씩 서로 마주 앉는다. 의자 뒤로 지나갈 길이 있고, 문 없이 복도로 이어진다. 내 자리는 더 안쪽 사무실에 있다.',

  'my-desk': '내 자리. 모니터에 ‘수습기자 첫 주 일정’이 열려 있다.',
  device: q1.deviceLocked,
  shelf: '뒤쪽 캐비닛에 건강 기사 작성 가이드, 용어 사전, 지난 호 신문이 정리되어 있다.',
  notice: '유로프라자 입주사 안내 · 4층 메디컬 데스크 편집국 · 엘리베이터는 이 옆 통로 안쪽. 4층에서 내려 복도 끝까지 가세요.',
  'street-notice': '현재 위치: 유로프라자 앞 논현로151길. 서쪽 도산대로25길로 들어가 북쪽으로 조금 가면 비투비씨 카페, 남동쪽 약 110m가 을지병원 사거리(논현로 × 도산대로), 북쪽 논현로를 따라가면 압구정역 방향이다. 큰길은 보행 신호가 초록불일 때만 횡단보도로 건널 수 있다. (실제 축척 지도: 1칸 = 3m, OpenStreetMap 기반)',
  station: '↑ 압구정역 방향. 지하철역은 아직 열리지 않았다.',
  'jinu-store': '진U 편의점. 문 앞에 음료 상자와 생활용품 묶음이 쌓여 있다. 가게 안은 아직 둘러볼 수 없다.',
  'alley-151': '논현로151길. 유로프라자 정문 앞을 지나는 좁은 골목으로, 논현로에서 들어와 서쪽으로 이어진다. 맞은편 진U 편의점 옆으로는 도산대로25길이 남쪽 도산대로로 내려간다.',
  'shoe-repair': '구두 수선대. 굽갈이와 광택을 한다는 안내가 붙어 있다.',
  // Kept for old saves: the pocket park was replaced by the buildings across the lane (D088).
  'park-bench': '쉼터 벤치에 앉아 잠시 숨을 골랐다. 은행잎이 노랗게 물들기 시작했다. (지금은 그 자리에 건물이 들어섰다.)',
  fountain: '작은 분수. 물소리가 큰길의 소음을 조금 덮어 준다. (지금은 그 자리에 건물이 들어섰다.)',
  'window-seat': '창가 높은 자리에 앉아 잠시 쉬었다. 유리 너머로 도산대로25길 골목이 보인다.',
};

export const inspectLabels: Record<string, string> = {
  'lobby-tv': '1층 TV와 소파', 'lift-call': '1층 엘리베이터 통로', 'meeting-a': '4층 회의실 1', 'meeting-b': '4층 회의실 2', 'closed-glass': '4층 닫힌 유리문', 'lounge-table': '4층 라운지', 'corridor-guide': '4층 복도', 'outer-desks': '바깥 사무실', 'lift-panel': '엘리베이터 층 선택',

  'my-desk': '내 자리', device: '바디스코프', shelf: '뒤쪽 자료 캐비닛', notice: '로비 소식 게시판', 'street-notice': '거리 안내판',
  station: '압구정역 방향 표지', 'jinu-store': '진U 편의점', 'alley-151': '논현로151길 표지', 'shoe-repair': '구두 수선대', 'park-bench': '쉼터 벤치', fountain: '쉼터 분수', 'window-seat': '비투비씨 창가 자리',
};
