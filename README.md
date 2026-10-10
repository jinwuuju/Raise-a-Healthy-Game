# 메디컬 퀘스트: 의학기자 키우기

Phaser 4 + TypeScript + HTML/CSS로 만드는 **2.5D 픽셀아트 건강기자 생활·탐험 RPG**. 기획·개발: **진우주**.

> **현재는 설계 확장 v0.2 / 2026-10-10. 게임 구현 전 단계다.**
> 이 폴더에는 상세 설계, 1~99 레벨 계획 데이터, 콘텐츠 예시, 프로젝트 디렉터리와 기본 설정이 있다. 실행 가능한 게임, 설치된 엔진, 의학 검수 완료 콘텐츠는 아직 없다.

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

## 작업을 이어갈 때

[현재 상태](docs/production/STATUS.md) → [결정 기록](docs/decisions/DECISIONS.md) → [작업 큐](docs/production/BACKLOG.md)를 읽는다. **다음 작업은 P0-01: 첫 루프의 종이 프로토타입 검토**다. 준비 없이 전체 월드 구현부터 시작하지 않는다.

- 기획 수치: 초기 가설이며 플레이테스트로 조정한다.
- 기술 사실: [공식 출처와 확인 범위](docs/references/SOURCES.md)를 참고한다.
- 의학 내용: 기전과 퍼즐 아이디어는 검수 전 초안이다. 출처 확인과 검수 이후에만 공개 콘텐츠로 사용한다.
- 현 단계 검사: `python3 tools/check_design.py` (문서 링크·레벨 데이터·초기 퀘스트 보상 일관성 검사).
- `npm run dev`는 아직 제공하지 않는다. P1에서 엔진 버전을 고정하고 실행 환경을 만든다.

## 폴더 안내

| 경로 | 역할 |
|---|---|
| `docs/design/` | 게임·학습·기술 상세 설계 |
| `docs/production/` | 현재 상태, 작업 순서, 위험·추정 |
| `docs/decisions/` | 결정과 변경 이유 |
| `docs/templates/` | 단계 완료·퀘스트·검수 기록 양식 |
| `data/balance/` | 레벨 및 초반 보상 설계의 수치 원본 |
| `data/examples/` | 실행용이 아닌 콘텐츠 계약 예시 |
| `data/schemas/` | 향후 JSON Schema 작성 위치 |
| `src/` | 향후 게임 코드의 계층별 디렉터리 |
| `public/assets/` | 제작 원본·게임 배포 자산 구분 |
| `tests/` | 향후 단위·통합·브라우저 검증 |
| `tools/` | 설계 및 콘텐츠 검증 도구 |
| `artifacts/` | 로컬 검증 결과·성능 측정 (기본 Git 제외) |

## 설계 사이트

[GitHub 저장소](https://github.com/jinwuuju/Raise-a-Healthy-Game) · [Pages 주소](https://jinwuuju.github.io/Raise-a-Healthy-Game/).

사이트 공개 여부의 실제 확인 결과는 [현재 상태](docs/production/STATUS.md)에 기록한다. 로컬 생성은 `python3 tools/build_site.py`, 검증은 `python3 tools/check_site.py`, 미리보기는 `python3 -m http.server 4173 --directory _site`다. `main`에 push하면 GitHub Actions가 문서에서 사이트를 재생성한다. 로컬 파일 저장만으로 원격 사이트가 바뀌지는 않는다.

Copyright © 2026 진우주. All rights reserved. 자체 제작물의 권리 정책은 [LICENSE](LICENSE), 외부 구성요소는 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)를 따른다.
