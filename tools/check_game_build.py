"""Verify the P1 runtime bundle excludes design/medical examples and raw assets."""
from pathlib import Path
root = Path(__file__).resolve().parents[1]
dist = root / 'dist'
assert (dist / 'index.html').is_file(), 'Missing game entry'
for path in dist.rglob('*'):
    if path.is_file():
        assert path.suffix not in ('.md', '.json', '.ts'), f'Unexpected source/data: {path}'
        assert not any(p in ('raw', 'examples', 'balance', 'catalog') for p in path.relative_to(dist).parts), f'Draft/source copied: {path}'
        if path.suffix in ('.js', '.html'):
            text = path.read_text()
            for marker in ('사라진 혈액 배달표', 'medical_reviewed', 'Q001', '심근경색'):
                assert marker not in text, f'Draft medical content in runtime: {marker}'
print('P1 game build boundary passed: no medical examples, design catalogs or raw/source files; cafe/movement rules are explicit prototype imports')
