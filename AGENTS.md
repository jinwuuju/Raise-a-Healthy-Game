# 이 프로젝트에서 작업할 때

- 현재 단계는 설계다. 먼저 README.md, docs/production/STATUS.md, docs/decisions/DECISIONS.md, docs/production/BACKLOG.md를 읽는다.
- 사용자가 지정한 단계의 범위를 우선한다. 지금 없는 게임·검수·테스트를 완료했다고 기록하지 않는다.
- 기존 사용자 파일과 로컬 변경을 보존한다. 원격 저장소 생성·배포는 별도 요청 없이 하지 않는다.
- 도메인 상태/보상은 application을 통해 갱신하고 Phaser/DOM에서 직접 변경하지 않는다.
- 의학 본문은 코드와 분리하고 출처·검수 상태·단순화 한계를 기록한다. 초안은 승인 콘텐츠가 아니다.
- 수치 변경 시 data/balance 원본과 파생 문서를 함께 갱신한다. python3 tools/render_levels.py 후 python3 tools/check_design.py를 실행한다.
- 단계 완료 시 STATUS와 관련 결정·작업 큐를 갱신하고 실제 검증과 미검증 범위를 구분한다.
