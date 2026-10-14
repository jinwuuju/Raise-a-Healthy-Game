import { describe, expect, it } from 'vitest';
import picks from '../../data/content/lunch-menu-picks.v0.1.json';
import { fillMenu, lunchExtras as x, lunchMenus, lunchReferences, tipApplies, tipText, tipsFor } from '../../src/domain/lunch-content';

const sources = new Set(x.sources.map(s => s.id));
const triggers = ['감기', '혈압', '당뇨', '위염', '비염', '약', '처방', '복용', '해열', '면역', '혈당', '기능성', '피로', '젊어', '살이', '숙취', '보장', '집중력', '나았', '의사', '목 지킴이', '치료', '예방', '건강', '다이어트', '효과', '100%'];
const judging = ['건강', '다이어트', '칼로리', '열량', '몸에', '착한', '나쁜', '잘했', '훌륭', '대단', '굶', '살찌', '살 빠', '살이', '좋은 선택', '현명', '참았', '덜 먹'];
const lines = x.colleagues.flatMap(c => Object.values(c.lines).flat());

describe('lunch step ③ content (D081)', () => {
  it('keeps 192 unique menus with honest nutrition status and delivery basis', () => {
    expect(lunchMenus).toHaveLength(192);
    expect(new Set(lunchMenus.map(m => m.id)).size).toBe(192);
    for (const c of ['cool', 'spicy', 'hot', 'crispy', 'meat', 'foreign', 'light', 'quick', 'hearty']) expect(lunchMenus.filter(m => m.crave === c).length).toBeGreaterThanOrEqual(10);
    for (const m of lunchMenus) {
      if (m.nutritionStatus === 'none') { expect(m.perServing).toBeNull(); expect(m.per100g).toBeNull(); expect(m.source).toBeNull(); expect(m.servingBasis).toContain('값 없음'); }
      else {
        expect(m.source).not.toBeNull(); expect(m.per100g?.kcal).toBeTypeOf('number');
        if (m.nutritionStatus === 'borrowed') { expect(m.source!.borrowedFor).toBe(m.name); expect(m.servingBasis).toContain('대체'); }
        else expect(m.source!.borrowedFor).toBeNull();
        if (m.nutritionStatus === 'calculated') { expect(m.source!.method).toBe('산출'); expect(m.servingUnit).toBe('ml'); }
        if (m.perServing === null) expect(m.servingBasis).toContain('1인분 양 미상');
      }
    }
    expect(Object.hasOwn(picks, 'droppedRare')).toBe(false);
    for (const p of picks.picks) expect(['web-store', 'common-unverified', 'rare-included', 'popular-added']).toContain(p.delivery.basis);
    for (const art of ['물냉면', '떡볶이', '순댓국밥', '후라이드치킨', '김밥']) expect(lunchMenus.some(m => m.name === art)).toBe(true);
  });

  it('has varied, sourced exaggerated claims of every legal type, each with a spottable phrase', () => {
    expect(x.hype.length).toBeGreaterThanOrEqual(15);
    expect(new Set(x.hype.map(h => h.id)).size).toBe(x.hype.length); expect(new Set(x.hype.map(h => h.text)).size).toBe(x.hype.length);
    for (const type of Object.keys(x.claimTypes)) expect(x.hype.filter(h => h.type === type).length).toBeGreaterThanOrEqual(2);
    for (const h of x.hype) {
      expect(Object.hasOwn(x.claimTypes, h.type)).toBe(true); expect(h.src.every(s => sources.has(s))).toBe(true);
      expect(h.text.split('{menu}')).toHaveLength(2); expect(h.why.length).toBeGreaterThan(10);
      expect(triggers.some(t => h.text.includes(t))).toBe(true);
    }
  });

  it('keeps fair shop lines free of disease, drug, functional or health claims', () => {
    expect(x.fair.length).toBeGreaterThanOrEqual(15);
    expect(new Set(x.fair.map(f => f.text)).size).toBe(x.fair.length);
    for (const f of x.fair) { expect(triggers.filter(t => f.text.includes(t))).toEqual([]); expect(f.text.split('{menu}').length).toBeLessThanOrEqual(2); }
  });

  it('gives colleague lines for every moment without judging the meal or skipping', () => {
    for (const c of x.colleagues) for (const k of ['pick', 'any', 'skip', 'reportHit', 'reportMiss'] as const) expect(c.lines[k].length).toBeGreaterThan(0);
    for (const l of lines) { expect(judging.filter(w => l.includes(w))).toEqual([]); expect(l.replace(/\{menu\}/g, '')).not.toMatch(/[{}]/); }
    for (const c of x.colleagues) for (const l of c.lines.skip) expect(l).not.toContain('{menu}');
    const sample = lunchMenus.find(m => m.name === '김치찌개')!;
    expect(fillMenu(x.colleagues[1]!.lines.pick[0]!, sample)).toBe('와, 김치찌개 도착! 포장 매듭부터 장인의 손길이야.');
  });

  it('applies order tips by rule, fills the rice numbers from the DB row and keeps tips optional', () => {
    expect(lunchReferences.rice.foodCode).toBe('D301-022000000-0001');
    const rice = x.tips.find(t => t.id === 'rice-half')!;
    expect(tipText(rice)).toBe('공기밥을 반만 받아요. 밥 100g마다 약 166kcal, 탄수화물 37g이 달라져요.');
    for (const t of x.tips) { expect(lunchMenus.filter(m => tipApplies(t, m)).length).toBeGreaterThanOrEqual(5); expect(t.src.every(s => sources.has(s))).toBe(true); expect(tipText(t)).not.toMatch(/[{}]/); }
    const byName = (n: string) => lunchMenus.find(m => m.name === n)!;
    for (const n of ['탕수육', '김치볶음밥', '라볶이']) expect(tipApplies(rice, byName(n))).toBe(false);
    for (const n of ['김치찌개', '제육볶음', '간장게장', '보쌈']) expect(tipApplies(rice, byName(n))).toBe(true);
    const broth = x.tips.find(t => t.id === 'broth-sip')!;
    for (const m of lunchMenus.filter(m => m.crave === 'hot')) expect(tipApplies(broth, m)).toBe(true);
    for (const m of lunchMenus) expect(tipsFor(m).some(t => t.id === 'mild-please')).toBe(true);
    expect(x.tipsNote).toContain('보상·점수는 같고');
  });
});
