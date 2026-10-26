# 문서 지도와 우선순위

2026-10-25 · D114. 문서가 많아져 어느 것이 지금 기준인지 헷갈리지 않게 만든 목록이다. 새 문서를 만들거나 어떤 문서를 대체하면 이 표를 함께 고친다.

## 우선순위

1. 사용자 지시(대화). 결정 기록에 남긴다.
2. [AGENTS.md](../AGENTS.md): 작업 규칙과 현재 위치.
3. 최신 설계 지침: [설계 21](design/21-WHOLE-BODY-CHAPTERS-AND-KOREA.md)(전신 장 지도·한국 우선 질환, 장 지도 D115 확정) → [설계 20](design/20-RESPIRATORY-BASIC.md)(호흡기 기본 장) → [설계 19](design/19-BASIC-AND-ADVANCED.md)(기본·심화).
4. 개별 설계 문서 01~18. 머리말에 ‘변경’ 상자가 있으면 그 상자가 본문보다 우선한다.
5. 기록: STATUS·BACKLOG·DECISIONS·취재 보고서·ARCHIVE. 그때의 사실이며 지금 규칙이 아니다.

## 현재 상태를 보는 곳

| 문서 | 역할 |
|---|---|
| [현재 상태](production/STATUS.md) | 맨 위 ‘지금 한눈에’와 D109 이후 작업 기록 |
| [작업 큐](production/BACKLOG.md) | 맨 위 ‘지금 큐’·사람 확인 게이트·열린 질문 |
| [결정 기록](decisions/DECISIONS.md) | D001부터 오래된 것 순서 |
| [README](../README.md) | 바깥에 보여 주는 요약과 조작법 |
| [마스터 로드맵](00-MASTER-ROADMAP.md) | 목표·출시 계단·단계·1.0 완료 정의 |

## 설계 문서 상태

| 문서 | 상태 | 우선하는 문서 |
|---|---|---|
| [01 원칙과 핵심 루프](design/01-GAME-VISION.md) | 현행 | |
| [02 진행](design/02-PROGRESSION.md) | 일부 대체 | 직급·숙련·심화 XP는 19 |
| [02A 레벨 표](design/02A-LEVEL-CATALOG.md) | 자동 생성(D115 장 지도 반영) | 원본은 levels.v0.2 |
| [03 첫 10레벨](design/03-FIRST-TEN-LEVELS.md) | 일부 대체 | Q007~Q010은 19, 출시 상한은 30 |
| [04 월드·퀘스트](design/04-WORLD-AND-QUESTS.md) | 기획 가설 | 장 순서는 21, 실제 월드는 DISTRICT-1KM·EUROPLAZA-INTERIOR |
| [05 경제·편집국](design/05-ECONOMY-AND-NEWSROOM.md) | 현행, 편집국 확장 미구현 | |
| [06 기술 구조](design/06-TECHNICAL-ARCHITECTURE.md) | 일부 대체 | Phaser·IndexedDB 서술은 옛 결정, 현재 구조는 머리말과 AGENTS 4절 |
| [07 콘텐츠·검수](design/07-CONTENT-AND-REVIEW.md) | 현행 | 공개 시제품의 초안 표시는 머리말(D114) |
| [08 UX·아트·오디오](design/08-UX-ART-AUDIO.md) | 일부 대체 | HUD는 15, 인물 규격은 CHARACTER-STYLE |
| [09 품질·출시](design/09-QUALITY-AND-RELEASE.md) | 현행 | 실제 검증 결과는 STATUS |
| [10 Lv.99 이후](design/10-FUTURE-DEVELOPMENT.md) | 제안 | |
| [11 생활·캐릭터·집](design/11-LIFE-CHARACTER-HOUSING.md) | 일부 구현 | 카페·진U·옷가게 구현, 집 미구현 |
| [12 전신 아틀라스](design/12-WHOLE-BODY-ATLAS.md) | 일부 대체 | 레벨 구간은 19·21 |
| [13 기자 아카데미](design/13-HEALTH-JOURNALISM-CURRICULUM.md) | 일부 대체 | 기본 실습 4종은 19 |
| [14 아트 제작](design/14-2_5D-ART-PRODUCTION.md) | 일부 대체 | 인물 규격은 CHARACTER-STYLE |
| [15 HUD·모바일](design/15-HUD-AND-MOBILE-UX.md) | 현행 | |
| [16 질환 아카데미](design/16-DISEASE-ACADEMY.md) | 일부 대체 | 기본·심화는 19, 질환 배치는 21 |
| [17 돌발 뉴스·전국 월드](design/17-DYNAMIC-NEWS-AND-REGIONAL-WORLD.md) | 설계만 | 후보 범위는 19 |
| [18 심장 학습 루프](design/18-HEART-LEARNING-LOOP.md) | 구현됨 | 졸업 특집호는 Q010 |
| [19 기본·심화](design/19-BASIC-AND-ADVANCED.md) | 현행 지침 | |
| [20 호흡기 기본 장](design/20-RESPIRATORY-BASIC.md) | 현행, 진행 중 | |
| [21 장 지도·한국 우선](design/21-WHOLE-BODY-CHAPTERS-AND-KOREA.md) | 현행, 장 지도 확정(D115) | |

## 제작 문서 (production)

- 장기 공간 계약: [HEART-INTERIOR](production/HEART-INTERIOR.md), [RESPIRATORY-INTERIOR](production/RESPIRATORY-INTERIOR.md).
- 취재 보고서: [Q001](production/Q001-ARTICLE.md)부터 [Q013](production/Q013-TWO-FLOWS-REPORT.md)까지. 다음 취재를 만들 때 바로 앞 보고서를 본다.
- 월드: [DISTRICT-1KM](production/DISTRICT-1KM.md), [EUROPLAZA-INTERIOR](production/EUROPLAZA-INTERIOR.md), [MOVEMENT-AND-STREET](production/MOVEMENT-AND-STREET.md).
- 생활: [LUNCH-QUEST](production/LUNCH-QUEST.md), [ARTICLE-REACTIONS](production/ARTICLE-REACTIONS.md), [NOTEBOOK-STRUCTURE](production/NOTEBOOK-STRUCTURE.md).
- 아트: [CHARACTER-STYLE](production/CHARACTER-STYLE.md), [PIXEL-ASSETS](production/PIXEL-ASSETS.md), [REDESIGN-1](production/REDESIGN-1.md).
- 운영: [WEB-PUBLISHING](production/WEB-PUBLISHING.md), [CONTENT-BUDGET](production/CONTENT-BUDGET.md), [ESTIMATES-AND-RISKS](production/ESTIMATES-AND-RISKS.md).
- 지난 기록: [STATUS 기록](production/STATUS-ARCHIVE-2026-10.md), [작업 큐 기록](production/BACKLOG-ARCHIVE-2026-10.md), [옛 AGENTS](production/AGENTS-ARCHIVE-2026-10.md).
- 출처: [SOURCES](references/SOURCES.md). 취재별 의학 출처는 각 `data/content/*.json`의 `sources`에 있다.
