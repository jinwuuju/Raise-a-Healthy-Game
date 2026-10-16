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
HALF = 1050.0                               # map half-size in metres (1 km radius + margin, D098)
RADIUS = 1000.0
# Known places (Kakao address search 2026-10-15, metres from Euro Plaza): used to attach existing game entrances.
PLACES = {'europlaza': (1.6, 2.5), 'cafe': (-70.7, 33.0)}
# Facing Euro Plaza across the lane, either side of Dosan-daero 25-gil (user photos, D088): Jin-U brick block west, granite east.
FIXED = {'jinu': 1553709254, 'granite': 899216069}
# D103: the fictional Orbit Tailor clothes shop is given to this small block west of Jin-U (game assignment only:
# the building ledger is unchanged and the shop is not a real business).
TAILOR = 1553709277
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

def crossroads_px():
    # Eulji crossroads (Nonhyeon-ro x Dosan-daero), metres from Euro Plaza, in game pixels
    return m2px(41.0, -107.0)

def main():
    els = json.load(open(SRC, encoding='utf-8'))['elements']
    lim = HALF + 20
    roads, buildings, areas = [], [], []
    for e in els:
        if e['type'] != 'way' or 'geometry' not in e: continue
        t = e.get('tags', {}); pts = [local(p) for p in e['geometry']]
        if not any(abs(x) < lim and abs(y) < lim for x, y in pts): continue
        hw = t.get('highway')
        if hw in ('footway', 'path', 'steps', 'cycleway', 'platform', 'service') and not t.get('name'): continue  # D097: less clutter
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
                          'pts': [m2px(*p) for p in simplify(pts, 0.4 if hw in MAJOR else 1.2)]})
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
    stations = [[e['tags']['name'], *m2px(*local(e))] for e in els if e['type'] == 'node' and e.get('tags', {}).get('railway') == 'station' and 'name' in e['tags'] and abs(local(e)[0]) < HALF and abs(local(e)[1]) < HALF]
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
    blocks = make_blocks(buildings, roads, size, special)
    routes = make_routes(roads)
    zebras = make_zebras(roads, size, blocks, (2154, 2502 - 3840 // 2 + size // 2) if False else crossroads_px())
    data = {'version': '0.1', 'licence': 'Map data (c) OpenStreetMap contributors, ODbL 1.0', 'mPerTile': 3, 'pxPerM': round(PX, 4),
            'halfMetres': HALF, 'radiusMetres': RADIUS, 'sizePx': size, 'centrePx': m2px(0, 0),
            'places': {k: m2px(*v) for k, v in PLACES.items()}, 'special': special,
            'roads': roads, 'buildings': buildings, 'blocks': blocks, 'areas': areas, 'routes': routes, 'zebras': zebras, 'stations': stations}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(data, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    src_of = {b['id']: b['floorsSource'] for b in buildings}
    ledger = {'version': '0.1', 'licence': data['licence'],
              'note': 'name는 사용자가 나중에 채운다(null = 이름 없음). floorsSource가 estimate인 층수는 추정값이며 사용자가 고칠 수 있다.',
              'buildings': [{'id': k['id'], 'kind': k['kind'], 'rectPx': [k['x'], k['y'], k['w'], k['d']], 'floors': k['floors'],
                             'floorsSource': src_of.get(k['id'], 'estimate'), 'special': k['special'], 'name': None}
                            for k in sorted(blocks, key=lambda k: (math.hypot(k['x'] + k['w'] / 2 - size / 2, k['y'] + k['d'] / 2 - size / 2), k['id']))]}
    json.dump(ledger, open(LEDGER, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    est = sum(1 for b in buildings if b['floorsSource'] == 'estimate')
    print('routes', len(routes), 'zebras', len(zebras), 'stations', [s_[0] for s_ in stations]); print('blocks', len(blocks), 'size', size, 'px; roads', len(roads), 'buildings', len(buildings), '(estimated floors', est, ') areas', len(areas),
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
         'roads': [[r['id'], K[r['kind']], round(r['w']), round(r['sw']), (1 if r['bridge'] else 0) | (2 if r['oneway'] else 0)] + flat(r['pts']) for r in data['roads']],
         'routes': [[{'논현로': 0, '도산대로': 1}.get(r['name'], 2), 1 if r['oneway'] else 0, round(r['w'])] + flat(r['pts']) for r in data['routes']],
         'zebras': data['zebras'], 'stations': [[n, round(x), round(y)] for n, x, y in data['stations']],
         'blocks': [[k['id'], KINDS.index(k['kind']), k['v'], k['x'], k['y'], k['w'], k['d'], k['h']] for k in data['blocks']],
         'areas': [[AC.index(a['cls'])] + flat(a['pts']) for a in data['areas']]}
    json.dump(g, open(GAME, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    ep = next(b for b in data['blocks'] if b['special'] == 'europlaza'); cafe = next(b for b in data['blocks'] if b['special'] == 'cafe')
    jinu = next(b for b in data['blocks'] if b['special'] == 'jinu'); tailor = next(b for b in data['blocks'] if b['id'] == TAILOR)
    exits = {'size': data['sizePx'], 'euroOut': {'x': ep['x'] + 100, 'y': ep['y'] + ep['d'] + 14},
             'cafeOut': {'x': cafe['x'] + round(cafe['w'] / 2), 'y': cafe['y'] + cafe['d'] + 16}, 'cafeFacing': 'down',
             # D103: shop doors on the south faces (Jin-U's door art sits 55-69 px from its west edge; the tailor's is centred).
             'jinuOut': {'x': jinu['x'] + 62, 'y': jinu['y'] + jinu['d'] + 16},
             'tailorId': TAILOR, 'tailorOut': {'x': tailor['x'] + round(tailor['w'] / 2), 'y': tailor['y'] + tailor['d'] + 16}}
    json.dump(exits, open(os.path.join(ROOT, 'src/world/district-exits.generated.json'), 'w', encoding='utf-8'))
    print('game file', os.path.getsize(GAME), 'bytes; fits', fits)


# ---------- D097: tidy blocks (game look) ----------
GRID = 8
KINDS = ['europlaza', 'b2bc', 'jinu', 'granite', 'shop', 'office', 'apartment', 'brickcorner', 'hotel', 'small']
MIN_W = {'jinu': 80, 'cafe': 72, 'granite': 80}

def stroke_quads(pts, width):
    r = width / 2; out = []
    for i in range(1, len(pts)):
        (ax, ay), (bx, by) = pts[i - 1], pts[i]; L = math.hypot(bx - ax, by - ay) or 1
        nx, ny = -(by - ay) / L * r, (bx - ax) / L * r
        out.append([(ax + nx, ay + ny), (bx + nx, by + ny), (bx - nx, by - ny), (ax - nx, ay - ny)])
    if r >= 2:
        for (px_, py_) in pts:
            out.append([(px_ + math.cos(k * math.pi / 4 + math.pi / 8) * r, py_ + math.sin(k * math.pi / 4 + math.pi / 8) * r) for k in range(8)])
    return out

def raster(poly, grid, n, cell):
    ys = [p[1] / cell for p in poly]
    y0, y1 = max(0, math.ceil(min(ys) - 0.5)), min(n - 1, math.floor(max(ys) - 0.5))
    m = len(poly)
    for y in range(y0, y1 + 1):
        sy = y + 0.5; xs = []
        for i in range(m):
            (ax, ay), (bx, by) = poly[i], poly[i - 1]; ay /= cell; by /= cell; ax /= cell; bx /= cell
            if (ay > sy) != (by > sy): xs.append(ax + (sy - ay) / (by - ay) * (bx - ax))
        xs.sort()
        for k in range(0, len(xs) - 1, 2):
            for x in range(max(0, math.ceil(xs[k] - 0.5)), min(n - 1, math.floor(xs[k + 1] - 0.5)) + 1): grid[y * n + x] = 1

def make_blocks(buildings, roads, size, special):
    cell = 4; n = size // cell; occ = bytearray(n * n)
    for r in roads:
        if r['kind'] == 'path': continue
        w = r['w'] + (2 * r['sw'] if r['kind'] == 'major' else 0) + 4
        for q in stroke_quads(r['pts'], w): raster(q, occ, n, cell)
    def road_hits(x, y, w, d):
        x0, y0, x1, y1 = max(0, x // cell), max(0, y // cell), min(n, (x + w) // cell), min(n, (y + d) // cell)
        top = sum(occ[y0 * n + i] for i in range(x0, x1)) if y0 < n else 0
        bot = sum(occ[(y1 - 1) * n + i] for i in range(x0, x1)) if y1 > 0 else 0
        lef = sum(occ[j * n + x0] for j in range(y0, y1)) if x0 < n else 0
        rig = sum(occ[j * n + x1 - 1] for j in range(y0, y1)) if x1 > 0 else 0
        anyhit = any(occ[j * n + i] for j in range(y0, y1) for i in range(x0, x1))
        return anyhit, {'top': top, 'bottom': bot, 'left': lef, 'right': rig}
    cands = []
    for b in buildings:
        xs = [p[0] for p in b['pts']]; ys = [p[1] for p in b['pts']]
        bx0, by0, bx1, by1 = min(xs), min(ys), max(xs), max(ys)
        A = abs(area(b['pts'])); bbA = max(1, (bx1 - bx0) * (by1 - by0))
        cx, cy = (bx0 + bx1) / 2, (by0 + by1) / 2
        sp = next((k for k, v in special.items() if v == b['id']), None)
        f = 1.0 if sp == 'europlaza' else min(1.0, math.sqrt(A / bbA) * 1.05)
        w, d = (bx1 - bx0) * f, (by1 - by0) * f
        x0 = round((cx - w / 2) / GRID) * GRID; y0 = round((cy - d / 2) / GRID) * GRID
        w = max(GRID, round(w / GRID) * GRID); d = max(GRID, round(d / GRID) * GRID)
        if sp in MIN_W and w < MIN_W[sp]: x0 -= (MIN_W[sp] - w) // 2 // GRID * GRID; w = MIN_W[sp]
        cands.append({'id': b['id'], 'cls': b['cls'], 'floors': b['floors'], 'special': sp, 'x': x0, 'y': y0, 'w': w, 'd': d, 'area0': w * d})
    for c in cands:  # clip to the map so every block is fully inside (and solid)
        x1, y1 = min(size, c['x'] + c['w']), min(size, c['y'] + c['d']); c['x'], c['y'] = max(0, c['x']), max(0, c['y'])
        c['w'], c['d'] = x1 - c['x'], y1 - c['y']
    cands = [c for c in cands if c['w'] >= 32 and c['d'] >= 24 or c['special']]
    order = sorted(cands, key=lambda c: (c['special'] is None, -c['area0']))
    placed = []
    def overlaps(a, b, gap=0):
        return a['x'] < b['x'] + b['w'] + gap and b['x'] < a['x'] + a['w'] + gap and a['y'] < b['y'] + b['d'] + gap and b['y'] < a['y'] + a['d'] + gap
    for c in order:
        ok = True
        if c['special'] != 'europlaza':
            for _ in range(40):
                hit, sides = road_hits(c['x'], c['y'], c['w'], c['d'])
                if not hit: break
                side = max(sides, key=sides.get)
                if sides[side] == 0: side = 'bottom'
                if side == 'top': c['y'] += GRID; c['d'] -= GRID
                elif side == 'bottom': c['d'] -= GRID
                elif side == 'left': c['x'] += GRID; c['w'] -= GRID
                else: c['w'] -= GRID
                if c['w'] < 32 or c['d'] < 24: ok = False; break
            else: ok = False
        if not ok and not c['special']: continue
        for p in placed:
            if not overlaps(c, p): continue
            opts = []
            if p['x'] + p['w'] - c['x'] < c['w']: opts.append(('left', (c['x'] + c['w']) - (p['x'] + p['w'])))
            if c['x'] + c['w'] - p['x'] < c['w']: opts.append(('right', p['x'] - c['x']))
            if p['y'] + p['d'] - c['y'] < c['d']: opts.append(('top', (c['y'] + c['d']) - (p['y'] + p['d'])))
            if c['y'] + c['d'] - p['y'] < c['d']: opts.append(('bottom', p['y'] - c['y']))
            opts = [o for o in opts if o[1] > 0]
            if not opts: ok = False; break
            side, keep = max(opts, key=lambda o: o[1] * (c['d'] if o[0] in ('left', 'right') else c['w']))
            if side == 'left': c['x'], c['w'] = p['x'] + p['w'], keep
            elif side == 'right': c['w'] = keep
            elif side == 'top': c['y'], c['d'] = p['y'] + p['d'], keep
            else: c['d'] = keep
        if not ok or c['w'] < 32 or c['d'] < 24 or (c['w'] * c['d'] < 0.35 * c['area0'] and not c['special']): continue
        placed.append(c)
    # Story buildings need a clear frontage on their drawn (south) face for the door and the props.
    for sp in [c for c in placed if c['special'] in ('cafe', 'jinu', 'granite')]:
        strip = {'x': sp['x'] - 8, 'y': sp['y'] + sp['d'], 'w': sp['w'] + 16, 'd': 32}
        for c in list(placed):
            if c is sp or c['special'] == 'europlaza' or not overlaps(c, strip): continue
            cut = strip['y'] + strip['d'] - c['y']
            if c['y'] >= strip['y'] and c['d'] - cut >= 24: c['y'] += cut; c['d'] -= cut
            else: placed.remove(c)
    blocks = []
    for c in placed:
        f = c['floors']; h = 112 if c['special'] == 'europlaza' else max(48, min(140, 20 + 12 * f))
        hsh = (c['id'] * 2654435761) % 1000
        if c['special'] == 'europlaza': kind = 'europlaza'
        elif c['special'] == 'cafe': kind = 'b2bc'
        elif c['special'] in ('jinu', 'granite'): kind = c['special']
        elif c['cls'] in ('apartment', 'home') or (f >= 10 and c['w'] * c['d'] > 20000): kind = 'apartment'
        elif c['cls'] in ('office',) or c['w'] * c['d'] >= 22000 or f >= 8: kind = 'office'
        else: kind = ['shop', 'shop', 'shop', 'granite', 'brickcorner', 'shop'][hsh % 6]
        if kind in ('shop',) and c['w'] < 48: c['w'] = c['w']  # shops need room for the door; narrow ones become granite
        if kind in ('shop', 'granite') and c['w'] < 56 and not c['special']: kind = 'small'
        if kind == 'brickcorner' and c['w'] < 64: kind = 'small' if c['w'] < 56 else 'shop'
        blocks.append({'id': c['id'], 'kind': kind, 'v': hsh % 6, 'x': c['x'], 'y': c['y'], 'w': c['w'], 'd': c['d'], 'h': h,
                       'floors': f, 'special': c['special']})
    return blocks


# ---------- D098: whole-radius traffic routes and plain zebra crossings ----------
def make_routes(roads):
    majors = [r for r in roads if r['kind'] == 'major' and r['hw'] not in ('motorway',)]
    def key(p): return (round(p[0]), round(p[1]))
    def ang(a, b): return math.atan2(b[1] - a[1], b[0] - a[0])
    def turn(r1, r2):  # direction change from the end of r1 into the start of r2
        d = ang(r2['pts'][0], r2['pts'][1]) - ang(r1['pts'][-2], r1['pts'][-1])
        return abs((d + math.pi) % (2 * math.pi) - math.pi)
    starts, ends = {}, {}
    ow = [r for r in majors if r['oneway'] and len(r['pts']) >= 2]
    for r in ow: starts.setdefault(key(r['pts'][0]), []).append(r); ends.setdefault(key(r['pts'][-1]), []).append(r)
    used, out = set(), []
    for r in sorted(ow, key=lambda r: -sum(math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(r['pts'], r['pts'][1:]))):
        if r['id'] in used: continue
        chain = [r]; used.add(r['id'])
        while True:  # forward: straightest continuation, same name preferred
            c = [q for q in starts.get(key(chain[-1]['pts'][-1]), []) if q['id'] not in used and turn(chain[-1], q) < 1.0]
            if not c: break
            q = min(c, key=lambda q: (q['name'] != chain[-1]['name'], turn(chain[-1], q))); chain.append(q); used.add(q['id'])
        while True:  # backward
            c = [q for q in ends.get(key(chain[0]['pts'][0]), []) if q['id'] not in used and turn(q, chain[0]) < 1.0]
            if not c: break
            q = min(c, key=lambda q: (q['name'] != chain[0]['name'], turn(q, chain[0]))); chain.insert(0, q); used.add(q['id'])
        pts = list(chain[0]['pts'])
        for q in chain[1:]: pts += q['pts'][1:]
        name = max(chain, key=lambda q: sum(math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(q['pts'], q['pts'][1:])))['name']
        out.append({'name': name, 'oneway': True, 'w': max(q['w'] for q in chain), 'pts': pts})
    for r in majors:
        if r['oneway']: continue
        out.append({'name': r['name'], 'oneway': False, 'w': r['w'], 'pts': list(r['pts'])})
        out.append({'name': r['name'], 'oneway': False, 'w': r['w'], 'pts': list(reversed(r['pts']))})
    def length(pts): return sum(math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(pts, pts[1:]))
    return [r for r in out if length(r['pts']) > 120]

def make_zebras(roads, size, blocks, crossroads):
    cell = 2; n = size // cell; occ = bytearray(n * n)
    majors = [r for r in roads if r['kind'] == 'major' and not r['bridge'] and r['hw'] not in ('motorway', 'trunk')]
    for r in majors:
        for q in stroke_quads(r['pts'], r['w']): raster(q, occ, n, cell)
    def blocked(x, y):
        i, j = int(x // cell), int(y // cell)
        return 0 <= i < n and 0 <= j < n and occ[j * n + i] == 1
    def in_block(x, y):
        return any(b['x'] - 2 <= x <= b['x'] + b['w'] + 2 and b['y'] - 2 <= y <= b['y'] + b['d'] + 2 for b in blocks)
    def nearest_on(r, p):
        best = None
        for a, b in zip(r['pts'], r['pts'][1:]):
            dx, dy = b[0] - a[0], b[1] - a[1]; L = dx * dx + dy * dy or 1
            t = max(0, min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L)); q = (a[0] + dx * t, a[1] + dy * t)
            d = math.hypot(q[0] - p[0], q[1] - p[1]); Ls = math.sqrt(L)
            if best is None or d < best[0]: best = (d, q, (dx / Ls, dy / Ls))
        return best
    def zebra_at(q, u):
        nx, ny = -u[1], u[0]
        if not blocked(*q): return None
        ext = []
        for sgn in (-1, 1):
            t = 0; gap = 0; last = 0
            while t < 300:  # bridges a median of up to ~40 px between the two carriageways of a split road
                t += 2
                if blocked(q[0] + nx * t * sgn, q[1] + ny * t * sgn): last = t; gap = 0
                else:
                    gap += 2
                    if gap > 44: break
            ext.append(last)
        L = ext[0] + ext[1]
        if L < 16 or L > 340: return None
        A = (q[0] - nx * (ext[0] + 10), q[1] - ny * (ext[0] + 10)); B = (q[0] + nx * (ext[1] + 10), q[1] + ny * (ext[1] + 10))
        if any(not (8 < c < size - 8) for c in A + B) or in_block(*A) or in_block(*B) or blocked(*A) or blocked(*B): return None
        return [round(A[0]), round(A[1]), round(B[0]), round(B[1])]
    zebras = []
    def far(c, d=420): return all(math.hypot(c[0] - (z[0] + z[2]) / 2, c[1] - (z[1] + z[3]) / 2) > d for z in zebras) and math.hypot(c[0] - crossroads[0], c[1] - crossroads[1]) > 260
    # 1) where a small road meets a big road
    for r in roads:
        if r['kind'] not in ('minor', 'path'): continue
        for p in (r['pts'][0], r['pts'][-1]):
            cands = [nearest_on(m, p) + (m,) for m in majors]
            cands = [c for c in cands if c[0] < m_w(c[3]) / 2 + 14]
            if not cands: continue
            d, q, u, m = min(cands, key=lambda c: c[0])
            if not far(q): continue
            z = zebra_at(q, u)
            if z: zebras.append(z)
    # 2) fill long stretches so no big road runs more than ~200 m without a crossing
    for m in majors:
        pts = m['pts']
        for a, b in zip(pts, pts[1:]):
            L = math.hypot(b[0] - a[0], b[1] - a[1]); steps = int(L // 160)
            for k in range(1, steps + 1):
                t = k * 160 / L; q = (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
                if not (0 < q[0] < size and 0 < q[1] < size) or not far(q, 1000): continue
                z = zebra_at(q, ((b[0] - a[0]) / L, (b[1] - a[1]) / L))
                if z: zebras.append(z)
    return zebras

def m_w(r): return r['w']

if __name__ == '__main__':
    main()
