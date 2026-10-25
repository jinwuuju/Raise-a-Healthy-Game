# 이 프로젝트에서 작업할 때

> 2026-10-25 D114 정리판. 결정마다 상세 줄이 쌓였던 옛 본문은 [AGENTS 기록](docs/production/AGENTS-ARCHIVE-2026-10.md)에 그대로 있다. 이 파일은 지금 지킬 규칙과 현재 위치만 담는다. 문서끼리 다르면 [문서 지도](docs/00-DOCUMENT-MAP.md)의 우선순위를 따른다.

> **핵심 원칙(사용자, D115):** 우리는 의사가 아니다. 이 게임이 키우는 능력은 정확히 알고 쉽게 전하는 것이다. 진단·치료 판단을 가르치지 않고, 몸의 원리와 근거를 정확히 이해해 독자에게 쉽고 과장 없이 전한다. 새 콘텐츠는 이 기준으로 고르고 쓴다.

## 1. 시작할 때

- 다른 곳에서도 작업하므로 먼저 `git fetch` 후 원격 main을 fast-forward로 받는다. 로컬 변경은 보존하고 덮어쓰지 않는다.
- 읽는 순서: 이 파일 → [현재 상태](docs/production/STATUS.md) 맨 위 → [작업 큐](docs/production/BACKLOG.md) 맨 위 → 진행 중인 장의 설계(지금은 [설계 20](docs/design/20-RESPIRATORY-BASIC.md)) → 필요하면 [결정 기록](docs/decisions/DECISIONS.md).
- 사용자가 지정한 범위를 우선한다. 하지 않은 구현·검수·테스트를 완료라고 기록하지 않는다.

## 2. 지금 어디까지 (D114, 2026-10-25)

- 공개 게임: 심장 기본 Q001~Q010(졸업), 호흡기 기본 Q011 공기 항구·Q012 갈라지는 길. 출시 상한 Lv.30, 정상 진행으로 Lv.12. 주소 https://jinwuuju.github.io/Raise-a-Healthy-Game/
- 진행 중인 장: 호흡기 기본([설계 20](docs/design/20-RESPIRATORY-BASIC.md)). 다음은 Q013 ‘두 개의 흐름’(기관·기관지: 공기는 오가고 점액은 늘 위로, 기관용골에서 좌우로 갈림, 섬모가 다치면 청소가 느려진다는 연결만). check_design에 Q013 범위의 낱말 금지 규칙을 새로 둔다. 테스트 저장은 `tests/helpers/q013-fixture.ts`.
- 그다음: Q014 교환의 창(+산소 배달 런) → Q015 움직이는 바람 → Q016 천식 → Q017 폐렴(+숨에서 몸까지 이어 달리기) → Q018 감기·독감·코로나19 → Q019 처음 보는 항구 → Q020 호흡기 졸업 → 심장 심화 → D076 EVT-01 → 3장 입·소화 Lv.21~28([설계 21](docs/design/21-WHOLE-BODY-CHAPTERS-AND-KOREA.md) 장 지도, D115 확정).
- 사용자에게 열린 질문: Q020 졸업 특집호 XP(Q019 전), 우울증 기초를 기본 과정에 둘지(지금은 심화, 6장 착수 전).
- 사람 확인 게이트(작업자가 대신할 수 없음): 화면 미감(작업자는 화면을 눈으로 보지 못한다), 의학 검수(모든 의학 본문이 검수 전 초안), 실제 휴대폰·Safari, 재미·학습 효과, 점심 그림 187개 승인.

## 3. 배포·검증

- main에 push하면 GitHub Actions가 설계 검사·설계실 빌드·단위 테스트·게임 빌드 뒤 Pages에 게임(루트)과 설계실(/design/)을 올린다(D038).
- push 전 통과: `npm run typecheck`, `npm test`, `npm run build`(빌드 경계 `tools/check_game_build.py` 포함), `python3 tools/check_design.py`, `python3 tools/build_site.py`, `python3 tools/check_site.py`. 게임을 바꿨으면 `npm run test:e2e`(약 16분)도 돌린다. 문서·설계 데이터만 바꿨으면 브라우저 검사는 생략할 수 있고 STATUS에 그렇게 적는다.
- 배포 뒤 Actions 성공과 공개 주소의 본체 JS가 로컬 빌드와 같은지 확인하고 ‘Record verified … deployment’ 커밋으로 STATUS에 남긴다.
- 이 Mac 셸에 Node가 없으면 `bash tools/npm-local.sh …`를 쓴다.

## 4. 코드 구조

- 렌더러: Phaser 없이 직접 짠 Canvas 2D(redesign-1, D037). 그래픽은 `src/art/`에서 코드로 그리는 픽셀 아트(외부 이미지 0장), 16px 격자·색 윤곽선·정수 배율. 인물은 `src/art/avatar.ts`에서 바꾸고 문자 격자로 미리 확인하며 [CHARACTER-STYLE](docs/production/CHARACTER-STYLE.md)의 v3 얼굴 원리와 v4 비율(약 2.4등신)을 지킨다.
- 계층: 규칙은 `src/domain/`, 상태 변경은 `src/application/game.ts`(Game)만, 화면 `src/ui/`·`src/game/`은 읽기만 한다. 연출·건너뛰기·다시 보기는 상태를 바꾸지 않는다.
- 저장: localStorage schema4 / redesign-1(현재 + 백업 2, 손상 원본 보관, 파일 내보내기·불러오기, D039). 새 필드는 옛 저장에 없으면 빈 기록으로 읽는다. 졸업처럼 완료 기록에서 파생할 수 있는 것은 새 필드를 만들지 않는다.
- 시간: 기기 시계를 Asia/Seoul로 읽는 곳은 `src/domain/clock.ts` 하나뿐이다(`getHours()` 직접 사용 금지).
- 장기 공간: 심장 `src/world/heart-rooms.ts`·`src/game/heart-view.ts`, 호흡기 `src/world/airway-rooms.ts`·`src/art/airway.ts`·`src/game/airway-view.ts`·`src/domain/breath.ts`. 탐험 기록은 저장 `inspected`(호흡기는 `rx:` 접두), 별은 `mastery`를 장기별로 센다(`totalStars`는 심장만).
- 취재 하나의 묶음: `src/domain/qNNN.ts`(규칙)·`qNNN-state.ts`(저장 검증)·`src/ui/qNNN.ts`(내 자리)·관찰기 UI·`data/content/qNNN.v0.1.json`(초안)·`data/balance/qNNN.v0.1.json`(보상)·단위/브라우저 테스트·다음 취재용 테스트 저장 `tests/helpers/qNNN-fixture.ts`·`docs/production/`의 취재 보고서.

## 5. 새 취재·새 장기를 만들 때 확인할 것

- 상호작용 분기에서 의뢰 지점·관찰기는 그 취재 발행 전에만 먼저 동작한다(`!publishedAt` 조건, D110). 발행 뒤에는 확인 문제가 기본이고 관찰기는 ‘관찰기 다시 보기’(main.ts `observerReplay`).
- 의뢰 지점은 확인 문제·잠금 대상이 아니다. 배달 경유지와 겹치면 의뢰 기록을 먼저 하고 배달은 문제 없이 인정한다(D107).
- 호흡기 취재 지점은 refresh에서 잠금·이름 가림을 건너뛴다(main.ts 호흡기 블록, `world.questTargets`).
- 새 장기를 열면 지도 축척·인체 지도(`body-map`의 `opensWith`)·미니맵 열기(main.ts `openMap`, M 키)를 함께 확인한다.
- 수첩 개요의 발행 기사 수와 취재 파일에 새 취재를 넣는다(D113에서 Q011이 빠졌던 빈틈).
- 장기 진입 연출은 약 4초, 건너뛰기·Esc·동작 줄이기, 끝난 뒤 진입 명령 한 번(D072). 바깥 연출이 내부 탐험을 대신하지 않는다.
- check_design에 그 취재의 장면 위치·출처·숫자 금지·질환 낱말 금지·보상 규칙을, check_game_build에 초안 표시 검사를 더한다.
- STATUS·BACKLOG·DECISIONS·README와 관련 설계 문서의 현재 상태 줄을 함께 고친다.

## 6. 의학 내용

- 세 핵심 축은 인체 탐험·질환 취재·기사 작성이다(D071). 기본·심화는 [설계 19](docs/design/19-BASIC-AND-ADVANCED.md), 전신 장 지도와 한국 우선 질환은 [설계 21](docs/design/21-WHOLE-BODY-CHAPTERS-AND-KOREA.md)을 따른다. 인체의 모든 부위를 다룬다(D114). 장 지도는 D115에서 확정했다.
- 기본 과정 계약: 일상어 먼저, 새 이름 3개 이하, 진단 기준 수치·유병률·확률·약 이름 금지, 행동이 읽기보다 먼저, 실패 없음, 쉬운 기자 실습 4종.
- 심화: 그 장기 기본 졸업으로 열리고 레벨로 잠그지 않는다. 심화 XP는 최초 1회, 장기 기본 XP의 50% 이하.
- 심화 전용 질환은 기본 런타임에 나오면 안 된다. 원본은 질환 장부(`data/catalog/diseases.v0.1.json`)의 `depth: advanced`이고, 런타임 금지 낱말은 `tools/check_game_build.py`의 `ADVANCED_ONLY`(공개된 장기 몫)다. 새 장을 열 때 그 장의 심화 질환을 이 목록에 더한다.
- 질환은 기관과 함께 만든다: 정상 → 같은 공간의 질환 레이어 → 6단계 취재 → 기사·팩트체크. 미루면 이유를 BACKLOG·STATUS에 적는다. 아직 없는 기관은 ‘준비 중’으로 두고 빈 내용을 지어내지 않는다.
- 금지: 진단·개인 위험 계산·치료/약 추천(약은 심화에서 계열·원리만), 제품명·용량, 낙인. 기준 수치는 판본·날짜가 있는 카드, 수치는 출처·연도·분모와 함께, 응급 행동 안내는 임상 출처와 검수 뒤, 가상 환자·가상 검사자료는 표시한다.
- 본문은 코드 밖 `data/content/`에 두고 출처·검수 상태·단순화 한계를 적는다. 초안은 화면에 ‘검수 전 모형’을 표시하고 공개 도감에 넣지 않는다. 공개 배포본은 이 표시가 붙은 시제품이며 의학 승인 콘텐츠가 아니다(D015 해석, D114).
- 장기 정확성 계약: 심장 [HEART-INTERIOR](docs/production/HEART-INTERIOR.md)(혈류 순서·판막 일방향·주기), 호흡기 [RESPIRATORY-INTERIOR](docs/production/RESPIRATORY-INTERIOR.md)(공기 길 순서·삼킴 문·점액 방향·그림 정밀도). 장기 공간을 바깥에서 보는 모형으로 되돌리지 않는다.
- 정신건강·자살을 다루는 심화는 자살예방 보도준칙 4.0을 실습 기준으로 쓰고 방법·도구·장소를 묘사하지 않는다(설계 21).

## 7. 보상·경제

- XP는 최초 완료에만 준다. 반복(재발행·배달 런·점심)은 골드·수집만(D066·D107). 배달 런 XP는 처음 해낸 일(첫 배달·첫 S·새 목격)에만.
- 독자 반응 점수·댓글은 기사 품질과 무관한 무작위 조합이며 실력·정확성의 측정값으로 주장하지 않는다. 재발행은 새 반응과 골드만 준다. 결과 다시 보기·건너뛰기는 확정된 결과를 읽기만 한다(D066).
- 필수 진행은 무료이고 골드 0에서도 막히지 않는다. 출시 상한은 `src/domain/quest.ts`의 `RELEASE_CAP = 30`. 상한 뒤 XP는 쌓아 두고 결과 창에 반영 시점을 밝힌다(D110). 상한 30은 3장(Lv.28 졸업)까지 담고, 4장을 공개할 때 60으로 올린다(설계 21).
- 수치는 `data/balance/` 원본을 고치고 문서를 함께 갱신한 뒤 `python3 tools/render_levels.py` → `python3 tools/check_design.py`.
- 명성 3·편집국 확장권(심장 졸업분)은 기능이 생기면 졸업 기록으로 소급한다.

## 8. 화면·UX

- 새 UI 전에 [HUD·모바일 UX 원칙](docs/design/15-HUD-AND-MOBILE-UX.md)을 읽는다. 월드 우선, 관리 기능은 메뉴, 상시 표시는 현재 목표와 상황 행동만. 모바일 가로/세로의 누락·겹침·터치 영역·포커스를 검증한다.
- 시트 안에서 캔버스를 담는 칸에는 `overflow: hidden/clip`을 쓰지 않는다. 격자 칸이 줄어 그림 아래가 잘린다(D116 지도 잘림). 둥근 모서리는 캔버스에 직접 주고, 캔버스 높이는 창이 한 번에 보여 주는 높이에 맞추며, 글자는 캔버스 안에서 서로 겹치지 않게 그린다. 새 시트·관찰기는 `tests/e2e/map-fit.spec.ts`의 잘림 검사에 넣는다.
- 기사 결과는 별도 결과창에서 바로 보여 준다(D065~D066). 참고 게임의 원리만 쓰고 화면·자산·문구를 복제하지 않는다.
- 취재수첩(D067): 현재 할 일 / 취재 의뢰와 근거·초안 / 발행 기사와 독자 반응 / 인체 구조 탐험 / 동네·생활 기록. 기록 본문은 한 분류에만 두고 다른 곳은 링크로 잇는다. 토글과 요약으로 긴 목록을 한 번에 펼치지 않는다.
- 오프닝(D100): 제목 ‘건강 기자 키우기’(제작 진우주). 새 기자만 편집장 앞에서 시작하고 기존 기자는 저장 위치에서 이어 간다(D101). 브라우저 테스트는 DEV+webdriver에서 오프닝을 건너뛰고 `?opening`으로 실제 흐름을 검사한다.

## 9. 월드

- 동네(D096~D105): OSM 기반 실제 축척 `district`(1칸 3m, 반경 1km, 2.1km 정사각형). 수치를 손으로 고치지 말고 생성기 `python3 tools/district/build_district.py`(원본 data/raw는 Git 제외)를 고친다. 지도 데이터는 `loadDistrict()`가 별도 청크로 불러온다. 넓은 땅은 모두 유로프라자와 걸어서 이어져야 하고(`connect_zebras`, `tests/unit/district-reach.test.ts`) 간선도로는 지하보도로 건넌다. 한강은 물이라 걸을 수 없다. 거리는 늘 낮, 걸음 84px/초. 저장 위치가 걸을 수 없게 되면 유로프라자 정문 앞으로 옮긴다. ‘유로프라자 복귀’(H)는 장기 속에서는 숨긴다.
- 가게: 진U(가상 편의점, 실제 상표·간판 복제 금지)·오비트 테일러(가상 옷가게)·비투비씨 카페. 가격 원본 `data/balance/shops.v0.1.json`. 사진 속 다른 실제 상호·로고는 넣지 않는다.
- 유로프라자 실내(D092~D095): 1층 로비 → `lifthall` 승강기 → 4층 복도·바깥 사무실·유리 회의실·라운지(`lounge`)·안쪽 사무실(대표 `ceo`, 편집장 `editor`, 바디스코프는 오른쪽 끝). 옛 위치는 `roomsD093`/`roomsD094`로만 판정해 안전 지점으로 옮긴다. 상세 [EUROPLAZA-INTERIOR](docs/production/EUROPLAZA-INTERIOR.md).
- 효율화는 화면 결과가 같아야 한다(`tests/unit/efficiency.test.ts`). 큰 방 배경은 `src/world/scene-index.ts` 격자, 충돌 마스크는 `maskBlocked()`로만 읽는다.

## 10. 오늘의 점심

- 상세 [LUNCH-QUEST](docs/production/LUNCH-QUEST.md), 수치 `data/balance/lunch.v0.1.json`. 서울 시각 00:00~11:30 전에 주문을 확정하고, 11:30까지 미확정이면 자동 굶음(보상 0·벌칙 0·중립 문구, 굶기를 칭찬하거나 건강하다고 하지 않음). 점심값은 편집국 식대. 보상은 고르기 +10G·신고 적중 +20G·새 도감 +5G, XP 없음. 열지 않은 날은 소급하지 않는다.
- 영양 표시는 식약처 수치를 1인분·1일 기준치 %로 보여 준다. 건강 점수·벌점·비난 대사·좋고 나쁨 색칠 금지.
- 메뉴 수치는 손으로 고치지 않는다. 선정표를 고친 뒤 `python3 tools/build_lunch_db.py`(원본이 없으면 `--from-extract`). 브랜드 행 금지, 분석 → 산출 → 유사 대체(표시) → 값 없음 순(D080).
- 그림은 메뉴마다 고유하다(`tests/unit/food-art.test.ts`). 레시피 `src/art/food-menus.ts`, 부품 `src/art/food-heroes.ts`·`src/art/food-parts.ts`, 미리보기 `node tools/render_food_preview.mjs`. 그림 187개는 사용자 확인 전 ‘초안’. 점심 DB·그림은 `import('./ui/lunch')`로만 불러 첫 로딩에 넣지 않는다.

## 11. 돌발 뉴스·전국 월드 (D076, 설계만)

- [설계 17](docs/design/17-DYNAMIC-NEWS-AND-REGIONAL-WORLD.md). 후보는 진행 중인 기본 장 + 졸업한 장기 + 열린 심화 내용뿐이고, 후보가 없으면 이벤트도 없다. 무관한 질환 조기 공개·강제 이동, 유료 확률·압박형 출석·무한 의료 사건 생성·실제 개인 진단은 금지. 첫 사양 EVT-01은 호흡기 기본 장 뒤에 만든다.
