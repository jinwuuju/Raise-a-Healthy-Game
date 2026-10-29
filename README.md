# 건강 기자 키우기 (메디컬 퀘스트)

TypeScript + Canvas 2D로 만드는 **2.5D 픽셀아트 건강기자 생활·탐험 RPG**. 기획·개발: **진우주**.

> **핵심 원칙:** 우리는 의사가 아니다. 이 게임이 키우는 능력은 정확히 알고 쉽게 전하는 것이다. 진단·치료 판단을 가르치지 않고, 몸의 원리와 근거를 정확히 이해해 독자에게 쉽고 과장 없이 전한다.

> **지금 바로 플레이:** https://jinwuuju.github.io/Raise-a-Healthy-Game/ (설계실: [/design/](https://jinwuuju.github.io/Raise-a-Healthy-Game/design/))
>
> **현재 배포: redesign-1 + 심장 속 탐사 + 진입 연출 + 심장 기본 과정 Q001~Q010(졸업 특집호까지) + 호흡기 취재 Q011 공기 항구(출시 상한 30)·Q012 갈라지는 길·Q013 두 개의 흐름 / 2026-10-26.** 심장 내부를 걸으며 첫 기사·네 방의 주소·판막질환 비교·두 순환 노선·박동 신호·심장 근육 공급을 취재하고, 기본 과정(일반인 난이도)으로 죽상동맥경화 기초(Q007)·고혈압 기초(Q008, 기준 숫자 없이)·처음 보는 그림에 순환 적용(Q009)·심장 졸업 특집호(Q010)까지 이어진다. 심장 기본 XP 합계 2,700XP/Lv.10, Q010을 발행하면 심장 졸업·신입 기자 승진(완료 기록에서 파생). 혈류·심장 근육 배달 런으로 매번 골드를 받는다. 온몸 맵은 아직 없어 이동 축약을 표시한다. 의학 본문은 검수 전 모형이며 의학·아트·실사용자 평가는 별도다. **바디스코프 3D 외형 모형(D118):** 장기 속을 걷기 전에, 또는 지도에서 ‘자세히 보기’로 심장·큰 혈관·관상동맥, 코부터 기관지 나무까지의 기도, 엽이 나뉜 폐, 횡격막, 갈비뼈·척추를 반투명한 몸 안에서 돌려 보고 눌러서 설명을 읽는다([설계 22](docs/design/22-BODYSCOPE-3D-MODEL.md)). [현재 상태](docs/production/STATUS.md) · [Q013](docs/production/Q013-TWO-FLOWS-REPORT.md) · [Q012](docs/production/Q012-FORK-REPORT.md) · [Q011](docs/production/Q011-AIR-PORT-REPORT.md) · [Q010](docs/production/Q010-GRADUATION-REPORT.md) · [Q009](docs/production/Q009-CIRCULATION-EXPLAINER-REPORT.md) · [Q008](docs/production/Q008-PRESSURE-REPORT.md) · [Q006](docs/production/Q006-SUPPLY-REPORT.md).

**추가 배포(D072~D074):** 약 4.2초 심장 진입 연출과 Q002 네 방 취재, Q003 판막질환 비교·6단계 취재·팩트체크 기사. [진입/Q002 기록](docs/production/ORGAN-ENTRY-AND-Q002.md) · [판막 취재 기록](docs/production/Q003-VALVE-REPORT.md).


**Q007 좁아진 모형 통로(D108 기본 과정):** [두 관상동맥 입구의 정상 기준 → 통로 폭 하나만 바꾸는 통로 관찰기(죽상동맥경화 기초 레이어) → 쉬운 자료 3단계 → 하나만 바꾼 비교 도해와 쉬운 설명 기사](docs/production/Q007-PASSAGE-REPORT.md) (400XP·260G, Lv.8).

**Q008~Q010(D108 기본 과정):** [Q008 하나의 숫자로 충분할까](docs/production/Q008-PRESSURE-REPORT.md)(고혈압 기초, 화면에 기준 숫자 없음, 450XP·300G) · [Q009 독자에게 설명하는 순환](docs/production/Q009-CIRCULATION-EXPLAINER-REPORT.md)(마주 보고 그린 그림 읽기, 500XP·350G, Lv.10) · [Q010 심장 졸업 특집호](docs/production/Q010-GRADUATION-REPORT.md)(특집 배달 런·핵심 구조 확인·내 기록을 근거로 한 특집 기사, 0XP·400G). 명성·편집국 확장권은 해당 기능이 생기면 졸업 기록으로 소급한다.

**호흡기 기본 장(D109 준비 · D111 공간 1차 구현):** [설계 20](docs/design/20-RESPIRATORY-BASIC.md) · [정확성·그림 정밀도 계약](docs/production/RESPIRATORY-INTERIOR.md). 코안·인두·후두·기관·기관지 나무·폐포를 걷고, 천식·폐렴·호흡기 바이러스(감기·독감·코로나19 구분)를 기본 과정으로 취재한다. 심장 졸업 뒤 바디스코프에서 호흡기를 골라 콧구멍 진입 연출과 함께 콧구멍부터 폐포까지 걸을 수 있다(숨·삼킴·섬모와 점액, 탐험 기록 44개와 확인 문제). 첫 취재 [Q011 공기 항구](docs/production/Q011-AIR-PORT-REPORT.md)(코안 네 장면·들어오는 공기만 바꾸는 관찰기·본 것과 코가 하는 일 잇기, 550XP·380G, Lv.11)와 [Q012 갈라지는 길](docs/production/Q012-FORK-REPORT.md)(인두·후두 네 장면·목을 지나는 것만 바꾸는 갈림길 관찰기·삼킴 한 번을 순서대로, 600XP·400G, Lv.12), [Q013 두 개의 흐름](docs/production/Q013-TWO-FLOWS-REPORT.md)(기관·기관지 네 장면·숨만 바꾸는 두 흐름 관찰기·공기와 점액 나누기, 680XP·420G, Lv.13)을 공개했고 출시 상한은 30이다. 다음 작업은 Q014 교환의 창이다.

**기본·심화 과정(D108):** [장기마다 일반인도 이해할 만큼 쉬운 기본을 먼저 하고, 졸업하면 다음 장기로 가며 졸업한 장기는 언제든 다시 골라 심화를 배운다](docs/design/19-BASIC-AND-ADVANCED.md). 심장은 Q010 졸업 특집호까지, 다음은 호흡기(코부터). 기본 과정 Q007~Q010과 심장 졸업 표시, 바디스코프 장기 고르기(D111)는 구현됐고 심화 내용은 아직이다.

**심장 학습 루프(D106 1차 구현):** [현장 확인(이름표 가린 문제·별)·핵심 12 먼저·혈류 배달 런(매번 보상)](docs/design/18-HEART-LEARNING-LOOP.md). 우심방의 안내 로봇 바디에게 말을 걸어 배달을 시작한다. D108: Q006을 마치면 관상동맥으로 심실 벽 근육에 산소를 나르는 심장 근육 배달이 열리고, 바디스코프 심장 지도에 방별 별과 메달이 채워진다.

**전신 장 지도·한국 우선 질환(D114, 설계만):** [인체의 모든 부위를 장마다 차례로 다루고, 갑상샘암·위암·대장암·간암·결핵·뇌졸중·치매·우울증처럼 한국인에게 부담이 큰 질환을 장마다 넣는다](docs/design/21-WHOLE-BODY-CHAPTERS-AND-KOREA.md). 장 지도는 D115에서 확정했다: 입·소화 21~28 → 호르몬·대사 29~32 → 신장·비뇨 33~36 → 뇌·신경·마음 37~43 → 눈·귀·감각 44~47 → 뼈·관절·근육 48~52 → 피부·면역·혈액 53~56 → 골반·생식·생애주기 57~60. 어느 문서가 지금 기준인지는 [문서 지도](docs/00-DOCUMENT-MAP.md)에 있다.

**추가 설계(D076, 구현 전):** [특종 잭팟·의학 미스터리·돌발 뉴스/비밀 제보·전국 취재 월드](docs/design/17-DYNAMIC-NEWS-AND-REGIONAL-WORLD.md). 현재 심장에서는 심장 관련 사건만, 새 기관마다 해당 사건을 동반하며 기본판 전체 입문/검수 및 Lv.99 달성 후 전 분야 무작위 심화 취재를 연다. 기존 '오늘의 점심' 기획은 별도 유지한다. **아직 게임 기능은 추가되지 않았다.**

## 조작

- PC: 방향키/WASD 이동 · 클릭한 곳으로 걷기 · E/Space 대화·살펴보기 · J 수첩 · M 지도 · H 유로프라자 복귀 · Esc 메뉴. 취재 의뢰를 받은 뒤 바디스코프 앞에서 기기를 바라보고 멈추면 입장 창이 자동으로 열린다.
- 마우스·터치: 화면을 누르면 그곳으로 걷고, 꾹 누른 채 움직이면 손가락 쪽으로 계속 걷는다. 사람·사물을 누르면 다가가서 말을 건다. 대화창·창은 아무 곳이나 누르면 넘어가거나 닫힌다.
- 모바일: 왼쪽 아래 조작볼로 걷고 오른쪽 확인으로 가까운 사람·구조를 살펴보거나 대화를 넘긴다. 선택지는 직접 누른다. 오른쪽 위 심장 주기 헤더를 누르면 접거나 펼친다(모바일은 처음 접힘).
- 수첩: 분류 탭을 고르고 기관·방·기록을 접고 펼친다. 기사/반응은 수첩에서 다시 읽는다. 결과창은 ‘결과 바로 보기’로 연출을 넘길 수 있고 과거 결과는 새 보상을 주지 않는다.
- 큰길 횡단보도는 보행 신호가 초록불일 때만 건널 수 있다. 깜빡이면 새로 건너지 않는다.
- 길을 잃으면 오른쪽 위 **유로프라자 복귀** 버튼(PC는 H)으로 언제든 유로프라자 정문 앞으로 돌아온다(심장 속 제외). 동네의 걸을 수 있는 곳은 모두 횡단보도(올림픽대로는 나들목 지하보도)로 유로프라자까지 이어진다. 지도 북서쪽은 한강이라 들어갈 수 없다.
- 저장은 자동. 메뉴 → 기록·저장에서 파일로 내보내기/불러오기/백업 복구.

## 먼저 읽을 문서

어느 문서가 지금 기준인지는 [문서 지도](docs/00-DOCUMENT-MAP.md)에서 먼저 확인한다.

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
19. [특종·돌발 뉴스·전국 취재 월드](docs/design/17-DYNAMIC-NEWS-AND-REGIONAL-WORLD.md).
20. [심장 탐사 학습 루프](docs/design/18-HEART-LEARNING-LOOP.md).
21. [기본 과정과 심화 과정](docs/design/19-BASIC-AND-ADVANCED.md).
22. [호흡기 기본 장](docs/design/20-RESPIRATORY-BASIC.md).
23. [전신 장 지도와 한국 건강 우선순위](docs/design/21-WHOLE-BODY-CHAPTERS-AND-KOREA.md).

[HUD·모바일 UX 개발 원칙](docs/design/15-HUD-AND-MOBILE-UX.md)을 UI와 후속 기능에 적용한다.

## 작업을 이어갈 때

[현재 상태](docs/production/STATUS.md) → [결정 기록](docs/decisions/DECISIONS.md) → [작업 큐](docs/production/BACKLOG.md)를 읽는다. 다음 순서는 AGENTS.md 2절 ‘지금 어디까지’를 따른다(심장 기본 Q001~Q010 완료 → 호흡기 기본 장 Q011(D112)·Q012(D113)·Q013(D117) 완료 → 바디스코프 3D 외형 모형(D118) → Q014 · 점심 그림 확인 대기). 심장 탐사·기사 플레이 피드백과 의학·아트 검수는 별도 게이트다.

- 실행: Node 24.19.0 / npm 12.2.0에서 `npm ci` → `npm run dev`. 이 Mac의 셸에 Node가 없으면 `bash tools/npm-local.sh run dev`.
- 검증: `npm run typecheck`, `npm test`, `npm run test:e2e`, `npm run build`. 최신 실행 결과는 [현재 상태](docs/production/STATUS.md)와 [첫 기사 기록](docs/production/Q001-ARTICLE.md)에 남긴다. [기존 오류 점검](docs/production/CODE-AUDIT-2026-10-11.md) · [뒷모습·모바일 생성 화면](docs/production/MOBILE-CREATOR-AND-REAR-WALK.md).
- 설계 검사: `python3 tools/check_design.py`. 수치 변경 시 data/balance 원본과 문서를 함께 고친다.
- 배포: `main`에 push하면 GitHub Actions가 테스트·빌드 후 Pages에 게임(루트)과 설계실(/design/)을 올린다. 1~2분 뒤 같은 주소를 새로고침하면 최신 버전이다.
- 의학 내용은 검수 전 초안이다. 공개 게임에는 ‘검수 전 모형’ 표시와 함께 시제품으로만 싣고, 공개 도감과 정식 출시는 출처 확인과 의학 검수 뒤에 한다.

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
