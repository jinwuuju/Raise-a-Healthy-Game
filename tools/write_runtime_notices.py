"""Preserve runtime dependency license texts in the distributable."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
parts = ['Medical Quest runtime third party notices\nProject original work: Copyright 2026 진우주. All rights reserved.']
for name in ['ajv', 'fast-deep-equal', 'fast-uri', 'json-schema-traverse', 'require-from-string']:
    directory = ROOT / 'node_modules' / name
    package = json.loads((directory / 'package.json').read_text())
    licenses = [p for p in directory.iterdir() if p.is_file() and p.name.lower().startswith('license')]
    assert licenses, f'Missing license: {name}'
    parts += [f"{name} {package['version']} ({package['license']})", licenses[0].read_text()]
(ROOT / 'dist' / 'THIRD-PARTY-LICENSES.txt').write_text('\n\n'.join(parts) + '\n')
print('Runtime license texts included')
