#!/usr/bin/env python3
"""Phase 0 of the real-scale district (1 tile = 3 m): turn the OpenStreetMap extract around
Euro Plaza (Nonhyeon-ro 805) into local-metre geometry for previews.

Input : data/raw/district/osm-1km.json  (Overpass `out geom`, ODbL, Git-ignored)
Output: artifacts/map-ref/district-plan.js (window.PLAN = {...}, local only)

Coordinates: metres east (x) / north (y) of the centre, equirectangular around the centre
(error < 0.1 % inside 1.1 km). No game data is produced here; this is a reference preview.
"""
import json, math, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, 'data/raw/district/osm-1km.json')
OUT = os.path.join(ROOT, 'artifacts/map-ref/district-plan.js')
LAT0, LON0 = 37.52067, 127.02767        # Nonhyeon-ro 805 (Euro Plaza) per OSM address node
MX = 111320.0 * math.cos(math.radians(LAT0))
MY = 110574.0
RADIUS = 1100.0

def xy(p):
    return [round((p['lon'] - LON0) * MX, 2), round((p['lat'] - LAT0) * MY, 2)]

def num(v, d=None):
    try:
        return float(str(v).split(';')[0].replace('m', '').strip())
    except (TypeError, ValueError):
        return d

# Carriageway width estimate in metres (OSM rarely has width here). Calibrated later against imagery.
BASE_W = {'motorway': 14, 'trunk': 14, 'primary': 20, 'secondary': 18, 'tertiary': 10, 'unclassified': 7,
          'residential': 6, 'living_street': 5, 'service': 4, 'busway': 4,
          'motorway_link': 7, 'trunk_link': 7, 'primary_link': 7, 'secondary_link': 7, 'tertiary_link': 6,
          'pedestrian': 5, 'footway': 2.5, 'path': 2, 'cycleway': 2.5, 'steps': 2, 'platform': 3}
SIDEWALK = {'motorway': 0, 'trunk': 0, 'primary': 4, 'secondary': 4, 'tertiary': 2.5}

def road_width(t):
    hw = t['highway']
    w = num(t.get('width'))
    if w: return w
    lanes = num(t.get('lanes'))
    if lanes and hw in ('motorway', 'trunk', 'primary', 'secondary', 'tertiary') or (lanes and hw.endswith('_link')):
        return lanes * 3.25
    if hw == 'service' and t.get('service') == 'parking_aisle': return 5
    return BASE_W.get(hw, 4)

def area_class(t):
    if 'building' in t: return None
    if t.get('leisure') in ('park', 'garden', 'playground') or t.get('landuse') in ('grass', 'meadow', 'village_green') or t.get('natural') in ('grassland', 'wood', 'scrub'):
        return 'green'
    if t.get('leisure') in ('pitch', 'sports_centre', 'track'): return 'pitch'
    if t.get('amenity') in ('parking',) or t.get('amenity') == 'parking_space': return 'parking'
    if t.get('amenity') in ('school', 'kindergarten', 'university', 'college'): return 'school'
    if t.get('landuse') == 'construction': return 'construction'
    if t.get('landuse') == 'religious' or t.get('amenity') == 'place_of_worship': return 'religious'
    if t.get('natural') == 'water' or 'waterway' in t: return 'water'
    if t.get('man_made') in ('bridge', 'pier'): return 'bridge'
    return None

def building_class(t):
    b = t.get('building', 'yes')
    if b in ('apartments', 'residential', 'house', 'detached', 'terrace', 'dormitory'): return 'home'
    if b in ('school', 'kindergarten', 'university'): return 'school'
    if b in ('church', 'chapel', 'temple', 'religious'): return 'religious'
    if b in ('commercial', 'retail', 'office', 'hotel'): return 'commercial'
    if b in ('parking', 'garage', 'garages'): return 'parking'
    return 'yes'

def main():
    data = json.load(open(SRC, encoding='utf-8'))['elements']
    roads, buildings, areas, stations = [], [], [], []
    for e in data:
        t = e.get('tags', {})
        if e['type'] == 'node':
            if t.get('railway') in ('station', 'subway_entrance'):
                p = xy(e)
                if math.hypot(*p) <= RADIUS:
                    stations.append({'kind': t['railway'], 'name': t.get('name', t.get('ref', '')), 'p': p})
            continue
        if e['type'] == 'way' and 'geometry' in e:
            pts = [xy(p) for p in e['geometry']]
            if min(math.hypot(*p) for p in pts) > RADIUS: continue
            if 'highway' in t and t['highway'] not in ('construction', 'proposed', 'elevator', 'corridor'):
                roads.append({'id': e['id'], 'hw': t['highway'], 'name': t.get('name', ''), 'w': road_width(t),
                              'sw': SIDEWALK.get(t['highway'], 0), 'oneway': t.get('oneway') == 'yes',
                              'layer': int(num(t.get('layer'), 0) or 0), 'bridge': t.get('bridge') == 'yes',
                              'tunnel': t.get('tunnel') in ('yes', 'building_passage'), 'pts': pts})
            elif 'building' in t:
                lv = num(t.get('building:levels')); h = num(t.get('height'))
                buildings.append({'id': e['id'], 'cls': building_class(t), 'levels': lv, 'height': h,
                                  'name': t.get('name', ''), 'pts': pts})
            elif t.get('railway') in ('rail', 'subway') and t.get('tunnel') != 'yes':
                roads.append({'id': e['id'], 'hw': 'rail', 'name': t.get('name', ''), 'w': 4, 'sw': 0, 'oneway': False,
                              'layer': int(num(t.get('layer'), 0) or 0), 'bridge': t.get('bridge') == 'yes', 'tunnel': False, 'pts': pts})
            else:
                c = area_class(t)
                if c and len(pts) > 2: areas.append({'id': e['id'], 'cls': c, 'pts': pts})
        elif e['type'] == 'relation' and 'members' in e:
            c = 'building' if 'building' in t else area_class(t)
            if not c: continue
            for m in e['members']:
                if m.get('role') != 'outer' or 'geometry' not in m: continue
                pts = [xy(p) for p in m['geometry']]
                if min(math.hypot(*p) for p in pts) > RADIUS: continue
                if c == 'building':
                    buildings.append({'id': e['id'], 'cls': building_class(t), 'levels': num(t.get('building:levels')),
                                      'height': num(t.get('height')), 'name': t.get('name', ''), 'pts': pts})
                else:
                    areas.append({'id': e['id'], 'cls': c, 'pts': pts})
    plan = {'centre': [LAT0, LON0], 'mPerTile': 3, 'radius': RADIUS, 'source': 'OpenStreetMap contributors (ODbL)',
            'roads': roads, 'buildings': buildings, 'areas': areas, 'stations': stations}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write('window.PLAN = ' + json.dumps(plan, ensure_ascii=False, separators=(',', ':')) + ';\n')
    print('roads', len(roads), 'buildings', len(buildings), 'areas', len(areas), 'stations', len(stations),
          'bytes', os.path.getsize(OUT))

if __name__ == '__main__':
    main()
