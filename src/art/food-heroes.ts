/*
 * 오늘의 점심 ‘주인공 재료’ 부품(D084). 사용자 피드백: 전체적으로 비슷하다 → 음식마다 특징을 살린다.
 * 사실적인 축소보다 알아보는 특징(뼈·닭다리·껍데기·노른자·단면·들어 올린 면·꼬치)을 크게, 과장해서 그린다.
 * 부품마다 자기 외곽선을 가져 32x32에서도 실루엣이 따로 읽히게 한다. 기법은 기준 5종과 같다(왼쪽 위 광원, 색 외곽선).
 */
import { Layer, h2 } from './food-kit.ts';
import { lit, mix, ramp, type Ramp } from './food-parts.ts';

type Paint = string | ((x: number, y: number, t: number) => string | null);
const paint = (c: Paint, x: number, y: number, t: number) => (typeof c === 'string' ? c : c(x, y, t));

/** 새 층에 그리고, 그 층만 외곽선을 둘러 위에 얹는다. */
export function part(o: Layer, out: string | null, draw: (l: Layer) => void): void {
  const l = new Layer(); draw(l); if (out) l.outline(out); o.put(l);
}

export function line(l: Layer, x0: number, y0: number, x1: number, y1: number, c: Paint, w = 1): void {
  const steep = Math.abs(y1 - y0) > Math.abs(x1 - x0), n = Math.max(1, Math.round(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = Math.round(x0 + (x1 - x0) * t), y = Math.round(y0 + (y1 - y0) * t);
    for (let k = 0; k < w; k++) { const X = steep ? x + k : x, Y = steep ? y : y + k, col = paint(c, X, Y, t); if (col) l.p(X, Y, col); }
  }
}

const shade = (r: Ramp, seed: number) => (x: number, y: number, u: number, v: number) => lit(r, u, v, h2(x, y, seed));

/* ---------- 뼈·고기 ---------- */

/** 굵은 뼈(끝 마디가 둥근 만화 뼈). meat를 주면 뼈에 붙은 살. */
export function bone(o: Layer, x0: number, y0: number, x1: number, y1: number, meat?: string, seed = 1): void {
  part(o, '#8a6a46', l => {
    line(l, x0, y0, x1, y1, (x, y, t) => (t < 0.45 ? '#fbf3e2' : '#e9dcbc'), 2);
    for (const [x, y] of [[x0, y0], [x1, y1]] as const) { l.e(x, y, 1, 1, '#fffaf0'); l.p(x + 1, y + 1, '#dccca8'); }
    if (meat) {
      const mx = Math.round(x0 + (x1 - x0) * 0.6), my = Math.round(y0 + (y1 - y0) * 0.6);
      l.e(mx, my, 3, 2, shade(ramp(meat), seed));
    }
  });
}

/** 삼계탕 인삼: 국물 밖으로 비스듬히 솟은 뿌리. */
export function ginseng(o: Layer, x: number, y: number): void {
  part(o, '#8a6a3a', l => {
    line(l, x, y, x + 3, y - 8, (X, Y, t) => (t > 0.65 ? '#f6e4b6' : '#e2c48a'), 2);
    line(l, x + 1, y - 3, x - 2, y - 5, '#d9b878'); line(l, x + 3, y - 5, x + 6, y - 6, '#d9b878');
    l.p(x + 4, y - 9, '#c9a86a');
  });
}

/** 통닭 한 마리(삼계탕): 둥근 몸통 + 엇갈린 다리 뼈. */
export function wholeChicken(o: Layer, cx: number, cy: number, skin = '#f2dcbc', seed = 3): void {
  const r = ramp(skin);
  part(o, mix(skin, '#000000', 0.5), l => {
    l.e(cx, cy, 6, 4, shade(r, seed));
    l.e(cx + 4, cy - 3, 2, 2, (x, y, u, v) => lit(r, u, v, 0.6));
    l.e(cx - 3, cy - 3, 2, 2, (x, y, u, v) => lit(r, u, v, 0.6));
    l.p(cx - 3, cy - 1, r[0]); l.p(cx - 2, cy - 1, r[0]);
  });
  part(o, '#a8946a', l => {
    line(l, cx + 4, cy - 5, cx + 1, cy - 8, '#fffaf0'); line(l, cx - 3, cy - 5, cx, cy - 8, '#efe4cc');
    l.r(cx, cy - 9, 2, 1, '#fffaf0');
  });
}

/** 닭다리: 통통한 살 + 가늘어지는 끝 + 뼈 마디. glaze로 후라이드·양념·간장을 나눈다. */
export function drumstick(o: Layer, cx: number, cy: number, glaze: Ramp, dir: 1 | -1, seed: number, out: string, withBone = true): void {
  part(o, out, l => {
    l.e(cx, cy, 4, 3, shade(glaze, seed));
    l.e(cx + dir * 4, cy - 2, 2, 1, shade(glaze, seed + 1));
    l.p(cx - 2, cy - 2, mix(glaze[0], '#ffffff', 0.6)); l.p(cx - 1, cy - 2, mix(glaze[0], '#ffffff', 0.35));
    if (withBone) { l.r(cx + dir * 6 - (dir < 0 ? 1 : 0), cy - 4, 2, 2, '#f6f0e3'); l.p(cx + dir * 7, cy - 5, '#fffaf0'); l.p(cx + dir * 6, cy - 3, '#d9cfbd'); }
  });
}

/** 닭날개: 꺾인 V자 두 마디. */
export function wing(o: Layer, cx: number, cy: number, glaze: Ramp, seed: number, out: string, flip = false): void {
  const s = flip ? -1 : 1;
  part(o, out, l => {
    l.e(cx - 2 * s, cy, 3, 2, shade(glaze, seed));
    l.e(cx + 2 * s, cy - 2, 2, 2, shade(glaze, seed + 2));
    l.e(cx + 4 * s, cy - 4, 1, 1, (x, y, u, v) => lit(glaze, u, v, 0.5));
    l.p(cx - 3 * s, cy - 1, glaze[0]);
  });
}

/** 등뼈 무더기(뼈해장국·감자탕): 살 붙은 뼈 덩이 + 튀어나온 마디. */
export function spine(o: Layer, cx: number, cy: number, meat: string, seed: number): void {
  const r = ramp(meat);
  part(o, mix(meat, '#000000', 0.55), l => {
    l.e(cx, cy, 5, 3, shade(r, seed));
    l.e(cx - 3, cy - 3, 2, 2, shade(r, seed + 1)); l.e(cx + 3, cy - 3, 3, 2, shade(r, seed + 2));
  });
  bone(o, cx - 1, cy - 5, cx + 2, cy - 9); bone(o, cx + 5, cy - 3, cx + 8, cy - 6);
}

/* ---------- 면·젓가락 ---------- */

export function chopsticks(o: Layer, x0: number, y0: number, x1: number, y1: number, c = '#d6a467'): void {
  const r = ramp(c);
  part(o, r[3], l => {
    line(l, x0, y0, x1, y1, (x, y, t) => (t < 0.45 ? r[0] : r[1]));
    line(l, x0 + 2, y0, x1 + 2, y1 + 1, (x, y, t) => (t < 0.45 ? r[1] : r[2]));
  });
}

/** 젓가락으로 들어 올린 면발. w=면 굵기(칼국수·우동은 2), wavy=꼬불거림(라면·라멘). */
export function noodleLift(o: Layer, x: number, yTop: number, yBot: number, c: string, n = 3, wavy = 0, w = 1): void {
  const r = ramp(c);
  part(o, r[3], l => {
    for (let i = 0; i < n; i++) for (let y = yTop; y <= yBot; y++) {
      const dx = wavy ? Math.round(Math.sin((y + i * 2) * 1.4) * wavy) : 0;
      for (let k = 0; k < w; k++) l.p(x + i * (w + 1) + dx + k, y, k === 0 && i === 0 ? r[0] : y > yBot - 2 ? r[2] : r[1]);
    }
  });
}

/** 국물 위 면 똬리를 굵은 줄무늬로(면 종류마다 굵기·색이 다르다). */
export function noodleNest(o: Layer, cx: number, cy: number, rx: number, ry: number, c: string, seed: number, wavy = false, out?: string): void {
  const r = ramp(c);
  part(o, out ?? null, l => l.e(cx, cy, rx, ry, (x, y, u, v) => {
    const k = Math.floor((y - cy) * 1.6 + (wavy ? Math.sin(x * 1.3 + seed) * 1.2 : (x - cx) * 0.35));
    if (u < -0.3 && v < -0.2 && k % 2 === 0) return r[0];
    return k % 2 === 0 ? r[1] : r[2];
  }));
}

/** 부드러운 국물 면 위 쑥 솟은 비빔면 산(빨간 양념). */
export function sauceMound(o: Layer, cx: number, cy: number, rx: number, h: number, c: string, seed: number): void {
  const r = ramp(c);
  part(o, r[3], l => { for (let y = 0; y < h; y++) { const hw = Math.round(rx * (0.35 + 0.65 * (y / Math.max(1, h - 1)))); for (let x = -hw; x <= hw; x++) l.p(cx + x, cy - h + 1 + y, lit(r, x / Math.max(1, hw), (y / h) * 2 - 1, h2(cx + x, y, seed))); } });
}

/* ---------- 달걀·김·채소 ---------- */

export function eggHalf(o: Layer, cx: number, cy: number, jammy = false, rx = 3, ry = 2): void {
  part(o, '#a99c7c', l => {
    l.e(cx, cy, rx, ry, (x, y, u, v) => (u < -0.3 && v < 0 ? '#ffffff' : u + v > 0.8 ? '#e6dfcb' : '#f7f3e8'));
    l.e(cx, cy, Math.max(1, rx - 2), Math.max(1, ry - 1), jammy ? '#ff951a' : '#f6c234');
    l.p(cx - 1, cy - 1, jammy ? '#ffc56a' : '#ffe27c');
  });
}

/** 달걀프라이: 울퉁불퉁한 흰자 + 큰 노른자(김치볶음밥·함박·간짜장의 표지). */
export function friedEgg(o: Layer, cx: number, cy: number, rx = 5, ry = 3, seed = 1): void {
  part(o, '#bfb393', l => {
    l.e(cx, cy, rx, ry, (x, y, u, v) => (Math.sqrt(u * u + v * v) > 0.85 && h2(x, y, seed) > 0.6 ? null : u < -0.3 && v < 0 ? '#ffffff' : v > 0.5 ? '#ebe4d2' : '#f8f5ee'));
    l.e(cx - 1, cy - 1, 2, 1, (x, y, u, v) => (u < -0.2 && v < 0 ? '#ffe680' : '#ffbe1a'));
    l.p(cx - 2, cy - 2, '#fffbe0');
  });
}

/** 날달걀 노른자(순두부·콩나물국밥·규동·비빔밥). */
export function yolk(o: Layer, cx: number, cy: number, big = false): void {
  part(o, '#c96a08', l => { l.e(cx, cy, big ? 2 : 1, 1, (x, y, u, v) => (u < -0.2 && v < 0 ? '#ffe07a' : '#ffaa12')); l.p(cx - 1, cy - 1, '#fff6c8'); });
}

/** 세워 꽂은 김 한 장(라멘). */
export function noriSheet(o: Layer, x: number, y: number, w = 4, h = 7): void {
  part(o, '#0b110d', l => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) l.p(x + i + Math.floor(j / 4), y + j, i === 0 ? '#3e5244' : h2(x + i, y + j, 9) > 0.78 ? '#33483a' : '#1f2a22'); });
}

/** 잘게 채 썬 김 더미(막국수). */
export function noriShreds(o: Layer, cx: number, cy: number, rx: number, seed: number): void {
  part(o, null, l => { for (let i = 0; i < rx * 5; i++) { const x = Math.round(cx + (h2(i, seed) - 0.5) * rx * 2), y = Math.round(cy + (h2(seed, i) - 0.5) * 4 - (1 - Math.abs(h2(i, seed) - 0.5) * 2) * 2); l.p(x, y, i % 3 ? '#1f2a22' : '#3e5244'); l.p(x + 1, y, '#2a3a2e'); } });
}

export function limeWedge(o: Layer, cx: number, cy: number, rind = '#4fa23a', flesh = '#d6ef86'): void {
  part(o, mix(rind, '#000000', 0.45), l => l.e(cx, cy, 3, 2, (x, y, u, v) => (v < -0.2 ? null : v > 0.55 ? rind : (x - cx) % 2 === 0 && v < 0.4 ? '#f4ffd0' : flesh)));
}

/** 허브 잎줄기(쌀국수·분짜·팟타이·스테이크 로즈메리). */
export function herbSprig(o: Layer, x: number, y: number, c = '#3f9a3a'): void {
  const r = ramp(c);
  part(o, r[3], l => {
    line(l, x, y, x + 2, y - 4, r[2]);
    for (const [dx, dy] of [[-2, -1], [2, -2], [-1, -4], [3, -5]] as const) { l.r(x + dx, y + dy, 2, 1, r[1]); l.p(x + dx, y + dy, r[0]); }
  });
}

/** 길게 썬 대파(설렁탕·육개장·돼지국밥 부추). */
export function onionHeap(o: Layer, cx: number, cy: number, rx: number, seed: number, c = '#63b84c'): void {
  const r = ramp(c);
  part(o, null, l => { for (let i = 0; i < rx * 4; i++) { const x = Math.round(cx + (h2(i, seed, 1) - 0.5) * rx * 2), y = Math.round(cy - 1 + (h2(seed, i, 2) - 0.5) * 3); l.p(x, y, i % 4 === 0 ? '#f4f8e8' : i % 3 === 0 ? r[0] : r[1]); l.p(x + 1, y, i % 2 ? r[2] : r[1]); } });
}

export function longOnion(o: Layer, x0: number, y0: number, x1: number, y1: number): void {
  part(o, '#2c6a24', l => line(l, x0, y0, x1, y1, (x, y, t) => (t < 0.25 ? '#f4f8e8' : t < 0.5 ? '#a8db7f' : '#4ea23a'), 2));
}

export function perilla(o: Layer, cx: number, cy: number, seed = 1): void {
  part(o, '#24561c', l => { l.e(cx, cy, 4, 2, (x, y, u, v) => (Math.abs(v) < 0.2 && u > -0.8 ? '#a8d878' : u < -0.3 && v < 0 ? '#7cc35a' : h2(x, y, seed) > 0.7 ? '#3f8a2e' : '#4f9a3a')); l.p(cx + 5, cy, '#3f8a2e'); });
}

/** 콩나물 무더기(아귀찜·콩나물국밥): 노란 머리 + 흰 줄기. */
export function sprouts(o: Layer, cx: number, cy: number, rx: number, ry: number, seed: number): void {
  part(o, null, l => {
    for (let i = 0; i < rx * ry * 2; i++) {
      const x = Math.round(cx + (h2(i, seed) - 0.5) * rx * 2), y = Math.round(cy + (h2(seed, i) - 0.5) * ry * 2), d = h2(i, i, seed) > 0.5 ? 1 : -1;
      l.p(x, y, '#fbf8ea'); l.p(x + d, y + 1, '#ece6cc'); l.p(x, y - 1, '#f6dc5a');
    }
  });
}

/** 채 썬 양배추 더미(돈가스·쫄면). */
export function cabbage(o: Layer, cx: number, cy: number, rx: number, ry: number, seed: number): void {
  part(o, '#7f9a5a', l => l.e(cx, cy, rx, ry, (x, y, u, v) => { const k = (x + y * 2 + Math.floor(h2(x, y, seed) * 2)) % 3; return u < -0.3 && v < 0 ? '#ffffff' : k === 0 ? '#c9e09a' : k === 1 ? '#eef6dc' : '#dcecb8'; }));
}

/** 잎채소 볼륨(샐러드): 물결 모양 잎 여러 장. */
export function leaves(o: Layer, cx: number, cy: number, rx: number, ry: number, seed: number, c = '#6fbf4a'): void {
  const r = ramp(c);
  part(o, r[3], l => {
    for (let i = 0; i < 6; i++) {
      const lx = Math.round(cx + (h2(i, seed) - 0.5) * rx * 1.6), ly = Math.round(cy + (h2(seed, i) - 0.5) * ry * 1.4);
      l.e(lx, ly, 3, 2, (x, y, u, v) => (Math.abs(u) < 0.15 ? r[0] : lit(r, u, v, h2(x, y, seed + i))));
    }
  });
}

export function tomatoHalf(o: Layer, cx: number, cy: number): void {
  part(o, '#8a1e14', l => { l.e(cx, cy, 2, 2, (x, y, u, v) => (Math.sqrt(u * u + v * v) > 0.75 ? '#d8352a' : (x + y) % 2 ? '#f6806a' : '#ffd0a8')); l.p(cx - 1, cy - 2, '#ff9a8a'); });
}

export function cucumberRound(o: Layer, cx: number, cy: number): void {
  part(o, '#2c5a22', l => l.e(cx, cy, 2, 1, (x, y, u, v) => (Math.abs(u) > 0.7 || Math.abs(v) > 0.9 ? '#4d8b3f' : u < 0 ? '#e6f6c8' : '#c8e8a2')));
}

/* ---------- 해산물 ---------- */

export function mussel(o: Layer, cx: number, cy: number, open = true): void {
  part(o, '#0f0c14', l => { l.e(cx, cy, 3, 2, (x, y, u, v) => (u < -0.4 && v < -0.2 ? '#5a5070' : '#2a2533')); if (open) { l.e(cx, cy, 2, 1, '#f39a52'); l.p(cx - 1, cy, '#ffc28a'); } });
}

/** 꼬부라진 새우 한 마리(꼬리 부채 포함). */
export function shrimp(o: Layer, cx: number, cy: number, flip = false, body = '#ff8a5a', big = false): void {
  const r = ramp(body), s = flip ? -1 : 1, R = big ? 4 : 3;
  part(o, '#a8402a', l => {
    for (let k = 0; k <= 8; k++) {
      const a = Math.PI * (0.15 + k * 0.13), x = Math.round(cx + s * Math.cos(a) * R), y = Math.round(cy - Math.sin(a) * R * 0.8 + 1);
      l.r(x - (s < 0 ? 1 : 0), y, 2, 2, k % 2 ? r[1] : r[0]);
      if (k % 3 === 1) l.p(x, y, '#fff2ea');
    }
    const a = Math.PI * 1.25, tx = Math.round(cx + s * Math.cos(a) * R), ty = Math.round(cy - Math.sin(a) * R * 0.8 + 1);
    l.p(tx, ty + 1, '#e2402a'); l.p(tx - s, ty + 2, '#e2402a'); l.p(tx + s, ty + 2, '#c8321f');
  });
}

/** 꼬리를 세운 새우튀김(텐동·새우탕수육). */
export function shrimpTempura(o: Layer, x: number, y: number, len = 8, batter = '#f2c060'): void {
  const r = ramp(batter);
  part(o, '#8a5a1a', l => {
    for (let i = 0; i < len; i++) { const X = x + Math.round(i * 0.45), Y = y - i; l.r(X, Y, 3, 1, h2(X, Y, 3) > 0.6 ? r[0] : i % 2 ? r[1] : r[2]); }
    const tx = x + Math.round(len * 0.45), ty = y - len; l.p(tx, ty, '#e2402a'); l.p(tx + 1, ty - 1, '#ff6a3a'); l.p(tx + 2, ty, '#c8321f');
  });
}

/** 오징어 고리(속이 빈 흰 고리, 외곽선 없음). */
export function squidRing(o: Layer, cx: number, cy: number): void {
  part(o, null, l => l.e(cx, cy, 2, 2, (x, y, u, v) => (Math.abs(u) < 0.45 && Math.abs(v) < 0.45 ? null : v > 0.4 ? '#e6c8b2' : '#fff6ee')));
}

/** 칼집 낸 오징어 조각(격자 무늬). sauce가 있으면 양념이 묻은 색. */
export function squidPiece(o: Layer, x: number, y: number, w = 6, h = 3, sauce?: string): void {
  const base = sauce ? mix('#fff4ec', sauce, 0.45) : '#fff4ec', line2 = sauce ? mix('#d9b8a2', sauce, 0.6) : '#e2c2ac';
  part(o, sauce ? mix(sauce, '#000000', 0.45) : '#b8907a', l => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) l.p(x + i, y + j, (i + j) % 3 === 0 ? line2 : j === 0 ? mix(base, '#ffffff', 0.3) : base); });
}

/** 빨판이 보이는 말린 다리(낙지·주꾸미). */
export function tentacle(o: Layer, x: number, y: number, c: string, dir: 1 | -1, len = 7): void {
  const r = ramp(c);
  part(o, r[3], l => {
    let a = -0.4, px = x, py = y;
    for (let i = 0; i < len; i++) {
      a += 0.55; px += dir * Math.cos(a) * 1.2; py += Math.sin(a) * 0.9;
      const w = i < len - 3 ? 2 : 1, X = Math.round(px), Y = Math.round(py);
      l.r(X, Y, w, w, i % 2 ? r[1] : r[0]);
      if (i % 2 === 0 && w > 1) l.p(X, Y + 1, '#f8d2c0');
    }
  });
}

/** 통 주꾸미: 둥근 머리 + 짧은 다리. */
export function babyOcto(o: Layer, cx: number, cy: number, c: string, seed: number): void {
  const r = ramp(c);
  part(o, r[3], l => {
    l.e(cx, cy - 1, 2, 2, shade(r, seed)); l.p(cx - 1, cy - 2, mix(r[0], '#ffffff', 0.5));
    for (let i = -2; i <= 2; i++) { l.p(cx + i, cy + 2, r[1]); l.p(cx + i + (i < 0 ? -1 : i > 0 ? 1 : 0), cy + 3, i % 2 ? r[2] : '#f8d2c0'); }
  });
}

/** 게 한 마리: 등딱지 + 다리 + 집게. roe면 등딱지 안 주황 알. */
export function crab(o: Layer, cx: number, cy: number, shell: string, roe: boolean, seed: number): void {
  const r = ramp(shell);
  part(o, r[3], l => {
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) line(l, cx + s * 4, cy + k - 1, cx + s * (8 + (k === 1 ? 1 : 0)), cy + k * 2 - 1, r[2]);
    for (const s of [-1, 1]) { line(l, cx + s * 3, cy - 2, cx + s * 6, cy - 5, r[1]); l.e(cx + s * 7, cy - 5, 1, 1, r[0]); }
    l.e(cx, cy, 5, 3, shade(r, seed));
    if (roe) l.e(cx, cy, 3, 2, (x, y, u, v) => (u < -0.3 && v < 0 ? '#ffd27a' : h2(x, y, seed + 1) > 0.5 ? '#f6a23a' : '#f08a2a'));
  });
}

export function oyster(o: Layer, cx: number, cy: number): void {
  part(o, '#6a665e', l => l.e(cx, cy, 2, 1, (x, y, u, v) => (Math.sqrt(u * u + v * v) > 0.75 ? '#9a958c' : u < 0 ? '#f6f3ec' : '#dcd7cb')));
}

/** 벌어진 조개(위 껍데기 줄무늬 + 아래 살). */
export function clam(o: Layer, cx: number, cy: number, seed = 1): void {
  part(o, '#4a3a2c', l => l.e(cx, cy, 2, 2, (x, y, u, v) => (v < -0.1 ? ((x + seed) % 2 ? '#dcc6a0' : '#8a6a4a') : u < 0 ? '#fff4e0' : '#f2d6a6')));
}

export function abalone(o: Layer, cx: number, cy: number): void {
  part(o, '#3a4a44', l => { l.e(cx, cy, 4, 2, (x, y, u, v) => (Math.sqrt(u * u + v * v) > 0.72 ? (x % 2 ? '#7ac0b4' : '#c79ac0') : u < -0.2 ? '#b8b49a' : '#8f8a6c')); for (let i = -2; i <= 2; i += 2) l.p(cx + i, cy, '#6a664e'); });
}

/** 생선 토막(단면에 동그란 뼈가 보이는 매운탕·동태 표지). */
export function fishSteak(o: Layer, cx: number, cy: number, skin = '#6a7480', sauce?: string): void {
  const flesh = sauce ? mix('#fff6ee', sauce, 0.25) : '#fff6ee';
  part(o, '#3a3a44', l => { l.e(cx, cy, 3, 2, (x, y, u, v) => (v < -0.5 ? skin : u < -0.2 && v < 0.2 ? '#ffffff' : flesh)); l.p(cx, cy, '#d9c8b8'); l.p(cx + 1, cy, '#c8b4a2'); });
}

/** 알 덩이(알탕·알밥): 오톨도톨한 주황 알. */
export function roe(o: Layer, cx: number, cy: number, rx: number, ry: number, seed: number): void {
  part(o, '#a8420a', l => l.e(cx, cy, rx, ry, (x, y, u, v) => ((x + y) % 2 === 0 ? (u < -0.2 && v < 0 ? '#ffd08a' : '#ff9a3c') : h2(x, y, seed) > 0.5 ? '#f27a1e' : '#ff8a2a')));
}

/* ---------- 두부·김치·부대 재료 ---------- */

/** 3/4 시점 두부 정육면체(윗면 밝음, 오른쪽 옆면 어두움). */
export function tofuCube(o: Layer, x: number, y: number, s = 3, top = '#ffffff', front = '#f3eee2', side = '#d8d0bc'): void {
  part(o, '#a8a08a', l => { l.r(x, y, s, 1, top); l.r(x, y + 1, s, s - 1, front); l.r(x + s, y + 1, 1, s - 1, side); l.p(x + s, y, mix(top, side, 0.5)); });
}

/** 몽글한 순두부 덩이. */
export function softTofu(o: Layer, cx: number, cy: number, seed: number): void {
  part(o, '#c9c0aa', l => l.e(cx, cy, 4, 2, (x, y, u, v) => (Math.sqrt(u * u + v * v) > 0.8 && h2(x, y, seed) > 0.55 ? null : u < -0.2 && v < 0 ? '#ffffff' : '#f6f2e8')));
}

/** 큼직한 배추김치 조각(흰 줄기에 빨간 양념 + 잎). */
export function kimchiChunk(o: Layer, x: number, y: number, w = 6, seed = 1): void {
  part(o, '#7a1a10', l => {
    for (let j = 0; j < 4; j++) for (let i = 0; i < w; i++) {
      const stem = i < w / 2 && j > 0;
      l.p(x + i, y + j, j === 0 ? (i % 2 ? '#e2553a' : '#f0704f') : stem ? (h2(x + i, y + j, seed) > 0.55 ? '#e86a4a' : '#fbe6d6') : h2(x + i, y + j, seed + 1) > 0.5 ? '#c8382a' : '#d8452c');
    }
  });
}

export function spam(o: Layer, x: number, y: number, w = 5): void {
  part(o, '#8a3a32', l => { l.r(x, y, w, 1, '#ffc8c0'); l.r(x, y + 1, w, 2, '#f2a39a'); l.r(x + w, y + 1, 1, 2, '#c9766c'); l.p(x + 1, y + 1, '#ffd8d2'); });
}

export function sausageSlice(o: Layer, cx: number, cy: number): void {
  part(o, '#7a3428', l => { l.e(cx, cy, 1, 1, '#c8665a'); l.p(cx, cy, '#f2b0a0'); l.p(cx - 1, cy - 1, '#e8998a'); });
}

export function ramenBlock(o: Layer, x: number, y: number, w = 6, h = 4): void {
  part(o, '#9a6a14', l => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) l.p(x + i, y + j, (i + (j % 2 ? 1 : 0)) % 2 ? '#e2b24a' : '#f6d27a'); });
}

export function cheeseSlice(o: Layer, x: number, y: number, w = 5): void {
  part(o, '#b88a10', l => { l.r(x, y, w, 3, '#ffd84a'); l.r(x, y, w, 1, '#fff09a'); l.r(x + w - 2, y + 3, 2, 2, '#ffd84a'); l.p(x + w - 1, y + 5, '#f2bc22'); });
}

export function potato(o: Layer, cx: number, cy: number, seed: number, c = '#e8c27a'): void {
  part(o, '#8a6428', l => { l.e(cx, cy, 3, 2, shade(ramp(c), seed)); l.p(cx + 1, cy, '#b8924a'); l.p(cx - 2, cy + 1, '#b8924a'); });
}

/** 동그란 떡국 떡(타원 단면). */
export function riceCakeOval(o: Layer, cx: number, cy: number): void {
  part(o, '#b8ab8a', l => l.e(cx, cy, 2, 1, (x, y, u) => (u < -0.2 ? '#ffffff' : '#f3efe4')));
}

/** 주름 잡힌 만두(반달). fried면 바닥이 노릇. */
export function dumpling(o: Layer, cx: number, cy: number, skin: string, seed: number, fried = false, filling?: string): void {
  const r = ramp(skin);
  part(o, r[3], l => {
    l.e(cx, cy, 4, 2, (x, y, u, v) => (fried && v > 0.3 ? '#c8862a' : filling && v > -0.2 && v < 0.4 && h2(x, y, seed) > 0.6 ? mix(skin, filling, 0.45) : lit(r, u, v, h2(x, y, seed))));
    for (let i = -3; i <= 3; i += 2) l.p(cx + i, cy - 3, r[0]);
    for (let i = -2; i <= 2; i += 2) l.p(cx + i, cy - 3, r[1]);
  });
}

/** 동그랗게 주름을 모은 찐만두(위에 꼭지). */
export function bao(o: Layer, cx: number, cy: number, skin: string, seed: number): void {
  const r = ramp(skin);
  part(o, r[3], l => { l.e(cx, cy, 3, 3, shade(r, seed)); for (const [dx, dy] of [[-1, -2], [1, -2], [0, -3], [-2, -1], [2, -1]] as const) l.p(cx + dx, cy + dy, r[2]); l.p(cx, cy - 4, r[1]); });
}

/* ---------- 튀김·고기 조각 ---------- */

/** 썬 돈가스 판: 빵가루 무늬 + 칸마다 드러난 하얀 단면. */
export function cutletSliced(o: Layer, x: number, y: number, w: number, crust: string, cut: string, seed: number, n = 5, h = 5): void {
  const r = ramp(crust);
  part(o, mix(crust, '#000000', 0.5), l => {
    const step = Math.max(3, Math.round(w / n));
    for (let i = 0; i < n; i++) for (let j = 0; j < h; j++) for (let k = 0; k < step - 1; k++) {
      const X = x + i * step + k + Math.round(j * -0.3), Y = y + j - (i % 2);
      l.p(X, Y, k === 0 ? cut : j === 0 ? r[0] : h2(X, Y, seed) > 0.7 ? r[0] : h2(X, Y, seed + 1) > 0.75 ? r[2] : r[1]);
    }
  });
}

/** 바삭한 튀김 덩이(탕수육·깐풍기·닭강정): 울퉁불퉁 + 밝은 바삭 점. */
export function nugget(o: Layer, cx: number, cy: number, c: string, seed: number, rx = 3, ry = 2, out?: string, gloss = false): void {
  const r = ramp(c);
  part(o, out ?? r[3], l => {
    l.e(cx, cy, rx, ry, (x, y, u, v) => (Math.sqrt(u * u + v * v) > 0.85 && h2(x, y, seed) > 0.6 ? null : lit(r, u, v, h2(x, y, seed))));
    if (gloss) { l.p(cx - 1, cy - 1, '#ffffff'); l.p(cx, cy - 1, mix(r[0], '#ffffff', 0.5)); }
  });
}

/** 마른 고추(라조기·깐풍기·마라). */
export function driedChili(o: Layer, x: number, y: number, flip = false): void {
  part(o, '#5a0e0a', l => { const s = flip ? -1 : 1; l.r(x, y, 3, 1, '#c8201a'); l.p(x + s * 3, y + 1, '#a8160f'); l.p(x, y, '#ff5a3a'); l.p(x - s, y - 1, '#4f8a2a'); });
}

export function lotusRoot(o: Layer, cx: number, cy: number): void {
  part(o, '#8a6a4a', l => l.e(cx, cy, 3, 2, (x, y, u, v) => ((x === cx || x === cx - 2 || x === cx + 2) && y === cy ? '#9a7a5a' : u < -0.2 && v < 0 ? '#fbf1dc' : '#ecd9b8')));
}

export function enoki(o: Layer, x: number, y: number, n = 4): void {
  part(o, '#a89a7a', l => { for (let i = 0; i < n; i++) { line(l, x + i, y, x + i + (i % 2), y - 5, '#fbf8ee'); l.p(x + i + (i % 2), y - 6, '#efe0b8'); } });
}

export function shiitake(o: Layer, cx: number, cy: number): void {
  part(o, '#3a2414', l => { l.e(cx, cy, 3, 2, (x, y, u, v) => (Math.abs(x - cx) === Math.abs(y - cy) * 2 && v < 0.4 ? '#f2e2c8' : u < -0.3 && v < 0 ? '#a8744a' : '#7a4a2a')); });
}

/** 판 위 줄무늬 삼겹살: 지방(흰)과 살(분홍) 층 + 노릇한 끝. */
export function bellyStrip(o: Layer, x: number, y: number, w: number, seed: number, glaze?: string): void {
  part(o, glaze ? mix(glaze, '#000000', 0.5) : '#8a4a32', l => {
    const rows = glaze ? [mix('#fff2ea', glaze, 0.6), glaze, mix('#ffe8dc', glaze, 0.5), mix(glaze, '#000000', 0.2)] : ['#fff2ea', '#f2a088', '#ffe8dc', '#d9785a'];
    for (let j = 0; j < 4; j++) for (let i = 0; i < w; i++) l.p(x + i, y + j, i === 0 || i === w - 1 ? '#c8864a' : (h2(x + i, y + j, seed) > 0.85 ? '#e8a46a' : rows[j]!));
  });
}

/** 동그랗게 말린 곱창·막창 고리. */
export function tubeRing(o: Layer, cx: number, cy: number, c: string, seed: number): void {
  const r = ramp(c);
  part(o, r[3], l => l.e(cx, cy, 2, 2, (x, y, u, v) => (Math.abs(u) < 0.4 && Math.abs(v) < 0.4 ? '#fff2dc' : lit(r, u, v, h2(x, y, seed)))));
}

/** 석쇠 자국 스테이크 덩이. */
export function steakSlab(o: Layer, cx: number, cy: number, rx: number, ry: number, meat: string, seed: number, marks = true): void {
  const r = ramp(meat);
  part(o, r[3], l => l.e(cx, cy, rx, ry, (x, y, u, v) => (marks && (x + y * 2) % 5 === 0 && v < 0.6 ? '#2a140c' : lit(r, u, v, h2(x, y, seed)))));
}

/** 꼬치 한 줄(고기·파 번갈아 + 나무 꼬챙이). */
export function skewer(o: Layer, x: number, y: number, meat: string, seed: number, n = 3, leek = true): void {
  const r = ramp(meat);
  part(o, '#8a6a3a', l => line(l, x - 3, y + 3, x + n * 5 + 2, y - 2, '#e8d4a8'));
  for (let i = 0; i < n; i++) {
    const cx = x + i * 5, cy = y + 1 - Math.round(i * 1);
    part(o, r[3], l => { l.e(cx, cy, 2, 2, shade(r, seed + i)); l.p(cx - 1, cy - 1, mix(r[0], '#ffffff', 0.5)); });
    if (leek && i < n - 1) part(o, '#3a6a2a', l => { l.r(cx + 3, cy - 1, 1, 2, '#f4f8e8'); l.p(cx + 3, cy + 1, '#7cc35a'); });
  }
}

/** 갈비 한 대(뼈가 옆으로 삐죽). */
export function ribRack(o: Layer, x: number, y: number, n: number, meat: string, seed: number): void {
  const r = ramp(meat);
  part(o, r[3], l => { for (let i = 0; i < n; i++) l.e(x + i * 4, y, 2, 3, shade(r, seed + i)); });
  part(o, '#8a6a46', l => { for (let i = 0; i < n; i++) { l.r(x + i * 4, y - 5, 2, 2, '#fbf3e2'); l.p(x + i * 4 + 1, y - 4, '#dccca8'); } });
}

/** 족발: 반짝이는 갈색 껍질 덩이 + 끝 뼈. */
export function hock(o: Layer, cx: number, cy: number, seed: number): void {
  part(o, '#3a1a0c', l => { l.e(cx, cy, 6, 3, (x, y, u, v) => (u < -0.3 && v < -0.2 && h2(x, y, seed) > 0.4 ? '#d9965a' : lit(['#b86a3a', '#8a4a24', '#6a3418', '#4a220e'], u, v, h2(x, y, seed)))); l.e(cx + 6, cy - 1, 2, 2, '#7a3e1c'); });
  part(o, '#8a6a46', l => { l.e(cx + 8, cy - 2, 1, 1, '#fbf3e2'); l.p(cx + 9, cy - 1, '#dccca8'); });
}

/** 비스듬히 겹쳐 놓은 고기 편(보쌈·수육·훈제오리): edge=껍질/지방 띠. */
export function slicesFan(o: Layer, x: number, y: number, n: number, meat: string, edge: string, seed: number, step = 4): void {
  const m = ramp(meat);
  for (let i = 0; i < n; i++) part(o, mix(meat, '#000000', 0.5), l => { const X = x + i * step, Y = y + (i % 2); l.r(X, Y, 3, 1, edge); l.r(X, Y + 1, 3, 3, m[1]); l.p(X, Y + 1, m[0]); l.p(X + 2, Y + 3, m[2]); l.r(X + 3, Y + 1, 1, 3, m[2]); });
}

/* ---------- 빵·밥 ---------- */

/** 소복한 흰 밥(낱알 무늬). */
export function riceDome(o: Layer, cx: number, cy: number, rx: number, ry: number, seed: number, tint = '#f4f1e8', out = '#a8a088'): void {
  const r: Ramp = ['#ffffff', tint, mix(tint, '#8a8270', 0.25), mix(tint, '#6d6555', 0.45)];
  part(o, out, l => l.e(cx, cy, rx, ry, (x, y, u, v) => ((x * 3 + y * 5) % 7 === 0 ? '#ffffff' : lit(r, u, v, h2(x, y, seed)))));
}

export function onigiri(o: Layer, cx: number, cy: number, seed: number, mix2?: string): void {
  part(o, '#8a8270', l => {
    for (let j = 0; j < 7; j++) { const hw = Math.round(j * 0.7) + 1; for (let x = -hw; x <= hw; x++) l.p(cx + x, cy - 6 + j, mix2 && h2(cx + x, j, seed) > 0.75 ? mix2 : x < 0 && j < 4 ? '#ffffff' : '#f3efe4'); }
    l.r(cx - 2, cy - 1, 5, 2, '#1f2a22'); l.p(cx - 2, cy - 1, '#3e5244');
  });
}

export function inari(o: Layer, cx: number, cy: number, seed: number): void {
  part(o, '#6a3e10', l => { l.e(cx, cy, 3, 2, shade(['#f2c06a', '#d99a3a', '#b8782a', '#8a5418'], seed)); l.r(cx - 2, cy - 2, 5, 1, '#f6f2e6'); l.p(cx - 1, cy - 2, '#ffffff'); l.p(cx + 1, cy - 2, '#e8e2d2'); });
}

/** 세로로 높이 쌓은 햄버거(참깨 번·치즈 늘어짐·상추 물결). */
export function burgerTall(o: Layer, cx: number, by: number, layers: string[], seed: number, sesame = true): void {
  const bun = ramp('#e0a04a');
  part(o, '#6a3e14', l => {
    let y = by;
    l.e(cx, y, 7, 1, (x, yy, u) => (u < -0.3 ? bun[1] : bun[2])); y -= 2;
    for (const c of layers) {
      for (let x = -8; x <= 8; x++) { const wav = c === '#7cc35f' && x % 2 ? 1 : 0; l.p(cx + x, y + wav, h2(x, y, seed) > 0.85 ? mix(c, '#ffffff', 0.3) : c); if (c === '#ffd84a' && (x === 3 || x === -4)) l.p(cx + x, y + 1, c); }
      y -= c === '#5a2e18' || c === '#6a3a22' ? 2 : 1; if (c === '#5a2e18' || c === '#6a3a22') for (let x = -7; x <= 7; x++) l.p(cx + x, y + 1, c);
    }
    l.e(cx, y - 2, 7, 4, (x, yy, u, v) => (v > 0.5 ? null : lit(bun, u, v, h2(x, yy, seed))));
    if (sesame) for (const [dx, dy] of [[-3, -4], [0, -5], [3, -4], [-1, -3], [2, -2]] as const) l.p(cx + dx, y - 2 + dy + 2, '#fff3c9');
  });
}

/** 단면이 보이는 세모 샌드위치(앞면에 층). */
export function sandwichWedge(o: Layer, x: number, y: number, layers: string[], bread = '#f2dcae', w = 9): void {
  const b = ramp(bread);
  part(o, mix(bread, '#000000', 0.5), l => {
    const h = layers.length * 2 + 2;
    for (let j = 0; j < h; j++) {
      const hw = Math.round((w * (j + 1)) / h);
      for (let i = 0; i < hw; i++) {
        const edge = i === 0 || i === hw - 1 || j === h - 1, k = Math.floor((j - 1) / 2);
        l.p(x + i - Math.round(hw / 2), y + j, edge ? b[2] : j === 0 ? b[1] : j < h - 1 ? layers[Math.min(layers.length - 1, k)]! : b[2]);
      }
    }
  });
}

/** 비스듬한 피자 한 조각(끝이 아래로) + 치즈. */
export function pizzaSlice(o: Layer, x: number, y: number, sauce: string, cheese: string, seed: number): void {
  part(o, '#7a4a1a', l => {
    for (let j = 0; j < 9; j++) { const hw = Math.round((9 - j) * 0.7); for (let i = -hw; i <= hw; i++) l.p(x + i + Math.round(j * 0.3), y + j, j < 2 ? (j === 0 ? '#f2c27a' : '#d9963a') : h2(x + i, y + j, seed) > 0.75 ? sauce : cheese); }
  });
}

/** 단면이 보이는 부리또 반쪽(속 고리 무늬). */
export function burritoHalf(o: Layer, cx: number, cy: number, fills: string[], seed: number): void {
  const t = ramp('#f2dcae');
  part(o, '#8a6a3a', l => {
    l.e(cx - 3, cy, 6, 3, (x, y, u, v) => lit(t, u, v, h2(x, y, seed)));
    l.e(cx + 3, cy, 3, 3, (x, y, u, v) => (Math.sqrt(u * u + v * v) > 0.82 ? t[1] : fills[Math.floor(h2(x, y, seed + 2) * fills.length)]!));
  });
}

/** U자 타코 껍질 + 위로 넘치는 속. */
export function taco(o: Layer, cx: number, cy: number, seed: number): void {
  part(o, '#7a4e14', l => {
    l.e(cx, cy - 2, 4, 2, (x, y) => ['#7cc35f', '#e8402e', '#8a5a3a', '#ffd84a', '#ffffff'][Math.floor(h2(x, y, seed) * 5)]!);
    l.e(cx, cy, 5, 3, (x, y, u, v) => (v < -0.3 ? null : lit(['#ffe49a', '#f2c66a', '#d9a03a', '#b07a22'], u, v, h2(x, y, seed + 1))));
  });
}

/** 칼집 난 바게트(반미) + 옆으로 삐져나온 채소. */
export function baguette(o: Layer, x: number, y: number, len: number, fills: string[], seed: number): void {
  const b = ramp('#e2a24a');
  part(o, '#7a4a14', l => {
    for (let i = 0; i < len; i++) for (let j = 0; j < 4; j++) { const X = x + i, Y = y + j - Math.round(i * 0.25); l.p(X, Y, j === 2 ? fills[i % fills.length]! : i % 4 === 1 && j === 0 ? '#fbe6b8' : lit(b, i / len * 2 - 1, j / 2 - 1, h2(X, Y, seed))); }
  });
}

/** 피타 주머니 케밥: 고기 결 + 상추가 위로. */
export function pita(o: Layer, cx: number, cy: number, seed: number): void {
  part(o, '#7a5a2a', l => {
    l.e(cx, cy - 3, 4, 2, (x, y) => (y < cy - 3 ? (h2(x, y, seed) > 0.5 ? '#7cc35f' : '#e8402e') : (x + y) % 2 ? '#a35a3c' : '#c87a4a'));
    l.e(cx, cy + 1, 5, 3, (x, y, u, v) => (v < -0.4 ? null : lit(['#fbe6b8', '#f0d9a8', '#d8b884', '#b8945e'], u, v, h2(x, y, seed))));
  });
}

/** 장어 구이 한 토막(윤기 + 석쇠 줄). */
export function eel(o: Layer, x: number, y: number, w = 8): void {
  part(o, '#2a140a', l => { for (let i = 0; i < w; i++) for (let j = 0; j < 3; j++) l.p(x + i, y + j, i % 3 === 0 ? '#3a1e10' : j === 0 ? '#c88a4a' : '#8a4a22'); l.p(x + 1, y, '#f2c88a'); });
}

/** 게맛살 조각(빨간 띠 + 흰 살). */
export function crabStick(o: Layer, x: number, y: number): void {
  part(o, '#8a2a1a', l => { l.r(x, y, 3, 1, '#e8402e'); l.r(x, y + 1, 3, 1, '#fff6ee'); l.p(x, y, '#ff7a5a'); });
}

export function chestnut(o: Layer, cx: number, cy: number): void { part(o, '#5a3410', l => { l.e(cx, cy, 1, 1, '#f6d88a'); l.p(cx + 1, cy - 1, '#8a5a2a'); }); }
export function jujube(o: Layer, cx: number, cy: number): void { part(o, '#4a0e0a', l => { l.e(cx, cy, 1, 1, '#a3302a'); l.p(cx - 1, cy - 1, '#d85a4a'); }); }
export function riceBall(o: Layer, cx: number, cy: number): void { part(o, '#b8ae98', l => { l.e(cx, cy, 1, 1, '#f8f6ee'); l.p(cx - 1, cy - 1, '#ffffff'); }); }

/** 소스·마요 지그재그(돈가스·감자피자·핫도그). */
export function zigzag(o: Layer, x0: number, x1: number, y: number, c: string): void {
  part(o, null, l => { for (let x = x0; x <= x1; x++) l.p(x, y + ((x - x0) % 4 < 2 ? 0 : 1), c); });
}

/** 돌솥 가장자리 누룽지·지글 효과. */
export function sizzle(o: Layer, cx: number, cy: number, rx: number): void {
  part(o, null, l => { for (let x = -rx; x <= rx; x += 2) l.p(cx + x, cy + (Math.abs(x) > rx - 3 ? 0 : 1), '#c8863a'); });
}
