"""Verify the runtime bundle keeps the content boundary.

D041/D056: the Q001 entry and the Bodyscope heart interior (data/content/heart-interior.v0.1.json)
ship as labelled drafts.
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
            if '사라진 혈액 배달표' in text or 'heart-out' in text:
                assert DISCLAIMER in text, 'Draft Q001 content must carry the in-game disclaimer'
                assert 'draft_unreviewed' in text, 'Q001 content must keep its draft status in the bundle'
            if 'content.heart.interior' in text or 'hx-moderator' in text:
                assert DISCLAIMER in text, 'Draft heart interior content must carry the in-game disclaimer'
                assert 'draft_unreviewed' in text, 'Heart interior content must keep its draft status in the bundle'
                assert 'medical_reviewed' not in text, 'Heart interior content must not claim review'
print('Game build boundary passed: Q001 and the heart interior are labelled as unreviewed drafts; no catalogs, examples or raw/source files')
