// Only fictional workplace text is allowed in this P1 build. No medical body text.
export const workplaceText: Record<string, { title: string; body: string }> = {
  editor: { title: '편집장 · 첫 출근을 환영해요', body: '좋은 기자는 먼저 관찰하고, 근거를 확인하죠. 이곳은 서울 논현로의 유로프라자 안, 우리 편집국이에요. 먼저 동료들과 인사하고 공간을 둘러보세요. 첫 취재 의뢰는 다음 제작 단계에서 열립니다.' },
  device: { title: '탐사 장치 · 준비 중', body: '인체 탐험으로 이어질 장치입니다. 지금은 편집국 이동과 저장을 확인하는 시험판이에요. 아직 취재를 시작할 수 없습니다.' },
  'street-notice': { title: '논현로 · 을지병원 사거리', body: '압구정역 방향은 북쪽입니다. 횡단보도를 따라 도로를 건널 수 있어요. 실제 주변 지리를 게임 이동에 맞춰 축약한 거리입니다.' },
  station: { title: '압구정역 방향', body: '논현로를 따라 북쪽으로 가면 압구정역 4번 출구 방향입니다. 이번 시험판에서는 유로프라자 주변 블록까지만 둘러볼 수 있어요.' },
  notice: { title: '동료 기자들의 소식', body: '이곳은 유로프라자 1층 로비입니다. 오른쪽 출입구를 지나면 논현로가 나와요. 왼쪽 문으로 돌아가거나, 현재 위치를 저장하고 다음에 이어서 둘러보세요.' },
};
