import { describe, expect, it } from 'vitest';
import menusData from '../../data/content/lunch-menus.v0.1.json';
import extras from '../../data/content/lunch-extras.v0.1.json';
import { CRAVES, DAY_LIMIT, LUNCH_CLOSE_SEC, drawLunch, emptyLunch, lunchOpen, lunchToday, orderLunch, reportLunch, seeLunch, settleLunch, skipLunch, validateLunch, type Crave, type LunchPool } from '../../src/domain/lunch';
import { newState, validateState } from '../../src/domain/state';
import { tipsFor } from '../../src/domain/lunch-content';

const pool: LunchPool = { menus: menusData.menus.map(m => ({ id: m.id, crave: m.crave as Crave, name: m.name })), hype: extras.hype.map(h => h.id), fair: extras.fair.map(f => f.id) };
const seoul = (date: string, hms: string) => Date.parse(date + 'T' + hms + '+09:00');
const T = seoul('2026-10-14', '10:00:00');
function rng(seed: number) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const started = () => ({ ...newState(), started: true, totalXp: 50, gold: 30 });
const crave = (id: string) => menusData.menus.find(m => m.id === id)!.crave;
const roundTrip = <S>(s: S) => validateState(JSON.parse(JSON.stringify(s)));

describe('오늘의 점심 상태(D085)', () => {
  it('마감은 서울 11:30:00이고 그 1초 전까지 열려 있다', () => {
    expect(LUNCH_CLOSE_SEC).toBe(41400);
    expect(lunchOpen(seoul('2026-10-14', '00:00:00'))).toBe(true);
    expect(lunchOpen(seoul('2026-10-14', '11:29:59'))).toBe(true);
    expect(lunchOpen(seoul('2026-10-14', '11:30:00'))).toBe(false);
    expect(lunchOpen(seoul('2026-10-14', '23:59:59'))).toBe(false);
  });

  it('당김 하나: 같은 칸 3장 + 다른 칸 1장, 과장 문구 1장, 메뉴 중복 없음', () => {
    for (const c of CRAVES) for (let seed = 1; seed <= 30; seed++) {
      const d = lunchToday(drawLunch(started(), T, c, pool, rng(seed)), T)!;
      expect(d.cards).toHaveLength(4);
      expect(new Set(d.cards.map(x => x.menu)).size).toBe(4);
      expect(d.cards.filter(x => crave(x.menu) === c)).toHaveLength(3);
      expect(d.cards.filter(x => x.hype)).toHaveLength(1);
      expect(d.cards.filter(x => !x.hype).every(x => pool.fair.includes(x.claim))).toBe(true);
      expect(pool.hype).toContain(d.cards.find(x => x.hype)!.claim);
      expect(new Set(d.cards.map(x => x.claim)).size).toBe(4);
    }
  });

  it('아무거나: 서로 다른 당김 칸 4장', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const d = lunchToday(drawLunch(started(), T, 'any', pool, rng(seed)), T)!;
      expect(new Set(d.cards.map(x => crave(x.menu))).size).toBe(4);
      expect(d.crave).toBe('any');
    }
  });

  it('후보는 하루 한 번 저장되고 다시 뽑아도 바뀌지 않는다', () => {
    const a = drawLunch(started(), T, 'hot', pool, rng(3));
    expect(drawLunch(a, T + 60_000, 'cool', pool, rng(9))).toBe(a);
    expect(roundTrip(a).lunch).toEqual(a.lunch);
  });

  it('과장 신고는 하루 한 번, 맞히면 hit, 틀려도 감점·보상 변화 없음', () => {
    const a = drawLunch(started(), T, 'spicy', pool, rng(5)), d = lunchToday(a, T)!;
    const hype = d.cards.find(c => c.hype)!, fair = d.cards.find(c => !c.hype)!;
    const hit = reportLunch(a, T, hype.menu, 'senior', 0), miss = reportLunch(a, T, fair.menu, 'editor', 0);
    expect(lunchToday(hit, T)!.report!.hit).toBe(true);
    expect(lunchToday(miss, T)!.report!.hit).toBe(false);
    expect(reportLunch(miss, T, hype.menu, 'senior', 0)).toBe(miss);
    for (const s of [hit, miss]) expect([s.totalXp, s.gold]).toEqual([50, 30]);
    expect(() => reportLunch(a, T, 'not-a-card', 'editor', 0)).toThrow();
  });

  it('주문: 후보 안의 메뉴와 그 메뉴에 맞는 요령만, 도감에 한 번 등록, 보상 없음', () => {
    const a = drawLunch(started(), T, 'hot', pool, rng(8)), menu = lunchToday(a, T)!.cards[0]!.menu, m = menusData.menus.find(x => x.id === menu)!;
    const applicable = tipsFor(m).map(t => t.id);
    expect(() => orderLunch(a, T, menu, m.name, ['not-a-tip'], applicable, 'editor', 0)).toThrow();
    expect(() => orderLunch(a, T, 'gimbap-x', '없음', [], applicable, 'editor', 0)).toThrow();
    const b = orderLunch(a, T, menu, m.name, applicable.slice(0, 1), applicable, 'photo', 1);
    const d = lunchToday(b, T)!;
    expect([d.outcome, d.menu, d.menuName, d.tips, d.seen]).toEqual(['ordered', menu, m.name, applicable.slice(0, 1), false]);
    expect(b.lunch.dex).toEqual([menu]);
    expect([b.totalXp, b.gold]).toEqual([50, 30]);
    expect(() => orderLunch(b, T, menu, m.name, [], applicable, 'editor', 0)).toThrow('이미');
    expect(() => skipLunch(b, T, 'editor', 0)).toThrow('이미');
    expect(roundTrip(b).lunch).toEqual(b.lunch);
  });

  it('11:30:00이 되면 주문·굶기·신고·뽑기 모두 막힌다', () => {
    const a = drawLunch(started(), T, 'quick', pool, rng(2)), late = seoul('2026-10-14', '11:30:00'), menu = lunchToday(a, T)!.cards[0]!.menu;
    expect(() => orderLunch(a, late, menu, 'x', [], [], 'editor', 0)).toThrow('마감');
    expect(() => skipLunch(a, late, 'editor', 0)).toThrow('마감');
    expect(() => reportLunch(a, late, menu, 'editor', 0)).toThrow('마감');
    expect(() => drawLunch(started(), late, 'quick', pool, rng(1))).toThrow('마감');
    expect(orderLunch(a, seoul('2026-10-14', '11:29:59'), menu, 'x', [], [], 'editor', 0).lunch.days[0]!.outcome).toBe('ordered');
  });

  it('직접 굶기: 보상 0·벌칙 0·상태 변화 없음', () => {
    const a = skipLunch(started(), T, 'senior', 0), d = lunchToday(a, T)!;
    expect([d.outcome, d.skip, d.menu, a.totalXp, a.gold, a.lunch.dex]).toEqual(['skipped', 'manual', null, 50, 30, []]);
    expect(roundTrip(a).lunch).toEqual(a.lunch);
  });

  it('자동 굶음: 그날 연 상태로 11:30이 지나거나 지난 날 미확정만. 열지 않은 날은 만들지 않는다', () => {
    const s = started();
    expect(settleLunch(s, T)).toBe(s);
    const late = settleLunch(s, seoul('2026-10-14', '12:10:00'));
    expect(late.lunch.days.map(d => [d.date, d.outcome, d.skip])).toEqual([['2026-10-14', 'skipped', 'auto']]);
    const drawn = drawLunch(s, T, 'meat', pool, rng(4));
    const nextWeek = settleLunch(drawn, seoul('2026-10-21', '09:00:00'));
    expect(nextWeek.lunch.days.map(d => [d.date, d.outcome, d.skip])).toEqual([['2026-10-14', 'skipped', 'auto']]);
    expect(settleLunch(nextWeek, seoul('2026-10-21', '09:00:01'))).toBe(nextWeek);
    expect(settleLunch(newState(), seoul('2026-10-14', '12:00:00')).lunch.days).toEqual([]);
    const ordered = orderLunch(drawn, T, lunchToday(drawn, T)!.cards[1]!.menu, 'x', [], [], 'editor', 0);
    expect(settleLunch(ordered, seoul('2026-10-14', '13:00:00'))).toBe(ordered);
    expect([late.totalXp, late.gold]).toEqual([50, 30]);
  });

  it('자정이 지나면 새 날이고 전날 확정 기록은 그대로 남는다', () => {
    const a = skipLunch(started(), seoul('2026-10-14', '09:00:00'), 'editor', 0);
    const b = drawLunch(a, seoul('2026-10-15', '00:00:00'), 'cool', pool, rng(6));
    expect(b.lunch.days.map(d => d.date)).toEqual(['2026-10-14', '2026-10-15']);
    expect(b.lunch.days[0]!.outcome).toBe('skipped');
  });

  it('카드 보기 표시는 확정된 날에만, 한 번', () => {
    const a = skipLunch(started(), T, 'editor', 0), b = seeLunch(a, '2026-10-14');
    expect(lunchToday(b, T)!.seen).toBe(true);
    expect(seeLunch(b, '2026-10-14')).toBe(b);
    const drawn = drawLunch(started(), T, 'cool', pool, rng(1));
    expect(seeLunch(drawn, '2026-10-14')).toBe(drawn);
  });

  it('옛 저장(점심 없음)은 빈 기록, 손상된 기록은 거부, 오래된 날은 최근 120일만', () => {
    const old = JSON.parse(JSON.stringify(started())); delete old.lunch;
    expect(validateState(old).lunch).toEqual(emptyLunch());
    const a = drawLunch(started(), T, 'hot', pool, rng(7));
    const broken = JSON.parse(JSON.stringify(a)); broken.lunch.days[0].cards[0].hype = !broken.lunch.days[0].cards[0].hype;
    expect(() => validateState(broken)).toThrow();
    const fake = JSON.parse(JSON.stringify(a)); fake.lunch.days[0].outcome = 'ordered';
    expect(() => validateState(fake)).toThrow();
    expect(() => validateLunch({ days: 'x', dex: [] })).toThrow();
    let s = started();
    for (let i = 0; i < DAY_LIMIT + 5; i++) s = skipLunch(s, T + i * 86_400_000, 'editor', 0);
    expect(s.lunch.days).toHaveLength(DAY_LIMIT);
    expect(roundTrip(s).lunch.days[0]!.date > '2026-10-14').toBe(true);
  });

  it('실제 메뉴 데이터로 모든 당김 칸에서 후보를 뽑을 수 있다', () => {
    for (const c of CRAVES) expect(pool.menus.filter(m => m.crave === c).length).toBeGreaterThanOrEqual(10);
    expect(pool.fair.length).toBeGreaterThanOrEqual(3);
  });
});
