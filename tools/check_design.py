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
q002 = load('data/balance/q002.v0.1.json')
q003 = load('data/balance/q003.v0.1.json')
q004 = load('data/balance/q004.v0.1.json')
require(q004['publication']['xp'] == quests[3]['xp'] and q004['publication']['gold'] == quests[3]['gold'] and q004['publication']['key'] == quests[3]['completionKey'], 'Q004 runtime reward mismatch')
require(q004['repeatXp'] == 0 and q004['repeatBaseGold'] == 0, 'Q004 repeat policy mismatch')
require(q003['publication']['xp'] == quests[2]['xp'] and q003['publication']['gold'] == quests[2]['gold'] and q003['publication']['key'] == quests[2]['completionKey'], 'Q003 runtime reward mismatch')
require(q003['repeatXp'] == 0 and q003['repeatBaseGold'] == 0, 'Q003 repeat policy mismatch')
require(q002['publication']['xp'] == quests[1]['xp'] and q002['publication']['gold'] == quests[1]['gold'], 'Q002 runtime reward mismatch')
require(q002['publication']['key'] == quests[1]['completionKey'] and q002['repeatXp'] == 0 and q002['repeatBaseGold'] == 0, 'Q002 repeat/completion contract mismatch')
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
diseases = load('data/catalog/diseases.v0.1.json')
require(diseases['status'] == 'planned' and diseases['review'] is None, 'Disease catalog must remain planning-only')
require(len({e['id'] for e in diseases['entries']}) == len(diseases['entries']), 'Duplicate disease IDs')
for hub in diseases['coverageHubs']:
    require(hub in {h['id'] for h in atlas['hubs']}, 'Unknown disease coverage hub')
    require(sum(e['primaryHubId'] == hub and e['depth'] == 'intro' for e in diseases['entries']) >= 2, 'Declared hub needs two planned introductory diseases')
for disease in diseases['entries']:
    require(disease['id'].startswith('disease.') and disease['primaryHubId'] in diseases['coverageHubs'], 'Invalid disease ID/hub')
    require(bool(disease['prerequisiteConcepts']) and disease['review'] is None and disease['status'] == 'planned', 'Disease requires normal prerequisites and unreviewed status')
    require(all(a in {e['id'] for e in atlas['entries'] if e['hubId'] == disease['primaryHubId']} for a in disease['anatomyIds']), 'Unknown disease anatomy reference')
    if disease['contentRef']:
        draft = load(disease['contentRef'])
        require(draft['id'] == disease['id'] and draft['status'] == 'draft_unreviewed' and draft['review'] is None and not draft['publicAtlas'], 'Disease draft must not masquerade as approved/public content')
        require(len(draft['reportingSteps']) == 6, 'Disease reporting plan needs six stages')
        implemented = {'disease.valve': 'Q003', 'disease.arrhythmia': 'Q005', 'disease.atherosclerosis': 'Q007'}
        if draft['id'] in implemented:
            require(draft['layerPlan']['implemented'] and draft['runtimeQuest'] == implemented[draft['id']] == disease['questSlot'], 'Implemented disease module boundary mismatch')
        else:
            require(not draft['layerPlan']['implemented'] and draft['deferral'], 'Planned disease needs explicit deferral without implementation claim')
        require(all(s['url'].startswith('https://') and s['section'] and s['checked'] for s in draft['sources']), 'Missing disease source evidence')
q3 = load('data/content/q003.v0.1.json')
q5 = load('data/content/q005.v0.1.json')
require(q5['status'] == 'draft_unreviewed' and q5['review'] is None and len(q5['notes']) == 5 and len(q5['materials']) == 3, 'Q005 content boundary or evidence mismatch')
require(all(id in {s['id'] for s in q5['sources']} for n in q5['notes'] + q5['materials'] for id in n['src']), 'Q005 missing source reference')
require(sorted(n['stage'] for n in q5['notes']) == [1, 2, 3, 4, 4] and all(str(s['stage']) in q5['board']['hints'] for s in q5['board']['stages']), 'Q005 signal stages mismatch')
require('가상 심전도' in json.dumps(q5, ensure_ascii=False) and '검수 전 모형' in q5['disclaimer'], 'Q005 fictional ECG/disclaimer label missing')
q6 = load('data/content/q006.v0.1.json')
q6text = json.dumps(q6, ensure_ascii=False)
require(q6['status'] == 'draft_unreviewed' and q6['review'] is None and len(q6['notes']) == 5 and len(q6['materials']) == 3, 'Q006 content boundary or evidence mismatch')
require(all(id in {s['id'] for s in q6['sources']} for n in q6['notes'] + q6['materials'] for id in n['src']), 'Q006 missing source reference')
require(sorted(n['stage'] for n in q6['notes']) == [1, 1, 2, 2, 3] and all(str(s['stage']) in q6['board']['hints'] for s in q6['board']['stages']), 'Q006 supply stages mismatch')
require('검수 전 모형' in q6['disclaimer'] and '질환 레이어가 아니에요' in q6['layerLimit'] and '심근경색' not in q6text and '협심증' not in q6text, 'Q006 must stay a labelled normal-supply draft without advanced-gate disease content (D099)')
# D108 Q007: basic-course passage comparison (design 19 section 3) with the atherosclerosis basic layer.
ADVANCED_ONLY = ['협심증', '심근경색', '심부전', '이상지질혈증', '만성폐쇄성폐질환', '폐암', '결핵', '수면무호흡']
q7 = load('data/content/q007.v0.1.json')
q7text = json.dumps(q7, ensure_ascii=False)
require(q7['status'] == 'draft_unreviewed' and q7['review'] is None and q7['tier'] == 'basic' and len(q7['notes']) == 2 and len(q7['materials']) == 3, 'Q007 content boundary or evidence mismatch')
require(all(id in {s['id'] for s in q7['sources']} for n in q7['notes'] + q7['materials'] for id in n['src']), 'Q007 missing source reference')
require(set(q7['comparison']) == {'wide', 'mild', 'narrow'} and q7['board']['correctPair'] in {p['id'] for p in q7['board']['pairs']} and all(p.get('hint') for p in q7['board']['pairs'] if p['id'] != q7['board']['correctPair']), 'Q007 single-variable board mismatch')
require(set(q7['board']['hints']) == {c['id'] for c in q7['board']['chain']} and q7['board']['decoy']['hint'], 'Q007 chain hints mismatch')
require('검수 전 모형' in q7['disclaimer'] and '질환 레이어' in q7['layerLimit'] and not any(w in q7text for w in ADVANCED_ONLY), 'Q007 must stay a labelled basic draft without advanced-only diseases (D108)')
require(not any(ch.isdigit() for m in q7['materials'] for ch in m['text'] + ''.join(c['text'] for c in m['cards'])), 'Q007 basic materials must not carry numbers (design 19 section 3)')
q7b = load('data/balance/q007.v0.1.json')
require(q7b['publication'] == {'key': quests[6]['completionKey'], 'xp': quests[6]['xp'], 'gold': quests[6]['gold']}, 'Q007 runtime reward mismatch')
q6b = load('data/balance/q006.v0.1.json')
require(q6b['publication'] == {'key': quests[5]['completionKey'], 'xp': quests[5]['xp'], 'gold': quests[5]['gold']}, 'Q006 runtime reward mismatch')
q4 = load('data/content/q004.v0.1.json')
require(q4['status'] == 'draft_unreviewed' and q4['review'] is None and len(q4['notes']) == 6, 'Q004 content boundary or evidence mismatch')
require(all(id in {s['id'] for s in q4['sources']} for n in q4['notes'] for id in n['src']), 'Q004 missing source reference')
require(set(q4['routes']['pulmonary']['noteIds'] + q4['routes']['systemic']['noteIds']) == {n['id'] for n in q4['notes']}, 'Q004 route/evidence mismatch')
require(q3['status'] == 'draft_unreviewed' and q3['review'] is None, 'Q003 must remain unreviewed')
require(len(q3['normal']) == 2 and len(q3['materials']) == 3 and len(q3['comparison']) == 3, 'Q003 six-stage content is incomplete')
require(all(id in {s['id'] for s in q3['sources']} for row in q3['normal'] + q3['materials'] for id in row['src']), 'Q003 missing source references')
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
