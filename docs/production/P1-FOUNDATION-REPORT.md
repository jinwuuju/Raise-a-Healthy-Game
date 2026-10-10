# P1 초기 실행 기반 구현 기록

이 문서의 G0/schema1/7+11검사는 첫 기반 버전의 기록이다. 사용자 수정 이후 현재 구현은 [거리·조작감 명세](MOVEMENT-AND-STREET.md)와 [STATUS](STATUS.md)에 기록한다. 전체 게임 화면/픽셀 자산/4개 공간/카페/schema2/새 입력 검증을 추가했다.

- 대표 작업 ID: P1-01 / 연결 범위: P1-02, P1-03, P1-AVATAR, P1-04, P1-05의 G0 최소 구현.
- 날짜: 2026-10-10. 버전: foundation-1 / save schema 1. P1 전체 승인이나 P2 완료 기록 아님.
- 목표: 설계 파일만 있던 프로젝트를 실행 가능한 로컬 Phaser 기반으로 전환.

## 구현과 상태 소유권

`src/domain`에 저장 계약·발 충돌·범위 판정을 두고, `src/application/game.ts`가 모든 진행/위치/외형 변경을 처리한다. Phaser/DOM은 명령을 보내고 projection만 읽는다. 의료 본문을 하드코딩하지 않으며 이번 content에는 허구의 편집국 대사만 있다.

편집국/로비는 640×360의 G0 시험 공간이다. 계획된 20×14 편집국/24×18 심장 맵의 실제 제작은 후속 단계다. 세 프리셋은 임시 도형의 색으로 구분하며 실제 4방향 스프라이트·의상 합성 구현은 아니다.

HTML native dialog로 포커스 제한·Esc 복귀·Phaser 키 입력 잠금을 연결했다. 캔버스가 포커스된 상태에서 방향키/WASD로 이동하며 HTML 방향 버튼으로도 이동한다. 표식 클릭과 E/조사 버튼은 동일 application 거리 검사를 거친다.

IndexedDB 한 트랜잭션에서 revision 비교, 저장 상태, 정상 백업 2개를 갱신한다. Web Locks로 한 탭만 쓰기 권한을 갖는다. 잠금 미지원은 읽기 전용. 저장 실패 시 도메인 상태/보상 원장을 변경하지 않는다. 파일 import는 크기·버전·스키마·안전 위치를 검증하며 명시적 확인 후 적용한다. 지원하지 않는/손상된 기존 기록은 자동 덮어쓰지 않고 원본 export와 명시적 정상 백업 복구를 제공한다. 복구 시 손상 원본도 IndexedDB에 보존한다.

조사와 장면 전환, 캐릭터 선택, 파일 복구는 자동 저장한다. 이동만 한 뒤의 위치는 ‘현재 위치 저장’으로 확정한다. 종료 시 비동기 저장 성공을 보장하지 않으므로 저장하지 않은 이동은 마지막 정상 체크포인트에서 재개한다.

`grantOnce`는 후속 퀘스트의 보상 계약이며 이번 UI에 실제 보상 명령은 없다. 테스트에서 사용하는 100XP/100G는 격리된 fixture다. Q001이나 밸런스 원본을 런타임 콘텐츠로 승인/수입한 것이 아니다.

## 도구와 재현

Node 24.19.0, npm 12.2.0, Phaser 4.2.1, TypeScript 7.0.2, Vite 8.3.4, Vitest 5.0.3, Playwright 1.64.0을 고정했다. 정확한 버전과 package-lock.json을 함께 보관한다. 기본 셸에 Node/npm이 없어 앱 번들 Node와 사용자 캐시의 npm을 이용했다. `bash tools/npm-local.sh …`는 이 Mac에서 해당 도구를 사용하고, 설치된 Node/npm이 있는 환경에서는 일반 npm을 사용한다. 앱 번들 또는 캐시가 없는 기기에는 표준 도구 설치가 필요하다.

공식 [Phaser 설치 안내](https://docs.phaser.io/phaser/getting-started/installation), [Vite 안내](https://vite.dev/guide/), [Playwright 안내](https://playwright.dev/docs/intro) 및 공식 Vite vanilla-ts 템플릿을 확인했다. 설치된 Phaser 4.2.1 타입·소스에 맞춰 keyboard manager와 scene plugin을 구분했다.

`publicDir: false`와 명시적 파일 import를 사용하여 raw·README·미검수 데이터가 자동 배포되지 않게 했다. 빌드 검사에서 의학 예시/카탈로그/밸런스/소스가 없는지 확인한다. Phaser/EventEmitter3의 라이선스 고지를 런타임에서 열 수 있다. 게임 빌드와 기존 설계실 `_site`는 별개다.

## 실제 검증

- 타입 검사 통과.
- Vitest 단위/통합 **7개 통과**: 손상/미지원 저장, 충돌, 보상 fixture 멱등성/숫자 범위, 저장 실패 재시도, 입력 잠금, 거리 검사, 읽기 전용/경쟁 revision, import 원본 보존.
- Chromium E2E **11개 통과**: 프리셋 3종 시작/위치 저장/새로고침, 조사·포커스·입력 잠금·충돌·왕복·복원, 두 탭 소유권 전환, 미지원 import와 백업 복구, 390px 화면·200% 글자, 저장 실패 주입, 손상된 IndexedDB의 명시적 복구와 원본 보존, 키보드 이동, 실제 IndexedDB에서 보상 fixture/원장 동시 저장과 stale writer 거부.
- 실제 런타임 스크린샷을 생성하여 화면 확인. G0 도형·한글 표시·도구 버튼 배치를 확인했으며 아트 승인이 아님.
- `npm run build` 및 게임 빌드 경계 검사 통과. 엔진 포함 JS 약 1.40MB / gzip 약 367KB. Vite 단일 청크 500KB 경고가 남아 있으며 숨기지 않았다. 전송 조건 성능 실측과 청크 분리는 후속 검증.
- 별도 임시 디렉터리의 lockfile 기반 `npm ci`와 빌드 재현 결과는 STATUS에 기록한다.
- 문서/설계실 검사 수는 STATUS에 기록한다. 설치 의존성과 생성 결과를 설계 검사 대상에서 제외하도록 도구의 범위를 명시했다. authored 문서와 데이터 검사는 유지한다.

테스트 환경: macOS arm64 / Node v24.19.0 / Playwright Chromium 156.0.8078.4, 기본 viewport 1280×900, 별도 390×844. CPU/GPU별 성능 및 다른 브라우저는 측정하지 않았다.

## 남은 조건

P1-DEPTH는 발 y 정렬·임시 가림 처리까지만 구현했다. 고도/계단·정렬 경계 자동 검사, 여러 왕복 후 메모리/리스너 측정이 남았다. 실제 200% 브라우저 확대는 미실시이며 이번 검사는 CSS 글자 크기 200%다. Safari/Firefox/Edge, 오디오, 터치 지속 이동, 스토리지 미지원 기기의 복구 UI는 별도 실측 필요.

schema 1은 P1 기반 필드만 포함한다. P2에서 questStates/퍼즐/기사/분야 근거를 더할 때 schema 2와 1→2 migrator를 함께 만든다. 정상 데이터의 export/import·백업 경로는 구현했지만 이전 게임 버전 이행을 시험할 기존 버전은 없다.

실제 Q001, 의학 검수, G1/G2, 사용자 형성 평가, 학습 효과, 원격 게임 배포는 수행하지 않았다. 이 조건을 통과하지 않은 채 P2/P3 완료로 표시하지 않는다.
