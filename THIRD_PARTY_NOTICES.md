# 외부 구성요소·출처 고지

프로젝트 자체 제작물: © 2026 진우주. [권리 정책](LICENSE).

## 게임 (redesign-1, 2026-10-10)

P3의 콘텐츠 JSON Schema 검증은 Ajv와 그 종속 라이브러리를 사용한다. 외부 이미지·서체·음원은 포함하지 않는다. 그래픽은 `src/art/`의 자체 코드가 그리고, 글자는 사용자 기기의 시스템 서체를 쓴다. 이전 P1의 Phaser 4.2.1과 EventEmitter3은 D037로 제거했다.

| 개발 도구 | 고정 버전 | 출처 | 라이선스 | 사용 |
|---|---|---|---|---|
| TypeScript | 7.0.2 | [공식 프로젝트](https://github.com/microsoft/TypeScript) | Apache-2.0 | 타입 검사, 배포 자산 아님 |
| Vite | 8.3.4 | [공식 프로젝트](https://github.com/vitejs/vite) | MIT | 개발/빌드 |
| Vitest | 5.0.3 | [공식 프로젝트](https://github.com/vitest-dev/vitest) | MIT | 테스트 |
| Playwright Test | 1.64.0 | [공식 프로젝트](https://github.com/microsoft/playwright) | Apache-2.0 | 브라우저 테스트 |
| Node.js types | 26.6.5 | [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped) | MIT | 테스트 타입 |

## P3 런타임 콘텐츠 검사

| 라이브러리 | 설치 버전 | 라이선스 | 사용 |
|---|---|---|---|
| Ajv | 8.20.0 | MIT | 실제 취재 JSON Schema 검사 |
| fast-deep-equal | 3.1.3 | MIT | Ajv 종속 |
| fast-uri | 3.1.8 | BSD-3-Clause | Ajv URI 처리 |
| json-schema-traverse | 1.0.0 | MIT | Ajv 스키마 순회 |
| require-from-string | 2.0.2 | MIT | Ajv 종속 패키지 |

버전은 `package-lock.json`에서 고정한다. 빌드 시 설치된 라이선스 원문을 `dist/THIRD-PARTY-LICENSES.txt`로 함께 배포한다. 의학 출처의 사실 관계를 바탕으로 직접 작성한 모형이며 원문 이미지·영상·전문을 복제하지 않았다.

## 설계 웹사이트

자체 작성 HTML/CSS/JavaScript/SVG, 시스템 서체, Python 표준 라이브러리만 사용한다. GitHub Actions의 공식 actions/ 도구는 CI에 쓰며 사이트 자산으로 복제하지 않는다.

참고 작품(바람의나라 연 모바일, 스타듀밸리 등)은 분위기와 읽기 쉬움의 원칙만 참고했고 캐릭터·타일·UI·지도를 복제하지 않았다. 지도/로드뷰 사진은 관찰 자료이며 게임에 포함하지 않았다. 의학·기술 출처는 [출처 문서](docs/references/SOURCES.md)를 참조한다.
