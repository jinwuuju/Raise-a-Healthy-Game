# 외부 구성요소·출처 고지

프로젝트 자체 제작물: © 2026 진우주. [권리 정책](LICENSE).

## 게임 (redesign-1, 2026-10-10)

배포되는 게임에는 외부 이미지·서체·음원이 없다. 외부 런타임 라이브러리는 바디스코프 3D 외형 모형(D118)의 three.js 하나뿐이며, 그 화면을 처음 열 때만 내려받는 별도 청크에 들어간다. 최소화 과정에서 라이선스 주석이 빠지므로 3D 화면의 ‘오픈소스 고지’에 MIT 전문을 표시한다. 그래픽은 `src/art/`의 자체 코드가 그리고, 글자는 사용자 기기의 시스템 서체를 쓴다. 이전 P1의 Phaser 4.2.1과 EventEmitter3은 D037로 제거했다.

| 구성요소 | 고정 버전 | 출처 | 라이선스 | 사용 |
|---|---|---|---|---|
| TypeScript | 7.0.2 | [공식 프로젝트](https://github.com/microsoft/TypeScript) | Apache-2.0 | 타입 검사, 배포 자산 아님 |
| Vite | 8.3.4 | [공식 프로젝트](https://github.com/vitejs/vite) | MIT | 개발/빌드 |
| Vitest | 5.0.3 | [공식 프로젝트](https://github.com/vitest-dev/vitest) | MIT | 테스트 |
| Playwright Test | 1.64.0 | [공식 프로젝트](https://github.com/microsoft/playwright) | Apache-2.0 | 브라우저 테스트 |
| three.js | 0.186.1 | [공식 프로젝트](https://github.com/mrdoob/three.js) | MIT (Copyright © 2010-2026 three.js authors) | **배포 자산(지연 청크)**: 3D 외형 모형 렌더링·궤도 조작 |
| three.js types | 0.186.0 | [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped) | MIT | 타입 검사 |
| Node.js types | 26.6.5 | [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped) | MIT | 테스트 타입 |

## 설계 웹사이트

자체 작성 HTML/CSS/JavaScript/SVG, 시스템 서체, Python 표준 라이브러리만 사용한다. GitHub Actions의 공식 actions/ 도구는 CI에 쓰며 사이트 자산으로 복제하지 않는다.

참고 작품(바람의나라 연 모바일, 스타듀밸리 등)은 분위기와 읽기 쉬움의 원칙만 참고했고 캐릭터·타일·UI·지도를 복제하지 않았다. 지도/로드뷰 사진은 관찰 자료이며 게임에 포함하지 않았다. 의학·기술 출처는 [출처 문서](docs/references/SOURCES.md)를 참조한다.

## OpenStreetMap 지도 데이터

`data/world/district-*.json`의 도로·건물 윤곽·영역은 OpenStreetMap에서 파생했다. Map data © OpenStreetMap contributors, Open Database License 1.0 (https://www.openstreetmap.org/copyright). 이 파생 데이터베이스도 ODbL 1.0을 따른다. 항공사진·로드뷰 캡처는 참고용으로만 로컬에 두며 저장소·게임에 포함하지 않는다.

