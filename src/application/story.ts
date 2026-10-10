import q1 from '../../data/content/q001-entry.v0.1.json';
import { Q1, q1CanOffer, q1Seen } from '../domain/quest';
import type { GameState } from '../domain/state';
import type { RoomId } from '../world/types';

export type Line = { who: string; text: string; npc: string | null };
export type Talk = { lines: Line[]; flag: string | null; action?: 'offer-q1' | 'brief-q1' };
export const q1Text = q1;

export function objective(s: GameState, room: RoomId): string {
  const has = (f: string) => s.flags.includes(f);
  if (!has('met-editor')) return room === 'newsroom' ? '편집장에게 첫 출근 인사하기' : '편집국으로 돌아가 편집장에게 인사하기';
  if (!s.cafe.welcomeUsed) {
    if (room === 'newsroom') return '엘리베이터를 타고 1층 로비로 내려가기';
    if (room === 'lobby') return '정문으로 나가 논현로 거리로';
    if (room === 'street') return '쉼터 옆 비투비씨 카페 찾아가기';
    return '바리스타에게 첫 방문 커피 받기';
  }
  if (!has('reported-back')) return room === 'newsroom' ? '편집장에게 다녀왔다고 알리기' : '편집국으로 돌아가 편집장에게 알리기';
  if (!has(Q1.accepted)) return room === 'newsroom' ? '편집장에게 첫 취재 의뢰 받기' : '편집국으로 돌아가 편집장에게 첫 취재 받기';
  if (!has(Q1.observed)) {
    if (room === 'heart') return '심장 모형 관찰하기 (' + q1Seen(s).length + '/2) · 표식이 나가는 곳과 들어오는 곳';
    return room === 'newsroom' ? '바디스코프 앞에 서서 심장 모형으로 들어가기' : '편집국의 바디스코프로 가기';
  }
  if (room === 'heart') return '귀환 장치를 눌러 편집국으로 돌아가기';
  if (!has(Q1.briefed)) return room === 'newsroom' ? '편집장에게 관찰 결과 알리기' : '편집국으로 돌아가 편집장에게 알리기';
  return '다음 업데이트: 끊긴 배달 길 잇기와 첫 기사 · 그동안 자유롭게 둘러보기';
}

const say = (who: string, npc: string | null, ...texts: string[]): Line[] => texts.map(text => ({ who, text, npc }));

export function talk(id: string, s: GameState): Talk {
  const name = s.avatar.name;
  const has = (f: string) => s.flags.includes(f);
  switch (id) {
    case 'editor':
      if (!has('met-editor')) return { flag: 'met-editor', lines: say('편집장', 'editor',
        `어서 와요, ${name} 기자. 메디컬 데스크에 온 걸 환영해요.`,
        '여기는 논현로 유로프라자 3층 편집국이에요. 우리는 몸에 관한 궁금증을 직접 취재해서 쉽게 전하는 곳이죠.',
        '첫 취재 전에 동네부터 익혀 둬요. 길 건너 쉼터 옆 비투비씨 카페는 첫 커피가 무료예요.') };
      if (!s.cafe.welcomeUsed) return { flag: null, lines: say('편집장', 'editor', '엘리베이터로 내려가 정문으로 나가면 논현로예요. 비투비씨는 좁은 길 건너 쉼터 옆이에요.') };
      if (!has('reported-back')) return { flag: 'reported-back', action: 'offer-q1', lines: say('편집장', 'editor', '커피 맛 괜찮죠? 이제 동네가 조금 익숙해졌을 거예요.') };
      if (q1CanOffer(s)) return { flag: null, action: 'offer-q1', lines: [] };
      if (!has(Q1.observed)) return { flag: null, lines: say('편집장', 'editor', q1.editorWaiting) };
      if (!has(Q1.briefed)) return { flag: null, action: 'brief-q1', lines: say('편집장', 'editor', ...q1.editorBrief) };
      return { flag: null, lines: say('편집장', 'editor', q1.editorDone) };
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
      const lines = seen === 0 ? q1.guideFirst : seen === 1 ? [q1.guideOne] : [q1.guideBoth];
      return { flag: null, lines: say('안내 로봇 바디', null, ...lines) };
    }
    default:
      return { flag: null, lines: [] };
  }
}

export const lookText: Record<string, string> = {
  'my-desk': '내 자리. 모니터에 ‘수습기자 첫 주 일정’이 열려 있다.',
  device: q1.deviceLocked,
  shelf: '건강 기사 작성 가이드, 용어 사전, 지난 호 신문이 빼곡하게 꽂혀 있다.',
  notice: '유로프라자 입주사 안내 · 3층 메디컬 데스크 편집국 · 1층 식당가 영업 중.',
  'street-notice': '현재 위치: 논현로 · 을지병원 사거리. 북쪽으로 가면 압구정역 방향이다. 큰길은 보행 신호가 초록불일 때만 건널 수 있다. (게임 지도는 실제 거리를 줄여 표현했다.)',
  station: '↑ 압구정역 방향. 지하철역은 아직 열리지 않았다.',
  'park-bench': '쉼터 벤치에 앉아 잠시 숨을 골랐다. 은행잎이 노랗게 물들기 시작했다.',
  fountain: '작은 분수. 물소리가 큰길의 소음을 조금 덮어 준다.',
  'window-seat': '창가 자리에 앉아 잠시 쉬었다. 유리 너머로 도산대로의 차들이 지나간다.',
};

export const inspectLabels: Record<string, string> = {
  'my-desk': '내 자리', device: '바디스코프', shelf: '자료 책장', notice: '로비 소식 게시판', 'street-notice': '거리 안내판',
  station: '압구정역 방향 표지', 'park-bench': '쉼터 벤치', fountain: '쉼터 분수', 'window-seat': '비투비씨 창가 자리',
};
