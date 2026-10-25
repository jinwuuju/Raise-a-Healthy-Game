# 출처와 확인 범위

확인일 2026-10-10. 기술 정보는 아래 공식 페이지를 읽어 확인했다. 본 설계의 경험치·가격·시간·콘텐츠 수·성능은 독자적으로 제안한 가설이며 공식 자료의 사실로 주장하지 않는다.

| ID | 공식 자료 | 확인한 내용 | 제한 |
|---|---|---|---|
| TECH-001 | [Phaser 4.0.0 release](https://phaser.io/download/release/v4.0.0) | 2026-04-10 정식 릴리스·npm 제공 | 최신 4.x 패치 고정·실행 검증 아님 |
| TECH-002 | [Phaser project templates](https://docs.phaser.io/phaser/getting-started/project-templates) | Vite/TypeScript 선택 가능 | 오래된 개별 예제는 v3 기반일 수 있음 |
| TECH-003 | [Phaser installation](https://docs.phaser.io/phaser/getting-started/installation) | 패키지 설치와 TypeScript 정의 제공 | 프로젝트 설정은 P1에서 직접 확인 |
| TECH-004 | [Vite guide](https://vite.dev/guide/) | Node 요구조건·TS 템플릿·빌드 흐름 | 설치 버전/플러그인에 따라 추가 조건 |

## 의학 근거의 현재 상태

> D114: 이 절은 2026-10-10 당시 서술이다. 구현된 취재(Q001~Q012)의 의학 출처는 각 `data/content/*.json`의 `sources`에 절·확인일과 함께 있다.

현재 문서는 콘텐츠 제작 설계이지 의료정보 검수본이 아니다. 순환·신호·가스교환 등의 항목은 제작 주제이며 특정 치료·진단 기준을 제공하지 않는다. 실제 콘텐츠에는 주장별 참고 문헌과 전문가 검토가 필요하다. 이번 단계에서 의료 출처를 확인했다고 표시하지 않는다.

P0-03에서 심장 입문 주제의 주장 목록을 확정한 뒤 국가 보건기관·전문기관·의학교육 자료·교과서 등에서 각 주장에 대응하는 원문을 찾는다. URL만 등록하지 말고 제목·기관/저자·판본/날짜·확인일·장/절·해당 주장을 기록한다.

## v0.2 참고 자료

- [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages): 정적 빌드/업로드/배포와 Pages 설정 경로 확인.
- [GitHub 라이선스 안내](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository): 공개 저장소와 오픈소스 이용허락의 구분 확인. 프로젝트 자체 제작물은 권리 유보 정책.
- [MedlinePlus Health Topics](https://medlineplus.gov/healthtopics.html): 부위/계통/건강 주제를 교차 탐색하는 범위 참고. 이 링크가 아틀라스 해부 항목(D114 기준 157개)이나 의료 주장 전체를 검수한 근거는 아님.

바람의나라 모바일·스타듀밸리는 사용자가 제시한 분위기 참고다. 이들 작품의 이미지·자산·로고를 복사하거나 배포하지 않는다.


## 한국 건강 통계·정책 (D114, 설계 21)

[설계 21](../design/21-WHOLE-BODY-CHAPTERS-AND-KOREA.md)의 한국 우선 질환 근거다. 2026-10-25에 보도·지표로 확인했고, 각 장을 만들 때 공식 원문(보도자료·보고서)을 다시 확인한다. 질환 장부의 `sources`와 같은 id를 쓴다.

| ID | 자료 | 확인한 내용 | 제한 |
|---|---|---|---|
| KR-CANCER-2023 | [2023년 국가암등록통계 보도 (보건복지부·중앙암등록본부 발표 2026-01-20)](https://www.kyeonggi.com/article/20260120580302) | 발생 순위, 성별·연령별 1위 암, 5년 상대생존율 | 보도로 확인, 원문 재확인 필요 |
| KR-DEATH-2025 | [2025년 사망원인통계 보도 (국가데이터처 발표 2026-09-22)](https://www.wikitree.co.kr/articles/1161649) | 10대 사망원인 순위, 연령별 1위 사인 | 보도로 확인, 원문 재확인 필요 |
| KR-DEATH-2025-CANCER | [2025년 사망원인통계 보도: 암종별 사망률](https://news.mtn.co.kr/news-detail/2026092215271156528/share-modal) | 암 사망률 폐·간·대장·췌장·위 순, 치매 사망 증가 | 보도로 확인, 원문 재확인 필요 |
| KR-DEATH-2024-INDEX | [e-나라지표 사망원인별 사망률 추이 (2024년 통계)](https://www.index.go.kr/unify/idx-info.do?idxCd=1012) | 2024년 10대 사망원인과 자살률(공식 지표) | 공식·학술 원문 |
| KR-SCREEN-6 | [국가암검진 6대암 정책 안내 (대한민국 정책브리핑)](https://www.korea.kr/news/policyNewsView.do?newsId=148923727) | 6대암 검진 대상과 주기 | 공식·학술 원문 |
| KR-CANCER-PLAN-5 | [제5차 암관리종합계획(2026~2030) 보도 (보건복지부 발표 2026-02-24)](https://www.khan.co.kr/article/202602241730001) | 대장내시경 검진 전환·폐암 검진 대상 확대 추진(목표 2028) | 보도로 확인, 원문 재확인 필요 |
| KR-THYROID-SCREEN-2015 | [갑상선암 검진 권고안 (국립암센터 주관 제정위원회, 2015)](https://synapse.koreamed.org/articles/1042935) | 무증상 성인 초음파 선별검사의 근거 평가와 권고 | 공식·학술 원문 |
| KR-TB-2025 | [2025년도 결핵환자 신고현황 보도 (질병관리청 발표 2026-03-24)](https://www.mt.co.kr/thebio/2026/03/24/2026032410305819188) | 환자 수 감소, 65세 이상 비중, OECD 발생률 2위·사망률 3위 | 보도로 확인, 원문 재확인 필요 |
| KR-SUICIDE-GUIDE-4 | [자살예방 보도준칙 4.0 (한국기자협회·보건복지부·한국생명존중희망재단)](https://journalist.or.kr/news/section4.html?p_num=12) | 자살 보도 원칙 | 공식·학술 원문 |
