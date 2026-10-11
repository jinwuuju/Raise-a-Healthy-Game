#!/usr/bin/env python3
# 오늘의 점심(D068) 메뉴 DB 생성기.
# 입력: data/raw/20260828_음식DB_19617건.xlsx (식약처 K-FIND 음식 DB 원본, Git 제외)
#       data/content/lunch-menu-picks.v0.1.json (메뉴 선정표)
# 출력: data/content/lunch-menus.v0.1.json (게임용 draft 본문)
#       data/sources/mfds-food-db-lunch-rows.csv (선택한 원본 행 전체 열, 추적용)
# 원본이 없으면 data/sources의 추출본으로 다시 만들 수 있다(--from-extract).
import csv, json, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
RAW = ROOT / 'data/raw/20260828_음식DB_19617건.xlsx'
PICKS = ROOT / 'data/content/lunch-menu-picks.v0.1.json'
OUT = ROOT / 'data/content/lunch-menus.v0.1.json'
EXTRACT = ROOT / 'data/sources/mfds-food-db-lunch-rows.csv'

CRAVES = ['cool', 'spicy', 'hot', 'crispy', 'meat', 'foreign', 'light', 'quick', 'hearty']
MIN_PER_CRAVE = 10
# DB 1인분 중량이 100g 기준값뿐인 메뉴: 같은 DB의 비슷한 음식 분석 1인분 중량을 빌려 쓴다(추정 표시).
ASSUMED = {
    'malatang': ('쌀국수', '국물 면 요리로 같은 DB 쌀국수 분석 1인분 중량을 적용'),
    'tonkotsu-ramen': ('우동_일식', '국물 면 요리로 같은 DB 일식 우동 분석 1인분 중량을 적용'),
    'pad-thai': ('우동볶음', '볶음 면 요리로 같은 DB 우동볶음 분석 1인분 중량을 적용'),
    'bun-cha': ('국수_비빔국수', '찬 면 요리로 같은 DB 비빔국수 분석 1인분 중량을 적용'),
}
COLS = {'kcal': '에너지(kcal)', 'protein': '단백질(g)', 'fat': '지방(g)', 'saturatedFat': '포화지방산(g)',
        'carb': '탄수화물(g)', 'sugar': '당류(g)', 'fiber': '식이섬유(g)', 'sodium': '나트륨(mg)'}


def load_rows(from_extract):
    if from_extract:
        with open(EXTRACT, newline='', encoding='utf-8') as f:
            rows = list(csv.reader(f))
        return rows[0], rows[1:]
    import openpyxl
    wb = openpyxl.load_workbook(RAW, read_only=True)
    it = wb[wb.sheetnames[0]].iter_rows(values_only=True)
    hdr = [str(h) for h in next(it)]
    return hdr, [['' if v is None else str(v) for v in r] for r in it]


def grams(s):
    s = (s or '').strip()
    return float(s[:-1]) if s.endswith('g') and not s.endswith('mg') else None


def num(s):
    try:
        return float(s)
    except (TypeError, ValueError):
        return None


def main():
    from_extract = '--from-extract' in sys.argv or not RAW.exists()
    hdr, rows = load_rows(from_extract)
    ix = {h: i for i, h in enumerate(hdr)}
    def g(r, k): return r[ix[k]]
    used = []
    generic = [r for r in rows if g(r, '업체명') == '해당없음' and g(r, '데이터생성방법명') == '분석']

    def pick_row(name):
        c = [r for r in generic if g(r, '식품명') == name]
        if not c:
            raise SystemExit('DB에 분석값 없음: ' + name)
        # 실제 1인분 중량(100g 기준값이 아닌 것)을 먼저, 그다음 최신 생성일자
        c.sort(key=lambda r: ((grams(g(r, '식품중량')) or 0) > 100, grams(g(r, '식품중량')) is not None, g(r, '데이터생성일자')), reverse=True)
        return c[0]

    def others(name, chosen, w):
        # 같은 음식명의 다른 분석 행: 가게·조사마다 값이 다르다는 것을 함께 보여 준다.
        res = []
        for o in generic:
            if g(o, '식품명') != name or o is chosen: continue
            ow = grams(g(o, '식품중량'))
            sw = ow if ow and ow > 100 else w
            k, na = num(g(o, '에너지(kcal)')), num(g(o, '나트륨(mg)'))
            res.append({'foodCode': g(o, '식품코드'), 'servingG': sw,
                        'servingBasis': 'DB 1인분 중량' if sw == ow else '대표 행의 1인분 중량 적용',
                        'kcal': None if k is None else round(k * sw / 100),
                        'sodium': None if na is None else round(na * sw / 100),
                        'createdAt': g(o, '데이터생성일자')})
            used.append(o)
        return res

    picks = json.load(open(PICKS, encoding='utf-8'))['picks']
    menus = []
    for p in picks:
        r = pick_row(p['dbName'])
        if g(r, '영양성분함량기준량') != '100g':
            raise SystemExit('기준량이 100g이 아님: ' + p['id'])
        w = grams(g(r, '식품중량'))
        basis = 'DB 1인분 중량'
        ref = None
        if p['id'] in ASSUMED:
            refName, why = ASSUMED[p['id']]
            rr = pick_row(refName)
            w = grams(g(rr, '식품중량'))
            basis = '추정: ' + why
            ref = {'foodCode': g(rr, '식품코드'), 'foodName': refName}
            used.append(rr)
        if not w or w <= 100 and p['id'] not in ASSUMED:
            # 100g은 기준량과 구분되지 않으므로 1인분으로 쓰지 않는다
            raise SystemExit('1인분 중량 없음 또는 100g 이하: ' + p['id'])
        per100 = {k: num(g(r, v)) for k, v in COLS.items()}
        def scale(k, v):
            if v is None: return None
            x = v * w / 100
            return round(x) if k in ('kcal', 'sodium') else round(x, 1)
        menus.append({
            'id': p['id'], 'name': p['name'], 'crave': p['crave'], 'tags': [],
            'servingG': w, 'servingBasis': basis, 'servingRef': ref,
            'perServing': {k: scale(k, v) for k, v in per100.items()},
            'per100g': per100,
            'source': {'db': '식품의약품안전처 K-FIND 식품영양성분 데이터베이스 음식 DB(2026-08-28 갱신, 19,617건)',
                       'foodCode': g(r, '식품코드'), 'foodName': g(r, '식품명'), 'method': g(r, '데이터생성방법명'),
                       'createdAt': g(r, '데이터생성일자')},
            'otherAnalyses': others(p['dbName'], r, w),
            'art': {'id': 'food-' + p['id'], 'status': '미제작'},
            'adClaim': None, 'orderTips': [], 'review': 'draft_unreviewed',
        })
        used.append(r)

    # 무결성 검사
    ids = [m['id'] for m in menus]; names = [m['name'] for m in menus]; codes = [m['source']['foodCode'] for m in menus]
    for label, xs in (('id', ids), ('이름', names), ('식품코드', codes), ('그림 id', [m['art']['id'] for m in menus])):
        dup = {x for x in xs if xs.count(x) > 1}
        if dup: raise SystemExit(label + ' 중복: ' + ', '.join(sorted(dup)))
    for c in CRAVES:
        n = sum(m['crave'] == c for m in menus)
        if n < MIN_PER_CRAVE: raise SystemExit(c + ' 메뉴가 ' + str(n) + '개로 부족')
    if any(m['crave'] not in CRAVES for m in menus): raise SystemExit('알 수 없는 당김')

    OUT.write_text(json.dumps({
        'contentId': 'content.lunch.menus', 'version': '0.1', 'review': 'draft_unreviewed',
        'disclaimer': '검수 전 모형. 수치는 식약처 음식 DB의 100g당 분석값에 1인분 중량을 곱한 값이며, 실제 가게·레시피·양에 따라 크게 다를 수 있다.',
        'craves': CRAVES, 'count': len(menus), 'menus': menus}, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    if not from_extract:
        seen, uniq = set(), []
        for r in used:
            if g(r, '식품코드') not in seen: seen.add(g(r, '식품코드')); uniq.append(r)
        EXTRACT.parent.mkdir(parents=True, exist_ok=True)
        with open(EXTRACT, 'w', newline='', encoding='utf-8') as f:
            wr = csv.writer(f); wr.writerow(hdr); wr.writerows(uniq)
    print('OK', len(menus), 'menus;', ', '.join(c + '=' + str(sum(m['crave'] == c for m in menus)) for c in CRAVES))


if __name__ == '__main__':
    main()
