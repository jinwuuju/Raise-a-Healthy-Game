#!/usr/bin/env python3
"""Phase 1 of the real-scale district: game data for the area around Euro Plaza at 1 tile (16 px) = 3 m.

Input : data/raw/district/osm-1km.json (OpenStreetMap, ODbL; Git-ignored)
Output: data/world/district-r300.v0.1.json  geometry in game pixels (north up, origin top-left)
        data/world/district-buildings.v0.1.json  building ledger: id, floors (OSM or estimate), name (null = user fills)

Heights: OSM building:levels / height when present, otherwise an estimate from building class and footprint area,
marked 'estimate'. Names are deliberately left empty; the user adds real names later (D094 conversation).
Map data (c) OpenStreetMap contributors, ODbL 1.0. The derived files carry the same licence.
"""
import json, math, os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, 'data/raw/district/osm-1km.json')
OUT = os.path.join(ROOT, 'data/world/district-r300.v0.1.json')
LEDGER = os.path.join(ROOT, 'data/world/district-buildings.v0.1.json')
GAME = os.path.join(ROOT, 'src/world/district.generated.json')  # compact copy the game imports
LAT0, LON0 = 37.52067, 127.02767            # Nonhyeon-ro 805 (Euro Plaza)
MX, MY = 111320.0 * math.cos(math.radians(LAT0)), 110574.0
PX = 16 / 3                                 # game pixels per metre (16 px tile = 3 m)
HALF = 360.0                                # map half-size in metres (300 m radius + margin)
RADIUS = 300.0
# Known places (Kakao address search 2026-10-15, metres from Euro Plaza): used to attach existing game entrances.
PLACES = {'europlaza': (1.6, 2.5), 'cafe': (-70.7, 33.0)}
# Facing Euro Plaza across the lane, either side of Dosan-daero 25-gil (user photos, D088): Jin-U brick block west, granite east.
FIXED = {'jinu': 1553709254, 'granite': 899216069}
EUROPLAZA_OSM = 899216070

def m2px(x, y): return [round((x + HALF) * PX, 1), round((HALF - y) * PX, 1)]
def local(p): return ((p['lon'] - LON0) * MX, (p['lat'] - LAT0) * MY)

def simplify(pts, eps):
    if len(pts) < 3: return pts
    a, b = pts[0], pts[-1]; dx, dy = b[0] - a[0], b[1] - a[1]; L = math.hypot(dx, dy) or 1e-9
    i, dmax = 0, 0.0
    for k in range(1, len(pts) - 1):
        d = abs(dy * pts[k][0] - dx * pts[k][1] + b[0] * a[1] - b[1] * a[0]) / L
        if d > dmax: i, dmax = k, d
    if dmax <= eps: return [a, b]
    return simplify(pts[:i + 1], eps)[:-1] + simplify(pts[i:], eps)

def simplify_ring(pts, eps):
    # Closed rings (first == last) cannot go straight into Douglas-Peucker: split at the vertex farthest from the start.
    if len(pts) < 4 or math.hypot(pts[0][0] - pts[-1][0], pts[0][1] - pts[-1][1]) > 1e-6: return simplify(pts, eps)
    k = max(range(len(pts) - 1), key=lambda i: math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]))
    ring = simplify(pts[:k + 1], eps)[:-1] + simplify(pts[k:], eps)
    return ring if len(ring) >= 4 else pts

def area(pts):
    s = 0.0
    for i in range(len(pts) - 1): s += pts[i][0] * pts[i + 1][1] - pts[i + 1][0] * pts[i][1]
    return s / 2

def inside(p, poly):
    x, y, c = p[0], p[1], False
    for i in range(len(poly) - 1):
        (x1, y1), (x2, y2) = poly[i], poly[i + 1]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1: c = not c
    return c

def num(v):
    try: return float(str(v).split(';')[0].replace('m', '').strip())
    except (TypeError, ValueError): return None

CLS = {'apartments': 'apartment', 'residential': 'home', 'house': 'home', 'detached': 'home', 'terrace': 'home',
       'commercial': 'commercial', 'retail': 'commercial', 'office': 'office', 'hotel': 'hotel', 'school': 'school',
       'church': 'religious', 'religious': 'religious', 'parking': 'parking', 'garage': 'parking', 'garages': 'parking'}

def estimate_floors(cls, a):
    if cls == 'apartment': return 12 if a > 500 else 6
    if cls == 'parking': return 3
    if cls == 'religious': return 3
    if a < 40: return 1
    if a < 120: return 3
    if a < 250: return 4
    if a < 450: return 5
    if a < 900: return 7
    return 10

VEH = {'motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'residential', 'living_street', 'service',
       'busway', 'motorway_link', 'trunk_link', 'primary_link', 'secondary_link', 'tertiary_link'}
MAJOR = {'motorway', 'trunk', 'primary', 'secondary', 'motorway_link', 'trunk_link', 'primary_link', 'secondary_link'}
BASE_W = {'primary': 20, 'secondary': 18, 'tertiary': 10, 'unclassified': 7, 'residential': 6, 'living_street': 5, 'service': 4,
          'busway': 4, 'primary_link': 7, 'secondary_link': 7, 'trunk_link': 7, 'tertiary_link': 6,
          'pedestrian': 5, 'footway': 2.5, 'path': 2, 'cycleway': 2.5, 'steps': 2}

def main():
    els = json.load(open(SRC, encoding='utf-8'))['elements']
    lim = HALF + 20
    roads, buildings, areas = [], [], []
    for e in els:
        if e['type'] != 'way' or 'geometry' not in e: continue
        t = e.get('tags', {}); pts = [local(p) for p in e['geometry']]
        if not any(abs(x) < lim and abs(y) < lim for x, y in pts): continue
        hw = t.get('highway')
        if hw and hw in BASE_W or hw in VEH:
            if t.get('tunnel') in ('yes',) or int(num(t.get('layer')) or 0) < 0: continue
            lanes = num(t.get('lanes')); w = num(t.get('width'))
            # One-way carriageways: at most 4 through lanes (wider tags here include turn pockets and swallowed the sidewalks).
            if lanes and t.get('oneway') == 'yes': lanes = min(lanes, 4)
            if not w: w = lanes * 3.25 if lanes and (hw in MAJOR or hw == 'tertiary') else BASE_W.get(hw, 4)
            kind = ('link' if hw.endswith('_link') else 'major') if hw in MAJOR else 'minor' if hw in VEH else 'path'
            sw = 4 if hw in ('primary', 'secondary', 'trunk') else 2.5 if hw == 'tertiary' else 0
            roads.append({'id': e['id'], 'kind': kind, 'hw': hw, 'name': t.get('name', ''), 'w': round(w * PX, 1), 'sw': round(sw * PX, 1),
                          'oneway': t.get('oneway') == 'yes', 'bridge': t.get('bridge') == 'yes',
                          'pts': [m2px(*p) for p in simplify(pts, 0.4)]})
        elif 'building' in t:
            if len(pts) < 4: continue
            c = (sum(p[0] for p in pts[:-1]) / (len(pts) - 1), sum(p[1] for p in pts[:-1]) / (len(pts) - 1))
            if abs(c[0]) > lim or abs(c[1]) > lim: continue
            a = abs(area(pts)); cls = CLS.get(t.get('building'), 'general')
            lv = num(t.get('building:levels')); h = num(t.get('height'))
            floors, src = (round(lv), 'osm-levels') if lv else (max(1, round(h / 3.2)), 'osm-height') if h else (estimate_floors(cls, a), 'estimate')
            buildings.append({'id': e['id'], 'cls': cls, 'floors': floors, 'floorsSource': src, 'areaM2': round(a),
                              'centre': [round(c[0], 1), round(c[1], 1)], 'pts': [m2px(*p) for p in simplify_ring(pts, 0.5)]})
        else:
            cls = ('green' if t.get('leisure') in ('park', 'garden', 'playground') or t.get('landuse') in ('grass', 'meadow') or t.get('natural') in ('grassland', 'wood', 'scrub')
                   else 'parking' if t.get('amenity') == 'parking' else 'school' if t.get('amenity') in ('school', 'kindergarten') else None)
            if cls and len(pts) > 3: areas.append({'id': e['id'], 'cls': cls, 'pts': [m2px(*p) for p in simplify_ring(pts, 0.5)]})
    # Special buildings that already have game art / entrances.
    special = {}
    for b in buildings:
        poly = [((x / PX) - HALF, HALF - (y / PX)) for x, y in b['pts']]
        if b['id'] == EUROPLAZA_OSM: special['europlaza'] = b['id']
        elif inside(PLACES['cafe'], poly): special['cafe'] = b['id']
    if 'cafe' not in special:  # address point may sit on the entrance side: nearest centroid within 15 m
        near = min(buildings, key=lambda b: math.hypot(b['centre'][0] - PLACES['cafe'][0], b['centre'][1] - PLACES['cafe'][1]))
        if math.hypot(near['centre'][0] - PLACES['cafe'][0], near['centre'][1] - PLACES['cafe'][1]) < 15: special['cafe'] = near['id']
    special.update(FIXED)
    for b in buildings:
        b['special'] = next((k for k, v in special.items() if v == b['id']), None)
    size = round(2 * HALF * PX)
    data = {'version': '0.1', 'licence': 'Map data (c) OpenStreetMap contributors, ODbL 1.0', 'mPerTile': 3, 'pxPerM': round(PX, 4),
            'halfMetres': HALF, 'radiusMetres': RADIUS, 'sizePx': size, 'centrePx': m2px(0, 0),
            'places': {k: m2px(*v) for k, v in PLACES.items()}, 'special': special,
            'roads': roads, 'buildings': buildings, 'areas': areas}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(data, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    ledger = {'version': '0.1', 'licence': data['licence'],
              'note': 'name는 사용자가 나중에 채운다(null = 이름 없음). floorsSource가 estimate인 층수는 추정값이며 사용자가 고칠 수 있다.',
              'buildings': [{'id': b['id'], 'centreMetres': b['centre'], 'cls': b['cls'], 'floors': b['floors'], 'floorsSource': b['floorsSource'],
                             'special': b['special'], 'name': None} for b in sorted(buildings, key=lambda b: (math.hypot(*b['centre']), b['id']))]}
    json.dump(ledger, open(LEDGER, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    est = sum(1 for b in buildings if b['floorsSource'] == 'estimate')
    print('size', size, 'px; roads', len(roads), 'buildings', len(buildings), '(estimated floors', est, ') areas', len(areas),
          'special', special, 'bytes', os.path.getsize(OUT))

    write_game(data)

def fit_line(pts, vertical):
    # least squares: vertical -> x = a + b*y ; else y = a + b*x
    us = [p[1] if vertical else p[0] for p in pts]; vs = [p[0] if vertical else p[1] for p in pts]
    n = len(us); mu, mv = sum(us) / n, sum(vs) / n
    b = sum((u - mu) * (v - mv) for u, v in zip(us, vs)) / (sum((u - mu) ** 2 for u in us) or 1)
    return mv - b * mu, b

def write_game(data):
    K = {'major': 0, 'minor': 1, 'path': 2, 'link': 3}
    CL = ['general', 'commercial', 'office', 'home', 'apartment', 'hotel', 'school', 'religious', 'parking']
    AC = ['green', 'parking', 'school']
    fits = {}
    for name, key, vertical in (('논현로', 'ns', True), ('도산대로', 'ew', False)):
        ways = [r for r in data['roads'] if r['name'] == name and r['kind'] == 'major']
        pts = [p for r in ways for p in r['pts']]
        a, b = fit_line(pts, vertical)
        offs = []
        for r in ways:
            for p in r['pts']:
                u, v = (p[1], p[0]) if vertical else (p[0], p[1])
                d = (v - (a + b * u)) / math.sqrt(1 + b * b)
                offs += [d - r['w'] / 2, d + r['w'] / 2]
        lo, hi = sorted(offs)[len(offs) // 20], sorted(offs)[-len(offs) // 20 - 1]
        fits[key] = {'a': round(a, 2), 'b': round(b, 5), 'lo': round(lo, 1), 'hi': round(hi, 1)}
    flat = lambda pts: [v for p in pts for v in (round(p[0]), round(p[1]))]
    labels = []
    for name in ('논현로', '도산대로', '논현로151길', '도산대로25길', '도산대로27길', '가로수길'):
        ways = [r for r in data['roads'] if r['name'] == name]
        if not ways: continue
        r = max(ways, key=lambda r: len(r['pts'])); m = r['pts'][len(r['pts']) // 2]
        labels.append([name, round(m[0]), round(m[1])])
    g = {'licence': data['licence'], 'size': data['sizePx'], 'centre': [round(v) for v in data['centrePx']], 'fits': fits, 'labels': labels,
         'special': data['special'],
         'roads': [[r['id'], K[r['kind']], round(r['w']), round(r['sw']), 1 if r['bridge'] else 0] + flat(r['pts']) for r in data['roads']],
         'buildings': [[b['id'], CL.index(b['cls']) if b['cls'] in CL else 0, b['floors']] + flat(b['pts']) for b in data['buildings']],
         'areas': [[AC.index(a['cls'])] + flat(a['pts']) for a in data['areas']]}
    json.dump(g, open(GAME, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print('game file', os.path.getsize(GAME), 'bytes; fits', fits)

if __name__ == '__main__':
    main()
