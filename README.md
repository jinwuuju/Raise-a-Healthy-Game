# 메디컬 퀘스트: 의학기자 키우기

Phaser 4 + TypeScript + HTML/CSS로 만드는 **2.5D 픽셀아트 건강기자 생활·탐험 RPG**. 기획·개발: **진우주**.

> **현재는 P1 현대 서울 픽셀 RPG 시험판 / 2026-10-10.**
> 유로프라자 안 편집국에서 시작해 로비·논현로 거리·비투비씨 카페를 걸어 다니고, 조사·주문·쉬기·저장/복원이 실행된다. Q001 취재·기사·실보상·전체 아트 승인·의학 검수는 아직 없다. [거리·이동 명세](docs/production/MOVEMENT-AND-STREET.md), [생성 자산/프롬프트](docs/production/PIXEL-ASSETS.md)를 참고한다. 기존 v0.2 설계와 1~99 레벨 계획 데이터는 유지한다.

## 먼저 읽을 문서

1. [전체 로드맵](docs/00-MASTER-ROADMAP.md) — 전체 목표, 출시 범위, 단계별 진행 순서와 완료 조건.
2. [게임의 원칙과 핵심 루프](docs/design/01-GAME-VISION.md).
3. [레벨·숙련도·해금 설계](docs/design/02-PROGRESSION.md) / [레벨 1~99 개별 계획](docs/design/02A-LEVEL-CATALOG.md).
4. [첫 10분과 레벨 1~10 실제 플레이](docs/design/03-FIRST-TEN-LEVELS.md).
5. [월드·퍼즐·특별 취재](docs/design/04-WORLD-AND-QUESTS.md).
6. [보상·경제·편집국 경영](docs/design/05-ECONOMY-AND-NEWSROOM.md).
7. [기술 구조와 초기 설정](docs/design/06-TECHNICAL-ARCHITECTURE.md).
8. [콘텐츠 규격과 의학 검수](docs/design/07-CONTENT-AND-REVIEW.md).
9. [화면·조작·아트·오디오](docs/design/08-UX-ART-AUDIO.md).
10. [검증·플레이테스트·출시 기준](docs/design/09-QUALITY-AND-RELEASE.md).
11. [콘텐츠 수량과 구간별 XP 예산](docs/production/CONTENT-BUDGET.md).
12. [레벨 99 이후 확장 제안](docs/design/10-FUTURE-DEVELOPMENT.md).
13. [캐릭터·옷가게·집·생활](docs/design/11-LIFE-CHARACTER-HOUSING.md).
14. [전신 아틀라스](docs/design/12-WHOLE-BODY-ATLAS.md).
15. [건강기자 아카데미·기사 가이드](docs/design/13-HEALTH-JOURNALISM-CURRICULUM.md).
16. [2.5D 아트 제작 기준](docs/design/14-2_5D-ART-PRODUCTION.md).
17. [GitHub Pages 배포·갱신](docs/production/WEB-PUBLISHING.md).

[HUD·모바일 UX 개발 원칙](docs/design/15-HUD-AND-MOBILE-UX.md)을 UI와 후속 기능에 적용한다.

## 작업을 이어갈 때

[현재 상태](docs/production/STATUS.md) → [결정 기록](docs/decisions/DECISIONS.md) → [작업 큐](docs/production/BACKLOG.md)를 읽는다. **다음은 현재 조작감의 실제 플레이 피드백과 기반 잔여 검증**이다. 반경300m 지리 대조·내부 사진 반영·추가 상점은 후속 범위다. [내부 착수 검토](docs/production/P0-IMPLEMENTATION-ENTRY.md)와 [P1 구현 기록](docs/production/P1-FOUNDATION-REPORT.md)을 함께 읽는다. P0의 사용자 검토·의학 검수와 P2 아트 게이트는 완료로 처리하지 않았다.

- 기획 수치: 초기 가설이며 플레이테스트로 조정한다.
- 기술 사실: [공식 출처와 확인 범위](docs/references/SOURCES.md)를 참고한다.
- 의학 내용: 기전과 퍼즐 아이디어는 검수 전 초안이다. 출처 확인과 검수 이후에만 공개 콘텐츠로 사용한다.
- 현 단계 검사: `python3 tools/check_design.py` (문서 링크·레벨 데이터·초기 퀘스트 보상 일관성 검사).
- 게임 실행: Node 24.19.0 / npm 12.2.0에서 `npm ci` → `npm run dev`. 로컬 주소는 터미널에 표시된다.
- 이 Mac의 기본 셸에 Node/npm이 없으면 `bash tools/npm-local.sh run dev`로 앱 번들/사용자 캐시 도구를 사용할 수 있다.
- 검증: `npm run typecheck`, `npm test`, `npm exec playwright install chromium`, `npm run test:e2e`, `npm run build`.
- 방향키/WASD 길게 누르기로 연속 이동, 클릭으로 경로 이동, E/표식/조사 버튼으로 조사. 문으로 걸어가면 자동 출입한다. 생성 시 외형을 고르고 왼쪽 기자 칩에서 외형을 수정한다. 월드와 HUD는 같은 외형을 표시한다. 화면 방향 버튼은 제거했다. 모바일은 화면 탭으로 이동하며 관리 기능은 메뉴 → 기록·저장에 있다. 조사·전환은 자동 저장, 이동 후 위치는 ‘현재 위치 저장’. 기록은 파일로 내보내거나 최근 정상 백업으로 복구한다. 비투비씨는 첫 커피와 물을 무료로 이용할 수 있다.

## 폴더 안내

| 경로 | 역할 |
|---|---|
| `docs/design/` | 게임·학습·기술 상세 설계 |
| `docs/production/` | 현재 상태, 작업 순서, 위험·추정 |
| `docs/decisions/` | 결정과 변경 이유 |
| `docs/templates/` | 단계 완료·퀘스트·검수 기록 양식 |
| `data/balance/` | 레벨 및 초반 보상 설계의 수치 원본 |
| `data/examples/` | 미검수 콘텐츠 계약 예시 (게임 빌드 제외) |
| `data/schemas/` | 콘텐츠 JSON Schema 후속 작성 위치 |
| `src/` | 게임 기반 코드의 계층별 디렉터리 |
| `public/assets/` | 제작 원본·게임 배포 자산 구분 |
| `tests/` | 단위·통합·브라우저 검증 |
| `tools/` | 설계 및 콘텐츠 검증 도구 |
| `artifacts/` | 로컬 검증 결과·성능 측정 (기본 Git 제외) |

## 설계 사이트

[GitHub 저장소](https://github.com/jinwuuju/Raise-a-Healthy-Game) · [Pages 주소](https://jinwuuju.github.io/Raise-a-Healthy-Game/).

사이트 공개 여부의 실제 확인 결과는 [현재 상태](docs/production/STATUS.md)에 기록한다. 로컬 생성은 `python3 tools/build_site.py`, 검증은 `python3 tools/check_site.py`, 미리보기는 `python3 -m http.server 4173 --directory _site`다. `main`에 push하면 GitHub Actions가 문서에서 사이트를 재생성한다. 로컬 파일 저장만으로 원격 사이트가 바뀌지는 않는다.

Copyright © 2026 진우주. All rights reserved. 자체 제작물의 권리 정책은 [LICENSE](LICENSE), 외부 구성요소는 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)를 따른다.
