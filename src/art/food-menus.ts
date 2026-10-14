/*
 * 오늘의 점심 나머지 메뉴 그림(D082). 메뉴마다 그릇·면·고명·크기·시드를 다르게 한 레시피.
 * 기준 5종(food.ts)은 손으로 그린 그대로 두고, 여기서는 food-parts.ts의 같은 기법 부품만 쓴다.
 */
import { Layer, h2, type FoodGrid } from './food-kit.ts';
import { BITS, bowl, board, box, cutlet, disc, dosirak, dumplings, finish, hotpot, lit, mix, mound, noodles, paperTray, pieces, plate, ramp, rice, rolls, scatter, skewers, skillet, soup, stackFood, steamer, wrap, type Area } from './food-parts.ts';

Object.assign(BITS, {
  octo: (o: Layer, x: number, y: number) => { o.p(x, y, '#e2554a'); o.p(x + 1, y, '#b8342c'); o.p(x + 2, y + 1, '#e2554a'); o.p(x, y + 1, '#f6c2b0'); },
  sprout: (o: Layer, x: number, y: number) => { o.p(x, y, '#fff6c8'); o.p(x + 1, y + 1, '#f6f2e2'); o.p(x + 2, y + 1, '#f6f2e2'); },
  bone: (o: Layer, x: number, y: number) => { o.r(x, y, 3, 2, '#8a4a2c'); o.p(x + 3, y, '#f6efe0'); o.p(x - 1, y + 1, '#f6efe0'); },
  seonji: (o: Layer, x: number, y: number) => { o.r(x, y, 2, 2, '#5a1e1e'); o.p(x, y, '#7a3030'); },
  ugeoji: (o: Layer, x: number, y: number) => { o.r(x, y, 3, 1, '#5d7a2e'); o.p(x + 1, y + 1, '#3f5a1e'); },
  tuna: (o: Layer, x: number, y: number) => { o.p(x, y, '#f3c6a8'); o.p(x + 1, y, '#e6a98a'); o.p(x, y + 1, '#fbe2cf'); },
  potato: (o: Layer, x: number, y: number) => { o.r(x, y, 2, 2, '#f6d58a'); o.p(x, y, '#fff0b8'); o.p(x + 1, y + 1, '#d9b25a'); },
  hen: (o: Layer, x: number, y: number) => { o.e(x, y, 4, 2, (X: number, Y: number, u: number, v: number) => lit(['#fff4e2', '#f2dcbc', '#dcbf98', '#bf9f76'], u, v)); },
  flake: (o: Layer, x: number, y: number) => { o.r(x, y, 3, 1, '#fbf4e2'); o.p(x + 1, y + 1, '#e8dcc0'); },
  mandu: (o: Layer, x: number, y: number) => { o.r(x, y, 3, 2, '#fbf6ea'); o.p(x + 1, y - 1, '#ffffff'); o.p(x + 2, y + 1, '#e2d8c2'); },
  slice: (o: Layer, x: number, y: number) => { o.r(x, y, 3, 1, '#ffffff'); o.r(x, y + 1, 3, 1, '#ede6d6'); },
  eggstrip: (o: Layer, x: number, y: number) => { o.r(x, y, 3, 1, '#ffe27a'); },
  roe: (o: Layer, x: number, y: number) => { o.p(x, y, '#ff8a3c'); o.p(x + 1, y, '#ffb06a'); o.p(x, y + 1, '#e86a20'); o.p(x + 1, y + 1, '#ff8a3c'); },
  pepperoni: (o: Layer, x: number, y: number) => { o.r(x, y, 2, 2, '#c8342a'); o.p(x, y, '#e2604a'); o.p(x + 1, y + 1, '#9a2420'); },
  tomato: (o: Layer, x: number, y: number) => { o.r(x, y, 2, 2, '#e8402e'); o.p(x, y, '#ff8a6a'); },
  abalone: (o: Layer, x: number, y: number) => { o.r(x, y, 3, 2, '#c9b28a'); o.p(x + 1, y, '#e8d8b6'); o.p(x + 2, y + 1, '#8a7452'); },
  ball: (o: Layer, x: number, y: number) => { o.r(x, y, 2, 2, '#fbf8f0'); o.p(x + 1, y + 1, '#e2dccb'); },
  pine: (o: Layer, x: number, y: number) => { o.p(x, y, '#f6e8c8'); o.p(x + 1, y, '#e8d4a8'); },
  gop: (o: Layer, x: number, y: number) => { o.r(x, y, 3, 1, '#f2dcb8'); o.p(x + 1, y + 1, '#d9b48a'); o.p(x, y, '#fff2dc'); },
  ginger: (o: Layer, x: number, y: number) => { o.p(x, y, '#ef6a7a'); o.p(x + 1, y + 1, '#d84a5c'); },
  jujube: (o: Layer, x: number, y: number) => { o.p(x, y, '#a3302a'); o.p(x + 1, y, '#7a1e1a'); },
  ginkgo: (o: Layer, x: number, y: number) => { o.p(x, y, '#c9d94a'); o.p(x + 1, y, '#a8ba2a'); },
});

const seedOf = (id: string) => { let s = 7; for (const c of id) s = (Math.imul(s, 31) + c.charCodeAt(0)) | 0; return Math.abs(s) % 9973; };
type Fx = 'steam' | 'cold' | 'none';
const BOWL_OUT: Record<string, string> = { steel: '#58626f', white: '#7d7466', china: '#5a6680', red: '#7c4a3c', earthen: '#1e120c', stone: '#141214', wood: '#4a2e14', celadon: '#4b6656', lacquer: '#33100c', paper: '#7a6648', clear: '#4f7486', brass: '#5a4210' };
const PLATE_OUT: Record<string, string> = { white: '#7d7466', cream: '#7c6748', blue: '#4d6585', slate: '#141215', green: '#4f6d48' };
function vessel(o: Layer, v: string, w: number, dx: number): Area {
  if (v === 'brass') { const a = bowl(o, 'white', w, dx); recolorBrass(o); return a; }
  return bowl(o, v, w, dx);
}
/** 놋그릇: 흰 그릇과 같은 모양을 금빛 재질로 다시 칠한다(색만 같은 복제가 아니라 재질 램프 교체). */
function recolorBrass(o: Layer): void {
  const map: Record<string, string> = { '#ffffff': '#fff0b0', '#f1eee8': '#e8c560', '#d9d3c8': '#c79d3b', '#b8b0a2': '#8a6519', '#f6f3ee': '#f2d27a', '#ddd6cb': '#c9a24a' };
  o.d.forEach((c, i) => { if (c && map[c]) o.d[i] = map[c]!; });
}
/** 국물 그릇(면·밥 선택). */
function soupBowl(id: string, v: string, broth: string, items: string, fx: Fx = 'steam', w = 0, dx = 0, noodle?: string, top?: string): FoodGrid {
  const o = new Layer(), s = seedOf(id), a = vessel(o, v, w, dx);
  soup(o, a, broth, s);
  if (noodle) noodles(o, a, noodle, s);
  if (top) o.e(a.cx + 1, a.cy - 1, Math.max(3, a.rx - 7), 2, (x, y, u, vv) => lit(ramp(top), u, vv, h2(x, y, s + 5)));
  scatter(o, a, items, s);
  return finish(o, BOWL_OUT[v]!, fx, s);
}
/** 밥 위에 덮은 그릇(덮밥·비빔밥·돌솥). 가장자리에 밥이 보인다. */
function riceBowl(id: string, v: string, top: string, items: string, fx: Fx = 'steam', w = 0, dx = 0, tint = '#f4f1e8'): FoodGrid {
  const o = new Layer(), s = seedOf(id), a = vessel(o, v, w, dx);
  rice(o, a, s, tint);
  o.e(a.cx + 1, a.cy - 1, Math.max(4, a.rx - 4), 3, (x, y, u, vv) => lit(ramp(top), u, vv, h2(x, y, s + 3)));
  scatter(o, a, items, s);
  return finish(o, BOWL_OUT[v]!, fx, s);
}
/** 소복한 더미 접시(볶음밥·샐러드·볶음). */
function plateMound(id: string, p: string, base: string, items: string, fx: Fx = 'steam', oval = false, w = 0): FoodGrid {
  const o = new Layer(), s = seedOf(id), a = plate(o, p, oval, w);
  mound(o, a, base, s); scatter(o, a, items, s);
  return finish(o, PLATE_OUT[p]!, fx, s, 14);
}
/** 반은 밥, 반은 덮밥 소스/볶음(덮밥 접시·카레·짜장밥). */
function halfPlate(id: string, p: string, base: string, items: string, fx: Fx = 'steam', curry = false): FoodGrid {
  const o = new Layer(), s = seedOf(id), a = plate(o, p, true);
  const left: Area = { cx: a.cx - 5, cy: a.cy, rx: 6, ry: 3 }, right: Area = { cx: a.cx + 4, cy: a.cy + 1, rx: 7, ry: 3 };
  if (curry) { soup(o, { ...right, rx: 8 }, base, s); rice(o, left, s); }
  else { rice(o, left, s); mound(o, right, base, s); }
  scatter(o, right, items, s);
  return finish(o, PLATE_OUT[p]!, fx, s, 14);
}
function panDish(id: string, base: string, items: string, w = 0, sauce?: string): FoodGrid {
  const o = new Layer(), s = seedOf(id), a = skillet(o, w);
  if (sauce) soup(o, a, sauce, s);
  mound(o, { ...a, rx: a.rx - 2, ry: a.ry - 1 }, base, s, 0.9); scatter(o, a, items, s);
  return finish(o, '#120e0d', 'steam', s, 14);
}
function potDish(id: string, broth: string, items: string, w = 0, noodle?: string): FoodGrid {
  const o = new Layer(), s = seedOf(id), a = hotpot(o, w);
  soup(o, a, broth, s); if (noodle) noodles(o, a, noodle, s); scatter(o, a, items, s);
  return finish(o, '#4f5862', 'steam', s, 14);
}
function boxDish(id: string, base: string, n: number, items: string, tint?: string): FoodGrid {
  const o = new Layer(), s = seedOf(id), a = box(o, tint);
  pieces(o, a, base, s, n); scatter(o, a, items, s);
  const cup = new Layer(); cup.r(22, 21, 6, 5, '#fbfaf3'); cup.r(22, 21, 1, 5, '#ffffff'); cup.r(27, 21, 1, 5, '#e2dfd2'); cup.e(25, 21, 3, 1, '#f1eedd'); cup.p(25, 21, '#fffbe4'); cup.outline('#9a9580'); o.put(cup);
  return finish(o, '#5a3a1f', 'steam', s, 14);
}
function piecesPlate(id: string, p: string, base: string, n: number, items: string, pool?: string, oval = false): FoodGrid {
  const o = new Layer(), s = seedOf(id), a = plate(o, p, oval);
  if (pool) soup(o, { ...a, rx: a.rx + 1, ry: a.ry }, pool, s);
  pieces(o, a, base, s, n); scatter(o, a, items, s);
  return finish(o, PLATE_OUT[p]!, 'steam', s, 14);
}
function cutletPlate(id: string, p: string, crust: string, cut: string, items: string, n = 4): FoodGrid {
  const o = new Layer(), s = seedOf(id), a = plate(o, p, true);
  const side: Area = { cx: a.cx + 8, cy: a.cy, rx: 3, ry: 2 };
  o.e(side.cx, side.cy, 3, 2, (x, y) => (h2(x, y, s) > 0.5 ? '#f2f6e2' : '#b9dc8a'));
  cutlet(o, { ...a, cx: a.cx - 3, rx: 8 }, crust, cut, s, n); scatter(o, { ...a, cx: a.cx - 3, rx: 7, ry: 2 }, items, s);
  return finish(o, PLATE_OUT[p]!, 'steam', s, 14);
}
/** 썬 고기 접시(족발·보쌈·수육·삼겹살): 껍질/지방 띠와 살코기. */
function slicesPlate(id: string, p: string, skin: string, meat: string, items: string, n = 5, fx: Fx = 'none'): FoodGrid {
  const o = new Layer(), s = seedOf(id), a = plate(o, p, true), sk = ramp(skin), mt = ramp(meat);
  for (let i = 0; i < n; i++) {
    const x0 = a.cx - a.rx + 1 + i * Math.round((a.rx * 2 - 2) / n);
    for (let y = -2; y <= 2; y++) for (let x = 0; x < Math.round((a.rx * 2 - 2) / n) - 1; x++) {
      const X = x0 + x + (y < 0 ? 1 : 0), Y = a.cy + y;
      o.p(X, Y, y === -2 ? sk[x === 0 ? 0 : 1] : lit(mt, (x - 2) / 3, y / 2.5, h2(X, Y, s)));
    }
  }
  scatter(o, { ...a, cy: a.cy + 3, ry: 1 }, items, s);
  return finish(o, PLATE_OUT[p]!, fx, s, 14);
}
function rollBoard(id: string, outer: string, inner: string, fills: string[], n: number, items: string, tint: string): FoodGrid {
  const o = new Layer(), s = seedOf(id), a = board(o, tint);
  rolls(o, a, outer, inner, fills, s, n); scatter(o, { ...a, cy: a.cy + 4, ry: 1 }, items, s);
  return finish(o, mix(tint, '#000000', 0.55), 'none', s, 14);
}
/** 초밥: 밥 덩이 위 생선 조각. */
function sushiBoard(id: string, toppings: string[], items: string, tint: string): FoodGrid {
  const o = new Layer(), s = seedOf(id), a = board(o, tint);
  toppings.forEach((t, i) => {
    const cx = a.cx - a.rx + 2 + i * Math.round((a.rx * 2 - 2) / toppings.length), cy = a.cy + (i % 2);
    const l = new Layer(); l.r(cx - 1, cy, 4, 2, '#fbfaf3'); l.p(cx + 2, cy + 1, '#e0dccd');
    const r = ramp(t); l.r(cx - 1, cy - 1, 4, 1, r[1]); l.p(cx - 1, cy - 1, r[0]); l.p(cx + 2, cy - 1, r[2]);
    l.outline(mix(t, '#000000', 0.45)); o.put(l);
  });
  scatter(o, { ...a, cy: a.cy + 4, ry: 1 }, items, s);
  return finish(o, mix(tint, '#000000', 0.55), 'none', s, 14);
}
function pizza(id: string, sauce: string, cheese: string, items: string): FoodGrid {
  const o = new Layer(), s = seedOf(id);
  o.r(2, 13, 28, 14, '#d7a66d'); o.r(2, 13, 28, 1, '#ebc38d'); o.r(2, 26, 28, 1, '#a97843'); o.r(28, 14, 2, 12, '#b98648');
  const a: Area = { cx: 16, cy: 19, rx: 12, ry: 6 };
  disc(o, a, '#e2a04a', sauce, cheese, s);
  for (let i = 0; i < 4; i++) { const ang = (i * Math.PI) / 4 + 0.3; for (let r = 1; r < 11; r++) { const x = Math.round(16 + Math.cos(ang) * r), y = Math.round(19 + Math.sin(ang) * r * 0.5); o.p(x, y, mix(cheese, '#8a5a2a', 0.35)); } }
  scatter(o, { ...a, rx: 9, ry: 4 }, items, s);
  return finish(o, '#5a3a1f', 'steam', s, 14);
}
function pasta(id: string, p: string, noodle: string, sauce: string | null, items: string): FoodGrid {
  const o = new Layer(), s = seedOf(id), a = plate(o, p);
  mound(o, a, noodle, s);
  const n = ramp(noodle);
  for (let k = 0; k < 9; k++) { const ang = h2(k, s) * 6.28, r = 2 + h2(s, k) * 7; for (let t = 0; t < 4; t++) o.p(Math.round(a.cx + Math.cos(ang + t * 0.4) * r), Math.round(a.cy - 1 + Math.sin(ang + t * 0.4) * r * 0.45), n[2]); }
  if (sauce) o.e(a.cx, a.cy - 2, 5, 2, (x, y, u, v) => lit(ramp(sauce), u, v, h2(x, y, s + 2)));
  scatter(o, a, items, s);
  return finish(o, PLATE_OUT[p]!, 'steam', s, 14);
}
function burger(id: string, tray: string, bun: string, layers: string[], items: string): FoodGrid {
  const o = new Layer(), s = seedOf(id), a = paperTray(o, tray);
  const l = new Layer(); stackFood(l, { ...a, rx: 9, cy: a.cy + 1 }, bun, layers, s); l.outline(mix(bun, '#000000', 0.5)); o.put(l);
  scatter(o, { cx: a.cx + 9, cy: a.cy + 4, rx: 2, ry: 1 }, items, s);
  return finish(o, mix(tray, '#000000', 0.5), 'none', s, 14);
}
function sandwich(id: string, tint: string, bread: string, layers: string[], items: string): FoodGrid {
  const o = new Layer(), s = seedOf(id), a = board(o, tint);
  for (const [cx, k] of [[a.cx - 5, 0], [a.cx + 6, 1]] as const) {
    const l = new Layer(); stackFood(l, { ...a, cx, rx: 5, cy: a.cy + 2 + k }, bread, layers, s + k, true); l.outline(mix(bread, '#000000', 0.5)); o.put(l);
  }
  scatter(o, { ...a, cy: a.cy + 5, ry: 1 }, items, s);
  return finish(o, mix(tint, '#000000', 0.55), 'none', s, 14);
}
function wrapTray(id: string, tray: string, skin: string, fills: string[], items: string, n = 1): FoodGrid {
  const o = new Layer(), s = seedOf(id), a = paperTray(o, tray);
  for (let i = 0; i < n; i++) { const l = new Layer(); wrap(l, { cx: a.cx - 2 + i * 6, cy: a.cy + i * 2, rx: n > 1 ? 6 : 9, ry: 3 }, skin, fills, s + i); l.outline(mix(skin, '#000000', 0.5)); o.put(l); }
  scatter(o, { cx: a.cx, cy: a.cy - 3, rx: 6, ry: 1 }, items, s);
  return finish(o, mix(tray, '#000000', 0.5), 'none', s, 14);
}
function tacoTray(id: string): FoodGrid {
  const o = new Layer(), s = seedOf(id), a = paperTray(o, '#2f8f5a');
  for (let i = 0; i < 2; i++) {
    const l = new Layer(), cx = a.cx - 5 + i * 10, cy = a.cy + 1;
    l.e(cx, cy, 5, 4, (x, y, u, v) => (v < -0.2 ? ['#7cc35f', '#e8402e', '#8a5a3a', '#ffd84a'][Math.floor(h2(x, y, s + i) * 4)]! : lit(['#ffe49a', '#f2c66a', '#d9a03a', '#b07a22'], u, v, h2(x, y, s))));
    l.outline('#7a4e14'); o.put(l);
  }
  return finish(o, '#1c4a30', 'none', s, 14);
}
function cornDogs(id: string): FoodGrid {
  const o = new Layer(), s = seedOf(id), a = paperTray(o, '#f2b84a');
  for (let i = 0; i < 2; i++) {
    const l = new Layer(), cx = a.cx - 4 + i * 8, cy = a.cy - 1 + i;
    l.r(cx, cy + 4, 1, 5, '#e8d4a8');
    l.e(cx, cy, 3, 5, (x, y, u, v) => lit(['#ffd98a', '#e8a84a', '#c47f2a', '#94581a'], u, v, h2(x, y, s + i)));
    l.r(cx - 1, cy - 3, 3, 1, '#d23a2a'); l.p(cx, cy - 2, '#ffd84a');
    l.outline('#6a3e12'); o.put(l);
  }
  return finish(o, '#7a5214', 'steam', s, 14);
}
function steak(id: string, p: string, meat: string, items: string, sauce?: string): FoodGrid {
  const o = new Layer(), s = seedOf(id), a = plate(o, p);
  if (sauce) soup(o, { ...a, rx: a.rx - 1 }, sauce, s);
  const l = new Layer(), r = ramp(meat);
  l.e(a.cx - 1, a.cy - 1, 7, 3, (x, y, u, v) => (((x + y) % 4 === 0 && v < 0.5) ? r[3] : lit(r, u, v, h2(x, y, s))));
  l.outline(r[3]); o.put(l); scatter(o, { cx: a.cx + 7, cy: a.cy, rx: 3, ry: 2 }, items, s);
  return finish(o, PLATE_OUT[p]!, 'steam', s, 14);
}
function omurice(id: string): FoodGrid {
  const o = new Layer(), s = seedOf(id), a = plate(o, 'white', true);
  const l = new Layer(); l.e(a.cx - 1, a.cy - 1, 9, 4, (x, y, u, v) => lit(['#fff2a8', '#ffd84a', '#f2bc22', '#d39a12'], u, v, h2(x, y, s))); l.outline('#a87810'); o.put(l);
  for (let x = -6; x <= 5; x++) o.p(a.cx - 1 + x, a.cy - 2 + (x % 2 === 0 ? 0 : 1), '#d23a2a');
  scatter(o, { cx: a.cx + 9, cy: a.cy, rx: 2, ry: 1 }, 'leaf tomato', s);
  return finish(o, PLATE_OUT.white!, 'steam', s, 14);
}
function steamerDish(id: string, skin: string, n: number): FoodGrid {
  const o = new Layer(), s = seedOf(id), a = steamer(o);
  dumplings(o, a, skin, s, n);
  return finish(o, '#5a4214', 'steam', s, 14);
}
function plateDumplings(id: string, p: string, skin: string, n: number, fried: boolean, items: string): FoodGrid {
  const o = new Layer(), s = seedOf(id), a = plate(o, p, true);
  dumplings(o, a, skin, s, n, fried); scatter(o, { cx: a.cx + 9, cy: a.cy + 2, rx: 2, ry: 1 }, items, s);
  return finish(o, PLATE_OUT[p]!, 'steam', s, 14);
}
function lunchbox(id: string, side: string, items: string): FoodGrid {
  const o = new Layer(), s = seedOf(id), a = dosirak(o);
  rice(o, a, s); mound(o, { cx: 23, cy: 19, rx: 5, ry: 5 }, side, s); scatter(o, { cx: 23, cy: 19, rx: 4, ry: 4 }, items, s);
  return finish(o, '#0c0a0b', 'none', s, 14);
}
function skewerBoard(id: string, meat: string, n: number, tint: string): FoodGrid {
  const o = new Layer(), s = seedOf(id), a = board(o, tint);
  skewers(o, a, meat, s, n);
  return finish(o, mix(tint, '#000000', 0.55), 'steam', s, 14);
}

const G = '#25332a', W = '#fbfbf5';
/** 메뉴 id → 그림(기준 5종 제외 187개). */
export const MENU_ART: Record<string, () => FoodGrid> = {
  // 시원·상큼한 거
  'bibim-naengmyeon': () => soupBowl('bibim-naengmyeon', 'steel', '#b8442f', 'halfegg cuke3 sesame4 pickle', 'cold', -1, 0, '#8f7f6c', '#c8321f'),
  'hoe-naengmyeon': () => soupBowl('hoe-naengmyeon', 'steel', '#c4523a', 'fish3 halfegg cuke2 sesame3', 'cold', 1, 1, '#7f6f5c'),
  'yeolmu-naengmyeon': () => soupBowl('yeolmu-naengmyeon', 'clear', '#f0a58c', 'leaf2 halfegg chili2', 'cold', 0, -1, '#8f7f6c'),
  makguksu: () => soupBowl('makguksu', 'white', '#cdb79a', 'nori2 sesame4 halfegg cuke2', 'cold', -2, 0, '#7d6c5c'),
  'jaengban-makguksu': () => plateMound('jaengban-makguksu', 'blue', '#7d6c5c', 'leaf3 carrot3 cuke3 halfegg sauce:#c8462f', 'cold', true),
  kongguksu: () => soupBowl('kongguksu', 'white', '#f3ead2', 'cuke4 sesame3 tomato', 'cold', 1, 1, '#efe3c8'),
  jjolmyeon: () => soupBowl('jjolmyeon', 'red', '#d9573b', 'leaf2 carrot3 halfegg sesame3', 'none', 0, 0, '#f0d79a'),
  'bibim-guksu': () => soupBowl('bibim-guksu', 'white', '#c2462f', 'cuke3 halfegg sesame4 kimchi2', 'none', -1, -1, '#f3ead8'),
  'kimchi-mari-guksu': () => soupBowl('kimchi-mari-guksu', 'steel', '#e8a07a', 'kimchi4 halfegg sesame3', 'cold', 2, 0, '#f3ead8'),
  'yeolmu-guksu': () => soupBowl('yeolmu-guksu', 'clear', '#f2c1a8', 'leaf3 chili2 sesame2', 'cold', -2, 1, '#f3ead8'),
  mulhoe: () => soupBowl('mulhoe', 'clear', '#e86a46', 'fish4 cuke3 leaf2 sesame3', 'cold', 1, 0),
  'ojingeo-mulhoe': () => soupBowl('ojingeo-mulhoe', 'steel', '#e9784f', 'squid5 cuke3 leaf sesame3', 'cold', -2, -1),
  'hoe-deopbap': () => riceBowl('hoe-deopbap', 'lacquer', '#8cc96a', 'fish4 carrot3 sauce:#d23a2a sesame2', 'cold'),
  'sushi-moodeum': () => sushiBoard('sushi-moodeum', ['#ff8c6a', '#fff1ea', '#e8402e', '#ffd84a', '#d9e6f0'], 'pickle ginger', '#c99460'),
  'sushi-gwangeo': () => sushiBoard('sushi-gwangeo', ['#fff4ee', '#fff1ea', '#fff4ee', '#fff1ea'], 'leaf ginger', '#e2b77f'),
  'california-roll': () => rollBoard('california-roll', '#fff7e6', '#f6efe0', ['#ffb27a', '#7cc35f', '#f6e6a8'], 5, 'roe2', '#d9a46a'),
  'salmon-roll': () => rollBoard('salmon-roll', '#ff9a78', '#fbfaf3', ['#7cc35f', '#f6e6a8', '#ffcf6a'], 4, 'lemon', '#ecc592'),
  'ganjang-gejang': () => plateMound('ganjang-gejang', 'cream', '#7a4a2a', 'crab4 scal3 sesame3 greenchili2', 'none', true),
  'yangnyeom-gejang': () => plateMound('yangnyeom-gejang', 'white', '#c7392a', 'crab4 sesame5 scal2', 'none', false, -1),
  poke: () => riceBowl('poke', 'clear', '#9fd06e', 'salmon3 corn3 cuke3 onion2 sesame3', 'cold', 1),
  sakedon: () => riceBowl('sakedon', 'white', '#ff8c6a', 'salmon3 onion2 scal2 halfegg', 'none', -1, 1),
  // 매콤한 거
  rabokki: () => plateMound('rabokki', 'cream', '#d23a2a', 'tteok3 fishcake2 egg scal3 sesame2', 'steam', false, 1),
  jjamppong: () => soupBowl('jjamppong', 'china', '#c8321f', 'squid3 mussel2 shrimp2 onion3 scal2', 'steam', 0, 0, '#f2dca0'),
  'samseon-jjamppong': () => soupBowl('samseon-jjamppong', 'red', '#d13a24', 'shrimp3 squid3 clam2 mussel2 leaf', 'steam', 1, 1, '#f2dca0'),
  'gul-jjamppong': () => soupBowl('gul-jjamppong', 'china', '#e8dcc6', 'clam4 scal4 chili2 onion2', 'steam', -1, -1, '#f2dca0'),
  'jjamppong-bap': () => soupBowl('jjamppong-bap', 'china', '#c63520', 'rice2 squid2 mussel2 onion2 scal2', 'steam', 2, 0),
  malatang: () => soupBowl('malatang', 'paper', '#b5281c', 'tofu2 mush3 leaf2 sausage2 chili4 bean2', 'steam', 1, 0),
  'jeyuk-deopbap': () => halfPlate('jeyuk-deopbap', 'white', '#c4472c', 'onion3 scal3 sesame4 carrot2'),
  'jeyuk-bokkeum': () => panDish('jeyuk-bokkeum', '#c4472c', 'onion4 scal3 carrot2 sesame4 leaf'),
  'nakji-bokkeum': () => panDish('nakji-bokkeum', '#c92f22', 'octo4 onion2 scal3 sesame3', -1),
  'nakji-deopbap': () => halfPlate('nakji-deopbap', 'blue', '#c92f22', 'octo3 scal2 sesame3 onion2'),
  'ojingeo-deopbap': () => halfPlate('ojingeo-deopbap', 'cream', '#d44a2c', 'squid4 onion2 carrot2 scal2'),
  'jukkumi-bokkeum': () => panDish('jukkumi-bokkeum', '#b8261f', 'octo5 onion3 leaf sesame4', 1),
  dakbal: () => piecesPlate('dakbal', 'slate', '#b8341f', 6, 'sesame5 scal2 halfegg'),
  dakgalbi: () => panDish('dakgalbi', '#c8452c', 'tteok2 leaf2 onion3 sesame2 meat3:#e8a46a carrot2', 2),
  yukgaejang: () => soupBowl('yukgaejang', 'earthen', '#b32a18', 'meat3:#8a4a2c scal4 leaf2 chili2 eggstrip2', 'steam', 0, -1),
  'daegu-maeuntang': () => potDish('daegu-maeuntang', '#c43a22', 'fish4 leaf2 tofu2 chili3 greenchili2'),
  dakbokkeumtang: () => potDish('dakbokkeumtang', '#c9502c', 'meat4:#e6a46a carrot3 potato2 scal3', -1),
  agujjim: () => plateMound('agujjim', 'white', '#c94a2c', 'fish3 sprout5 scal2 sesame3', 'steam', true),
  haemuljjim: () => plateMound('haemuljjim', 'blue', '#d0502e', 'shrimp3 squid2 crab2 mussel2 sprout4', 'steam', true, -1),
  'sundae-bokkeum': () => panDish('sundae-bokkeum', '#c4402c', 'seonji4 leaf2 onion2 sesame3 sausage2', -2),
  'mapa-tofu': () => plateMound('mapa-tofu', 'white', '#b8341f', 'tofu6 scal3 meat2:#7a3a26 chili2', 'steam', false, 1),
  'gopchang-bokkeum': () => panDish('gopchang-bokkeum', '#b33a24', 'gop4 leaf2 onion3 sesame3', 0, '#8a2a1a'),
  'mala-xiangguo': () => riceBowl('mala-xiangguo', 'paper', '#a8301f', 'chili5 mush2 tofu2 shrimp2 leaf2 bean3', 'steam', -1, 1, '#d9562a'),
  // 뜨끈한 거
  'dwaeji-gukbap': () => soupBowl('dwaeji-gukbap', 'earthen', '#f2e6d0', 'slab3:#efd2c0 scal5 sauce:#c23b2a', 'steam', 1, 0),
  'kongnamul-gukbap': () => soupBowl('kongnamul-gukbap', 'earthen', '#f1ead8', 'sprout6 scal3 egg chili', 'steam', -1, 1),
  'sogogi-gukbap': () => soupBowl('sogogi-gukbap', 'earthen', '#b84a2a', 'meat3:#7a3e26 sprout3 scal3', 'steam', 2, -1),
  'gul-gukbap': () => soupBowl('gul-gukbap', 'earthen', '#ece4cf', 'clam4 scal4 nori2', 'steam', -2, 0),
  'ppyeo-haejangguk': () => soupBowl('ppyeo-haejangguk', 'earthen', '#b4482c', 'bone3 ugeoji3 scal2', 'steam', 0, 1),
  'seonji-haejangguk': () => soupBowl('seonji-haejangguk', 'earthen', '#a85a3a', 'seonji3 ugeoji3 sprout2 scal2', 'steam', 1, -1),
  'ugeoji-haejangguk': () => soupBowl('ugeoji-haejangguk', 'earthen', '#9a6a3a', 'ugeoji5 bone2 scal2', 'steam', -2, 1),
  'hwangtae-haejangguk': () => soupBowl('hwangtae-haejangguk', 'white', '#efe3c6', 'fish4 eggstrip2 scal3 sprout3', 'steam', 1, 1),
  'kimchi-jjigae': () => soupBowl('kimchi-jjigae', 'earthen', '#d0462a', 'kimchi4 tofu2 slab2:#e9b39c scal2', 'steam', 0, -1),
  'chamchi-kimchi-jjigae': () => soupBowl('chamchi-kimchi-jjigae', 'earthen', '#cf4b2c', 'kimchi3 tuna3 tofu2 scal2', 'steam', -1, 0),
  'doenjang-jjigae': () => soupBowl('doenjang-jjigae', 'earthen', '#a8743a', 'tofu3 mush2 greenchili2 onion2 clam', 'steam', 1, 0),
  'sundubu-jjigae': () => soupBowl('sundubu-jjigae', 'stone', '#d24a2a', 'tofu4 egg clam2 scal2', 'steam', 0, 0),
  'budae-jjigae': () => potDish('budae-jjigae', '#d0502c', 'sausage3 cheese bean3 kimchi2 scal2', 0, '#f2d79a'),
  gamjatang: () => potDish('gamjatang', '#b8502c', 'bone4 potato2 ugeoji2 scal2 sesame2', 1),
  galbitang: () => soupBowl('galbitang', 'stone', '#e9dcc0', 'bone3 scal4 jujube eggstrip', 'steam', 1, -1),
  seolleongtang: () => soupBowl('seolleongtang', 'earthen', '#f6f1e6', 'slab3:#e8d8c8 scal6', 'steam', 2, 1, '#f6efe0'),
  gomtang: () => soupBowl('gomtang', 'brass', '#e9dcb8', 'slab4:#d9b8a0 scal5', 'steam', 0, 0),
  samgyetang: () => soupBowl('samgyetang', 'earthen', '#efe4cc', 'hen jujube2 scal3 ginkgo', 'steam', -1, -1),
  dakgomtang: () => soupBowl('dakgomtang', 'white', '#f1e6c8', 'meat4:#f1d6b6 scal4 rice2', 'steam', -1, 0),
  kalguksu: () => soupBowl('kalguksu', 'white', '#e9dcc0', 'carrot2 scal3 cuke2', 'steam', 2, -1, '#f6edd8'),
  'bajirak-kalguksu': () => soupBowl('bajirak-kalguksu', 'white', '#efe6cf', 'clam6 scal3', 'steam', 0, 1, '#f3e8cf'),
  'haemul-kalguksu': () => soupBowl('haemul-kalguksu', 'paper', '#d9b98a', 'shrimp2 mussel2 clam3 squid2 scal2', 'steam', -1, 0, '#f3e8cf'),
  ssalguksu: () => soupBowl('ssalguksu', 'china', '#e6c9a0', 'slab3:#9a5a42 herb4 onion2 sprout2', 'steam', 1, 0, '#f8f3e8'),
  udon: () => soupBowl('udon', 'lacquer', '#c9a46a', 'fishcake2 scal3 nori shrimp', 'steam', 0, 0, '#fbf3e0'),
  sujebi: () => soupBowl('sujebi', 'white', '#e8dcc2', 'flake5 carrot2 scal2 potato', 'steam', -2, 1),
  'tteok-manduguk': () => soupBowl('tteok-manduguk', 'white', '#efe5cf', 'mandu3 slice4 eggstrip2 nori2', 'steam', 1, -1),
  chueotang: () => soupBowl('chueotang', 'earthen', '#8a5a2c', 'ugeoji3 scal3 chili2 sesame2', 'steam', 2, 0),
  altang: () => potDish('altang', '#c8482a', 'roe4 tofu2 leaf2 scal2', -2),
  'dongtae-jjigae': () => potDish('dongtae-jjigae', '#cf4a28', 'fish4 tofu2 chili2 greenchili2 onion2', 2),
  'sogogi-shabu': () => potDish('sogogi-shabu', '#e9dcc0', 'slab4:#c76a5a leaf3 mush3 tofu', -1, undefined),
  'tonkotsu-ramen': () => soupBowl('tonkotsu-ramen', 'lacquer', '#f2e2c4', 'slab2:#d9a48a halfegg2 nori2 scal4', 'steam', 1, -1, '#f6e6b0'),
  // 바삭한 거
  'yangnyeom-chicken': () => boxDish('yangnyeom-chicken', '#c4351f', 5, 'sesame6'),
  'ganjang-chicken': () => boxDish('ganjang-chicken', '#9a5a26', 5, 'sesame4 greenchili2', '#cfa06a'),
  'chicken-wing': () => boxDish('chicken-wing', '#e09a3c', 7, 'herb2', '#e0b47e'),
  'deungsim-katsu': () => cutletPlate('deungsim-katsu', 'white', '#d9933a', '#f3e2cf', 'sauce:#6a3418'),
  'ansim-katsu': () => piecesPlate('ansim-katsu', 'cream', '#d39a42', 4, 'leaf3 sauce:#6a3418', undefined, true),
  'cheese-katsu': () => cutletPlate('cheese-katsu', 'blue', '#dc9a3e', '#ffd84a', 'cheese2', 3),
  'chicken-katsu': () => cutletPlate('chicken-katsu', 'cream', '#e0a44a', '#f6ead8', 'sauce:#7a3a1a lemon', 5),
  'fish-katsu': () => cutletPlate('fish-katsu', 'green', '#e3b05a', '#fffaf0', 'lemon2 sauce:#f2ead2', 3),
  'saeu-tangsuyuk': () => piecesPlate('saeu-tangsuyuk', 'blue', '#f0b05a', 5, 'shrimp3 cuke2', '#f2a07a'),
  lajogi: () => piecesPlate('lajogi', 'white', '#c8642a', 5, 'chili4 greenchili3 onion2'),
  nanjawanseu: () => piecesPlate('nanjawanseu', 'cream', '#8a4a26', 4, 'mush2 leaf2 carrot2', '#6a3418'),
  'tteok-gangjeong': () => piecesPlate('tteok-gangjeong', 'white', '#d8622c', 7, 'sesame6 pine2', undefined, true),
  tangsuyuk: () => piecesPlate('tangsuyuk', 'cream', '#e2a04a', 6, 'carrot2 cuke2 onion', '#f2a16a', true),
  kkanpunggi: () => piecesPlate('kkanpunggi', 'slate', '#c4562a', 6, 'chili3 greenchili3 onion2'),
  dakgangjeong: () => soupBowl('dakgangjeong', 'paper', '#b8401f', 'pine4 sesame5 chili2', 'steam', 1, 1, undefined, '#c4351f'),
  'boneless-chicken': () => boxDish('boneless-chicken', '#e8a84a', 8, 'pickle', '#c79a62'),
  guobaorou: () => piecesPlate('guobaorou', 'white', '#f2d29a', 4, 'carrot3 scal2', undefined, true),
  hotdog: () => cornDogs('hotdog'),
  katsudon: () => riceBowl('katsudon', 'lacquer', '#d9933a', 'egg2 scal3 onion2 eggstrip2', 'steam', -1, 0),
  tendon: () => riceBowl('tendon', 'lacquer', '#f0c070', 'shrimp3 sauce:#7a4a2a leaf', 'steam', 2, 1),
  // 고기 당기는 거
  jokbal: () => slicesPlate('jokbal', 'cream', '#5a2e1a', '#c99a7a', 'leaf3 greenchili2 sauce:#d9b06a'),
  samgyeopsal: () => slicesPlate('samgyeopsal', 'slate', '#f6e2d6', '#d98a6a', 'leaf2 mush2 kimchi2', 6, 'steam'),
  'gochujang-samgyeopsal': () => panDish('gochujang-samgyeopsal', '#c9472a', 'slab3:#e2604a onion3 leaf2 sesame4', 1),
  'so-bulgogi': () => panDish('so-bulgogi', '#8a4a2c', 'mush3 onion3 scal3 carrot2', -1, '#7a4026'),
  'so-galbi': () => slicesPlate('so-galbi', 'slate', '#5a2414', '#8a3e26', 'bone2 sesame4 scal2', 4, 'steam'),
  tteokgalbi: () => piecesPlate('tteokgalbi', 'white', '#7a3e26', 3, 'leaf2 pine3 sesame4'),
  'ori-bulgogi': () => panDish('ori-bulgogi', '#c44a2c', 'leaf3 onion3 sesame3 mush', -2),
  'hunje-ori': () => slicesPlate('hunje-ori', 'green', '#a8552c', '#e9b49a', 'leaf3 onion2 pickle'),
  'deungsim-steak': () => steak('deungsim-steak', 'slate', '#7a3a26', 'corn3 potato2 leaf'),
  'hambak-steak': () => steak('hambak-steak', 'white', '#6a3a22', 'egg corn3', '#5a2a14'),
  'so-galbijjim': () => soupBowl('so-galbijjim', 'stone', '#7a3a1e', 'bone3 carrot3 jujube2 mush2 ginkgo', 'steam', -1, 1, undefined, '#6a3018'),
  'dwaeji-galbijjim': () => potDish('dwaeji-galbijjim', '#b8432a', 'bone3 potato2 carrot2 scal2', 0),
  deunggalbijjim: () => plateMound('deunggalbijjim', 'cream', '#c4452a', 'bone5 sesame4 scal2', 'steam', true, -1),
  'so-suyuk': () => slicesPlate('so-suyuk', 'blue', '#9a6a52', '#d9b29c', 'onion2 sauce:#c9a46a scal2', 5, 'steam'),
  'so-gopchang': () => panDish('so-gopchang', '#d9a06a', 'gop5 onion3 leaf', 0, '#a8642a'),
  'chicken-teriyaki': () => halfPlate('chicken-teriyaki', 'white', '#8a4a1e', 'meat4:#c97a3a sesame4 scal2 leaf'),
  jjimdak: () => plateMound('jjimdak', 'white', '#5a2e18', 'meat4:#e2b07a potato2 carrot2 chili2', 'steam', true, 1),
  bossam: () => slicesPlate('bossam', 'green', '#f3d5c4', '#c98a6a', 'kimchi4 leaf2', 5),
  'beef-makchang': () => panDish('beef-makchang', '#c89a5a', 'gop4 onion2 greenchili2 sauce:#d9b06a', -1, '#7a4a22'),
  'dak-kkochi': () => skewerBoard('dak-kkochi', '#c4542a', 2, '#d9a46a'),
  // 색다른 거
  'curry-rice': () => halfPlate('curry-rice', 'white', '#d99a2a', 'carrot3 potato2 meat2:#8a5a3a', 'steam', true),
  'hayashi-rice': () => halfPlate('hayashi-rice', 'cream', '#7a3a1e', 'mush3 onion2 meat2:#5a2e1a', 'steam', true),
  'pad-thai': () => pasta('pad-thai', 'green', '#e8b06a', null, 'shrimp3 sprout4 herb2 lemon bean2'),
  'bun-cha': () => soupBowl('bun-cha', 'paper', '#e8b88a', 'meat3:#8a4a2a herb3 carrot2', 'none', -2, -1, '#f8f4ea'),
  wolnamssam: () => rollBoard('wolnamssam', '#f6efe4', '#f9f6f0', ['#ff9a6b', '#7cc35f', '#f39a3b'], 4, 'herb2 sauce:#e8a04a', '#e8d0a0'),
  'pizza-pepperoni': () => pizza('pizza-pepperoni', '#c8402a', '#ffdb6a', 'pepperoni7'),
  'pizza-cheese': () => pizza('pizza-cheese', '#d9562a', '#ffe27a', 'cheese3 herb2'),
  'pizza-combination': () => pizza('pizza-combination', '#c8402a', '#ffd86a', 'pepperoni3 mush3 pepper3 bean3 onion2'),
  'pizza-bulgogi': () => pizza('pizza-bulgogi', '#a8542a', '#ffd06a', 'meat5:#7a4026 onion3 corn2'),
  'pizza-potato': () => pizza('pizza-potato', '#e8c08a', '#ffe08a', 'potato5 corn3 bean2'),
  'pasta-tomato': () => pasta('pasta-tomato', 'white', '#f2d27a', '#d23a2a', 'herb2 cheese'),
  'pasta-cream': () => pasta('pasta-cream', 'cream', '#f2d27a', '#f6ecd6', 'mush3 slab2:#e8a48a herb'),
  'pasta-oil': () => pasta('pasta-oil', 'blue', '#f0cc6a', null, 'onion3 chili2 herb3'),
  'pasta-seafood-tomato': () => pasta('pasta-seafood-tomato', 'green', '#f2d27a', '#c8402a', 'shrimp3 mussel2 squid2 clam2'),
  'pasta-meatball': () => pasta('pasta-meatball', 'slate', '#f2d27a', '#b8341f', 'meat4:#6a3a22 herb2'),
  taco: () => tacoTray('taco'),
  burrito: () => wrapTray('burrito', '#d9a43a', '#f4e2b8', ['#7cc35f', '#c8402a', '#f2d27a', '#8a5a3a'], 'lemon'),
  kebab: () => wrapTray('kebab', '#3d6fb6', '#f0d9a8', ['#a35a3c', '#7cc35f', '#f6f2ea'], 'chili2', 2),
  'banh-mi': () => wrapTray('banh-mi', '#c99460', '#e2a24a', ['#f39a3b', '#7cc35f', '#a35a3c'], 'herb2'),
  // 가볍고 속 편한 거
  'salad-chicken': () => soupBowl('salad-chicken', 'wood', '#8ccc66', 'meat4:#f1d6b6 corn2 carrot2 tomato2', 'none', 0, 0, undefined, '#9fd67a'),
  'salad-tuna': () => soupBowl('salad-tuna', 'clear', '#94d06e', 'tuna4 corn3 onion2 tomato2', 'none', 1, 1, undefined, '#a8db7f'),
  'salad-pumpkin': () => soupBowl('salad-pumpkin', 'white', '#a8db7f', 'leaf3 bean2 tomato', 'none', -1, -1, undefined, '#f2b84a'),
  'salad-vegetable': () => soupBowl('salad-vegetable', 'wood', '#7cc35a', 'tomato3 cuke3 carrot3 onion2 corn2', 'none', 2, -1),
  'jeonbok-juk': () => soupBowl('jeonbok-juk', 'celadon', '#e7d9a8', 'abalone2 sesame4 nori2 scal', 'steam', 0, 0),
  'hobak-juk': () => soupBowl('hobak-juk', 'celadon', '#f2b13a', 'bean3 sesame2 pine2', 'steam', -1, 1),
  'chaeso-juk': () => soupBowl('chaeso-juk', 'celadon', '#f1e6c8', 'carrot4 cuke3 sesame3 mush', 'steam', 1, -1),
  'dak-juk': () => soupBowl('dak-juk', 'celadon', '#f1e2bc', 'meat4:#f1d6b6 scal3 sesame3', 'steam', 2, 1),
  'sogogi-beoseot-juk': () => soupBowl('sogogi-beoseot-juk', 'celadon', '#e6d4b0', 'meat3:#8a5a3c mush3 scal2 sesame2', 'steam', -2, -1),
  'pat-juk': () => soupBowl('pat-juk', 'celadon', '#7a3428', 'ball4 pine2', 'steam', 1, 1),
  'heugimja-juk': () => soupBowl('heugimja-juk', 'celadon', '#5a5450', 'sesame6 pine3 jujube', 'steam', -1, -1),
  'gesal-juk': () => soupBowl('gesal-juk', 'celadon', '#f2e4c2', 'crab4 scal2 sesame3', 'steam', 0, 1),
  // 간단한 거
  'chamchi-gimbap': () => rollBoard('chamchi-gimbap', G, W, ['#f3d0a8', '#f6d43a', '#4ea24b', '#f08c3c'], 4, 'pickle', '#e2b77f'),
  'cheese-gimbap': () => rollBoard('cheese-gimbap', G, W, ['#ffd84a', '#f6d43a', '#4ea24b', '#f08c3c', '#8b5a33'], 5, 'pickle', '#d9a46a'),
  'sogogi-gimbap': () => rollBoard('sogogi-gimbap', G, W, ['#7a4026', '#f6d43a', '#4ea24b', '#f08c3c'], 4, 'sesame3', '#ecc592'),
  'donkatsu-gimbap': () => rollBoard('donkatsu-gimbap', G, W, ['#d9933a', '#f3e2cf', '#4ea24b'], 3, 'pickle sauce:#6a3418', '#c99460'),
  'kimchi-gimbap': () => rollBoard('kimchi-gimbap', G, W, ['#e2553a', '#f6d43a', '#4ea24b'], 5, 'sesame2', '#b98650'),
  'salad-gimbap': () => rollBoard('salad-gimbap', G, W, ['#7cc35a', '#a8db7f', '#f6d43a', '#f08c3c'], 4, 'leaf', '#e8c99a'),
  'chungmu-gimbap': () => plateMound('chungmu-gimbap', 'white', '#e2553a', 'squid3 nori4 kimchi2', 'none', true),
  'sogogi-jumeokbap': () => plateDumplings('sogogi-jumeokbap', 'cream', '#f6f3ea', 3, false, 'nori'),
  'yubu-chobap': () => lunchbox('yubu-chobap', '#d9a04a', 'sesame4 rice2'),
  'bulgogi-burger': () => burger('bulgogi-burger', '#e8a03a', '#e0a04a', ['#7cc35f', '#7a4026', '#f6f2ea'], 'potato2'),
  hamburger: () => burger('hamburger', '#cf3b2c', '#d9933a', ['#7cc35f', '#ffd84a', '#6a3a22', '#e24a3a'], 'pickle'),
  'sandwich-chicken': () => sandwich('sandwich-chicken', '#efd8b0', '#f2dcae', ['#7cc35f', '#f1d6b6', '#f6f2ea'], 'tomato'),
  'sandwich-tuna': () => sandwich('sandwich-tuna', '#e2c08a', '#f6e2b8', ['#7cc35f', '#f3d0a8', '#fff4c8'], 'corn2'),
  'sandwich-ham-egg': () => sandwich('sandwich-ham-egg', '#d9b07a', '#f2d29a', ['#f4a3a6', '#ffe486', '#7cc35f'], 'pickle'),
  'sandwich-vegetable': () => sandwich('sandwich-vegetable', '#e8d0a0', '#e9c48a', ['#7cc35f', '#e24a3a', '#f39a3b', '#a8db7f'], 'cuke'),
  'gun-mandu': () => plateDumplings('gun-mandu', 'white', '#f2d29a', 5, true, 'sauce:#5a3a26'),
  'gogi-mandu': () => steamerDish('gogi-mandu', '#f6efe2', 5),
  'kimchi-mandu': () => plateDumplings('kimchi-mandu', 'cream', '#f6e2d6', 4, false, 'kimchi'),
  sundae: () => rollBoard('sundae', '#3a2a33', '#5a3a48', ['#7a5361', '#ddcdd6'], 5, 'slab:#7a3a2a', '#d9b07a'),
  // 든든한 거
  bibimbap: () => riceBowl('bibimbap', 'brass', '#7cc35a', 'carrot3 sprout3 mush2 meat2:#7a4026 egg sauce:#d23a2a sesame3', 'none', 0, 0),
  'dolsot-bibimbap': () => riceBowl('dolsot-bibimbap', 'stone', '#8ccc66', 'carrot2 sprout3 leaf2 meat2:#7a4026 egg sauce:#d23a2a', 'steam', 0, 1),
  'bulgogi-deopbap': () => halfPlate('bulgogi-deopbap', 'white', '#8a4a2c', 'onion3 scal2 sesame3 mush2'),
  'dak-deopbap': () => riceBowl('dak-deopbap', 'lacquer', '#e2a85a', 'meat4:#e9b67a onion2 scal2 sauce:#f2ead2', 'steam', 0, -1),
  'haemul-deopbap': () => halfPlate('haemul-deopbap', 'blue', '#e9d2a8', 'shrimp3 squid3 carrot2'),
  'jangeo-deopbap': () => riceBowl('jangeo-deopbap', 'lacquer', '#7a4a26', 'slab3:#9a5a2a sesame4 pickle', 'steam', 1, 0),
  'kimchi-bokkeumbap': () => plateMound('kimchi-bokkeumbap', 'white', '#e0613a', 'egg kimchi3 sesame3 nori2'),
  'saeu-bokkeumbap': () => plateMound('saeu-bokkeumbap', 'cream', '#f2d8a0', 'shrimp5 scal3 carrot3', 'steam', false, -1),
  'haemul-bokkeumbap': () => plateMound('haemul-bokkeumbap', 'blue', '#f0cf8a', 'shrimp2 squid3 mussel2 scal3 carrot2', 'steam', false, 1),
  jajangmyeon: () => soupBowl('jajangmyeon', 'china', '#3a2416', 'cuke4 onion2', 'steam', 0, 1, '#f2dca0', '#2e1a0e'),
  'gan-jajang': () => soupBowl('gan-jajang', 'china', '#f2dca0', 'egg onion4 cuke2', 'steam', 2, -1, '#f2dca0', '#3a2416'),
  'samseon-jajang': () => soupBowl('samseon-jajang', 'red', '#3a2416', 'shrimp2 squid2 cuke2', 'steam', -1, 0, '#f2dca0', '#2e1a0e'),
  jajangbap: () => halfPlate('jajangbap', 'white', '#3a2214', 'onion3 cuke2 egg', 'steam', true),
  japchaebap: () => halfPlate('japchaebap', 'cream', '#8a5a3a', 'carrot3 onion2 pepper3 meat2:#6a3a22'),
  japtangbap: () => halfPlate('japtangbap', 'green', '#d8b07a', 'shrimp2 squid2 mush2 leaf2'),
  'yusanseul-deopbap': () => halfPlate('yusanseul-deopbap', 'blue', '#efe2c4', 'shrimp2 squid2 mush3 leaf'),
  omurice: () => omurice('omurice'),
  kongnamulbap: () => riceBowl('kongnamulbap', 'stone', '#f6f2e2', 'sprout6 meat2:#7a4026 scal2 sauce:#7a4a2a', 'steam', -1, 0),
  'gondeure-bap': () => riceBowl('gondeure-bap', 'stone', '#5d7a2e', 'ugeoji4 sesame3 sauce:#5a3a26', 'steam', 1, -1, '#e6e0c8'),
  albap: () => riceBowl('albap', 'stone', '#ff8a3c', 'roe5 nori2 kimchi2 cuke2', 'steam', 0, -1),
  'yeongyang-dolsotbap': () => riceBowl('yeongyang-dolsotbap', 'stone', '#e6dcc0', 'jujube3 bean3 ginkgo3 pine2', 'steam', 2, 0, '#efe6cf'),
  gyudon: () => riceBowl('gyudon', 'lacquer', '#9a5a32', 'onion4 ginger2 scal2', 'steam', -2, 1),
};
