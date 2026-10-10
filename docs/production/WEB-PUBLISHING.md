# GitHub Pages 설계실·업데이트 운영

> **D038:** Pages 루트(`/`)에 게임, `/design/`에 이 설계실을 함께 배포한다. workflow는 설계 검사→설계실 생성→단위 테스트→게임 빌드→두 결과 합치기→배포 순서다.

## 배포 대상

저장소: [jinwuuju/Raise-a-Healthy-Game](https://github.com/jinwuuju/Raise-a-Healthy-Game).
사이트 주소: [Raise a Healthy Game](https://jinwuuju.github.io/Raise-a-Healthy-Game/).

현재 사이트는 설계 v0.2를 읽고 캐릭터·전신·레벨·생활 경제 방향을 살펴보는 **설계실**이다. Phaser RPG가 실행되는 페이지는 아직 아니다. 사이트에서 모든 미래 기능을 구현된 것처럼 표시하지 않는다.

## 원본과 배포의 관계

- `docs/`: 상세 설계 원본.
- `data/catalog/`, `data/balance/`: 전신·레벨·제작 수량 원본.
- `site/`: 사이트 화면·스타일·인터랙션 원본.
- `tools/build_site.py`: 문서를 안전한 HTML과 검색 데이터로 변환하는 생성기.
- `_site/`: 생성된 공개 파일만 보관. Git에 직접 커밋하지 않음.
- `.github/workflows/pages.yml`: 검사→생성→검사→Pages 업로드/배포.

GitHub Pages 설정에서 Source를 **GitHub Actions**로 1회 지정해야 한다. 설정 접근 제한 때문에 이 단계가 완료되지 않으면 파일 업로드 성공과 실제 사이트 공개를 구분해 STATUS에 남긴다. 배포 workflow만 넣었다고 Pages 활성화가 자동 보장되는 것은 아니다.

## 함께 수정할 때

1. 로컬/작업 브랜치에서 docs/data/site 원본을 수정한다.
2. `python3 tools/render_levels.py`로 레벨 표를 갱신한다.
3. `python3 tools/check_design.py`로 설계 일관성을 확인한다.
4. `python3 tools/build_site.py` 후 `python3 tools/check_site.py`를 실행한다.
5. 필요한 브라우저 화면/동작을 확인한다.
6. 변경을 커밋하고 main에 push 또는 PR merge한다.
7. Pages workflow 성공과 배포 URL의 변경 내용을 확인한다.

**파일 저장만으로 GitHub에 자동 업로드하지 않는다.** main에 반영된 변경을 자동 배포한다. 실험/미검수 내용을 원치 않게 공개하는 파일 감시 동기화는 사용하지 않는다.

## 로컬 보기

`python3 -m http.server 4173 --directory _site` 후 브라우저에서 `http://127.0.0.1:4173`을 연다. Python 3.9 이상, 외부 Python 패키지 불필요. 사이트 생성에 Node가 필요하지 않다. 게임 제작 도구체인 설치는 별도 P1 작업이다.

## 검사와 실패 처리

배포는 check_design, build_site, check_site가 모두 성공한 뒤 진행한다. 실패 시 기존 공개 버전을 유지하고 실패한 작업 로그를 확인한다. 정적 링크는 프로젝트 하위 경로에서도 작동하게 상대 경로로 만든다. 자동 생성 HTML을 직접 수정하지 않는다.

브랜치 충돌은 원격 최신 커밋을 확인한 뒤 해결한다. 강제 push·원격 삭제·다른 저장소 이력 덮어쓰기를 하지 않는다. 사이트 롤백은 이전 소스로 되돌리는 새 커밋 또는 이전 검증 아티팩트의 재배포로 처리한다.

## 공개 데이터·저작권

출력은 설계 문서·카탈로그·사이트 자산·권리 고지만 허용한다. 로컬 경로, 인증정보, .git, 임시 검사 파일, 사용자 저장 데이터는 업로드하지 않는다. 원본 의료 초안은 기획/미검수임을 표시하며 실제 의료 정보 안내 카드와 구분한다. 푸터·문서·LICENSE에 ©2026 진우주 표기를 유지한다.
