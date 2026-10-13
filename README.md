# 메디컬 퀘스트: 의학기자 키우기

TypeScript + Canvas 2D로 만드는 **2.5D 픽셀아트 건강기자 생활·탐험 RPG**. 기획·개발: **진우주**.

> **지금 바로 플레이:** https://jinwuuju.github.io/Raise-a-Healthy-Game/ (설계실: [/design/](https://jinwuuju.github.io/Raise-a-Healthy-Game/design/))
>
> **현재 배포: redesign-1 + 심장 속 탐사 + 진입 연출 + Q001~Q005 취재·기사·독자 반응 / 2026-10-13.** 심장 내부를 걸으며 첫 기사·네 방의 주소·판막질환 비교·두 순환 노선·박동 신호까지 취재한다. Q005는 전도계 다섯 곳을 직접 보고 같은 우심방에서 고른 박자와 심방세동을 비교한 뒤 신호 도착 순서 도해와 팩트체크 기사를 쓴다. 온몸 맵은 아직 없어 이동 축약을 표시한다. 기본 XP 합계 1,000XP/Lv.6, 골드는 최초 보상과 발행별 추가 응원금이다. 수첩은 할 일·취재·기사·인체·생활로 분류한다. 의학 본문은 검수 전 모형이며 의학·아트·실사용자 평가는 별도다. [현재 상태](docs/production/STATUS.md) · [Q005 구현·검증](docs/production/Q005-SIGNAL-REPORT.md) · [Q004](docs/production/Q004-CIRCULATION-REPORT.md).

**추가 배포(D072~D074):** 약 4.2초 심장 진입 연출과 Q002 네 방 취재, Q003 판막질환 비교·6단계 취재·팩트체크 기사. [진입/Q002 기록](docs/production/ORGAN-ENTRY-AND-Q002.md) · [판막 취재 기록](docs/production/Q003-VALVE-REPORT.md).


**추가 설계(D076, 구현 전):** [특종 잭팟·의학 미스터리·돌발 뉴스/비밀 제보·전국 취재 월드](docs/design/17-DYNAMIC-NEWS-AND-REGIONAL-WORLD.md). 현재 심장에서는 심장 관련 사건만, 새 기관마다 해당 사건을 동반하며 기본판 전체 입문/검수 및 Lv.99 달성 후 전 분야 무작위 심화 취재를 연다. 기존 '오늘의 점심' 기획은 별도 유지한다. **아직 게임 기능은 추가되지 않았다.**

## 조작

- PC: 방향키/WASD 이동 · 클릭한 곳으로 걷기 · E/Space 대화·살펴보기 · J 수첩 · M 지도 · Esc 메뉴. 취재 의뢰를 받은 뒤 바디스코프 앞에서 기기를 바라보고 멈추면 입장 창이 자동으로 열린다.
- 마우스·터치: 화면을 누르면 그곳으로 걷고, 꾹 누른 채 움직이면 손가락 쪽으로 계속 걷는다. 사람·사물을 누르면 다가가서 말을 건다. 대화창·창은 아무 곳이나 누르면 넘어가거나 닫힌다.
- 모바일: 왼쪽 아래 조작볼로 걷고 오른쪽 확인으로 가까운 사람·구조를 살펴보거나 대화를 넘긴다. 선택지는 직접 누른다. 오른쪽 위 심장 주기 헤더를 누르면 접거나 펼친다(모바일은 처음 접힘).
- 수첩: 분류 탭을 고르고 기관·방·기록을 접고 펼친다. 기사/반응은 수첩에서 다시 읽는다. 결과창은 ‘결과 바로 보기’로 연출을 넘길 수 있고 과거 결과는 새 보상을 주지 않는다.
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
18. [질환 아카데미: 기관마다 함께 구현하는 질환 취재](docs/design/16-DISEASE-ACADEMY.md).

[HUD·모바일 UX 개발 원칙](docs/design/15-HUD-AND-MOBILE-UX.md)을 UI와 후속 기능에 적용한다.

## 작업을 이어갈 때

[현재 상태](docs/production/STATUS.md) → [결정 기록](docs/decisions/DECISIONS.md) → [작업 큐](docs/production/BACKLOG.md)를 읽는다. 다음 로컬 구현은 **Q006 관상 공급 취재 + 협심증·죽상동맥경화 동반 범위 검토**다. 심장 탐사·기사 플레이 피드백과 의학·아트 검수는 별도 게이트다.

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
