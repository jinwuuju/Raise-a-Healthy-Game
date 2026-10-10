"""Render the design-only level catalog from the authoritative JSON table."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]

def render():
    data = json.loads((ROOT / 'data/balance/levels.v0.2.json').read_text(encoding='utf-8'))
    lines = [
        '# 레벨 1~99 개별 플레이 계획', '',
        '> 자동 생성 문서. data/balance/levels.v0.2.json을 수정한 뒤 python3 tools/render_levels.py로 갱신한다.', '',
        '모든 행은 설계 초안이다. 각 행은 해당 레벨 부근의 플레이 목표이며 99개 독립 퀘스트를 뜻하지 않는다. 초반은 Q001~Q010 상세 명세를 따르고 후반 취재별 맵·출처·판정은 해당 제작 단계에서 작성한다.', '',
        '해금은 권장 배치다. 실제 취재/선수 개념 조건을 충족해야 하며 레벨만으로 분야 숙련도를 주지 않는다. 직급도 별도 승진 취재가 필요하다.', '',
        f"Lv.99까지 누적 XP 가설: **{data['rows'][-1]['cumulativeXp']:,}**. 각 구간 시간은 구간 전체의 목표이며 실측이 아니다.", ''
    ]
    for row in data['rows']:
        lv = row['level']
        if (lv - 1) % 10 == 0:
            lines += [f"## Lv.{lv}~{min(lv+9,99)} / {row['rankTarget']} / {row['bandPlaytimeTarget']}", '',
                      '| Lv | 누적 XP | 다음 XP | 플레이 목표 | 직접 하는 일 | 해금·성장 제안 | 생활 목표 | 기자 실습 |',
                      '|---:|---:|---:|---|---|---|---|---|']
        nex = '최고 레벨' if row['xpToNext'] is None else str(row['xpToNext'])
        lines.append(f"| {lv} | {row['cumulativeXp']} | {nex} | {row['playBeat']} | {row['playerAction']} | {row['unlockProposal']} | {row['lifeBeat']} | {row['journalismFocus']} |")
        if lv % 10 == 0:
            lines.append('')
    return '\n'.join(lines).rstrip() + '\n'

if __name__ == '__main__':
    target = ROOT / 'docs/design/02A-LEVEL-CATALOG.md'
    target.write_text(render(), encoding='utf-8')
    print('Rendered docs/design/02A-LEVEL-CATALOG.md (99 rows)')
