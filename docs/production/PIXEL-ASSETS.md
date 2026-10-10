# 픽셀 아트 자산 기록

## redesign-1 (현재)

게임 그래픽은 외부 이미지 파일 없이 `src/art/`의 코드가 실행 시 한 픽셀씩 그린다. 인물(`character.ts`), 건물(`buildings.ts`), 바닥·실내 벽(`ground.ts`), 소품(`props.ts`), 차량(`vehicles.ts`)이 같은 16px 타일 격자·윤곽선·광원 규칙을 공유한다. 자세한 방향은 [redesign-1 기록](REDESIGN-1.md)을 따른다. 사진·지도·다른 게임의 이미지를 복사하지 않았다.

## 이전 생성 PNG (폐기)

첫 P1에서 내장 이미지 생성 도구로 만든 `reporters-v1`, `office-props-v1`, `city-props-v1`, `europlaza-v1`, `b2bc-v1` PNG와 생성 프롬프트는 런타임에서 제거했다. 비정수 축소로 픽셀이 깨지고 격자가 어긋나 사용자 검토에서 탈락했다. 원본과 프롬프트 기록은 Git 태그 `p1-first-attempt`에 남아 있다.
