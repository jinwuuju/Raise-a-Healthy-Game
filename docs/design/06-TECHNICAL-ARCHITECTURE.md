# 기술 구조·폴더·초기 설정

> **redesign-1 (D037):** 게임 런타임은 Phaser 대신 자체 Canvas 2D 렌더러(`src/game/world.ts`)를 사용한다. 계층 원칙(도메인 상태는 application만 변경)은 그대로다. 아래 Phaser 관련 서술은 이전 결정 기록이다.

## 기술 선택과 확인 범위

Phaser 4는 2D 월드·카메라·타일맵·캐릭터·애니메이션을 맡는다. TypeScript는 도메인 규칙과 콘텐츠 계약을, HTML/CSS는 대사·도감·기사·설정·학습 설명을 맡는다. 첫 UI는 프레임워크 없는 DOM 컴포넌트로 시작한다. React 등의 추가는 패널 규모와 상태 관리 비용이 확인된 뒤 결정한다.

[Phaser 4.0.0 공식 릴리스](https://phaser.io/download/release/v4.0.0)는 2026-04-10 정식 출시를 명시한다. 따라서 Phaser 4를 미래 베타로 가정하지 않는다. 다만 이 확인이 특정 최신 패치의 프로젝트 호환성을 보장하지는 않는다. P1에서 선택한 **4.x 정확한 버전**으로 이동·타일맵·DOM 포커스·오디오·저장 전환을 검증한다.

[공식 템플릿 안내](https://docs.phaser.io/phaser/getting-started/project-templates)는 Vite/TypeScript 템플릿을 제공한다. 오래된 Phaser 3 예제를 그대로 복사하지 말고 설치 버전의 타입·예제로 API를 확인한다. [Vite 공식 요구사항](https://vite.dev/guide/)은 Node 20.19+ 또는 22.12+를 안내하며 템플릿에 더 높은 요구가 있을 수 있다. 본 프로젝트는 **Node 22.12 이상인 지원 LTS 중 하나**를 P1에서 선택하고 정확한 버전을 `.node-version`에 기록한다.

설계 작성 당시 셸 PATH에 Node가 없었다. 2026-10-10 P1에서 앱 번들 Node 24.19.0과 npm 12.2.0으로 실제 설치했으며 exact dependencies/lockfile/dev/typecheck/build/test/test:e2e를 추가했다. [실제 구현과 검증 범위](../production/P1-FOUNDATION-REPORT.md)를 참고한다. 아래 확장 계약을 모두 구현했다고 해석하지 않는다.

## 디렉터리의 책임

```text
src/
  app/               시작·의존성 연결·화면 생명주기
  domain/            진행도·보상·경제·기사 판정; Phaser/DOM import 금지
  application/       명령 처리·상태 전환·저장 조정
  game/
    scenes/          Boot, Newsroom, WorldMap, OrganExplore
    systems/         이동·충돌·상호작용·퍼즐 표현
  ui/
    components/      대화·도감·기사·설정의 HTML
    styles/          토큰·레이아웃·접근성·인쇄/기사 표시
  infrastructure/    IndexedDB·입력·오디오·측정 어댑터
  content/           데이터 로드·참조 해석; 의료 본문 하드코딩 금지
data/
  balance/           검증 가능한 진행/경제 표
  examples/          계약 초안; 배포 목록에 넣지 않음
  schemas/           P1/P3에서 만들 JSON Schema
public/assets/
  raw/               작업 원본; 빌드 복사에서 반드시 제외
  runtime/           라이선스 검토 후 압축된 배포 자산
```

Vite의 public 자동 복사를 그대로 쓰면 raw가 배포될 수 있다. P1 실제 설정은 `publicDir: false`이며 런타임 고지를 명시적으로 import한다. 이후 자산도 명시적 import/manifest로 추가한다. 어느 방식이든 테스트 빌드에 원본·미검수 데이터가 없는지 검사한다. 콘텐츠 배포는 명시적 manifest allowlist를 사용한다.

단일 저장소·단일 프론트엔드로 시작한다. 모노레포·마이크로서비스·별도 CMS 서버는 현재 규모에 불필요하다. 데이터 파일은 기관별 패키지로 나누고 필요한 자산만 지연 로딩한다.

## 상태의 소유권

GameState의 유일한 쓰기 주체는 application 명령 처리기다. Phaser 씬과 DOM 패널은 projection을 읽고 명령을 보낸다. 두 UI가 서로 다른 골드·퀘스트 상태를 보유하지 않는다.

예시 흐름:

```text
E키/클릭 → Interact(targetId)
         → application: 거리·현재 모드·퀘스트 조건 확인
         → domain: 전이/보상 이벤트 계산
         → persistence: 상태+완료키+보상기록 한 번에 저장
         → view projection 갱신 → 씬/DOM 표시
```

명령 예: AcceptQuest, RecordObservation, ApplyPuzzleAction, SaveDraft, PublishArticle, ClaimReward, PurchaseUpgrade, ChangeSetting. 이벤트 예: QuestAccepted, EvidenceRecorded, ArticlePublished, RewardGranted, RankPromoted. 각 명령에 commandId, 저장에는 revision을 둔다. 씬 전환 후 구독과 리스너를 반드시 해제한다.

보상 규칙은 중앙 함수가 계산한다. UI 버튼·애니메이션 완료 콜백이 골드를 직접 더하면 안 된다. 표현 중 오류가 나도 저장된 보상 기록으로 결과 UI를 복원한다.

## 저장 계약

저장 수단은 IndexedDB 우선, JSON 내보내기/불러오기를 제공한다. settings 같은 작은 비핵심 설정만 localStorage 후보. 핵심 진척을 서로 다른 저장소에 쪼개 원자성을 깨뜨리지 않는다.

필드: schemaVersion, contentVersion, balanceVersion, saveId, revision, createdAt, updatedAt, totalXp, awardedLevelFloor, rank, gold, reputation, specialties, conceptEvidence, questStates, articleRevisions, upgrades, staff, completionLedger, safeLocation, puzzleSnapshots, settings.

보상 원자성: 현재 revision 확인→조건 검증→completionKey 존재 확인→상태·원장·새 revision을 한 IndexedDB transaction에 저장→UI 반영. 두 탭 중 하나만 쓰기 권한을 갖는 세션 정책을 P1에 구현한다. 다른 탭은 읽기/새로고침 안내. 단순 UI 비활성화만으로 중복 방지를 끝내지 않는다.

자동 저장 시점: 의뢰 수락, 관찰 확정, 퍼즐 안전 체크포인트, 초안 변경 디바운스, 발행, 구매, 장면 전환. 매 프레임 저장하지 않는다. 최근 정상 스냅샷 2개와 사용자가 내보낸 파일을 복구 경로로 둔다. 저장 실패 시 성공 메시지를 띄우지 않고 메모리 상태 유지·내보내기를 제공한다.

이행: N→N+1 순차 migrator, 기존 원본 보관, 로드 스키마 검증, 없는 콘텐츠는 삭제하지 않고 보류 기록으로 보존. 더 최신 버전 저장을 구버전에서 덮어쓰지 않는다. 손상 파일은 원본 보존 후 복구 선택. 브라우저 저장이 영구 보장되지 않는 점은 저장 화면에 간단히 안내한다.

## 입력·장면·UI

입력 모드: world, dialog, puzzle, editor, settings. 항상 하나의 활성 모드만 가진다. HTML 모달이 열리면 캐릭터 이동 입력을 막고 닫으면 원래 포커스와 모드를 복원한다. 키보드·클릭·터치는 동일한 도메인 명령을 호출한다. 클릭 좌표를 DOM과 캔버스 사이에서 섞지 않는다.

맵에는 object layer로 spawn, exits, interaction targets, blocked tiles, camera bounds를 정의한다. Tiled JSON을 후보 포맷으로 쓰되 P1에서 직접 읽기와 에디터 제작 흐름을 확인한다. 기관별로 별도 Scene 클래스를 양산하기보다 OrganExploreScene + region definition + puzzle renderer 조합을 우선한다.

## P1 설치 및 초기화 순서

1. Node/npm 사용 가능 여부와 버전을 확인하고 지원 LTS를 선택한다. 프로젝트 루트 전체에 생성기를 덮어쓰지 않는다.
2. 임시 폴더의 공식 Vite TypeScript 템플릿을 확인한 뒤 필요한 설정만 반영한다.
3. Phaser 4.x, TypeScript, Vite 및 테스트 도구의 호환 버전을 정하고 exact version으로 설치한다.
4. `.node-version`, `packageManager`, dependencies, devDependencies, 실제 생성된 package-lock.json을 함께 기록한다. npm을 기본 패키지 관리자로 통일한다.
5. `index.html`, `src/app/main.ts`, `vite.config.ts`, 앱용 `tsconfig.json`을 만든다. 기존 `tsconfig.base.json`을 extends한다.
6. package scripts에 dev, typecheck, build, preview, test, test:e2e, validate:content를 **각 구현이 생긴 시점에** 추가한다.
7. 최소 Phaser 씬과 HTML 버튼을 띄우고 typecheck·build·브라우저 연동을 검사한다.
8. 새 디렉터리에서 lockfile 기반 `npm ci`로 동일 빌드가 되는지 확인한다.

테스트 도구 후보는 Vitest와 Playwright. P1에서 설치 버전의 공식 문서를 확인한다. 현재는 설치되었다고 가정하지 않는다.

## 배포·보안·측정

정적 호스팅을 기본으로 한다. 상대 base path·해시 자산·캐시 정책을 실제 배포 경로에서 검사한다. service worker/PWA는 초기에는 제외하여 오래된 콘텐츠 캐시와 세이브 불일치를 줄인다. 원격 텍스트를 innerHTML로 직접 주입하지 않는다. 파일 import는 크기·스키마를 검증하며 실행 코드를 허용하지 않는다.

측정은 먼저 로컬 디버그 로그로 시작한다. 외부 분석 전송은 기본 비활성. 사용자 자유 메모·건강 정보·문장 전문은 측정하지 않는다. 이벤트는 quest_started, evidence_recorded, hint_used, article_published, save_failed 정도로 제한하고 ID·소요 시간·버전만 기록한다. 재전송이 사용자 보상 처리와 연결되지 않게 한다.

## v0.2 모듈·상태 확장

Phaser 2D 렌더러로 2.5D 공간 표현을 구현한다. AvatarAppearance, Wardrobe, ShopCatalog, HousingOwnership, FurniturePlacement를 domain에 추가하고 PurchaseCosmetic, EquipItem, PurchaseHome, PlaceFurniture 명령을 application에서 처리한다. save에는 avatar, ownedCosmetics, ownedHomes, activeHomeId, roomLayouts, furnitureInventory를 버전과 함께 넣는다. Y정렬·가림·고도는 game 표현 계층 책임이다.

현재 공개 설계실은 `site/` 정적 HTML/CSS/JS와 `tools/build_site.py`로 만든다. 게임 런타임과 별개이며 아직 Phaser 게임을 배포하지 않는다. `_site/`는 생성 결과로 Git에서 제외, GitHub Actions가 docs/data 원본에서 다시 만든다. GitHub 프로젝트 하위 경로를 지원하도록 상대 링크를 사용한다. 향후 게임 빌드를 별도 game/ 경로로 추가하더라도 설계실을 유지한다.
