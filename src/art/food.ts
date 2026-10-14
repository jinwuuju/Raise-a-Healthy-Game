/*
 * 오늘의 점심(D068~D069) 음식 픽셀 그림 — 기준 5종.
 * DOM 없이 32x32 색 격자(16px 타일 2x2칸)를 만든다. 캔버스 연결은 게임 화면 구현 때 붙인다.
 * 기준: 메뉴마다 고유 그림(같은 이미지·색만 바꾼 복제 금지), 귀엽고 먹음직스럽게,
 * 왼쪽 위 광원, 그릇마다 다른 질감, 음식 전체에 색 외곽선 1px, 바닥 그림자, 김/냉기 효과는 외곽선 없이.
 * 상표·실제 가게 포장은 그리지 않는다.
 */
import { FOOD_W, FOOD_H, SHADOW, h2, Layer, stack, body, steam, sparkle, type FoodGrid, type Shade } from './food-kit.ts';
export { FOOD_W, FOOD_H, FOOD_AX, FOOD_AY, type FoodGrid } from './food-kit.ts';
import { MENU_ART } from './food-menus.ts';

/* 1. 물냉면 — 스테인리스 그릇, 맑은 육수, 메밀면 똬리, 달걀 반쪽·오이·배·편육, 얼음. 냉기 반짝. */
function mulNaengmyeon(): FoodGrid {
  const sh = new Layer(); sh.e(16, 28, 12, 2, SHADOW);
  const o = new Layer();
  body(o, 16, 15, 25, 14, 8, ['#f5f8fb', '#d8dfe7', '#aeb9c5', '#848f9d']);
  o.r(11, 26, 11, 1, '#8a95a3'); o.r(12, 26, 4, 1, '#bcc6d1');
  o.e(16, 15, 14, 6, (x, y, u, v) => (u < -0.25 && v < 0.1 ? '#ffffff' : u > 0.45 ? '#c3ccd6' : '#e6ebf0'));
  o.e(16, 15, 12, 4, (x, y, u, v) => v < -0.62 ? '#b49a66' : u < -0.35 && v < 0.2 && h2(x, y, 3) > 0.45 ? '#efe0b4' : u + v > 0.85 ? '#c7ab73' : '#dcc58f');
  const noodle: Shade = (x, y, u, v) => {
    const k = Math.floor(Math.sqrt((x - 16) ** 2 + ((y - 14) * 2.4) ** 2));
    if (u < -0.3 && v < -0.2 && k % 2 === 0) return '#b7aa93';
    return k % 2 === 0 ? '#9b8d78' : '#7b6e5c';
  };
  o.e(16, 14, 7, 3, noodle); o.e(16, 12, 5, 2, noodle);
  o.r(9, 12, 4, 2, '#9b5b43'); o.r(9, 12, 3, 1, '#bb7a5c');
  for (const [x, y, c] of [[19, 11, '#7cc35f'], [20, 11, '#7cc35f'], [21, 12, '#4d8b3f'], [20, 12, '#4d8b3f'], [12, 10, '#7cc35f'], [13, 10, '#4d8b3f']] as const) o.p(x, y, c);
  o.r(20, 14, 3, 2, '#f6f1d3'); o.p(22, 15, '#ddd2a0');
  o.e(16, 9, 3, 2, (x, y, u, v) => (u < -0.3 && v < 0 ? '#ffffff' : '#f5f2e6'));
  o.e(16, 9, 1, 1, '#f2bc33'); o.p(15, 8, '#ffe07c');
  o.p(14, 11, '#d8473a'); o.p(18, 13, '#d8473a');
  for (const [x, y] of [[6, 16], [24, 15], [21, 17]] as const) { o.r(x, y, 2, 2, '#f4fbff'); o.p(x + 1, y + 1, '#bfe3f4'); }
  o.outline('#58626f');
  const fx = new Layer(); sparkle(fx, 4, 6); sparkle(fx, 28, 9); fx.p(25, 4, '#cdeefa');
  return stack(sh, o, fx);
}

/* 2. 떡볶이 — 아이보리 접시, 윤기 나는 빨간 양념, 떡·어묵 세모·달걀 반쪽·파·깨, 김. */
function tteok(l: Layer, x: number, y: number, len: number): void {
  for (let i = 0; i < len; i++) {
    l.p(x + i, y, i % 3 === 1 ? '#f6b29a' : '#fff6e2');
    l.p(x + i, y + 1, '#f2dfb8');
    l.p(x + i, y + 2, '#d7b98a');
  }
  l.p(x - 1, y + 1, '#ead3a6'); l.p(x + len, y + 1, '#d7b98a'); l.p(x + 1, y, '#ffffff');
}
function fishcake(l: Layer, x: number, y: number): void {
  l.p(x + 2, y, '#f7d496');
  l.r(x + 1, y + 1, 3, 1, '#ebb872');
  l.r(x, y + 2, 5, 1, '#c88f4b');
  l.p(x + 1, y + 1, '#f7d496');
}
function tteokbokki(): FoodGrid {
  const sh = new Layer(); sh.e(16, 28, 13, 2, SHADOW);
  const o = new Layer();
  body(o, 16, 17, 25, 15, 11, ['#fffaf2', '#f3e9da', '#dccdb7', '#bba88f']);
  o.e(16, 17, 15, 7, (x, y, u, v) => (u < -0.3 && v < 0 ? '#ffffff' : u > 0.5 ? '#e4d8c6' : '#f7f0e5'));
  o.e(16, 17, 13, 5, (x, y, u, v) => v < -0.7 ? '#9d2219' : u < -0.35 && v < -0.1 && h2(x, y, 5) > 0.4 ? '#ef6c4d' : u + v > 0.9 ? '#a8261d' : h2(x, y, 9) > 0.94 ? '#ff9b7c' : '#d23a2a');
  tteok(o, 5, 14, 6); tteok(o, 18, 12, 6); tteok(o, 6, 19, 5); tteok(o, 13, 19, 7);
  o.r(25, 15, 2, 4, '#f2dfb8'); o.r(25, 15, 1, 4, '#fff6e2'); o.p(26, 18, '#d7b98a');
  fishcake(o, 13, 13); fishcake(o, 20, 16);
  o.e(10, 16, 2, 1, (x, y, u) => (u < 0 ? '#ffffff' : '#f3efe2')); o.p(10, 16, '#f3bd35'); o.p(11, 16, '#e7a92a');
  for (const [x, y, c] of [[17, 16, '#6cc04f'], [18, 16, '#3f8f37'], [8, 12, '#6cc04f'], [23, 20, '#3f8f37'], [21, 21, '#6cc04f'], [4, 17, '#3f8f37']] as const) o.p(x, y, c);
  for (const [x, y] of [[16, 14], [22, 14], [10, 21], [24, 13]] as const) o.p(x, y, '#fbf3d6');
  o.outline('#87664f');
  const fx = new Layer(); steam(fx, 11, 9, 7, 0); steam(fx, 20, 8, 6, 2);
  return stack(sh, o, fx);
}

/* 3. 순댓국밥 — 나무 받침 위 뚝배기, 뽀얀 국물, 순대·고기·다대기·송송 파, 큰 김. */
function sundaeGukbap(): FoodGrid {
  const sh = new Layer(); sh.e(16, 29, 14, 2, SHADOW);
  const o = new Layer();
  o.e(16, 27, 14, 3, (x, y, u, v) => (v > 0.4 ? '#94653b' : u < -0.4 ? '#dcaa73' : '#bd8653'));
  const EARTH = ['#80594a', '#5c3e31', '#442d23', '#2f1e17'];
  body(o, 16, 14, 20, 12, 13, EARTH); body(o, 16, 21, 26, 13, 9, EARTH);
  for (let y = 16; y <= 21; y++) o.p(6, y, '#a07a66');
  o.p(7, 17, '#c49d88');
  o.e(16, 14, 12, 5, (x, y, u, v) => (u < -0.2 && v < 0 ? '#8d6450' : '#674636'));
  o.e(16, 14, 10, 3, (x, y, u, v) => v < -0.6 ? '#d3c2a5' : u < -0.3 && v < 0.3 && h2(x, y, 11) > 0.55 ? '#fffaf0' : '#f0e7d5');
  o.e(12, 14, 2, 1, '#4b2c37'); o.p(12, 14, '#7a5361'); o.p(11, 14, '#ddcdd6');
  o.e(19, 15, 2, 1, '#4b2c37'); o.p(20, 15, '#7a5361'); o.p(18, 15, '#ddcdd6');
  o.r(15, 12, 3, 2, '#efcdb7'); o.r(15, 13, 3, 1, '#cf9f88');
  o.r(21, 13, 2, 1, '#ebc3ab');
  o.r(16, 15, 2, 1, '#c23b2a'); o.p(17, 14, '#e2664c');
  for (const [x, y, c] of [[10, 13, '#63b84c'], [11, 15, '#9ad673'], [14, 15, '#63b84c'], [20, 13, '#9ad673'], [22, 14, '#63b84c'], [13, 12, '#63b84c'], [18, 13, '#9ad673'], [9, 15, '#63b84c']] as const) o.p(x, y, c);
  o.p(19, 12, '#3a2b24'); o.p(13, 16, '#3a2b24');
  o.outline('#1e120c');
  const fx = new Layer(); steam(fx, 10, 9, 8, 1); steam(fx, 16, 8, 8, 3); steam(fx, 22, 9, 7, 0);
  return stack(sh, o, fx);
}

/* 4. 후라이드치킨 — 무늬 없는 크라프트 상자, 바삭한 황금빛 조각들(뼈 끝), 치킨무 컵. */
function chickenPiece(parts: [number, number, number, number][], seed: number, bone: [number, number] | null): Layer {
  const l = new Layer();
  const GOLD = ['#ffe49a', '#f3b84e', '#d68c2e', '#a8631f'];
  const [mx, my, mrx, mry] = parts[0]!;
  for (const [cx, cy, rx, ry] of parts) l.e(cx, cy, rx, ry, (x, y) => {
    const u = (x - mx) / (mrx + 1), v = (y - my) / (mry + 1);
    const light = -(u * 0.55 + v * 0.85);
    let i = light > 0.5 ? 0 : light > -0.05 ? 1 : light > -0.6 ? 2 : 3;
    const n = h2(x, y, seed);
    if (n > 0.8 && i > 0) i--; else if (n < 0.12 && i < 3) i++;
    return GOLD[i]!;
  });
  if (bone) { const [bx, by] = bone; l.r(bx, by, 2, 2, '#f6f0e3'); l.p(bx + 1, by + 1, '#d9cfbd'); l.p(bx - 1, by, '#f6f0e3'); }
  l.outline('#96561c');
  return l;
}
function friedChicken(): FoodGrid {
  const sh = new Layer(); sh.e(16, 29, 14, 2, SHADOW);
  const o = new Layer();
  o.r(4, 7, 24, 6, '#d7a66d'); o.r(4, 7, 24, 1, '#ebc38d'); o.r(4, 12, 24, 1, '#b98648'); o.r(4, 9, 24, 1, '#cf9c62');
  o.r(5, 13, 22, 6, '#9c6a37');
  for (let x = 5; x <= 26; x++) o.p(x, 18, x % 2 === 0 ? '#fbf5e6' : '#eadfc6');
  o.p(5, 15, '#fbf5e6'); o.p(5, 16, '#eadfc6'); o.p(26, 15, '#fbf5e6'); o.p(26, 16, '#eadfc6');
  o.r(4, 19, 24, 8, '#c99760'); o.r(4, 19, 2, 8, '#dcae78'); o.r(26, 19, 2, 8, '#a97843');
  o.r(4, 19, 24, 1, '#e8c08c'); o.r(4, 26, 24, 1, '#9a6a3a');
  for (let x = 7; x < 25; x += 4) o.p(x, 23, '#b8864f');
  o.put(chickenPiece([[23, 13, 4, 3], [25, 15, 2, 2]], 41, null));
  o.put(chickenPiece([[18, 13, 4, 3], [21, 15, 3, 2]], 17, [13, 10]));
  o.put(chickenPiece([[10, 14, 5, 4], [8, 12, 3, 2]], 5, null));
  o.put(chickenPiece([[15, 17, 5, 3], [19, 18, 2, 2]], 29, null));
  const cup = new Layer();
  cup.r(22, 22, 6, 5, '#fbfaf3'); cup.r(22, 22, 1, 5, '#ffffff'); cup.r(27, 22, 1, 5, '#e2dfd2');
  cup.e(25, 22, 3, 1, '#f1eedd'); cup.p(24, 21, '#fffbe4'); cup.p(26, 22, '#efe8c2'); cup.p(25, 22, '#fffbe4');
  cup.outline('#9a9580');
  o.put(cup);
  o.outline('#5a3a1f');
  const fx = new Layer(); steam(fx, 12, 7, 5, 2); fx.p(20, 6, '#ffffffaa'); fx.p(21, 5, '#ffffff55');
  return stack(sh, o, fx);
}

/* 5. 김밥 — 나무 도마 위 단면이 보이는 김밥 다섯 조각(조각마다 속 배치가 다름), 단무지, 깨·참기름 윤기. */
const FILL = ['#f6d43a', '#f08c3c', '#4ea24b', '#f4a3a6', '#8b5a33', '#ffe486'];
function slice(l: Layer, cx: number, cy: number, turn: number): void {
  l.e(cx, cy + 2, 4, 2, '#16201a');
  l.e(cx, cy, 4, 3, (x, y, u, v) => {
    const r = Math.sqrt(u * u + v * v);
    if (r > 0.8) return u < -0.2 && v < -0.2 ? '#46594c' : '#25332a';
    if (r > 0.42) return h2(x, y, cx) > 0.72 ? '#e8e7dc' : '#fbfbf5';
    if (x === cx && y === cy) return FILL[5]!;
    const a = Math.atan2(v, u) + Math.PI;
    return FILL[(Math.floor(a / (Math.PI / 2.5)) + turn) % 5]!;
  });
  l.p(cx - 2, cy - 3, '#f2e6c4'); l.p(cx + 1, cy - 3, '#f2e6c4'); l.p(cx - 3, cy - 1, '#ffffff');
}
function gimbap(): FoodGrid {
  const sh = new Layer(); sh.e(16, 29, 14, 2, SHADOW);
  const o = new Layer();
  o.r(2, 18, 28, 7, '#e2b77f'); o.r(2, 18, 1, 7, '#efcd9c');
  for (let x = 3; x < 30; x++) { if (h2(x, 20) > 0.45) o.p(x, 20, '#cf9f63'); if (h2(x, 23) > 0.5) o.p(x, 23, '#cf9f63'); }
  o.r(2, 25, 28, 2, '#b98650'); o.r(2, 26, 28, 1, '#9e6e3e');
  slice(o, 7, 14, 0); slice(o, 16, 13, 2); slice(o, 25, 14, 4);
  slice(o, 11, 19, 1); slice(o, 21, 19, 3);
  o.r(27, 20, 3, 2, '#f7d84a'); o.r(27, 21, 3, 1, '#e3b928'); o.p(27, 20, '#fff08a');
  o.outline('#6a4a2c');
  return stack(sh, o);
}

/** 메뉴 id → 그림. 메뉴 id는 data/content/lunch-menus.v0.1.json과 같아야 한다. */
export const FOOD_ART: Record<string, () => FoodGrid> = {
  'mul-naengmyeon': mulNaengmyeon,
  tteokbokki,
  'sundae-gukbap': sundaeGukbap,
  'fried-chicken': friedChicken,
  gimbap,
  ...MENU_ART,
};

/* ---- 고유성 검사(D069): 같은 그림·색만 바꾼 복제·거의 같은 그림을 막는다. ---- */
export function paletteIndex(g: FoodGrid): number[] {
  const m = new Map<string, number>();
  return g.map(c => {
    if (c === null) return -1;
    const k = m.get(c);
    if (k !== undefined) return k;
    m.set(c, m.size);
    return m.size - 1;
  });
}
export function diffRatio(a: FoodGrid, b: FoodGrid): number {
  let union = 0, diff = 0;
  for (let i = 0; i < a.length; i++) if (a[i] || b[i]) { union++; if (a[i] !== b[i]) diff++; }
  return union ? diff / union : 0;
}
export const MIN_DIFF = 0.15;
export function uniquenessProblems(arts: Record<string, FoodGrid>): string[] {
  const ids = Object.keys(arts), out: string[] = [];
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    const a = arts[ids[i]!]!, b = arts[ids[j]!]!;
    if (a.join() === b.join()) out.push(ids[i] + '=' + ids[j] + ': 같은 그림');
    else if (paletteIndex(a).join() === paletteIndex(b).join()) out.push(ids[i] + '=' + ids[j] + ': 색만 바꾼 그림');
    else if (diffRatio(a, b) < MIN_DIFF) out.push(ids[i] + '~' + ids[j] + ': 차이 ' + Math.round(diffRatio(a, b) * 100) + '%');
  }
  return out;
}
