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
require(len(atlas['entries']) == 157, 'Expected 157 coverage topics (D114)')
require(len({e['id'] for e in atlas['entries']}) == 157, 'Duplicate anatomy IDs')
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
        implemented = {'disease.valve': 'Q003', 'disease.arrhythmia': 'Q005', 'disease.atherosclerosis': 'Q007', 'disease.hypertension': 'Q008'}
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
# D108 Q008: basic-course blood-pressure records (design 19 section 3) with the hypertension basic layer, no threshold numbers.
q8 = load('data/content/q008.v0.1.json')
q8text = json.dumps(q8, ensure_ascii=False)
require(q8['status'] == 'draft_unreviewed' and q8['review'] is None and q8['tier'] == 'basic' and len(q8['notes']) == 2 and len(q8['materials']) == 3, 'Q008 content boundary or evidence mismatch')
require(all(id in {s['id'] for s in q8['sources']} for n in q8['notes'] + q8['materials'] for id in n['src']), 'Q008 missing source reference')
q8records = {r['id']: r for r in q8['board']['records']}
require(set(q8['comparison']) == {'rest', 'moved', 'high'} and len(q8['board']['correctRecords']) == 3 and all(r in q8records and 'hint' not in q8records[r] for r in q8['board']['correctRecords']) and all(r.get('hint') for k, r in q8records.items() if k not in q8['board']['correctRecords']), 'Q008 record board mismatch')
require(q8['board']['correctVerdict'] in {v['id'] for v in q8['board']['verdicts']} and all(v.get('hint') for v in q8['board']['verdicts'] if v['id'] != q8['board']['correctVerdict']), 'Q008 verdict board mismatch')
require('검수 전 모형' in q8['disclaimer'] and '질환 레이어' in q8['layerLimit'] and not any(w in q8text for w in ADVANCED_ONLY), 'Q008 must stay a labelled basic draft without advanced-only diseases (D108)')
q8screen = ''.join([q8['question'], *q8['offer'], *(n['text'] for n in q8['notes']), *(m['text'] for m in q8['comparison'].values()), q8['singleVariable'], *(m['text'] + ''.join(c['text'] for c in m['cards']) for m in q8['materials']), *(r['card'] + r.get('hint', '') for r in q8['board']['records']), *(v['card'] + v.get('hint', '') for v in q8['board']['verdicts']), *(l['text'] for l in q8['article']['leads'] + q8['article']['limitations']), q8['article']['factcheck'], q8['article']['reply']])
require(not any(ch.isdigit() for ch in q8screen) and 'mmHg' not in q8text and 'mm Hg' not in q8text, 'Q008 basic screens must not carry numbers or blood-pressure thresholds (design 19 section 3)')
# D108 Q009: basic-course capstone before graduation. A known principle on a new arrangement (design 03), evidence for every link, no new disease.
q9 = load('data/content/q009.v0.1.json')
q9text = json.dumps(q9, ensure_ascii=False)
require(q9['status'] == 'draft_unreviewed' and q9['review'] is None and q9['tier'] == 'basic' and len(q9['notes']) == 4 and 'materials' not in q9, 'Q009 content boundary or evidence mismatch')
require(all(id in {s['id'] for s in q9['sources']} for n in q9['notes'] for id in n['src']), 'Q009 missing source reference')
q9b_ = q9['board']
require([x['room'] for x in q9b_['slots']] == ['ra', 'rv', 'la', 'lv'] and {r['id'] for r in q9b_['rooms']} == {'ra', 'rv', 'la', 'lv'}, 'Q009 picture must be drawn facing the person (their right on the picture left)')
require([c['id'] for c in q9b_['chain']] == ['ra', 'rv', 'lung', 'la', 'lv', 'body'] and all(c['evidence'] in {n['id'] for n in q9['notes']} for c in q9b_['chain']), 'Q009 loop must follow the blood and rest on recorded evidence')
require(all(d.get('hint') and 'evidence' not in d for d in q9b_['decoys']) and '{last}' in q9b_['nextHint'], 'Q009 decoys need hints and no evidence; out-of-order cards show only the missing link')
require(len([a for a in q9['article']['analogies'] if a.get('hint')]) == 1 and len(q9['article']['analogies']) == 3, 'Q009 analogy choices mismatch')
require('검수 전 모형' in q9['disclaimer'] and not any(w in q9text for w in ADVANCED_ONLY) and '고혈압' not in q9text, 'Q009 must stay a labelled basic draft without new or advanced-only diseases (D108)')
q9screen = ''.join([q9['question'], *q9['offer'], *(n['text'] for n in q9['notes']), q9b_['picture'], q9b_['sideHint'], q9b_['levelHint'], q9b_['startHint'], q9b_['nextHint'], q9b_['twice'], *(c['card'] for c in q9b_['chain']), *(d['card'] + d['hint'] for d in q9b_['decoys']), *(x['text'] for x in q9['article']['leads'] + q9['article']['analogies'] + q9['article']['limitations']), q9['article']['factcheck'], q9['article']['reply']])
require(not any(ch.isdigit() for ch in q9screen), 'Q009 basic screens must not carry numbers (design 19 section 3)')
# D108 Q010: heart graduation special issue (design 19 section 6). Several valid claim-evidence pairs (design 03), no new disease.
# D109 respiratory preparation (design 20): accuracy contract data for the air path, before any runtime use.
rx = load('data/content/respiratory-interior.v0.1.json')
rxtext = json.dumps(rx, ensure_ascii=False)
rxsrc = {s['id'] for s in rx['sources']}
rxrooms = [r['id'] for r in rx['rooms']]
require(rx['status'] == 'draft_unreviewed' and rx['review'] is None and '검수 전 모형' in rx['disclaimer'], 'Respiratory interior must stay a labelled draft')
require(rx['airPath'] == ['nose', 'pharynx', 'larynx', 'trachea', 'bronchi', 'alveoli'] == rxrooms, 'Respiratory air path order must follow the airway (design 20 section 2)')
require(all(d['room'] in rxrooms and d['src'] and set(d['src']) <= rxsrc and d['text'] for d in rx['discoveries'].values()), 'Every respiratory record needs a room and existing sources')
rxtiered = [i for t in rx['tiers'] for i in t['ids']]
require(sorted(rxtiered) == sorted(rx['discoveries']) and len(rxtiered) == len(set(rxtiered)) and len(rx['tiers'][0]['ids']) == 12 and rx['tiers'][0]['unlockStars'] == 0, 'Respiratory tiers must cover every record once with twelve core structures')
heartdisc = load('data/content/heart-interior.v0.1.json')['discoveries']
j = rx['joinsHeartRoom']
require(j['target'] in rx['discoveries'] and rx['discoveries'][j['target']]['room'] == j['room'] and heartdisc.get(j['heartTarget'], {}).get('room') == j['heartRoom'] == 'lung', 'Alveolus must join the existing heart lung room as the same alveolus (design 19 section 5)')
require(not any(w in rxtext for w in ADVANCED_ONLY), 'Respiratory basic records must not carry advanced-only diseases')
# D111 airway space: clues for every record without the record's own name, screen lines without numbers (design 19 section 3).
rxm = load('data/content/respiratory-mastery.v0.1.json')
rxs = load('data/content/respiratory-space.v0.1.json')
require(rxm['status'] == rxs['status'] == 'draft_unreviewed' and '검수 전 모형' in rxm['disclaimer'] and '검수 전 모형' in rxs['disclaimer'], 'Airway clues and screen lines must stay labelled drafts')
require(set(rxm['hints']) == set(rx['discoveries']) and all(rx['discoveries'][k]['name'] not in v for k, v in rxm['hints'].items()), 'Every airway record needs a clue that does not give away its name')
require(set(rxm['roomNames']) == set(rxrooms) and all(a in rx['discoveries'] and b in rx['discoveries'] for a, b in rxm['twins']), 'Airway quiz rooms and confusable pairs must match the records')
rxscreen = ''.join([*rxm['hints'].values(), *rxs['guideOnce'], rxs['swallowWait'], rxs['swallowOpen'], rxs['esophagus'], rxs['mouth'], rxs['deadEnd'], rxs['membraneCross'], rxs['entryToast']])
require(not any(ch.isdigit() for ch in rxscreen), 'Airway basic screens must not carry numbers (design 19 section 3)')
require(not any(w in json.dumps([rxm, rxs], ensure_ascii=False) for w in ADVANCED_ONLY), 'Airway space must not carry advanced-only diseases')
for did in ('disease.respiratory-virus', 'disease.asthma', 'disease.pneumonia'):
    entry = next(e for e in diseases['entries'] if e['id'] == did)
    require(entry['primaryHubId'] == 'respiratory' and entry['depth'] == 'intro' and entry['contentRef'], 'Respiratory basic disease must be planned with a draft (design 20 section 6)')
    require(not any(w in json.dumps(load(entry['contentRef']), ensure_ascii=False) for w in ADVANCED_ONLY), 'Respiratory basic disease draft must not carry advanced-only diseases')
# D112 Q011: first respiratory basic quest (design 20 section 3). Scenes in the nose, a single-variable observer, no disease yet.
q11 = load('data/content/q011.v0.1.json')
q11text = json.dumps(q11, ensure_ascii=False)
q11src = {s['id'] for s in q11['sources']}
q11notes = {n['id'] for n in q11['notes']}
q11modes = q11['observer']['modes']
require(q11['status'] == 'draft_unreviewed' and q11['review'] is None and q11['tier'] == 'basic' and len(q11['notes']) == 4 and len(q11['newNames']) <= 3, 'Q011 content boundary mismatch (basic course: at most three new names)')
require(all(n['room'] == 'nose' and rx['discoveries'].get(n['target'], {}).get('room') == 'nose' and n['src'] and set(n['src']) <= q11src for n in q11['notes']), 'Q011 scenes must stand in the nose and carry sources')
require(rx['discoveries'].get(q11['observer']['target'], {}).get('room') == q11['observer']['room'] == 'nose' and set(q11modes) == {'cold', 'dust', 'virus'} and all(m['src'] and set(m['src']) <= q11src for m in q11modes.values()), 'Q011 observer must sit at the back of the nose with three kinds of incoming air')
require(all(m['back'][k] >= m['front'][k] for m in q11modes.values() for k in ('warm', 'wet')) and all(m['back']['bits'] <= m['front']['bits'] for m in q11modes.values()) and q11modes['virus']['back']['bits'] > 0 and '모두 막지는 못' in q11modes['virus']['text'], 'Q011 observer must not overclaim: the nose catches many particles but not all')
require(len(q11['board']['jobs']) == 3 and all(j['supports'] and set(j['supports']) <= q11notes for j in q11['board']['jobs']) and all(d.get('hint') for d in q11['board']['decoys']) and '{job}' in q11['board']['wrong'] and '{need}' in q11['board']['wrong'], 'Q011 board: every job rests on recorded scenes; decoys need hints')
require(len([a for a in q11['article']['analogies'] if a.get('hint')]) == 1 and len([l for l in q11['article']['leads'] if l.get('hint')]) == 1, 'Q011 lead and analogy choices mismatch')
require('검수 전 모형' in q11['disclaimer'] and not any(w in q11text for w in ADVANCED_ONLY) and not any(w in q11text for w in ('감기', '독감', '코로나', '폐렴', '천식')), 'Q011 must stay a labelled basic draft; respiratory diseases come in their own quests (design 20)')
q11screen = ''.join([q11['question'], *q11['offer'], *(n['text'] + n['card'] + n['name'] for n in q11['notes']), q11['observer']['intro'], q11['observer']['singleVariable'], q11['observer']['limit'], *(m['label'] + m['text'] for m in q11modes.values()), q11['board']['intro'], q11['board']['wrong'], *(d['card'] + d['hint'] for d in q11['board']['decoys']), *(j['claim'] for j in q11['board']['jobs']), *(x['text'] + x.get('hint', '') for x in q11['article']['leads'] + q11['article']['analogies'] + q11['article']['limitations']), q11['article']['factcheck'], q11['article']['next'], q11['article']['reply']])
require(not any(ch.isdigit() for ch in q11screen), 'Q011 basic screens must not carry numbers (design 19 section 3)')
q11b = load('data/balance/q011.v0.1.json')
require(q11b['publication']['key'] == 'quest.Q011.first' and q11b['publication']['xp'] == rows[9]['xpToNext'] and 0 < q11b['publication']['gold'] and q11b['repeatXp'] == 0 and q11b['repeatBaseGold'] == 0, 'Q011 reward must be E(10) XP once (Lv.10 to 11) with repeat XP 0')
# D113 Q012: the fork in the throat (design 20 section 3). Scenes in the pharynx and larynx, a single-variable observer,
# the steps of one swallow in order, no disease yet (no respiratory disease words; swallowing problems are not this quest).
q12 = load('data/content/q012.v0.1.json')
q12text = json.dumps(q12, ensure_ascii=False)
q12src = {s['id'] for s in q12['sources']}
q12notes = {n['id'] for n in q12['notes']}
q12modes = q12['observer']['modes']
require(q12['status'] == 'draft_unreviewed' and q12['review'] is None and q12['tier'] == 'basic' and len(q12['notes']) == 4 and len(q12['newNames']) <= 3, 'Q012 content boundary mismatch (basic course: at most three new names)')
require(all(n['room'] in ('pharynx', 'larynx') and rx['discoveries'].get(n['target'], {}).get('room') == n['room'] and n['src'] and set(n['src']) <= q12src for n in q12['notes']) and {n['room'] for n in q12['notes']} == {'pharynx', 'larynx'}, 'Q012 scenes must stand in the pharynx and the larynx and carry sources')
require(rx['discoveries'].get(q12['observer']['target'], {}).get('room') == q12['observer']['room'] == 'pharynx' and set(q12modes) == {'breath', 'swallow', 'slip'} and all(m['src'] and set(m['src']) <= q12src for m in q12modes.values()), 'Q012 observer must sit in the throat with three things passing it')
require(q12modes['breath']['route'] == 'front' and q12modes['swallow']['route'] == 'back' and q12modes['slip']['route'] == 'cough' and '기침' in q12modes['slip']['text'] and '멈' in q12modes['swallow']['gates']['breath'] and all(set(m['gates']) == {'palate', 'lid', 'cords', 'food', 'breath'} for m in q12modes.values()), 'Q012 observer: air goes front, a swallow goes back with the breath paused, a slipped crumb is coughed up')
steps = q12['board']['steps']
require([s['id'] for s in steps] == ['arrive', 'close', 'down', 'open'] and all(s['scenes'] and set(s['scenes']) <= q12notes for s in steps) and all(d.get('hint') for d in q12['board']['decoys']) and '{scene}' in q12['board']['wrong'], 'Q012 board: the swallow steps in order rest on recorded scenes; decoys need hints')
require(len([a for a in q12['article']['analogies'] if a.get('hint')]) == 1 and len([l for l in q12['article']['leads'] if l.get('hint')]) == 1, 'Q012 lead and analogy choices mismatch')
require('검수 전 모형' in q12['disclaimer'] and not any(w in q12text for w in ADVANCED_ONLY) and not any(w in q12text for w in ('감기', '독감', '코로나', '폐렴', '천식', '연하곤란', '삼킴장애', '흡인성')), 'Q012 must stay a labelled basic draft; respiratory diseases come in their own quests (design 20)')
q12screen = ''.join([q12['question'], *q12['offer'], *(n['text'] + n['card'] + n['name'] + n['place'] for n in q12['notes']), q12['observer']['intro'], q12['observer']['singleVariable'], q12['observer']['limit'], *q12['observer']['views'].values(), *q12['observer']['gateNames'].values(), *(m['label'] + m['text'] + m['result'] + ''.join(m['gates'].values()) for m in q12modes.values()), q12['board']['intro'], q12['board']['wrong'], q12['board']['placed'], *(d['card'] + d['hint'] for d in q12['board']['decoys']), *(s['card'] for s in steps), *(x['text'] + x.get('hint', '') for x in q12['article']['leads'] + q12['article']['analogies'] + q12['article']['limitations']), q12['article']['factcheck'], q12['article']['next'], q12['article']['reply']])
require(not any(ch.isdigit() for ch in q12screen), 'Q012 basic screens must not carry numbers (design 19 section 3)')
q12b = load('data/balance/q012.v0.1.json')
require(q12b['publication']['key'] == 'quest.Q012.first' and q12b['publication']['xp'] == rows[10]['xpToNext'] and 0 < q12b['publication']['gold'] and q12b['repeatXp'] == 0 and q12b['repeatBaseGold'] == 0, 'Q012 reward must be E(11) XP once (Lv.11 to 12) with repeat XP 0')
q10 = load('data/content/q010.v0.1.json')
q10text = json.dumps(q10, ensure_ascii=False)
q10ev = {e['id'] for e in q10['board']['evidence']}
q10claims = q10['board']['claims']
require(q10['status'] == 'draft_unreviewed' and q10['review'] is None and q10['tier'] == 'basic' and q10['board']['need'] == 2, 'Q010 content boundary mismatch')
require(len([c for c in q10claims if c.get('hint')]) == 1 and all(set(c['supports']) <= q10ev and len(c['supports']) >= q10['board']['need'] for c in q10claims if not c.get('hint')), 'Q010 claims need supporting records (several valid pairs)')
require(all(e['quest'] in {'Q003', 'Q004', 'Q005', 'Q006', 'Q007', 'Q008'} for e in q10['board']['evidence']) and '{need}' in q10['board']['wrongEvidence'], 'Q010 evidence must come from earlier heart reporting and point to the missing record')
require(len([a for a in q10['article']['analogies'] if a.get('hint')]) == 1, 'Q010 analogy choices mismatch')
require('검수 전 모형' in q10['disclaimer'] and not any(w in q10text for w in ADVANCED_ONLY) and '고혈압' not in q10text, 'Q010 must stay a labelled basic draft without new or advanced-only diseases (D108)')
q10screen = ''.join([q10['question'], *q10['offer'], *q10['special'].values(), *(c['card'] + c.get('hint', '') for c in q10claims), *(e['card'] for e in q10['board']['evidence']), *(x['text'] + x.get('hint', '') for x in q10['article']['leads'] + q10['article']['analogies'] + q10['article']['limitations']), q10['article']['factcheck'], q10['article']['reply'], *q10['graduation'].values()])
require(not any(ch.isdigit() for ch in q10screen), 'Q010 basic screens must not carry numbers (design 19 section 3)')
q10b = load('data/balance/q010.v0.1.json')
require(q10b['publication'] == {'key': quests[9]['completionKey'], 'xp': quests[9]['xp'], 'gold': quests[9]['gold']} and quests[9]['xp'] == 0, 'Q010 runtime reward mismatch')
q9b = load('data/balance/q009.v0.1.json')
require(q9b['publication'] == {'key': quests[8]['completionKey'], 'xp': quests[8]['xp'], 'gold': quests[8]['gold']}, 'Q009 runtime reward mismatch')
q8b = load('data/balance/q008.v0.1.json')
require(q8b['publication'] == {'key': quests[7]['completionKey'], 'xp': quests[7]['xp'], 'gold': quests[7]['gold']}, 'Q008 runtime reward mismatch')
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

# D114 (design 21): the whole body is planned, Korean priorities carry evidence, and the runtime advanced-only list rests on the disease catalog.
hub_ids = {h['id'] for h in atlas['hubs']}
require(all(any(e['hubId'] == h for e in atlas['entries']) for h in hub_ids), 'Every body hub needs atlas topics (D114: the whole body)')
require(set(diseases['coverageHubs']) == hub_ids, 'Disease catalog must plan every body hub (design 21)')
catalog_sources = {s['id']: s for s in diseases.get('sources', [])}
require(len(catalog_sources) == len(diseases.get('sources', [])) and all(s['url'].startswith('https://') and s['title'] and s['checked'] for s in catalog_sources.values()), 'Disease catalog sources need unique ids, https URLs, titles and checked dates')
for disease in diseases['entries']:
    require(disease['depth'] in ('intro', 'advanced'), disease['id'] + ': depth must be intro or advanced')
    korea = disease.get('korea')
    if korea:
        require(bool(korea['reason']) and bool(korea['sourceIds']) and all(i in catalog_sources for i in korea['sourceIds']), disease['id'] + ': Korean priority needs a reason and catalog sources (design 21)')
require(len({e['name'] for e in diseases['entries']}) == len(diseases['entries']), 'Duplicate disease names in the catalog')
require(sum(1 for e in diseases['entries'] if e.get('korea')) >= 15, 'Korean priority diseases missing from the catalog (design 21)')
advanced_names = ' '.join(e['name'] for e in diseases['entries'] if e['depth'] == 'advanced')
require(all(w in advanced_names for w in ADVANCED_ONLY), 'Every runtime advanced-only word must be an advanced disease in the catalog (design 19, 21)')
require(any(e['id'] == 'disease.thyroid-cancer' and e['depth'] == 'advanced' and e['primaryHubId'] == 'endocrine' for e in diseases['entries']), 'Thyroid cancer belongs to the endocrine advanced course (design 21)')
d21 = (ROOT / 'docs/design/21-WHOLE-BODY-CHAPTERS-AND-KOREA.md').read_text(encoding='utf-8')
require('확정' in d21 and '정확히 알고 쉽게 전한다' in d21 and '갑상샘암' in d21 and '의대생' in d21, 'Design 21 must keep the confirmed chapter map, the core principle, the thyroid cancer plan and the learning-level statement')

# D115 (design 21 section 2, confirmed): basic chapters run one after another through Lv.21~60; the level table and atlas bands follow them.
CHAPTERS = [(21, 28, ('oral', 'digestive')), (29, 32, ('endocrine',)), (33, 36, ('renal',)), (37, 43, ('neural',)), (44, 47, ('senses',)), (48, 52, ('movement',)), (53, 56, ('barrier',)), (57, 60, ('development',))]
require([lo for lo, hi, hs in CHAPTERS] == [21] + [hi + 1 for lo, hi, hs in CHAPTERS[:-1]] and CHAPTERS[-1][1] == 60, 'Chapter map must cover Lv.21~60 without gaps or overlaps (D115)')
atlas_hubs = {h['id']: h for h in atlas['hubs']}
for lo, hi, hs in CHAPTERS:
    require(all(hs[-1] in rows[lv - 1]['bodyHubIds'] for lv in range(lo, hi + 1)), 'Lv.' + str(lo) + '~' + str(hi) + ': level rows must follow the chapter map (D115)')
    for hub in hs:
        require((atlas_hubs[hub]['introMin'], atlas_hubs[hub]['introMax']) == (lo, hi), hub + ': atlas band must follow the chapter map (D115)')
require(all((e['introMin'], e['introMax']) == (atlas_hubs[e['hubId']]['introMin'], atlas_hubs[e['hubId']]['introMax']) for e in atlas['entries']), 'Atlas topics must carry their hub band (D115)')
require([rows[lv - 1]['unlockProposal'].count('승진 도전') for lv in (32, 43, 52, 60)] == [1, 1, 1, 1], 'Promotion challenges sit on chapter graduations 32, 43, 52 and 60 (D115)')

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
