"""Validate planning artifacts only; this does not test the game or medicine."""
import json
import re
import sys
from pathlib import Path
from urllib.parse import unquote
from render_levels import render

ROOT = Path(__file__).resolve().parents[1]
errors = []
checks = 0

def require(condition, message):
    global checks
    checks += 1
    if not condition:
        errors.append(message)

def load(relative):
    return json.loads((ROOT / relative).read_text(encoding='utf-8'))

for path in sorted(ROOT.rglob('*.json')):
    if any(part in ('_site', '.git', 'node_modules', 'dist', 'artifacts', 'test-results', 'playwright-report') for part in path.relative_to(ROOT).parts):
        continue
    try:
        json.loads(path.read_text(encoding='utf-8'))
        checks += 1
    except (ValueError, OSError) as exc:
        errors.append(f'{path.relative_to(ROOT)}: {exc}')

levels = load('data/balance/levels.v0.2.json')
rows = levels['rows']
require(levels['status'] == 'design_only', 'Level data must be labeled design_only')
require([row['level'] for row in rows] == list(range(1, 100)), 'Levels must be exactly 1..99')
total = 0
for row in rows:
    lv = row['level']
    expected = (None if lv == 99 else
                100 + 50 * (lv - 1) if lv <= 10 else
                600 + 80 * (lv - 11) if lv <= 60 else
                4800 + 120 * (lv - 61) if lv <= 90 else
                8600 + 200 * (lv - 91))
    require(row['xpToNext'] == expected, f'Lv.{lv}: wrong XP formula')
    require(row['cumulativeXp'] == total, f'Lv.{lv}: wrong cumulative XP')
    require(bool(row['playerAction']) and bool(row['playBeat']), f'Lv.{lv}: missing play design')
    if expected is not None:
        total += expected
require((ROOT / 'docs/design/02A-LEVEL-CATALOG.md').read_text(encoding='utf-8') == render(),
        'Level catalog is stale; run python3 tools/render_levels.py')

early = load('data/balance/early-quests.v0.1.json')
quests = early['quests']
require([q['id'] for q in quests] == [f'Q{i:03d}' for i in range(1, 11)], 'Expected Q001..Q010')
require(len({q['completionKey'] for q in quests}) == 10, 'Duplicate quest completion key')
q001 = load('data/balance/q001.v0.1.json')
require(q001['observation']['xp'] + q001['publication']['xp'] == q001['totalXp'] == quests[0]['xp'], 'Q001 runtime XP split mismatch')
require(q001['observation']['gold'] + q001['publication']['gold'] == q001['totalGold'] == quests[0]['gold'], 'Q001 runtime gold split mismatch')
require(q001['publication']['key'] == quests[0]['completionKey'] and q001['observation']['key'] != q001['publication']['key'], 'Q001 runtime completion key mismatch')
reaction = load('data/balance/article-reactions.v0.1.json')
require(reaction['xpBonus'] == 0 and reaction['repeatBaseGold'] == 0, 'Reader reactions must not inflate XP or base publication rewards')
require(0 <= reaction['scoreMin'] <= reaction['scoreMax'] <= 100 and 0 <= reaction['windfallChance'] <= 1, 'Reader reaction ranges invalid')
require(early['additionalGoldPolicy']['guaranteedTotalsExcludeReactionGold'] and early['additionalGoldPolicy']['repeatReactionGold'], 'Reaction gold must be separate from guaranteed income and repeatable')

def level_at(xp):
    return max(row['level'] for row in rows if row['cumulativeXp'] <= xp)

cumulative = 0
balance = 0
for quest in quests:
    require(level_at(cumulative) == quest['startLevel'], f"{quest['id']}: start level mismatch")
    cumulative += quest['xp']
    balance += quest['gold']
    require(level_at(cumulative) == quest['endLevel'], f"{quest['id']}: end level mismatch")
    require(quest['repeatXp'] == 0 and quest['repeatGold'] == 0, f"{quest['id']}: repeated reward")
    for purchase in early['purchaseScenario']:
        if purchase['afterQuest'] == quest['id']:
            require(balance >= purchase['price'], f"Cannot afford {purchase['id']} after {quest['id']}")
            balance -= purchase['price']
for key in ['xp', 'gold', 'reputation', 'targetMinutes']:
    require(sum(q[key] for q in quests) == early['expectedTotals'][key], f'Early total mismatch: {key}')
require(balance == early['expectedTotals']['balanceAfterPurchases'], 'Purchase balance mismatch')
require(cumulative == rows[9]['cumulativeXp'] == 2700, 'Early campaign must reach Lv.10 at 2700 XP')

example = load('data/examples/quest.example.json')
require(sum(step['xp'] for step in example['steps']) == quests[0]['xp'] == example['rewards']['xpTotal'],
        'Q001 example step rewards mismatch')
require(example['rewards']['gold'] == quests[0]['gold'], 'Q001 example gold mismatch')
for relative in ['data/examples/concept.example.json', 'data/examples/quest.example.json']:
    item = load(relative)
    require(item['status'] == 'draft' and item['runtimeReady'] is False and item['review'] is None,
            f'{relative}: example must not imply runtime/medical approval')

atlas = load('data/catalog/body-atlas.v0.2.json')
require(len(atlas['hubs']) == 12, 'Expected 12 body hubs')
require(len(atlas['entries']) == 148, 'Expected 148 initial coverage topics')
require(len({e['id'] for e in atlas['entries']}) == 148, 'Duplicate anatomy IDs')
for entry in atlas['entries']:
    require(entry['hubId'] in {h['id'] for h in atlas['hubs']}, 'Unknown atlas hub')
    require(entry['status'] == 'planned' and entry['review'] is None, 'Draft anatomy must not imply medical review')
for row in rows:
    require(bool(row['lifeBeat']) and bool(row['journalismFocus']), 'Missing life/journalism level path')
for spend in [250 + 600, 250 + 200 + 1500, 350 + 400 + 250, 0]:
    require(2270 - spend >= 0, 'Early life scenario cannot be afforded')

links = 0
for path in sorted(ROOT.rglob('*.md')):
    if any(part in ('_site', '.git', 'node_modules', 'dist', 'artifacts', 'test-results', 'playwright-report') for part in path.relative_to(ROOT).parts):
        continue
    text = path.read_text(encoding='utf-8')
    for target in re.findall(r'\]\(([^\s)]+)\)', text):
        if re.match(r'^[a-zA-Z][a-zA-Z0-9+.-]*:', target) or target.startswith('#'):
            continue
        local = unquote(target.split('#')[0])
        require((path.parent / local).exists(), f'{path.relative_to(ROOT)}: missing link {target}')
        links += 1

if errors:
    print('\n'.join('FAIL: ' + error for error in errors))
    sys.exit(1)
print(f'PASS: {checks} design consistency checks; {len(rows)} levels; {len(quests)} early quests; {links} local links.')
print(f'Lv.99 cumulative XP: {total:,}. Early rewards: 2,700 XP / 2,270 G; after purchases: {balance:,} G.')
print('Scope: planning files only. Game build, gameplay, medical review and learning outcomes are NOT tested.')
