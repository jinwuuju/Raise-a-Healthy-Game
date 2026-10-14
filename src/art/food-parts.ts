/*
 * 오늘의 점심 음식 그림 부품(D082). 기준 5종(food.ts)의 기법을 그대로 쓴다:
 * 왼쪽 위 광원 4단계 색, 색 외곽선, 바닥 그림자, 김·냉기, 시드 고정 무늬. 상표·글자는 그리지 않는다.
 */
import { Layer, SHADOW, body, h2, sparkle, stack, steam, type FoodGrid } from './food-kit.ts';

export type Ramp = [string, string, string, string];
const hx = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
export function mix(a: string, b: string, t: number): string {
  const p = (c: string, i: number) => parseInt(c.slice(1 + i * 2, 3 + i * 2), 16);
  return '#' + [0, 1, 2].map(i => hx(p(a, i) + (p(b, i) - p(a, i)) * t)).join('');
}
export const ramp = (c: string): Ramp => [mix(c, '#ffffff', 0.4), c, mix(c, '#000000', 0.22), mix(c, '#000000', 0.42)];
/** 왼쪽 위가 밝은 4단계 음영. u, v는 -1..1. */
export function lit(r: Ramp, u: number, v: number, n = 0.5): string {
  const light = -(u * 0.55 + v * 0.85);
  let i = light > 0.55 ? 0 : light > -0.05 ? 1 : light > -0.6 ? 2 : 3;
  if (n > 0.86 && i > 0) i--; else if (n < 0.1 && i < 3) i++;
  return r[i]!;
}
export type Area = { cx: number; cy: number; rx: number; ry: number };

/* ---------------- 그릇·받침 ---------------- */
type BowlStyle = { body: Ramp; rim: [string, string, string]; out: string; band?: string; tray?: boolean };
const BOWLS: Record<string, BowlStyle> = {
  steel: { body: ['#f5f8fb', '#d8dfe7', '#aeb9c5', '#848f9d'], rim: ['#ffffff', '#e6ebf0', '#c3ccd6'], out: '#58626f' },
  white: { body: ['#ffffff', '#f1eee8', '#d9d3c8', '#b8b0a2'], rim: ['#ffffff', '#f6f3ee', '#ddd6cb'], out: '#7d7466' },
  china: { body: ['#ffffff', '#f2f1ec', '#d6d6d0', '#b2b3ad'], rim: ['#ffffff', '#f4f4f0', '#d8d8d2'], out: '#5a6680', band: '#3d6fb6' },
  red: { body: ['#ffffff', '#f4efe9', '#ddd2c6', '#bba996'], rim: ['#ffffff', '#f7f2ec', '#e0d5c9'], out: '#7c4a3c', band: '#cf3b2c' },
  earthen: { body: ['#80594a', '#5c3e31', '#442d23', '#2f1e17'], rim: ['#8d6450', '#674636', '#53372a'], out: '#1e120c', tray: true },
  stone: { body: ['#6d6a6f', '#4a474c', '#333136', '#1f1d21'], rim: ['#7d7a80', '#58555b', '#403e43'], out: '#141214', tray: true },
  wood: { body: ['#e1b077', '#c08648', '#9a6633', '#714820'], rim: ['#ecc592', '#d19b5e', '#b07a3f'], out: '#4a2e14' },
  celadon: { body: ['#eaf4ec', '#c4dccb', '#9bbea7', '#77997f'], rim: ['#f4faf5', '#d3e6d9', '#b0cdb9'], out: '#4b6656' },
  lacquer: { body: ['#d1584a', '#a3302a', '#7a201c', '#511410'], rim: ['#2b2324', '#1f1819', '#141011'], out: '#33100c' },
  paper: { body: ['#fbf6ea', '#efe4cc', '#d8c6a3', '#b9a37c'], rim: ['#fffaf0', '#f3ead6', '#dccbaa'], out: '#7a6648' },
  clear: { body: ['#f4fbff', '#ddeef6', '#bcd8e6', '#96bccd'], rim: ['#ffffff', '#e8f5fb', '#c8e2ee'], out: '#4f7486' },
};
/** 오목한 그릇. 반환값은 음식이 놓일 면. w는 메뉴마다 다른 크기(-2..2). */
export function bowl(o: Layer, kind: string, w = 0, dx = 0): Area {
  const s = BOWLS[kind]!, cx = 16 + dx, top = 15, wt = 13 + w;
  if (s.tray) o.e(cx, 27, wt + 1, 3, (x, y, u, v) => (v > 0.4 ? '#94653b' : u < -0.4 ? '#dcaa73' : '#bd8653'));
  body(o, cx, top, 25, wt, 8 + Math.round(w / 2), s.body);
  o.r(cx - 5, 26, 11, 1, s.body[3]); o.r(cx - 4, 26, 4, 1, s.body[2]);
  o.e(cx, top, wt + 1, 6, (x, y, u, v) => (u < -0.25 && v < 0.1 ? s.rim[0] : u > 0.45 ? s.rim[2] : s.rim[1]));
  if (s.band) for (let x = -wt; x <= wt; x++) if ((x + 40) % 3 !== 0) o.p(cx + x, top + 4 + Math.round(Math.abs(x) > wt - 3 ? -1 : 0), s.band);
  return { cx, cy: top, rx: wt - 1, ry: 4 };
}
type PlateStyle = { r: Ramp; out: string };
const PLATES: Record<string, PlateStyle> = {
  white: { r: ['#ffffff', '#f3f0ea', '#dcd6cb', '#bdb5a8'], out: '#7d7466' },
  cream: { r: ['#fffaf0', '#f4ead8', '#dfd0b6', '#c2ae8e'], out: '#7c6748' },
  blue: { r: ['#ffffff', '#eaf0f7', '#c9d6e6', '#9fb3cc'], out: '#4d6585' },
  slate: { r: ['#6f6b70', '#4d4a50', '#38353b', '#242226'], out: '#141215' },
  green: { r: ['#f1f8ee', '#d6ead0', '#b3d1aa', '#8db384'], out: '#4f6d48' },
};
/** 납작한 접시(oval이면 더 길쭉). */
export function plate(o: Layer, kind: string, oval = false, w = 0): Area {
  const s = PLATES[kind]!, rx = (oval ? 15 : 14) + Math.min(0, w), ry = oval ? 5 : 6;
  o.e(16, 23, rx, ry, (x, y, u, v) => (v > 0.55 ? s.r[3] : u < -0.4 && v < 0 ? s.r[0] : u > 0.5 ? s.r[2] : s.r[1]));
  o.e(16, 22, rx - 3, ry - 2, (x, y, u, v) => (u < -0.3 ? s.r[1] : s.r[2]));
  return { cx: 16, cy: 19, rx: rx - 4 + w, ry: 4 };
}
export function skillet(o: Layer, w = 0): Area {
  o.r(26, 19, 5, 2, '#3a2f2b'); o.r(26, 19, 5, 1, '#5b4a43');
  o.e(15, 21, 13 + w, 6, (x, y, u, v) => (v > 0.5 ? '#1f1a19' : u < -0.4 && v < -0.2 ? '#6a5c58' : '#3f3634'));
  o.e(15, 20, 11 + w, 4, '#2a2322');
  return { cx: 15, cy: 19, rx: 10 + w, ry: 4 };
}
export function hotpot(o: Layer, w = 0): Area {
  for (const x of [2, 29]) { o.r(x, 15, 2, 2, '#8e98a3'); o.p(x, 15, '#c9d1d9'); }
  body(o, 16, 15, 23, 13 + w, 11 + w, ['#eef2f5', '#c9d1d9', '#a3adb8', '#7c8792']);
  o.e(16, 15, 14 + w, 5, (x, y, u, v) => (u < -0.3 && v < 0 ? '#ffffff' : u > 0.5 ? '#bcc5ce' : '#dfe5ea'));
  return { cx: 16, cy: 15, rx: 12 + w, ry: 3 };
}
/** 무늬 없는 크라프트 상자(기준 후라이드치킨과 같은 방식). */
export function box(o: Layer, tint = '#d7a66d'): Area {
  const r = ramp(tint);
  o.r(4, 7, 24, 6, r[1]); o.r(4, 7, 24, 1, r[0]); o.r(4, 12, 24, 1, r[2]);
  o.r(5, 13, 22, 6, r[3]);
  o.r(4, 19, 24, 8, mix(tint, '#000000', 0.06)); o.r(4, 19, 2, 8, r[0]); o.r(26, 19, 2, 8, r[2]);
  o.r(4, 19, 24, 1, r[0]); o.r(4, 26, 24, 1, r[3]);
  return { cx: 16, cy: 15, rx: 10, ry: 4 };
}
export function board(o: Layer, tint = '#e2b77f'): Area {
  const r = ramp(tint);
  o.r(2, 18, 28, 7, r[1]); o.r(2, 18, 1, 7, r[0]);
  for (let x = 3; x < 30; x++) { if (h2(x, 20, 7) > 0.45) o.p(x, 20, r[2]); if (h2(x, 23, 7) > 0.5) o.p(x, 23, r[2]); }
  o.r(2, 25, 28, 2, r[2]); o.r(2, 26, 28, 1, r[3]);
  return { cx: 16, cy: 16, rx: 12, ry: 4 };
}
export function paperTray(o: Layer, tint = '#cf3b2c'): Area {
  const r = ramp(tint);
  o.r(3, 20, 26, 7, r[1]); o.r(3, 20, 26, 1, r[0]); o.r(3, 26, 26, 1, r[3]); o.r(27, 21, 2, 5, r[2]);
  for (let x = 5; x < 26; x++) o.p(x, 19 + (x % 4 === 0 ? -1 : 0), '#fbf5e6');
  o.r(5, 18, 21, 2, '#f6efdd');
  return { cx: 16, cy: 16, rx: 11, ry: 4 };
}
export function steamer(o: Layer): Area {
  body(o, 16, 16, 25, 13, 12, ['#f0d699', '#d9b36a', '#b98e48', '#8f6a31']);
  for (let y = 18; y <= 24; y += 3) for (let x = 4; x <= 28; x++) if (h2(x, y, 3) > 0.25) o.p(x, y, '#a57d3d');
  o.e(16, 16, 14, 5, (x, y, u, v) => (u < -0.3 ? '#f7e3b2' : '#e5c584'));
  o.e(16, 16, 12, 3, '#cfd9a8');
  return { cx: 16, cy: 15, rx: 11, ry: 3 };
}
export function dosirak(o: Layer): Area {
  o.r(3, 12, 26, 15, '#2a2526'); o.r(3, 12, 26, 1, '#4a4344'); o.r(3, 26, 26, 1, '#141011');
  o.r(17, 13, 1, 13, '#4a4344');
  return { cx: 10, cy: 19, rx: 6, ry: 6 };
}

/* ---------------- 음식 면 ---------------- */
/** 국물·소스 면: 윤기(왼쪽 위 밝은 점)와 시드 무늬. */
export function soup(o: Layer, a: Area, base: string, seed: number, sheen = '#ffffff'): void {
  const r = ramp(base);
  o.e(a.cx, a.cy, a.rx, a.ry, (x, y, u, v) => v < -0.62 ? r[2] : u < -0.35 && v < 0.2 && h2(x, y, seed) > 0.55 ? mix(r[0], sheen, 0.3) : u + v > 0.85 ? r[2] : h2(x, y, seed + 9) > 0.93 ? r[0] : r[1]);
}
/** 면 똬리: 동심 고리 두 색. */
export function noodles(o: Layer, a: Area, base: string, seed: number): void {
  const r = ramp(base), cx = a.cx + Math.round((h2(seed, 1) - 0.5) * 4), cy = a.cy - 1;
  const coil = (x: number, y: number, u: number, v: number) => {
    const k = Math.floor(Math.sqrt((x - cx) ** 2 + ((y - cy) * 2.4) ** 2) + seed % 2);
    if (u < -0.3 && v < -0.2 && k % 2 === 0) return r[0];
    return k % 2 === 0 ? r[1] : r[2];
  };
  o.e(cx, cy, Math.max(3, a.rx - 5), 3, coil); o.e(cx, cy - 2, Math.max(2, a.rx - 7), 2, coil);
}
/** 소복한 더미(밥·볶음·샐러드·고기). */
export function mound(o: Layer, a: Area, base: string, seed: number, rough = 0.5): void {
  const r = ramp(base);
  o.e(a.cx, a.cy - 1, a.rx, a.ry + 1, (x, y, u, v) => lit(r, u, v, h2(x, y, seed) * (0.5 + rough)));
}
/** 밥 알갱이 더미. */
export function rice(o: Layer, a: Area, seed: number, tint = '#f4f1e8'): void {
  const r: Ramp = ['#ffffff', tint, mix(tint, '#8a8270', 0.25), mix(tint, '#6d6555', 0.45)];
  o.e(a.cx, a.cy - 1, a.rx, a.ry + 1, (x, y, u, v) => lit(r, u, v, h2(x, y, seed)));
}
/** 튀김·구이 조각 여러 개(각자 외곽선). */
export function pieces(o: Layer, a: Area, base: string, seed: number, n: number, out?: string): void {
  const r = ramp(base);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n, px = Math.round(a.cx - a.rx + t * a.rx * 2 + (h2(i, seed) - 0.5) * 3), py = Math.round(a.cy + (h2(seed, i) - 0.5) * a.ry * 1.6);
    const l = new Layer(), rx = 3 + Math.round(h2(i, seed, 2) * 2), ry = 2 + Math.round(h2(i, seed, 3));
    l.e(px, py, rx, ry, (x, y, u, v) => lit(r, u, v, h2(x, y, seed + i)));
    l.e(px + (i % 2 ? 2 : -2), py + 1, 2, 1, (x, y, u, v) => lit(r, u, v, h2(x, y, seed + 30 + i)));
    l.outline(out ?? r[3]); o.put(l);
  }
}
/** 비스듬히 썬 튀김 커틀릿(속 단면 색 cut). */
export function cutlet(o: Layer, a: Area, crust: string, cut: string, seed: number, n = 4): void {
  const r = ramp(crust);
  for (let i = 0; i < n; i++) {
    const x0 = a.cx - a.rx + 1 + i * Math.round((a.rx * 2 - 2) / n);
    for (let y = -2; y <= 2; y++) for (let x = 0; x < Math.round((a.rx * 2 - 2) / n) - 1; x++) {
      const X = x0 + x + Math.round(y * -0.5), Y = a.cy + y;
      o.p(X, Y, x === 0 ? cut : lit(r, (x - 2) / 3, y / 2.5, h2(X, Y, seed)));
    }
  }
}
/** 둥근 판(피자·전·부침): 테두리 빵, 소스, 치즈. */
export function disc(o: Layer, a: Area, crust: string, sauce: string, cheese: string, seed: number): void {
  const cr = ramp(crust);
  o.e(a.cx, a.cy, a.rx, a.ry, (x, y, u, v) => lit(cr, u, v, h2(x, y, seed)));
  o.e(a.cx, a.cy, a.rx - 2, a.ry - 1, sauce);
  o.e(a.cx, a.cy, a.rx - 3, a.ry - 1, (x, y) => (h2(x, y, seed + 3) > 0.35 ? (h2(x, y, seed + 4) > 0.8 ? '#ffffff' : cheese) : sauce));
}
/** 김밥·롤·초밥 단면(outer=겉, fill=속 색들). */
export function rolls(o: Layer, a: Area, outer: string, inner: string, fills: string[], seed: number, n = 4): void {
  for (let i = 0; i < n; i++) {
    const cx = Math.round(a.cx - a.rx + 3 + i * ((a.rx * 2 - 6) / Math.max(1, n - 1))), cy = a.cy + (i % 2 ? 2 : -1);
    o.e(cx, cy + 2, 3, 1, mix(outer, '#000000', 0.3));
    o.e(cx, cy, 3, 2, (x, y, u, v) => {
      const d = Math.sqrt(u * u + v * v);
      if (d > 0.8) return u < -0.2 && v < -0.2 ? mix(outer, '#ffffff', 0.25) : outer;
      if (d > 0.4) return h2(x, y, seed) > 0.75 ? mix(inner, '#000000', 0.08) : inner;
      return fills[(Math.floor((Math.atan2(v, u) + Math.PI) * 1.2) + i + seed) % fills.length]!;
    });
  }
}
/** 만두·딤섬 여러 개. */
export function dumplings(o: Layer, a: Area, skin: string, seed: number, n = 5, fried = false): void {
  const r = ramp(skin);
  for (let i = 0; i < n; i++) {
    const cx = Math.round(a.cx - a.rx + 3 + i * ((a.rx * 2 - 6) / Math.max(1, n - 1))), cy = a.cy + (i % 2 ? 1 : -1);
    const l = new Layer();
    l.e(cx, cy, 3, 2, (x, y, u, v) => (fried && v > 0.2 ? r[2] : lit(r, u, v, h2(x, y, seed + i))));
    l.p(cx - 1, cy - 2, r[0]); l.p(cx + 1, cy - 2, r[0]); l.p(cx, cy - 2, r[1]);
    l.outline(r[3]); o.put(l);
  }
}
/** 꼬치. */
export function skewers(o: Layer, a: Area, meat: string, seed: number, n = 2): void {
  const r = ramp(meat);
  for (let k = 0; k < n; k++) {
    const y = a.cy - 2 + k * 4;
    o.r(a.cx - a.rx - 2, y + 1, a.rx * 2 + 4, 1, '#d9c39a');
    for (let i = 0; i < 4; i++) { const l = new Layer(); l.e(a.cx - a.rx + 2 + i * Math.round(a.rx / 2), y, 2, 2, (x, yy, u, v) => lit(r, u, v, h2(x, yy, seed + i + k))); l.outline(r[3]); o.put(l); }
  }
}
/** 빵 겹(버거·샌드위치·반미). layers는 위에서 아래 색. */
export function stackFood(o: Layer, a: Area, bun: string, layers: string[], seed: number, flat = false): void {
  const b = ramp(bun), top = a.cy - 5;
  o.e(a.cx, top, a.rx, flat ? 2 : 3, (x, y, u, v) => lit(b, u, v, h2(x, y, seed)));
  if (!flat) for (const [x, y] of [[a.cx - 3, top - 1], [a.cx + 1, top - 2], [a.cx + 4, top]] as const) o.p(x, y, '#fff3c9');
  layers.forEach((c, i) => { const y = top + 3 + i; for (let x = -a.rx; x <= a.rx; x++) o.p(a.cx + x + (i % 2 && h2(x, y, seed) > 0.7 ? 1 : 0), y, h2(x, y, seed + i) > 0.85 ? mix(c, '#ffffff', 0.3) : c); });
  const by = top + 3 + layers.length;
  o.e(a.cx, by, a.rx, 1, (x, y, u) => (u < -0.3 ? b[1] : b[2]));
}
/** 또르띠야·랩 말이. */
export function wrap(o: Layer, a: Area, skin: string, fills: string[], seed: number): void {
  const r = ramp(skin);
  o.e(a.cx, a.cy, a.rx, a.ry, (x, y, u, v) => lit(r, u, v, h2(x, y, seed)));
  o.e(a.cx + a.rx - 3, a.cy - 1, 3, 2, (x, y) => fills[Math.floor(h2(x, y, seed + 1) * fills.length)]!);
  for (let x = a.cx - a.rx + 2; x < a.cx + a.rx - 4; x += 3) o.p(x, a.cy + a.ry - 1, r[3]);
}

/* ---------------- 고명·재료(작은 조각) ---------------- */
type Bit = (o: Layer, x: number, y: number, c: string) => void;
export const BITS: Record<string, Bit> = {
  egg: (o, x, y) => { o.e(x, y, 2, 1, (X, Y, u) => (u < 0 ? '#ffffff' : '#f3efe2')); o.p(x, y, '#f3bd35'); o.p(x + 1, y, '#e7a92a'); },
  halfegg: (o, x, y) => { o.e(x, y, 2, 1, (X, Y, u) => (u < -0.3 ? '#ffffff' : '#f5f2e6')); o.p(x, y, '#f2bc33'); },
  scal: (o, x, y) => { o.p(x, y, '#6cc04f'); o.p(x + 1, y, '#3f8f37'); },
  sesame: (o, x, y) => o.p(x, y, '#fbf3d6'),
  chili: (o, x, y) => { o.p(x, y, '#d8473a'); o.p(x + 1, y, '#a82a20'); },
  greenchili: (o, x, y) => { o.p(x, y, '#5fae3f'); o.p(x, y + 1, '#3c7d2a'); },
  meat: (o, x, y, c) => { const r = ramp(c); o.r(x, y, 3, 2, r[1]); o.r(x, y, 3, 1, r[0]); o.p(x + 2, y + 1, r[2]); },
  slab: (o, x, y, c) => { const r = ramp(c); o.r(x, y, 4, 2, r[1]); o.r(x, y, 4, 1, r[0]); o.r(x, y + 2, 4, 1, r[3]); },
  shrimp: (o, x, y) => { o.p(x, y, '#ff9a6b'); o.p(x + 1, y, '#f57b4a'); o.p(x + 2, y + 1, '#e25f35'); o.p(x, y + 1, '#ffd0b0'); },
  squid: (o, x, y) => { o.p(x, y, '#fff3ea'); o.p(x + 1, y, '#f1d8c8'); o.p(x, y + 1, '#e6c2ae'); o.p(x + 1, y + 1, '#fff3ea'); },
  clam: (o, x, y) => { o.p(x, y, '#3c2e3a'); o.p(x + 1, y, '#5b4757'); o.p(x, y + 1, '#f2d7a6'); },
  mussel: (o, x, y) => { o.r(x, y, 3, 1, '#2a2533'); o.p(x + 1, y + 1, '#f08a4b'); },
  mush: (o, x, y) => { o.p(x, y, '#9a6a45'); o.p(x + 1, y, '#7a4f31'); o.p(x, y + 1, '#efe2cc'); },
  kimchi: (o, x, y) => { o.r(x, y, 3, 1, '#e2553a'); o.p(x + 1, y + 1, '#f6c2a4'); o.p(x, y + 1, '#c23b26'); },
  cuke: (o, x, y) => { o.p(x, y, '#7cc35f'); o.p(x + 1, y, '#4d8b3f'); o.p(x, y + 1, '#d9f0c8'); },
  carrot: (o, x, y) => { o.p(x, y, '#f39a3b'); o.p(x + 1, y, '#d97b1f'); },
  cheese: (o, x, y) => { o.r(x, y, 3, 1, '#ffd84a'); o.p(x + 1, y + 1, '#f2bc22'); o.p(x, y, '#fff09a'); },
  tofu: (o, x, y) => { o.r(x, y, 2, 2, '#fbf8ef'); o.p(x + 1, y + 1, '#e2dccb'); },
  sausage: (o, x, y) => { o.r(x, y, 3, 1, '#c86a5a'); o.p(x, y, '#e8998a'); o.p(x + 2, y, '#9c4a3c'); },
  nori: (o, x, y) => { o.r(x, y, 2, 3, '#1f2a22'); o.p(x, y, '#3e5244'); },
  leaf: (o, x, y) => { o.r(x, y, 4, 2, '#7fc35a'); o.r(x, y, 4, 1, '#a8db7f'); o.p(x + 3, y + 1, '#4d8b3f'); },
  corn: (o, x, y) => { o.p(x, y, '#ffe066'); o.p(x + 1, y + 1, '#f2c230'); },
  onion: (o, x, y) => { o.p(x, y, '#f4eef6'); o.p(x + 1, y + 1, '#ddcfe4'); },
  tteok: (o, x, y) => { o.r(x, y, 4, 1, '#fff6e2'); o.r(x, y + 1, 4, 1, '#d7b98a'); },
  fishcake: (o, x, y) => { o.p(x + 1, y, '#f7d496'); o.r(x, y + 1, 3, 1, '#c88f4b'); },
  pickle: (o, x, y) => { o.r(x, y, 3, 2, '#f7d84a'); o.p(x, y, '#fff08a'); },
  lemon: (o, x, y) => { o.p(x, y, '#fff07a'); o.p(x + 1, y, '#f2d22c'); o.p(x, y + 1, '#ffffff'); },
  herb: (o, x, y) => { o.p(x, y, '#3f9a3a'); o.p(x + 1, y - 1, '#6cc04f'); },
  sauce: (o, x, y, c) => { o.r(x, y, 3, 1, c); o.p(x + 1, y + 1, mix(c, '#000000', 0.25)); o.p(x, y, mix(c, '#ffffff', 0.3)); },
  bean: (o, x, y) => { o.p(x, y, '#5a3a2a'); },
  salmon: (o, x, y) => { o.r(x, y, 3, 2, '#ff8c6a'); o.p(x, y, '#ffc2ad'); o.p(x + 2, y + 1, '#f06543'); },
  fish: (o, x, y) => { o.r(x, y, 3, 2, '#fff1ea'); o.p(x + 2, y + 1, '#f2cdbf'); },
  crab: (o, x, y) => { o.r(x, y, 3, 2, '#e4572e'); o.p(x, y, '#ff8a5c'); o.p(x + 1, y + 1, '#f6b04a'); },
  pepper: (o, x, y) => { o.p(x, y, '#5fae3f'); o.p(x + 1, y, '#e2553a'); },
  rice: (o, x, y) => { o.r(x, y, 3, 2, '#fbfaf3'); o.p(x + 2, y + 1, '#e0dccd'); },
};
/** 'meat3:#a35a3c scal5' 같은 짧은 표기를 시드 고정 위치로 흩뿌린다. */
export function scatter(o: Layer, a: Area, spec: string, seed: number): void {
  let k = 0;
  for (const token of spec.split(' ').filter(Boolean)) {
    const m = /^([a-z]+)(\d*)(?::(#[0-9a-f]{6}))?$/.exec(token);
    if (!m) throw new Error('잘못된 고명 표기: ' + token);
    const bit = BITS[m[1]!]; if (!bit) throw new Error('없는 고명: ' + m[1]);
    const n = m[2] ? Number(m[2]) : 1;
    for (let i = 0; i < n; i++, k++) {
      const ang = h2(k, seed, 5) * Math.PI * 2, rad = Math.sqrt(h2(seed, k, 6)) * 0.85;
      bit(o, Math.round(a.cx + Math.cos(ang) * a.rx * rad - 1), Math.round(a.cy + Math.sin(ang) * a.ry * rad), m[3] ?? '#a35a3c');
    }
  }
}
export function finish(o: Layer, out: string, fx: string, seed: number, shadowW = 13): FoodGrid {
  const sh = new Layer(); sh.e(16, 29, shadowW, 2, SHADOW);
  o.outline(out);
  const f = new Layer();
  if (fx === 'steam') { steam(f, 10 + (seed % 3), 9, 7, seed % 4); steam(f, 19 + (seed % 2), 8, 6, (seed + 2) % 4); }
  if (fx === 'cold') { sparkle(f, 4, 6 + (seed % 3)); sparkle(f, 28, 8); f.p(24, 4, '#cdeefa'); }
  return stack(sh, o, f);
}
