# 외부 구성요소·출처 고지

프로젝트 자체 제작물: © 2026 진우주. [권리 정책](LICENSE).

현재 설계 웹사이트는 자체 작성 HTML/CSS/JavaScript/SVG, 시스템 서체, Python 표준 라이브러리만 사용한다. 외부 게임의 이미지·캐릭터·음원·타일셋을 포함하지 않는다.

향후 Phaser, TypeScript, Vite, 서체, 음악, 의료 도해를 추가할 때에는 이름·버전·제작자·출처·라이선스·수정 여부·배포 범위를 기록하고 필요한 고지를 함께 배포한다. 기획에서 언급했다는 이유만으로 설치되었거나 사용권을 확보했다고 기록하지 않는다.

GitHub Actions의 공식 actions/ 도구는 CI 작업에 사용하며 웹사이트 자산으로 복제하지 않는다. 의학 출처와 기술 자료는 [출처 문서](docs/references/SOURCES.md)를 참조한다.

## P1 기반에 실제 추가한 구성요소 (2026-10-10)

| 구성요소 | 고정 버전 | 출처 | 라이선스 | 사용/수정 |
|---|---|---|---|---|
| Phaser | 4.2.1 | [공식 프로젝트](https://github.com/phaserjs/phaser) | MIT | 게임 런타임, 원본 변경 없음 |
| EventEmitter3 | 5.0.4 | [공식 프로젝트](https://github.com/primus/eventemitter3) | MIT | Phaser 의존성, 원본 변경 없음 |
| TypeScript | 7.0.2 | [공식 프로젝트](https://github.com/microsoft/TypeScript) | Apache-2.0 | 개발 도구, 배포 자산 아님 |
| Vite | 8.3.4 | [공식 프로젝트](https://github.com/vitejs/vite) | MIT | 개발/빌드 도구 |
| Vitest | 5.0.3 | [공식 프로젝트](https://github.com/vitest-dev/vitest) | MIT | 테스트 도구 |
| Playwright Test | 1.64.0 | [공식 프로젝트](https://github.com/microsoft/playwright) | Apache-2.0 | 브라우저 테스트 도구 |
| Node.js types | 26.6.5 | [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped) | MIT | 테스트용 개발 타입 |

Phaser와 EventEmitter3의 원문 라이선스는 [런타임 고지](public/assets/runtime/THIRD_PARTY_NOTICES.txt)에 포함하고 게임 화면에서 열 수 있다. npm의 전이 개발 의존성은 lockfile과 설치된 각 패키지의 고지를 따른다. 이번 G0 도형/HTML/CSS는 자체 작성이고 외부 이미지·음원·의료 도해는 복제하지 않았다. OpenStax는 콘텐츠 출처 후보로만 참고했다.

현대 서울 게임의 픽셀 건물/캐릭터/소품은 내장 imagegen으로 새로 생성한 통합 표본이다. [자산/프롬프트 기록](docs/production/PIXEL-ASSETS.md)을 보관한다. 지도/로드뷰 사진·기존 게임 자산은 런타임에 복사하지 않았다.
