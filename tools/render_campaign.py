"""Render early campaign/life numeric source register; does not approve medical content."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
def load(name): return json.loads((ROOT / name).read_text())
def render():
    c = load('data/content/cardio-campaign.v0.1.json')
    stages = load('data/balance/campaign-stages.v0.1.json')['stages']
    rewards = load('data/balance/early-quests.v0.1.json')['quests']
    life = load('data/balance/life-shop.v0.1.json')
    simulation = load('data/balance/model-simulation.v0.1.json')
    out = ['# 초반 캠페인·생활 수치 원본 기록', '', '> tools/render_campaign.py가 생성한다. 콘텐츠는 검수 전 모형이며 의료 승인 기록이 아니다.', '', '## Q001~Q010', '', '| 취재 | 제목 | 관찰 XP | 적용 XP | 발행 XP | 합계 XP | G | 명성 |', '|---|---|---:|---:|---:|---:|---:|---:|']
    for q, r in zip(c['quests'], rewards):
        s = stages[q['id']]
        assert q['id'] == r['id'] and sum(s.values()) == r['xp'], 'Stage reward disagrees with source'
        out.append(f"| {q['id']} | {q['title']} | {s['observe']} | {s['apply']} | {s['publish']} | {r['xp']} | {r['gold']} | {r['reputation']} |")
    out += ['', f"무구매 기준선: {sum(r['xp'] for r in rewards):,}XP / {sum(r['gold'] for r in rewards):,}G / 명성 {sum(r['reputation'] for r in rewards)}. 첫 기사 20+30+50XP와 100G 유지. 힌트·시연·재시도는 무료이며 시연 후 새 배치 2개 직접 적용이 필요하다.", '', '## 선택 품목', '', '기본 수첩·도감·기사·숙소는 무료다. 준비물은 핀/메모/즐겨찾기의 편의만 바꾸며 취재 허가·경험치·정확도에 영향이 없다.', '', '| ID | 품목 | 종류 | 가격 G | 발행 해금 |', '|---|---|---|---:|---|']
    for i in life['items']: out.append(f"| {i['id']} | {i['title']} | {i['kind']} | {i['price']} | {i['unlock']} |")
    out += ['', '## 가구 발자국', '', '16px 격자. 회전 시 가로·세로 교환. 바닥 러그를 제외한 배치에는 충돌이 있다. 출입구와 기자가 서 있는 자리는 비운다.', '', '| ID | 가구 | 가로 칸 | 세로 칸 | 가격 G |', '|---|---|---:|---:|---:|']
    for f in life['furniture']: out.append(f"| {f['id']} | {f['title']} | {f['w']} | {f['h']} | {f['price']} |")
    out += ['', '## 가상 모형 표식', '', f"조건 비교: 기준 {simulation['compare']['baselineMarkers']}개 / 변경 {simulation['compare']['changedMarkers']}개. 가상 기록: {simulation['virtualRecords'][0]} / {simulation['virtualRecords'][1]}개. {simulation['limitations']}"]
    return '\n'.join(out) + '\n'
if __name__ == '__main__':
    (ROOT / 'docs/production/CARDIO-CONTENT-REGISTER.md').write_text(render())
    print('Rendered campaign and life numeric register')
