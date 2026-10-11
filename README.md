# 메디컬 퀘스트: 의학기자 키우기

TypeScript + Canvas 2D로 만드는 **2.5D 픽셀아트 건강기자 생활·탐험 RPG**. 기획·개발: **진우주**.

> **지금 바로 플레이:** https://jinwuuju.github.io/Raise-a-Healthy-Game/ (설계실: [/design/](https://jinwuuju.github.io/Raise-a-Healthy-Game/design/))
>
> **현재 소스: redesign-1 + 심장 속 탐사 + Q001 첫 기사 + 모바일 확인·접는 주기 / 2026-10-11.** 유로프라자 편집국에서 시작해 동네를 익히고, 첫 취재 의뢰를 받아 바디스코프로 **심장 내부**의 실제 혈류 순서를 따라 걸어 다닌다. 관찰 2개를 얻고 귀환·보고하면 내 자리/수첩에서 첫 기사를 구성하고 게임 속 신문에 발행한다(총 100XP·100G, Lv.2). 그래픽은 코드로 그리는 픽셀 아트다. 배포 결과는 [현재 상태](docs/production/STATUS.md)에 구분한다. 의학 검수·아트 승인·실사용자 재미 평가는 별도다. [심장 속 탐사](docs/production/HEART-INTERIOR.md) · [첫 기사](docs/production/Q001-ARTICLE.md) · [모바일 확인·심장 주기](docs/production/MOBILE-CONFIRM-AND-CYCLE.md).

## 조작

- PC: 방향키/WASD 이동 · 클릭한 곳으로 걷기 · E/Space 대화·살펴보기 · J 수첩 · M 지도 · Esc 메뉴. 취재 의뢰를 받은 뒤 바디스코프 앞에서 기기를 바라보고 멈추면 입장 창이 자동으로 열린다.
- 마우스·터치: 화면을 누르면 그곳으로 걷고, 꾹 누른 채 움직이면 손가락 쪽으로 계속 걷는다. 사람·사물을 누르면 다가가서 말을 건다. 대화창·창은 아무 곳이나 누르면 넘어가거나 닫힌다.
- 모바일: 왼쪽 아래 조작볼로 걷고 오른쪽 확인으로 가까운 사람·구조를 살펴보거나 대화를 넘긴다. 선택지는 직접 누른다. 오른쪽 위 심장 주기 헤더를 누르면 접거나 펼친다(모바일은 처음 접힘).
- 큰길 횡단보도는 보행 신호가 초록불일 때만 건널 수 있다. 깜빡이면 새로 건너지 않는다.
- 저장은 자동. 메뉴 → 기록·저장에서 파일로 내보내기/불러오기/백업 복구.

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

[현재 상태](docs/production/STATUS.md) → [결정 기록](docs/decisions/DECISIONS.md) → [작업 큐](docs/production/BACKLOG.md)를 읽는다. 다음은 **심장 탐사·첫 기사 플레이 피드백 반영**, 이후 Q002~ 취재다.

- 실행: Node 24.19.0 / npm 12.2.0에서 `npm ci` → `npm run dev`. 이 Mac의 셸에 Node가 없으면 `bash tools/npm-local.sh run dev`.
- 검증: `npm run typecheck`, `npm test`, `npm run test:e2e`, `npm run build`. 최신 실행 결과는 [현재 상태](docs/production/STATUS.md)와 [첫 기사 기록](docs/production/Q001-ARTICLE.md)에 남긴다. [기존 오류 점검](docs/production/CODE-AUDIT-2026-10-11.md) · [뒷모습·모바일 생성 화면](docs/production/MOBILE-CREATOR-AND-REAR-WALK.md).
- 설계 검사: `python3 tools/check_design.py`. 수치 변경 시 data/balance 원본과 문서를 함께 고친다.
- 배포: `main`에 push하면 GitHub Actions가 테스트·빌드 후 Pages에 게임(루트)과 설계실(/design/)을 올린다. 1~2분 뒤 같은 주소를 새로고침하면 최신 버전이다.
- 의학 내용은 검수 전 초안이며 출처 확인과 검수 이후에만 공개 콘텐츠로 사용한다.

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
| `src/` | 게임 코드 ([구조](src/README.md)) |
| `public/assets/` | 향후 검수된 외부 자산 위치 (현재 게임은 사용 안 함) |
| `tests/` | 단위·통합·브라우저 검증 |
| `tools/` | 설계 및 콘텐츠 검증 도구 |
| `artifacts/` | 로컬 검증 결과·성능 측정 (기본 Git 제외) |

## 설계 사이트

[GitHub 저장소](https://github.com/jinwuuju/Raise-a-Healthy-Game) · [설계실](https://jinwuuju.github.io/Raise-a-Healthy-Game/design/). 로컬 생성은 `python3 tools/build_site.py`, 검증은 `python3 tools/check_site.py`. [배포 운영](docs/production/WEB-PUBLISHING.md).

Copyright © 2026 진우주. All rights reserved. 자체 제작물의 권리 정책은 [LICENSE](LICENSE), 외부 구성요소는 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)를 따른다.
