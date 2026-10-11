"""Verify the runtime bundle keeps the content boundary.

D056: the Q001-Q010 campaign and heart anatomy explorer ship as labelled drafts.
Draft quest text may appear only together with the in-game disclaimer, never as reviewed content, and
design catalogs, examples and raw/source files must stay out of the bundle.
"""
from pathlib import Path
root = Path(__file__).resolve().parents[1]
dist = root / 'dist'
assert (dist / 'index.html').is_file(), 'Missing game entry'
DISCLAIMER = '검수 전 모형'
for path in dist.rglob('*'):
    if path.is_file():
        assert path.suffix not in ('.md', '.json', '.ts'), f'Unexpected source/data: {path}'
        assert not any(p in ('raw', 'examples', 'balance', 'catalog') for p in path.relative_to(dist).parts), f'Draft/source copied: {path}'
        if path.suffix in ('.js', '.html'):
            text = path.read_text()
            for marker in ('medical_reviewed', '심근경색', 'runtimeReady'):
                assert marker not in text, f'Unreviewed medical content in runtime: {marker}'
            if any(marker in text for marker in ('사라진 혈액 배달표', 'heart-out', 'cardio-0.1', 'heart-anatomy-0.1')):
                assert DISCLAIMER in text, 'Draft medical content must carry the in-game disclaimer'
                assert 'draft_unreviewed' in text, 'Medical content must keep its draft status in the bundle'
all_js = '\n'.join(p.read_text() for p in dist.rglob('*.js'))
assert 'cardio-0.1' in all_js and 'heart-anatomy-0.1' in all_js, 'Campaign/anatomy runtime missing'
for relative in ('data/content/cardio-campaign.v0.1.json', 'data/content/heart-anatomy.v0.1.json'):
    import json
    content = json.loads((root / relative).read_text())
    assert content['status'] == 'draft_unreviewed' and content['review'] is None
    assert DISCLAIMER in content['disclaimer']
print('Game build boundary passed: Q001-Q010 and anatomy are labelled unreviewed; no catalogs, examples or raw/source files')
