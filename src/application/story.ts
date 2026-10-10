import type { GameState } from '../domain/state';
import type { RoomId } from '../world/types';

export type Line = { who: string; text: string; npc: string | null };

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
  return '첫 취재는 다음 업데이트에서 열려요 · 동네를 자유롭게 둘러보기';
}

const say = (who: string, npc: string | null, ...texts: string[]): Line[] => texts.map(text => ({ who, text, npc }));

export function talk(id: string, s: GameState): { lines: Line[]; flag: string | null } {
  const name = s.avatar.name;
  const has = (f: string) => s.flags.includes(f);
  switch (id) {
    case 'editor':
      if (!has('met-editor')) return { flag: 'met-editor', lines: say('편집장', 'editor',
        `어서 와요, ${name} 기자. 메디컬 데스크에 온 걸 환영해요.`,
        '여기는 논현로 유로프라자 3층 편집국이에요. 우리는 몸에 관한 궁금증을 직접 취재해서 쉽게 전하는 곳이죠.',
        '첫 취재는 곧 맡길게요. 그 전에 동네부터 익혀 둬요. 길 건너 쉼터 옆 비투비씨 카페는 첫 커피가 무료예요.') };
      if (!s.cafe.welcomeUsed) return { flag: null, lines: say('편집장', 'editor', '엘리베이터로 내려가 정문으로 나가면 논현로예요. 비투비씨는 좁은 길 건너 쉼터 옆이에요.') };
      if (!has('reported-back')) return { flag: 'reported-back', lines: say('편집장', 'editor',
        '커피 맛 괜찮죠? 이제 동네가 조금 익숙해졌을 거예요.',
        '첫 취재 의뢰는 바디스코프 점검이 끝나는 대로 줄게요. 그 전엔 편하게 둘러봐요.') };
      return { flag: null, lines: say('편집장', 'editor', '바디스코프 점검이 끝나면 바로 부를게요. 좋은 기사는 좋은 관찰에서 시작해요.') };
    case 'senior':
      return { flag: 'met-senior', lines: say('선배 기자', 'senior',
        '반가워요! 방향키나 WASD로 걷고, 화면을 누르면 그곳까지 걸어가요.',
        '화면을 꾹 누른 채 움직이면 손가락 쪽으로 계속 걸어요. 가까운 대상은 오른쪽 아래 버튼이나 E 키로 말을 걸 수 있어요.') };
    case 'guard':
      return { flag: null, lines: say('안내 데스크', 'guard', `좋은 하루예요, ${name} 기자님. 정문으로 나가면 바로 논현로예요.`) };
    case 'barista':
      return { flag: null, lines: say('바리스타', 'barista', s.cafe.welcomeUsed ? '또 오셨네요! 무엇으로 드릴까요?' : '비투비씨에 오신 걸 환영해요. 첫 방문이시면 아메리카노 한 잔은 무료예요.') };
    default:
      return { flag: null, lines: [] };
  }
}

export const lookText: Record<string, string> = {
  'my-desk': '내 자리. 모니터에 ‘수습기자 첫 주 일정’이 열려 있다.',
  device: '인체 원리를 탐험 가능한 모형으로 재현하는 장치 ‘바디스코프’. 아직 점검 중이라 가동할 수 없다.',
  shelf: '건강 기사 작성 가이드, 용어 사전, 지난 호 신문이 빼곡하게 꽂혀 있다.',
  notice: '유로프라자 입주사 안내 · 3층 메디컬 데스크 편집국 · 1층 식당가 영업 중.',
  'street-notice': '현재 위치: 논현로 · 을지병원 사거리. 북쪽으로 가면 압구정역 방향이다. (게임 지도는 실제 거리를 줄여 표현했다.)',
  station: '↑ 압구정역 방향. 지하철역은 아직 열리지 않았다.',
  'park-bench': '쉼터 벤치에 앉아 잠시 숨을 골랐다. 은행잎이 노랗게 물들기 시작했다.',
  fountain: '작은 분수. 물소리가 큰길의 소음을 조금 덮어 준다.',
  'window-seat': '창가 자리에 앉아 잠시 쉬었다. 유리 너머로 도산대로의 차들이 지나간다.',
};

export const inspectLabels: Record<string, string> = {
  'my-desk': '내 자리', device: '바디스코프', shelf: '자료 책장', notice: '로비 소식 게시판', 'street-notice': '거리 안내판',
  station: '압구정역 방향 표지', 'park-bench': '쉼터 벤치', fountain: '쉼터 분수', 'window-seat': '비투비씨 창가 자리',
};
