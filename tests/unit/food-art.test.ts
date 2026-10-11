import { describe, expect, it } from 'vitest';
import lunch from '../../data/content/lunch-menus.v0.1.json';
import { FOOD_ART, FOOD_H, FOOD_W, uniquenessProblems, type FoodGrid } from '../../src/art/food';

const grids: Record<string, FoodGrid> = Object.fromEntries(Object.entries(FOOD_ART).map(([id, f]) => [id, f()]));
const menuIds = new Set(lunch.menus.map(m => m.id));

describe('오늘의 점심 음식 그림(D069)', () => {
  it('그림마다 실제 메뉴 id와 연결되고 32x32 격자다', () => {
    for (const [id, g] of Object.entries(grids)) {
      expect(menuIds.has(id), id).toBe(true);
      expect(g.length).toBe(FOOD_W * FOOD_H);
    }
  });
  it('음식이 칸을 적당히 채우고 색이 풍부하다(빈약한 그림 방지)', () => {
    for (const [id, g] of Object.entries(grids)) {
      const opaque = g.filter(Boolean).length / g.length;
      expect(opaque, id).toBeGreaterThan(0.3);
      expect(opaque, id).toBeLessThan(0.9);
      expect(new Set(g.filter(Boolean)).size, id).toBeGreaterThanOrEqual(12);
    }
  });
  it('같은 그림·색만 바꾼 그림·차이 15% 미만 그림이 없다', () => {
    expect(uniquenessProblems(grids)).toEqual([]);
  });
  it('검사가 실제로 복제를 잡는다', () => {
    const a = grids['gimbap']!;
    const recolor = a.map(c => (c === '#25332a' ? '#123456' : c));
    expect(uniquenessProblems({ a, b: [...a] })[0]).toContain('같은 그림');
    expect(uniquenessProblems({ a, b: recolor })[0]).toContain('색만 바꾼');
  });
  it('렌더링은 항상 같은 결과다', () => {
    for (const [id, f] of Object.entries(FOOD_ART)) expect(f().join(), id).toBe(grids[id]!.join());
  });
});
