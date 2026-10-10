# 이 프로젝트에서 작업할 때

- 현재 게임은 redesign-1 + Q001 입구(D037~D044)이다. 그래픽은 src/art/에서 코드로 그리는 픽셀 아트이며 Phaser는 쓰지 않는다. 새 그래픽도 같은 16px 격자·윤곽선·정수 배율 규칙을 따른다. 인물 픽셀 배치는 src/art/avatar.ts(DOM 없음, 머리 템플릿)에서 바꾸고 문자 격자로 미리 확인한다. 인물은 docs/production/CHARACTER-STYLE.md의 v3 얼굴 원리(낮고 넓은 눈·볼터치·색 외곽선)와 v4 비율(바람의나라식 약 2.4등신)을 지킨다. 이전 단계 구분: P1 기반 구현. P0 사용자/의학 검토와 P2 아트 게이트는 별도로 남아 있다. 먼저 README.md, docs/production/STATUS.md, docs/decisions/DECISIONS.md, docs/production/BACKLOG.md를 읽는다.
- 사용자가 지정한 단계의 범위를 우선한다. 지금 없는 게임·검수·테스트를 완료했다고 기록하지 않는다.
- 기존 사용자 파일과 로컬 변경을 보존한다. 사용자 요청(D038)에 따라 main push가 GitHub Pages에 게임을 배포하므로, push 전에 typecheck·test·build를 통과시킨다.
- 도메인 상태/보상은 application을 통해 갱신하고 Phaser/DOM에서 직접 변경하지 않는다.
- 의학 본문은 코드와 분리하고(data/content/) 출처·검수 상태·단순화 한계를 기록한다. 초안은 승인 콘텐츠가 아니며 화면에 ‘검수 전 모형’을 표시한다. tools/check_game_build.py가 이 경계를 검사한다.
- 수치 변경 시 data/balance 원본과 파생 문서를 함께 갱신한다. python3 tools/render_levels.py 후 python3 tools/check_design.py를 실행한다.
- 단계 완료 시 STATUS와 관련 결정·작업 큐를 갱신하고 실제 검증과 미검증 범위를 구분한다.

- UI/UX 작업과 새 기능 추가 전 docs/design/15-HUD-AND-MOBILE-UX.md를 읽고 따른다. 월드를 우선하고 관리 기능은 메뉴로 묶으며 현재 목표와 상황 행동만 상시 표시한다. 모바일 가로/세로에서 기능 누락·겹침·터치 영역·포커스를 검증한다.
