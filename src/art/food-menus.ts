/*
 * 오늘의 점심 나머지 메뉴 그림(D082 초안 → D084 특징 강조 개편). 기준 5종(food.ts)은 손그림 그대로 둔다.
 * D084 사용자 피드백: ‘전체적으로 너무 비슷하다. 똑같이 사실적으로보다 음식마다 특징이 살게.’
 * 그래서 메뉴마다 알아보는 표지 하나를 주인공으로 크게·과장해서 그린다(food-heroes.ts):
 * 갈비탕의 솟은 뼈, 삼계탕의 통닭과 인삼, 라멘의 차슈·반숙·세운 김, 짬뽕의 홍합, 비빔밥의 방사형 나물과 달걀,
 * 돈가스의 하얀 단면, 핫도그의 꼬챙이, 게장의 등딱지, 팥죽의 새알처럼. 그릇·국물은 배경으로 물러난다.
 */
import { Layer, h2, type FoodGrid } from './food-kit.ts';
import { BITS, board, bowl, box, finish, hotpot, lit, mix, paperTray, plate, ramp, scatter, skillet, soup, steamer, type Area, type Ramp } from './food-parts.ts';
import {
  abalone, babyOcto, bao, baguette, bellyStrip, bone, burgerTall, burritoHalf, cabbage, cheeseSlice, chestnut, chopsticks, clam, crab, crabStick,
  cucumberRound, cutletSliced, driedChili, drumstick, dumpling, eel, eggHalf, enoki, fishSteak, friedEgg, ginseng, herbSprig, hock, inari, jujube,
  kimchiChunk, leaves, limeWedge, line, longOnion, lotusRoot, mussel, noodleLift, noodleNest, noriSheet, noriShreds, nugget, onigiri, onionHeap,
  oyster, part, perilla, pita, pizzaSlice, potato, ramenBlock, ribRack, riceBall, riceCakeOval, riceDome, roe, sandwichWedge, sauceMound,
  sausageSlice, shiitake, shrimp, shrimpTempura, sizzle, skewer, slicesFan, softTofu, spam, spine, sprouts, squidPiece, squidRing, steakSlab,
  taco, tentacle, tofuCube, tomatoHalf, tubeRing, wholeChicken, wing, yolk, zigzag,
} from './food-heroes.ts';

Object.assign(BITS, {
  pine: (o: Layer, x: number, y: number) => { o.p(x, y, '#f6e8c8'); o.p(x + 1, y, '#e8d4a8'); },
  ginkgo: (o: Layer, x: number, y: number) => { o.p(x, y, '#c9d94a'); o.p(x + 1, y, '#a8ba2a'); },
  pepperdot: (o: Layer, x: number, y: number) => o.p(x, y, '#3a3230'),
  peanut: (o: Layer, x: number, y: number) => { o.p(x, y, '#e8c08a'); o.p(x + 1, y, '#c8945a'); },
  pea: (o: Layer, x: number, y: number) => o.p(x, y, '#6cc04f'),
  raisin: (o: Layer, x: number, y: number) => { o.p(x, y, '#5a2a3a'); o.p(x + 1, y, '#7a3a4a'); },
  blacksesame: (o: Layer, x: number, y: number) => o.p(x, y, '#2a2420'),
  chiliflake: (o: Layer, x: number, y: number) => o.p(x, y, '#c8201a'),
  garlic: (o: Layer, x: number, y: number) => { o.p(x, y, '#fbf6e2'); o.p(x + 1, y, '#efe2b8'); },
});

const seedOf = (id: string) => { let s = 7; for (const c of id) s = (Math.imul(s, 31) + c.charCodeAt(0)) | 0; return Math.abs(s) % 9973; };
type Fx = 'steam' | 'cold' | 'none';
const BOWL_OUT: Record<string, string> = { steel: '#58626f', white: '#7d7466', china: '#5a6680', red: '#7c4a3c', earthen: '#1e120c', stone: '#141214', wood: '#4a2e14', celadon: '#4b6656', lacquer: '#33100c', paper: '#7a6648', clear: '#4f7486', brass: '#5a4210' };
const PLATE_OUT: Record<string, string> = { white: '#7d7466', cream: '#7c6748', blue: '#4d6585', slate: '#141215', green: '#4f6d48' };

/** 그릇(놋그릇은 흰 그릇 모양을 금빛 재질 램프로 다시 칠한다). 반환값은 음식 면. */
function vessel(o: Layer, v: string, w = 0, dx = 0): Area {
  const a = bowl(o, v === 'brass' ? 'white' : v, w, dx);
  if (v === 'brass') {
    const map: Record<string, string> = { '#ffffff': '#fff0b0', '#f1eee8': '#e8c560', '#d9d3c8': '#c79d3b', '#b8b0a2': '#8a6519', '#f6f3ee': '#f2d27a', '#ddd6cb': '#c9a24a' };
    o.d.forEach((c, i) => { if (c && map[c]) o.d[i] = map[c]!; });
  }
  return a;
}
/** 한 메뉴 그림: draw가 그릇·음식을 그리고 전체 외곽선 색을 돌려준다. */
function dish(id: string, fx: Fx, draw: (o: Layer, s: number) => string, shadowW = 14): FoodGrid {
  const o = new Layer(), s = seedOf(id), out = draw(o, s);
  return finish(o, out, fx, s, shadowW);
}
const inBowl = (o: Layer, v: string, broth: string, s: number, w = 0, dx = 0): Area => { const a = vessel(o, v, w, dx); soup(o, a, broth, s); return a; };

/* ---- 이 파일 안에서만 쓰는 작은 표지 ---- */

/** 채 썬 채소 다발(오이·당근·배). */
function julienne(o: Layer, cx: number, cy: number, n: number, c: string, seed: number, len = 4): void {
  const r = ramp(c);
  part(o, r[3], l => { for (let i = 0; i < n; i++) { const x = cx - n + i * 2, y = cy + (i % 2); line(l, x, y, x + len - 1, y - 1 - (h2(i, seed) > 0.5 ? 1 : 0), i % 2 ? r[1] : r[0]); } });
}
function iceCube(o: Layer, x: number, y: number): void { part(o, '#7aa8c0', l => { l.r(x, y, 3, 3, '#e8f6fd'); l.r(x, y, 3, 1, '#ffffff'); l.p(x + 2, y + 2, '#b9dcef'); l.p(x, y + 1, '#ffffff'); }); }
/** 잎이 달린 긴 채소 줄기(열무). */
function greenStalk(o: Layer, x0: number, y0: number, x1: number, y1: number): void {
  part(o, '#2a5a1e', l => { line(l, x0, y0, x1, y1, (x, y, t) => (t < 0.35 ? '#e9f6d6' : '#7cc35a'), 1); l.e(x1, y1, 2, 1, (x, y, u) => (u < 0 ? '#8fd06a' : '#4f9a3a')); });
}
/** 크게 그린 김밥·롤 단면: 겉(김/알), 밥 고리, 가운데 주인공 속, 주변 속. */
function bigRoll(o: Layer, cx: number, cy: number, outer: string, rice: string, center: string, around: string[], turn: number, rx = 4, ry = 3, dotted = false): void {
  part(o, mix(outer, '#000000', 0.5), l => {
    l.e(cx, cy + 2, rx, 2, mix(outer, '#000000', 0.3));
    l.e(cx, cy, rx, ry, (x, y, u, v) => {
      const r = Math.sqrt(u * u + v * v);
      if (r > 0.8) return dotted && (x + y) % 2 ? mix(outer, '#ffffff', 0.35) : u < -0.2 && v < -0.2 ? mix(outer, '#ffffff', 0.2) : outer;
      if (r > 0.5) return h2(x, y, cx) > 0.75 ? mix(rice, '#000000', 0.08) : rice;
      if (r < 0.28) return center;
      return around[(Math.floor((Math.atan2(v, u) + Math.PI) * 1.3) + turn) % around.length]!;
    });
  });
}
/** 석쇠 판(구이용): 둥근 검은 판 + 줄. */
function grill(o: Layer): Area {
  o.e(16, 21, 14, 6, (x, y, u, v) => (v > 0.55 ? '#18141a' : u < -0.4 && v < -0.2 ? '#5a5560' : '#2e2a32'));
  for (let y = 17; y <= 25; y += 2) for (let x = 4; x <= 28; x++) if (o.at(x, y) && h2(x, y, 4) > 0.2) o.p(x, y, '#46424c');
  return { cx: 16, cy: 20, rx: 11, ry: 4 };
}
/** 종이컵(닭강정). */
function paperCup(o: Layer): Area {
  for (let y = 14; y <= 26; y++) { const hw = 9 - Math.round((y - 14) * 0.25); for (let x = -hw; x <= hw; x++) o.p(16 + x, y, x < -hw + 2 ? '#ffe9c8' : (x + y) % 6 < 3 ? '#e8402e' : '#fff6e6'); }
  o.e(16, 14, 9, 2, '#d9c8a8');
  return { cx: 16, cy: 13, rx: 8, ry: 3 };
}
/** 나물·고명을 방사형으로 돌려 담기(비빔밥·알밥). */
function radial(o: Layer, a: Area, colors: string[], seed: number): void {
  part(o, null, l => l.e(a.cx, a.cy - 1, a.rx - 1, a.ry, (x, y, u, v) => {
    const k = Math.floor(((Math.atan2(v, u) + Math.PI) / (Math.PI * 2)) * colors.length) % colors.length, c = colors[k]!;
    return h2(x, y, seed) > 0.8 ? mix(c, '#ffffff', 0.3) : h2(x, y, seed + 1) > 0.85 ? mix(c, '#000000', 0.25) : c;
  }));
}
/** 작은 소스 종지. */
function dipDish(o: Layer, cx: number, cy: number, sauce: string): void {
  part(o, '#7d7466', l => { l.e(cx, cy, 3, 2, '#f3efe6'); l.e(cx, cy - 1, 2, 1, sauce); l.p(cx - 1, cy - 1, mix(sauce, '#ffffff', 0.4)); });
}
function fork(o: Layer, x: number, y: number): void {
  part(o, '#5a626e', l => { line(l, x, y, x + 4, y - 9, (xx, yy, t) => (t < 0.5 ? '#e6ebf0' : '#c3ccd6')); for (const d of [0, 2]) l.p(x + 4 + d - 1, y - 10, '#e6ebf0'); });
}
/** 닭발: 발바닥 + 세 발가락. */
function chickenFoot(o: Layer, cx: number, cy: number, c: string, seed: number): void {
  const r = ramp(c);
  part(o, r[3], l => { l.e(cx, cy, 2, 2, (x, y, u, v) => lit(r, u, v, h2(x, y, seed))); line(l, cx, cy - 1, cx - 3, cy - 4, r[1]); line(l, cx, cy - 1, cx, cy - 5, r[0]); line(l, cx, cy - 1, cx + 3, cy - 4, r[1]); line(l, cx, cy + 1, cx + 1, cy + 4, r[2]); });
}
/** 순대 한 조각(검보라 둥근 단면 + 흰 점). */
function sundaeSlice(o: Layer, cx: number, cy: number, sauce?: string): void {
  part(o, '#1e1018', l => l.e(cx, cy, 2, 2, (x, y, u, v) => (Math.sqrt(u * u + v * v) > 0.75 ? (sauce ?? '#3a2a33') : (x + y) % 3 === 0 ? '#ddcdd6' : '#6a4a58')));
}
/** 동그란 미트볼·완자. */
function ball(o: Layer, cx: number, cy: number, c: string, seed: number, r = 2): void { const rr = ramp(c); part(o, rr[3], l => { l.e(cx, cy, r, r, (x, y, u, v) => lit(rr, u, v, h2(x, y, seed))); l.p(cx - 1, cy - 1, mix(rr[0], '#ffffff', 0.5)); }); }
/** 늘어나는 치즈 줄. */
function cheesePull(o: Layer, x: number, y0: number, y1: number): void { part(o, '#c89a1a', l => { for (let k = 0; k < 3; k++) line(l, x + k * 2, y0, x + k * 2 + (k - 1), y1, k === 1 ? '#fff09a' : '#ffd84a'); }); }

/* ===================== 시원·상큼한 거 ===================== */
const COOL: Record<string, () => FoodGrid> = {
  // 빨간 양념 면이 산처럼 솟고 꼭대기에 달걀
  'bibim-naengmyeon': () => dish('bibim-naengmyeon', 'cold', (o, s) => { const a = inBowl(o, 'steel', '#8f7f6c', s, -1); noodleNest(o, a.cx, a.cy, a.rx - 1, a.ry, '#8f7f6c', s); sauceMound(o, 16, 15, 7, 7, '#d0361f', s); eggHalf(o, 16, 8); julienne(o, 9, 13, 2, '#7cc35f', s); julienne(o, 21, 12, 2, '#7cc35f', s + 1); return BOWL_OUT.steel!; }),
  // 붉은 양념 면 위에 큼직한 회 세 점
  'hoe-naengmyeon': () => dish('hoe-naengmyeon', 'cold', (o, s) => { const a = inBowl(o, 'steel', '#c4523a', s, 1, 1); noodleNest(o, a.cx, a.cy, a.rx - 2, a.ry - 1, '#7f6f5c', s); slicesFan(o, 9, 10, 3, '#f8dcd2', '#e8604a', s, 5); part(o, '#7a1a10', l => l.e(15, 15, 2, 1, '#d0361f')); return BOWL_OUT.steel!; }),
  // 열무 줄기가 그릇 밖으로 길게
  'yeolmu-naengmyeon': () => dish('yeolmu-naengmyeon', 'cold', (o, s) => { const a = inBowl(o, 'clear', '#f0a58c', s); noodleNest(o, a.cx, a.cy, 6, 2, '#8f7f6c', s); greenStalk(o, 10, 15, 6, 4); greenStalk(o, 14, 14, 13, 3); greenStalk(o, 20, 14, 25, 5); iceCube(o, 21, 14); return BOWL_OUT.clear!; }),
  // 검은 김 가루 산
  makguksu: () => dish('makguksu', 'cold', (o, s) => { const a = inBowl(o, 'white', '#cdb79a', s, -2); noodleNest(o, a.cx, a.cy, a.rx - 1, a.ry, '#7d6c5c', s); noriShreds(o, 16, 12, 6, s); eggHalf(o, 22, 15); scatter(o, a, 'sesame6', s); return BOWL_OUT.white!; }),
  // 넓은 쟁반에 채소를 칸칸이 두른 막국수
  'jaengban-makguksu': () => dish('jaengban-makguksu', 'none', (o, s) => { plate(o, 'blue', true); cabbage(o, 7, 19, 4, 2, s); julienne(o, 25, 20, 3, '#f39a3b', s); leaves(o, 16, 23, 5, 1, s); noodleNest(o, 16, 18, 5, 3, '#7d6c5c', s, false, '#4a3e32'); part(o, '#7a1a10', l => l.e(16, 16, 2, 1, '#d0361f')); eggHalf(o, 17, 13); return PLATE_OUT.blue!; }, 15),
  // 뽀얀 콩국 + 오이채 + 방울토마토
  kongguksu: () => dish('kongguksu', 'cold', (o, s) => { const a = inBowl(o, 'white', '#f7f0de', s, 1, 1); part(o, null, l => l.e(a.cx, a.cy, 6, 2, (x, y) => ((x + y * 2) % 4 === 0 ? '#e9dcc0' : null))); julienne(o, 17, 12, 4, '#6fbf4a', s, 5); tomatoHalf(o, 12, 12); return BOWL_OUT.white!; }),
  // 노란 쫄면 + 수북한 양배추·콩나물
  jjolmyeon: () => dish('jjolmyeon', 'none', (o, s) => { const a = inBowl(o, 'red', '#d9573b', s); noodleNest(o, a.cx + 3, a.cy, 7, 3, '#f0d79a', s, true, '#b8862a'); cabbage(o, 9, 12, 4, 3, s); sprouts(o, 21, 11, 3, 1, s); eggHalf(o, 16, 9); return BOWL_OUT.red!; }),
  // 하얀 소면 둥지 + 빨간 양념 + 김치
  'bibim-guksu': () => dish('bibim-guksu', 'none', (o, s) => { const a = inBowl(o, 'white', '#c2462f', s, -1, -1); noodleNest(o, a.cx, a.cy, a.rx - 2, a.ry, '#f6efe0', s, false, '#b8ab8a'); sauceMound(o, 14, 14, 4, 3, '#d0361f', s); kimchiChunk(o, 18, 11, 5, s); eggHalf(o, 11, 10); return BOWL_OUT.white!; }),
  // 얼음 둥둥 김칫국 + 소면
  'kimchi-mari-guksu': () => dish('kimchi-mari-guksu', 'cold', (o, s) => { const a = inBowl(o, 'steel', '#ef9a72', s, 2); noodleNest(o, a.cx, a.cy, 7, 2, '#f6efe0', s); kimchiChunk(o, 9, 11, 6, s); iceCube(o, 18, 11); iceCube(o, 22, 14); iceCube(o, 13, 16); return BOWL_OUT.steel!; }),
  // 소면 위로 열무가 그릇 가장자리에 걸쳐 늘어진다
  'yeolmu-guksu': () => dish('yeolmu-guksu', 'cold', (o, s) => { const a = inBowl(o, 'clear', '#f2c1a8', s, -2, 1); noodleNest(o, a.cx, a.cy, 7, 3, '#f6efe0', s); greenStalk(o, 17, 13, 27, 9); greenStalk(o, 15, 14, 4, 9); greenStalk(o, 17, 15, 26, 13); return BOWL_OUT.clear!; }),
  // 붉은 살얼음 + 얼음 + 회
  mulhoe: () => dish('mulhoe', 'cold', (o, s) => { inBowl(o, 'clear', '#e86a46', s, 1); slicesFan(o, 10, 12, 3, '#fff1ea', '#f2b8a8', s, 4); iceCube(o, 6, 12); iceCube(o, 23, 11); julienne(o, 20, 17, 2, '#7cc35f', s); return BOWL_OUT.clear!; }),
  // 하얗게 꼬불거리는 오징어 채가 수북
  'ojingeo-mulhoe': () => dish('ojingeo-mulhoe', 'cold', (o, s) => { inBowl(o, 'steel', '#e9784f', s, -2, -1); part(o, '#b8907a', l => { for (let k = 0; k < 4; k++) for (let x = 0; x < 9; x++) l.p(10 + x, 9 + k * 2 + Math.round(Math.sin(x * 1.1 + k) * 1), k % 2 ? '#fff6ee' : '#f6e6da'); }); iceCube(o, 21, 13); return BOWL_OUT.steel!; }),
  // 채소 위 깍둑 썬 회 + 초장
  'hoe-deopbap': () => dish('hoe-deopbap', 'cold', (o, s) => { const a = vessel(o, 'lacquer'); leaves(o, a.cx, a.cy, 9, 2, s, '#7cc35a'); for (const [x, y, c] of [[9, 12, '#ff8c6a'], [13, 14, '#fff1ea'], [18, 12, '#e8402e'], [21, 15, '#ff8c6a'], [15, 10, '#fff1ea']] as const) tofuCube(o, x, y, 2, mix(c, '#ffffff', 0.3), c, mix(c, '#000000', 0.2)); part(o, '#7a1a10', l => { l.e(12, 10, 2, 1, '#d0361f'); l.p(11, 9, '#ff7a5a'); }); return BOWL_OUT.lacquer!; }),
  // 나무 판 위 큰 초밥 넷(연어·참치·달걀·흰살)
  'sushi-moodeum': () => dish('sushi-moodeum', 'none', (o, s) => { board(o, '#c99460'); const top = [['#ff8c6a', '#ffd0bc'], ['#d8352a', '#f06a5a'], ['#ffd84a', '#fff09a'], ['#fff4ee', '#ffffff']] as const; top.forEach(([c, hl], i) => { const x = 4 + (i % 2) * 11 + (i > 1 ? 3 : 0), y = 9 + (i > 1 ? 6 : 0); part(o, mix(c, '#000000', 0.5), l => { l.r(x, y + 2, 8, 3, '#fbfaf3'); l.p(x + 7, y + 4, '#e0dccd'); l.r(x, y, 8, 2, c); l.r(x, y, 3, 1, hl); if (i === 0) for (let k = 1; k < 8; k += 2) l.p(x + k, y + 1, '#fff2ea'); if (i === 2) l.r(x + 3, y, 2, 5, '#1f2a22'); }); }); part(o, '#2a5a1e', l => l.e(27, 13, 1, 1, '#8fd06a')); return mix('#c99460', '#000000', 0.55); }),
  // 검은 접시 위 하얀 광어 초밥 셋 + 초록 잎
  'sushi-gwangeo': () => dish('sushi-gwangeo', 'none', (o, s) => { plate(o, 'slate', true); leaves(o, 24, 17, 3, 1, s, '#4f9a3a'); for (let i = 0; i < 3; i++) { const x = 4 + i * 7, y = 14 + (i % 2); part(o, '#8a7a72', l => { l.r(x, y + 2, 6, 3, '#fbfaf3'); l.r(x, y, 6, 2, '#fff8f4'); l.r(x, y, 6, 1, '#ffffff'); l.p(x + 5, y + 1, '#f6c8c0'); l.p(x + 4, y + 1, '#fbe2dc'); }); } limeWedge(o, 25, 21, '#d9c21a', '#fff07a'); return PLATE_OUT.slate!; }),
  // 겉에 주황 알이 오톨도톨한 누드 롤
  'california-roll': () => dish('california-roll', 'none', (o, s) => { board(o, '#d9a46a'); for (let i = 0; i < 4; i++) bigRoll(o, 6 + i * 7, 13 + (i % 2) * 3, '#ff8a3c', '#fbfaf3', '#ff9a8a', ['#7cc35f', '#f6e6a8'], i, 3, 3, true); return mix('#d9a46a', '#000000', 0.55); }),
  // 롤 위에 연어가 줄무늬로 덮인다 + 레몬
  'salmon-roll': () => dish('salmon-roll', 'none', (o, s) => { board(o, '#ecc592'); for (let i = 0; i < 4; i++) { const cx = 6 + i * 6, cy = 15; bigRoll(o, cx, cy, '#1f2a22', '#fbfaf3', '#ffcf6a', ['#7cc35f'], i, 3, 3); part(o, '#a8402a', l => { l.e(cx, cy - 3, 3, 1, (x) => (x % 2 ? '#ffb89a' : '#ff8c6a')); }); } limeWedge(o, 25, 21, '#e8c21a', '#fff07a'); return mix('#ecc592', '#000000', 0.55); }),
  // 뒤집은 게딱지 + 주황 알 + 짙은 간장
  'ganjang-gejang': () => dish('ganjang-gejang', 'none', (o, s) => { const a = plate(o, 'cream', true); soup(o, { ...a, rx: a.rx + 1 }, '#5a3418', s); crab(o, 16, 17, '#a86a2a', true, s); part(o, '#2c5a1e', l => { l.p(5, 21, '#6cc04f'); l.p(26, 20, '#6cc04f'); l.p(25, 21, '#3c7d2a'); }); return PLATE_OUT.cream!; }),
  // 빨간 양념 범벅 게 + 깨
  'yangnyeom-gejang': () => dish('yangnyeom-gejang', 'none', (o, s) => { plate(o, 'white'); crab(o, 15, 17, '#d8341f', false, s); part(o, '#7a1a10', l => { l.e(25, 20, 2, 1, '#c8281a'); l.p(24, 18, '#e8402e'); }); scatter(o, { cx: 15, cy: 17, rx: 4, ry: 2 }, 'sesame6', s); return PLATE_OUT.white!; }),
  // 칸칸이 담은 포케(연어·아보카도·옥수수·적양파·풋콩)
  poke: () => dish('poke', 'cold', (o, s) => { const a = vessel(o, 'wood', 1); radial(o, a, ['#ff8c6a', '#9fd06e', '#ffe066', '#c890c8', '#6cc04f', '#f4f1e8'], s); part(o, '#4a7a2a', l => { l.e(12, 12, 3, 1, (x) => (x % 2 ? '#c8e88a' : '#8fc85a')); }); for (const [x, y] of [[18, 12], [20, 14]] as const) tofuCube(o, x, y, 2, '#ffb89a', '#ff8c6a', '#e86a4a'); return BOWL_OUT.wood!; }),
  // 밥을 덮은 연어 꽃 + 연어알
  sakedon: () => dish('sakedon', 'none', (o, s) => { const a = vessel(o, 'white', -1, 1); riceDome(o, a.cx, a.cy, a.rx - 1, a.ry, s); for (let k = 0; k < 6; k++) { const ang = (k / 6) * Math.PI * 2, x = Math.round(a.cx + Math.cos(ang) * 5), y = Math.round(a.cy - 1 + Math.sin(ang) * 2); part(o, '#a8402a', l => { l.r(x - 2, y, 4, 2, '#ff8c6a'); l.p(x - 1, y, '#ffd0bc'); l.p(x + 1, y + 1, '#fff2ea'); }); } part(o, '#a8420a', l => { l.e(a.cx, a.cy - 1, 1, 1, '#ff7a1a'); l.p(a.cx - 1, a.cy - 2, '#ffc08a'); }); return BOWL_OUT.white!; }),
};

/* ===================== 매콤한 거 ===================== */
const SPICY: Record<string, () => FoodGrid> = {
  // 떡볶이 + 젓가락으로 들어 올린 꼬불 라면
  rabokki: () => dish('rabokki', 'steam', (o, s) => { const a = plate(o, 'cream', false, 1); soup(o, a, '#d23a2a', s); for (const [x, y] of [[6, 18], [19, 20], [9, 21]] as const) part(o, '#8a6a3a', l => { l.r(x, y, 5, 1, '#fff6e2'); l.r(x, y + 1, 5, 1, '#d7b98a'); }); noodleNest(o, 15, 18, 6, 2, '#f2cf6a', s, true, '#a8781a'); noodleLift(o, 13, 7, 17, '#f2cf6a', 3, 1); chopsticks(o, 22, 1, 13, 7); return PLATE_OUT.cream!; }),
  // 시뻘건 국물 + 큼직한 홍합 둘 + 오징어 고리
  jjamppong: () => dish('jjamppong', 'steam', (o, s) => { const a = inBowl(o, 'china', '#c8321f', s); noodleNest(o, a.cx, a.cy + 1, 5, 2, '#f2dca0', s); mussel(o, 8, 13); mussel(o, 22, 12); squidRing(o, 15, 12); squidRing(o, 18, 16); part(o, null, l => { l.p(11, 16, '#ff9a5a'); l.p(24, 16, '#ff9a5a'); }); return BOWL_OUT.china!; }),
  // 우뚝 선 큰 새우 + 해물 더미
  'samseon-jjamppong': () => dish('samseon-jjamppong', 'steam', (o, s) => { inBowl(o, 'red', '#d13a24', s, 1, 1); shrimp(o, 15, 10, false, '#ff8a5a', true); mussel(o, 23, 14); squidPiece(o, 6, 13, 5, 2); part(o, '#a89a7a', l => { l.e(21, 10, 1, 1, '#fbf6e8'); }); return BOWL_OUT.red!; }),
  // 하얀 국물 + 굴 + 빨간 고추
  'gul-jjamppong': () => dish('gul-jjamppong', 'steam', (o, s) => { inBowl(o, 'china', '#efe6d2', s, -1, -1); for (const [x, y] of [[10, 12], [16, 11], [20, 14], [12, 16], [21, 10]] as const) oyster(o, x, y); for (const [x, y] of [[7, 14], [17, 16], [24, 13]] as const) part(o, '#7a1a10', l => { l.p(x, y, '#e8402e'); l.p(x + 1, y, '#c8281a'); }); return BOWL_OUT.china!; }),
  // 빨간 국물 한가운데 밥 섬
  'jjamppong-bap': () => dish('jjamppong-bap', 'steam', (o, s) => { inBowl(o, 'china', '#c63520', s, 2); riceDome(o, 16, 13, 5, 3, s); mussel(o, 7, 15); squidRing(o, 24, 14); part(o, '#2c5a1e', l => { l.p(15, 10, '#6cc04f'); l.p(17, 10, '#3f8f37'); }); return BOWL_OUT.china!; }),
  // 종이 용기 속 검붉은 기름 + 팽이버섯 다발 + 연근 + 마른고추
  malatang: () => dish('malatang', 'steam', (o, s) => { inBowl(o, 'paper', '#9a2014', s, 1); enoki(o, 9, 13, 4); lotusRoot(o, 19, 12); driedChili(o, 14, 16); driedChili(o, 22, 16, true); tofuCube(o, 15, 10, 3, '#f6e2b0', '#e8c88a', '#c8a46a'); return BOWL_OUT.paper!; }),
  // 반은 밥, 반은 빨간 제육 + 깻잎
  'jeyuk-deopbap': () => dish('jeyuk-deopbap', 'steam', (o, s) => { const a = plate(o, 'white', true); riceDome(o, a.cx - 6, a.cy - 1, 5, 3, s); for (const [x, y] of [[18, 17], [22, 19], [20, 15], [24, 16]] as const) nugget(o, x, y, '#c4472c', s + x, 3, 1, '#6a1a0e', true); perilla(o, 11, 13, s); return PLATE_OUT.white!; }),
  // 무쇠 팬 가득 빨간 돼지고기 + 깻잎 두 장
  'jeyuk-bokkeum': () => dish('jeyuk-bokkeum', 'steam', (o, s) => { skillet(o, 1); for (const [x, y] of [[8, 19], [13, 21], [18, 19], [11, 17], [16, 16], [21, 21]] as const) nugget(o, x, y, '#c4472c', s + x + y, 3, 1, '#6a1a0e', true); perilla(o, 9, 14, s); perilla(o, 20, 14, s + 1); return '#120e0d'; }),
  // 접시 위 굽이치는 낙지 다리
  'nakji-bokkeum': () => dish('nakji-bokkeum', 'steam', (o, s) => { const a = plate(o, 'white'); soup(o, a, '#c92f22', s); tentacle(o, 7, 14, '#d0402a', 1, 8); tentacle(o, 18, 13, '#c8382a', 1, 7); tentacle(o, 14, 19, '#d84a32', -1, 6); scatter(o, a, 'sesame5 scal3', s); return PLATE_OUT.white!; }),
  // 밥 그릇 위로 낙지 다리가 꼬불
  'nakji-deopbap': () => dish('nakji-deopbap', 'steam', (o, s) => { const a = vessel(o, 'lacquer', 0, 1); riceDome(o, a.cx, a.cy, a.rx - 1, a.ry, s); soup(o, { ...a, rx: 6, ry: 2 }, '#c92f22', s); tentacle(o, 12, 8, '#d0402a', 1, 8); tentacle(o, 21, 10, '#c8382a', -1, 6); return BOWL_OUT.lacquer!; }),
  // 칼집 격자가 선명한 오징어 + 밥
  'ojingeo-deopbap': () => dish('ojingeo-deopbap', 'steam', (o, s) => { const a = plate(o, 'cream', true); riceDome(o, a.cx - 6, a.cy, 5, 3, s); squidPiece(o, 15, 14, 8, 3, '#d44a2c'); squidPiece(o, 18, 18, 7, 3, '#d44a2c'); part(o, '#2c5a1e', l => { l.p(13, 20, '#6cc04f'); l.p(26, 15, '#6cc04f'); }); return PLATE_OUT.cream!; }),
  // 팬 위 동글동글 통 주꾸미
  'jukkumi-bokkeum': () => dish('jukkumi-bokkeum', 'steam', (o, s) => { const a = skillet(o, 1); soup(o, a, '#b8261f', s); cabbage(o, 22, 19, 3, 2, s); babyOcto(o, 8, 18, '#c8382a', s); babyOcto(o, 14, 17, '#d0402a', s + 1); babyOcto(o, 11, 22, '#c03028', s + 2); scatter(o, a, 'sesame4', s); return '#120e0d'; }),
  // 발가락이 또렷한 매운 닭발 + 주먹밥
  dakbal: () => dish('dakbal', 'steam', (o, s) => { plate(o, 'slate'); chickenFoot(o, 7, 20, '#c8341f', s); chickenFoot(o, 13, 19, '#b8301c', s + 1); chickenFoot(o, 19, 21, '#d0402a', s + 2); onigiri(o, 25, 22, s); return PLATE_OUT.slate!; }),
  // 둥근 철판 가득 닭갈비 + 고구마·떡·양배추 + 주걱
  dakgalbi: () => dish('dakgalbi', 'steam', (o, s) => { o.e(16, 21, 15, 7, (x, y, u, v) => (v > 0.55 ? '#1f1a19' : '#3f3634')); const a: Area = { cx: 16, cy: 20, rx: 12, ry: 5 }; soup(o, a, '#c8452c', s); cabbage(o, 9, 19, 3, 2, s); for (const [x, y] of [[16, 19], [21, 21], [13, 23]] as const) nugget(o, x, y, '#d8603a', s + x, 3, 2, '#6a1a0e', true); for (const [x, y] of [[20, 17], [24, 20]] as const) part(o, '#8a6a3a', l => { l.r(x, y, 4, 1, '#fff6e2'); }); potato(o, 10, 23, s, '#f2c86a'); part(o, '#5a3a1a', l => { line(l, 26, 8, 22, 17, '#c8925a', 2); }); return '#0e0a0a'; }, 15),
  // 붉은 기름 국물에 길쭉한 대파
  yukgaejang: () => dish('yukgaejang', 'steam', (o, s) => { inBowl(o, 'earthen', '#b32a18', s, 0, -1); longOnion(o, 7, 13, 15, 11); longOnion(o, 13, 16, 22, 13); part(o, '#3a1a0c', l => { for (let k = 0; k < 3; k++) line(l, 17 + k, 10, 21 + k, 12 + (k % 2), '#7a4a2a'); }); part(o, null, l => { l.p(10, 16, '#ff7a3a'); l.p(21, 15, '#ff7a3a'); l.p(16, 12, '#ff9a5a'); }); return BOWL_OUT.earthen!; }),
  // 냄비 속 생선 토막(뼈 단면) + 쑥갓
  'daegu-maeuntang': () => dish('daegu-maeuntang', 'steam', (o, s) => { const a = hotpot(o); soup(o, a, '#c43a22', s); fishSteak(o, 11, 15, '#5a6470', '#c43a22'); fishSteak(o, 19, 14, '#5a6470', '#c43a22'); leaves(o, 24, 12, 2, 1, s, '#4f9a3a'); tofuCube(o, 14, 11, 3); return '#4f5862'; }),
  // 냄비 속 빨간 닭다리 + 통감자
  dakbokkeumtang: () => dish('dakbokkeumtang', 'steam', (o, s) => { const a = hotpot(o, -1); soup(o, a, '#c9502c', s); drumstick(o, 12, 15, ramp('#d0502c'), 1, s, '#6a1a0e'); potato(o, 21, 15, s); part(o, '#8a3a0a', l => { l.r(7, 12, 3, 2, '#f39a3b'); l.p(7, 12, '#ffc07a'); }); return '#4f5862'; }),
  // 콩나물 산 + 아귀 살
  agujjim: () => dish('agujjim', 'steam', (o, s) => { const a = plate(o, 'white', true); soup(o, { ...a, rx: a.rx + 1 }, '#c94a2c', s); sprouts(o, 15, 16, 7, 3, s); fishSteak(o, 22, 19, '#7a6a5a', '#c94a2c'); part(o, '#2c5a1e', l => { line(l, 8, 13, 11, 11, '#6cc04f'); }); return PLATE_OUT.white!; }),
  // 콩나물 위 게·새우·낙지 다리가 우르르
  haemuljjim: () => dish('haemuljjim', 'steam', (o, s) => { const a = plate(o, 'blue', true); soup(o, { ...a, rx: a.rx + 1 }, '#d0502e', s); sprouts(o, 16, 18, 8, 2, s); crab(o, 11, 14, '#e2402a', false, s); shrimp(o, 22, 14, true, '#ff7a4a', true); tentacle(o, 16, 19, '#d84a32', 1, 6); return PLATE_OUT.blue!; }),
  // 팬 위 순대 단면 + 깻잎
  'sundae-bokkeum': () => dish('sundae-bokkeum', 'steam', (o, s) => { const a = skillet(o, -1); soup(o, a, '#c4402c', s); for (const [x, y] of [[8, 19], [13, 21], [18, 19], [12, 17], [20, 22]] as const) sundaeSlice(o, x, y, '#a83020'); perilla(o, 15, 15, s); return '#120e0d'; }),
  // 붉은 소스 속 큼직한 두부 깍두기
  'mapa-tofu': () => dish('mapa-tofu', 'steam', (o, s) => { const a = plate(o, 'white', false, 1); soup(o, a, '#b8341f', s); for (const [x, y] of [[7, 16], [12, 18], [17, 16], [22, 18], [12, 14], [19, 20]] as const) tofuCube(o, x, y, 3); scatter(o, a, 'scal4 chiliflake4', s); return PLATE_OUT.white!; }),
  // 팬 가득 동그랗게 말린 곱창
  'gopchang-bokkeum': () => dish('gopchang-bokkeum', 'steam', (o, s) => { const a = skillet(o); soup(o, a, '#8a2a1a', s); for (const [x, y] of [[8, 19], [13, 20], [18, 18], [11, 16], [16, 22], [21, 21]] as const) tubeRing(o, x, y, '#d8603a', s + x); perilla(o, 21, 15, s); return '#120e0d'; }),
  // 국물 없는 빨간 볶음 + 구멍 뚫린 연근 + 마른고추
  'mala-xiangguo': () => dish('mala-xiangguo', 'steam', (o, s) => { const a = vessel(o, 'paper', -1, 1); soup(o, a, '#a8301f', s); lotusRoot(o, 12, 13); lotusRoot(o, 20, 15); for (const [x, y, f] of [[8, 15, false], [17, 11, true], [22, 12, false], [14, 17, true]] as const) driedChili(o, x, y, f); shrimp(o, 16, 13, false); return BOWL_OUT.paper!; }),
};

/* ===================== 뜨끈한 거 ===================== */
const HOT: Record<string, () => FoodGrid> = {
  // 뽀얀 국물 + 돼지고기 편 + 수북한 부추
  'dwaeji-gukbap': () => dish('dwaeji-gukbap', 'steam', (o, s) => { inBowl(o, 'earthen', '#f2e6d0', s, 1); slicesFan(o, 8, 12, 3, '#f6e2d6', '#fff8f2', s, 4); onionHeap(o, 19, 13, 4, s, '#4ea23a'); part(o, '#7a1a10', l => { l.e(21, 16, 1, 1, '#c23b2a'); }); return BOWL_OUT.earthen!; }),
  // 콩나물 산 + 날달걀 노른자
  'kongnamul-gukbap': () => dish('kongnamul-gukbap', 'steam', (o, s) => { inBowl(o, 'earthen', '#f1ead8', s, -1, 1); sprouts(o, 15, 14, 7, 3, s); yolk(o, 20, 12, true); part(o, null, l => { l.p(12, 11, '#1f2a22'); l.p(13, 11, '#3e5244'); }); return BOWL_OUT.earthen!; }),
  // 빨간 국물 + 결대로 찢은 소고기 + 네모 무
  'sogogi-gukbap': () => dish('sogogi-gukbap', 'steam', (o, s) => { inBowl(o, 'earthen', '#b84a2a', s, 2, -1); for (const [x, y] of [[8, 13], [13, 11], [19, 14]] as const) part(o, '#3a1a0c', l => { for (let k = 0; k < 3; k++) line(l, x + k, y, x + k + 2, y + 2, '#7a3e26'); }); for (const [x, y] of [[11, 15], [17, 12], [22, 11]] as const) tofuCube(o, x, y, 2, '#fbf6ee', '#f2e8d8', '#d9c8b0'); longOnion(o, 7, 10, 12, 9); return BOWL_OUT.earthen!; }),
  // 굴 + 짙은 매생이(초록 물결)
  'gul-gukbap': () => dish('gul-gukbap', 'steam', (o, s) => { inBowl(o, 'earthen', '#ece4cf', s, -2); part(o, null, l => { for (let x = 6; x < 26; x++) { l.p(x, 13 + Math.round(Math.sin(x * 0.9) * 1), '#2f6a3a'); l.p(x, 16 + Math.round(Math.cos(x * 0.8)), '#3f7a4a'); } }); for (const [x, y] of [[9, 11], [15, 12], [21, 11], [12, 15], [19, 15]] as const) oyster(o, x, y); return BOWL_OUT.earthen!; }),
  // 뚝배기 위로 솟은 돼지 등뼈 무더기
  'ppyeo-haejangguk': () => dish('ppyeo-haejangguk', 'steam', (o, s) => { const a = inBowl(o, 'earthen', '#b4482c', s, 0, 1); spine(o, 15, 13, '#9a5a3a', s); scatter(o, a, 'sesame6', s); part(o, '#2c4a1a', l => { l.r(21, 15, 3, 1, '#5d7a2e'); l.p(22, 16, '#3f5a1e'); }); return BOWL_OUT.earthen!; }),
  // 검붉은 선지 덩이 셋
  'seonji-haejangguk': () => dish('seonji-haejangguk', 'steam', (o, s) => { inBowl(o, 'earthen', '#a85a3a', s, 1, -1); tofuCube(o, 8, 11, 4, '#8a3030', '#5a1e1e', '#3a1010'); tofuCube(o, 15, 13, 4, '#7a2a2a', '#521a1a', '#341010'); sprouts(o, 21, 12, 2, 2, s); longOnion(o, 13, 10, 18, 9); return BOWL_OUT.earthen!; }),
  // 짙은 초록 우거지 잎이 수북
  'ugeoji-haejangguk': () => dish('ugeoji-haejangguk', 'steam', (o, s) => { inBowl(o, 'earthen', '#9a6a3a', s, -2, 1); leaves(o, 15, 13, 7, 2, s, '#5d7a2e'); bone(o, 20, 13, 24, 9, '#8a5a3a', s); return BOWL_OUT.earthen!; }),
  // 노란 북어채 + 달걀 줄
  'hwangtae-haejangguk': () => dish('hwangtae-haejangguk', 'steam', (o, s) => { inBowl(o, 'white', '#efe3c6', s, 1, 1); part(o, '#9a7a3a', l => { for (let k = 0; k < 5; k++) line(l, 8 + k * 3, 11 + (k % 2) * 3, 11 + k * 3, 13 + (k % 2) * 3, k % 2 ? '#f2d89a' : '#e8c47a'); }); part(o, null, l => { for (let x = 9; x < 24; x += 2) l.p(x, 16 + (x % 4 ? 0 : 1), '#ffe27a'); }); longOnion(o, 19, 10, 24, 11); return BOWL_OUT.white!; }),
  // 큼직한 김치 조각 + 돼지고기 + 두부
  'kimchi-jjigae': () => dish('kimchi-jjigae', 'steam', (o, s) => { inBowl(o, 'earthen', '#d0462a', s, 0, -1); kimchiChunk(o, 8, 11, 7, s); slicesFan(o, 17, 11, 2, '#e9b39c', '#fff4ea', s, 4); tofuCube(o, 13, 14, 3); return BOWL_OUT.earthen!; }),
  // 돌솥 속 연분홍 참치 덩이 + 김치
  'chamchi-kimchi-jjigae': () => dish('chamchi-kimchi-jjigae', 'steam', (o, s) => { const a = inBowl(o, 'stone', '#cf4b2c', s, -1); part(o, '#8a5a4a', l => l.e(18, 13, 4, 2, (x, y, u, v) => ((x + y) % 2 ? '#f3c6a8' : h2(x, y, s) > 0.5 ? '#e6a98a' : '#fbe2cf'))); kimchiChunk(o, 6, 13, 5, s); scatter(o, a, 'scal3', s); return BOWL_OUT.stone!; }),
  // 된장 국물 + 두부 깍두기 + 반달 애호박
  'doenjang-jjigae': () => dish('doenjang-jjigae', 'steam', (o, s) => { inBowl(o, 'earthen', '#a8743a', s, 1); tofuCube(o, 8, 12, 3); tofuCube(o, 16, 14, 3); for (const [x, y] of [[12, 11], [21, 12], [11, 16]] as const) part(o, '#2c5a1e', l => l.e(x, y, 2, 1, (xx, yy, u, v) => (v > 0.3 ? '#4d8b3f' : '#f2f2c8'))); part(o, '#2c5a1e', l => { l.p(20, 16, '#5fae3f'); l.p(21, 16, '#3c7d2a'); }); return BOWL_OUT.earthen!; }),
  // 돌솥 빨간 국물 + 몽글 순두부 + 노른자
  'sundubu-jjigae': () => dish('sundubu-jjigae', 'steam', (o, s) => { inBowl(o, 'stone', '#d24a2a', s); softTofu(o, 13, 14, s); yolk(o, 19, 12, true); clam(o, 8, 12, s); part(o, '#2c5a1e', l => { l.p(22, 15, '#6cc04f'); l.p(23, 15, '#3f8f37'); }); return BOWL_OUT.stone!; }),
  // 냄비 속 햄 네모·소시지 동그라미·라면 사리·치즈 한 장
  'budae-jjigae': () => dish('budae-jjigae', 'steam', (o, s) => { const a = hotpot(o); soup(o, a, '#d0502c', s); spam(o, 6, 11); ramenBlock(o, 13, 11); cheeseSlice(o, 13, 9, 5); for (const [x, y] of [[22, 12], [24, 15], [9, 16], [20, 16]] as const) sausageSlice(o, x, y); return '#4f5862'; }),
  // 냄비 속 등뼈 + 통감자 + 깻잎
  gamjatang: () => dish('gamjatang', 'steam', (o, s) => { const a = hotpot(o, 1); soup(o, a, '#b8502c', s); spine(o, 11, 14, '#9a5a3a', s); potato(o, 22, 14, s); perilla(o, 21, 10, s); return '#4f5862'; }),
  // 맑은 국물 위로 우뚝 선 갈빗대
  galbitang: () => dish('galbitang', 'steam', (o, s) => { const a = inBowl(o, 'stone', '#e9dcc0', s, 1, -1); bone(o, 17, 15, 22, 2, '#7a4a2e', s); part(o, null, l => { for (let x = 7; x < 15; x++) l.p(x, 14 + (x % 3 === 0 ? 1 : 0), '#d8ccb4'); }); jujube(o, 10, 12); scatter(o, a, 'scal4', s); return BOWL_OUT.stone!; }),
  // 새하얀 국물 한가운데 파 산
  seolleongtang: () => dish('seolleongtang', 'steam', (o, s) => { inBowl(o, 'earthen', '#fbf8f0', s, 2, 1); slicesFan(o, 8, 13, 2, '#e8d8c8', '#f6ece2', s, 4); onionHeap(o, 18, 12, 5, s); return BOWL_OUT.earthen!; }),
  // 놋그릇 맑은 금빛 국물 + 고기 편 + 노란 지단
  gomtang: () => dish('gomtang', 'steam', (o, s) => { inBowl(o, 'brass', '#ead8a8', s); slicesFan(o, 8, 12, 3, '#c8946a', '#e8c8a8', s, 4); part(o, '#b88a1a', l => { for (let k = 0; k < 4; k++) l.r(19 + (k % 2), 11 + k * 2, 4, 1, '#ffe27a'); }); onionHeap(o, 14, 17, 3, s); return BOWL_OUT.brass!; }),
  // 뚝배기에 앉은 통닭 + 인삼 + 대추
  samgyetang: () => dish('samgyetang', 'steam', (o, s) => { inBowl(o, 'earthen', '#efe4cc', s, 1); wholeChicken(o, 15, 14, '#f2dcbc', s); ginseng(o, 21, 13); jujube(o, 9, 16); return BOWL_OUT.earthen!; }),
  // 맑은 닭국물 + 닭다리 하나 + 찢은 살
  dakgomtang: () => dish('dakgomtang', 'steam', (o, s) => { inBowl(o, 'white', '#f4e4b8', s, -1); drumstick(o, 12, 14, ramp('#f6e2c4'), 1, s, '#a8845a'); part(o, null, l => { for (let k = 0; k < 4; k++) line(l, 18 + k, 15, 20 + k, 12, k % 2 ? '#fbeedc' : '#f1d6b6'); }); onionHeap(o, 20, 17, 3, s); return BOWL_OUT.white!; }),
  // 젓가락으로 들어 올린 넙적한 칼국수 면
  kalguksu: () => dish('kalguksu', 'steam', (o, s) => { const a = inBowl(o, 'white', '#e9dcc0', s, 2); noodleNest(o, a.cx, a.cy, 8, 3, '#f6edd8', s, false, '#c8b890'); julienne(o, 9, 13, 3, '#7cc35f', s); noodleLift(o, 15, 5, 13, '#f6edd8', 2, 0, 2); chopsticks(o, 25, 0, 16, 5); return BOWL_OUT.white!; }),
  // 벌어진 바지락이 수북
  'bajirak-kalguksu': () => dish('bajirak-kalguksu', 'steam', (o, s) => { const a = inBowl(o, 'white', '#efe6cf', s, 1, 1); noodleNest(o, a.cx, a.cy + 1, 7, 2, '#f3e8cf', s); for (const [x, y] of [[9, 12], [14, 10], [19, 12], [23, 14], [12, 15], [18, 16], [8, 16]] as const) clam(o, x, y, x); return BOWL_OUT.white!; }),
  // 냄비 위 큰 새우 + 홍합 + 칼국수
  'haemul-kalguksu': () => dish('haemul-kalguksu', 'steam', (o, s) => { const a = hotpot(o); soup(o, a, '#d9b98a', s); noodleNest(o, a.cx, a.cy, 9, 2, '#f3e8cf', s); shrimp(o, 12, 12, false, '#ff8a5a', true); mussel(o, 21, 13); clam(o, 23, 16, s); return '#4f5862'; }),
  // 라임 조각 + 허브 + 가는 쌀국수
  ssalguksu: () => dish('ssalguksu', 'steam', (o, s) => { const a = inBowl(o, 'china', '#d9b480', s, 1); noodleNest(o, a.cx, a.cy, 8, 3, '#fbf8f0', s, false, '#c8c0a8'); slicesFan(o, 9, 12, 2, '#a86a52', '#c88a72', s, 4); herbSprig(o, 18, 13, '#3f9a3a'); limeWedge(o, 23, 10); sprouts(o, 13, 16, 2, 1, s); return BOWL_OUT.china!; }),
  // 굵은 흰 면 + 분홍 소용돌이 어묵
  udon: () => dish('udon', 'steam', (o, s) => { const a = inBowl(o, 'lacquer', '#c9a46a', s); noodleNest(o, a.cx, a.cy, 9, 3, '#fffaf0', s, false, '#c8b890'); part(o, '#c9a8b0', l => { l.e(12, 12, 3, 2, (x, y, u, v) => (Math.abs(Math.sqrt(u * u + v * v) - 0.55) < 0.3 && u > -0.7 ? '#ef6a8a' : '#fbf6f2')); }); part(o, '#7a5a1a', l => { for (const [x, y] of [[18, 11], [20, 13], [22, 11]] as const) { l.p(x, y, '#f2c870'); l.p(x + 1, y, '#e8b04a'); } }); onionHeap(o, 20, 16, 2, s); return BOWL_OUT.lacquer!; }),
  // 손으로 뜯은 큼직한 수제비 반죽
  sujebi: () => dish('sujebi', 'steam', (o, s) => { inBowl(o, 'white', '#e8dcc2', s, -2, 1); for (const [x, y] of [[10, 12], [17, 11], [14, 15], [21, 14]] as const) part(o, '#b8ab8a', l => l.e(x, y, 3, 1, (xx, yy, u, v) => (h2(xx, yy, s) > 0.82 ? null : u < -0.2 ? '#ffffff' : '#f3ede0'))); part(o, '#8a3a0a', l => { l.r(8, 15, 2, 1, '#f39a3b'); }); potato(o, 23, 11, s); return BOWL_OUT.white!; }),
  // 동그란 떡국 떡 + 통통한 만두
  'tteok-manduguk': () => dish('tteok-manduguk', 'steam', (o, s) => { inBowl(o, 'white', '#efe5cf', s, 1, -1); for (const [x, y] of [[8, 12], [12, 15], [10, 17], [21, 16]] as const) riceCakeOval(o, x, y); dumpling(o, 17, 12, '#fbf6ea', s); part(o, null, l => { for (let x = 13; x < 22; x += 2) l.p(x, 17, '#ffe27a'); }); noriShreds(o, 22, 12, 2, s); return BOWL_OUT.white!; }),
  // 걸쭉한 갈색 국물 + 들깨 가루 + 우거지
  chueotang: () => dish('chueotang', 'steam', (o, s) => { const a = inBowl(o, 'earthen', '#8a5a2c', s, 2); part(o, null, l => l.e(a.cx, a.cy, a.rx - 1, a.ry, (x, y) => (h2(x, y, s + 4) > 0.75 ? '#c8a878' : null))); leaves(o, 11, 13, 3, 1, s, '#5d7a2e'); longOnion(o, 17, 15, 24, 11); part(o, '#5a0a0a', l => { l.p(20, 16, '#e8402e'); l.p(21, 16, '#c8281a'); }); return BOWL_OUT.earthen!; }),
  // 냄비 속 주황 알 덩이 + 쑥갓
  altang: () => dish('altang', 'steam', (o, s) => { const a = hotpot(o, -2); soup(o, a, '#c8482a', s); roe(o, 11, 13, 4, 2, s); roe(o, 20, 15, 3, 2, s + 1); leaves(o, 21, 10, 2, 1, s, '#4f9a3a'); return '#4f5862'; }),
  // 동태 토막 셋(가운데 뼈) + 무
  'dongtae-jjigae': () => dish('dongtae-jjigae', 'steam', (o, s) => { const a = hotpot(o, 2); soup(o, a, '#cf4a28', s); fishSteak(o, 8, 14, '#7a8490', '#cf4a28'); fishSteak(o, 15, 12, '#7a8490', '#cf4a28'); fishSteak(o, 22, 15, '#7a8490', '#cf4a28'); tofuCube(o, 13, 15, 3, '#fbf6ee', '#f2e8d8', '#d9c8b0'); return '#4f5862'; }),
  // 젓가락에 걸린 얇은 고기 한 장 + 팽이버섯 + 표고
  'sogogi-shabu': () => dish('sogogi-shabu', 'steam', (o, s) => { const a = hotpot(o, -1); soup(o, a, '#e9dcc0', s); enoki(o, 7, 16, 3); shiitake(o, 21, 14); leaves(o, 13, 15, 3, 1, s, '#6fbf4a'); part(o, '#6a1a1a', l => { for (let j = 0; j < 4; j++) for (let i = 0; i < 6; i++) l.p(13 + i + (j % 2), 6 + j, i === 0 || (i + j) % 4 === 0 ? '#f6d2c8' : '#c8443a'); }); chopsticks(o, 24, 1, 16, 6); return '#4f5862'; }),
  // 차슈·반숙 달걀·세운 김 + 꼬불 면
  'tonkotsu-ramen': () => dish('tonkotsu-ramen', 'steam', (o, s) => { const a = inBowl(o, 'lacquer', '#f2e2c4', s, 1); noodleNest(o, a.cx, a.cy + 1, 8, 2, '#f6e6b0', s, true, '#b8962a'); noriSheet(o, 20, 5, 4, 8); part(o, '#6a3418', l => l.e(11, 13, 4, 3, (x, y, u, v) => { const d = Math.sqrt(u * u + v * v); return d > 0.78 ? '#a8582e' : d > 0.35 && d < 0.6 ? '#fff0e0' : '#e9b496'; })); eggHalf(o, 17, 14, true); onionHeap(o, 22, 16, 2, s); return BOWL_OUT.lacquer!; }),
};

/* ===================== 바삭한 거 ===================== */
const GOLD = ramp('#e8a84a'), REDGLAZE = ramp('#d0341f'), SOYGLAZE = ramp('#8a4a1e');
/** 치킨 상자: 위 반쯤 열린 뚜껑 + 치킨무 컵(기준 후라이드와 같은 상자 언어). */
function chickenBox(o: Layer, tint = '#d7a66d'): void {
  box(o, tint);
  part(o, '#9a9580', l => { l.r(22, 21, 6, 5, '#fbfaf3'); l.r(22, 21, 1, 5, '#ffffff'); l.r(27, 21, 1, 5, '#e2dfd2'); l.e(25, 21, 3, 1, '#f1eedd'); l.p(25, 21, '#fffbe4'); });
}
const CRISPY: Record<string, () => FoodGrid> = {
  // 빨갛게 반짝이는 양념 닭다리 + 깨
  'yangnyeom-chicken': () => dish('yangnyeom-chicken', 'steam', (o, s) => { chickenBox(o); drumstick(o, 10, 15, REDGLAZE, 1, s, '#6a120a'); drumstick(o, 18, 13, REDGLAZE, -1, s + 1, '#6a120a'); drumstick(o, 14, 18, REDGLAZE, 1, s + 2, '#6a120a', false); scatter(o, { cx: 14, cy: 15, rx: 6, ry: 3 }, 'sesame8', s); return '#5a3a1f'; }),
  // 짙은 간장 윤기 닭다리 + 청양고추
  'ganjang-chicken': () => dish('ganjang-chicken', 'steam', (o, s) => { chickenBox(o, '#cfa06a'); drumstick(o, 11, 14, SOYGLAZE, 1, s, '#2a1206'); drumstick(o, 17, 17, SOYGLAZE, -1, s + 1, '#2a1206'); part(o, '#2c5a1e', l => { for (const [x, y] of [[8, 18], [20, 12], [15, 11]] as const) { l.p(x, y, '#5fae3f'); l.p(x + 1, y, '#3c7d2a'); } }); return '#5a3a1f'; }),
  // V자로 꺾인 날개 넷
  'chicken-wing': () => dish('chicken-wing', 'steam', (o, s) => { chickenBox(o, '#e0b47e'); wing(o, 9, 14, GOLD, s, '#7a4a14'); wing(o, 19, 13, GOLD, s + 1, '#7a4a14', true); wing(o, 11, 19, GOLD, s + 2, '#7a4a14', true); wing(o, 18, 19, GOLD, s + 3, '#7a4a14'); return '#5a3a1f'; }),
  // 하얀 단면이 줄줄이 보이는 큰 돈가스 + 양배추 + 소스 지그재그
  'deungsim-katsu': () => dish('deungsim-katsu', 'steam', (o, s) => { plate(o, 'white', true); cabbage(o, 23, 17, 4, 3, s); cutletSliced(o, 4, 15, 16, '#d9933a', '#fbf2e2', s, 5, 5); zigzag(o, 5, 18, 16, '#5a2a10'); return PLATE_OUT.white!; }),
  // 도톰한 원통 안심 조각(둥근 단면)
  'ansim-katsu': () => dish('ansim-katsu', 'steam', (o, s) => { plate(o, 'cream', true); for (const [x, y] of [[8, 17], [14, 15], [20, 17], [14, 20]] as const) part(o, '#7a4a14', l => { l.e(x, y, 3, 3, (xx, yy, u, v) => (Math.sqrt(u * u + v * v) < 0.55 ? '#fbeedc' : lit(GOLD, u, v, h2(xx, yy, s)))); }); dipDish(o, 25, 21, '#5a2a10'); return PLATE_OUT.cream!; }),
  // 단면에서 치즈가 쭉 늘어난다
  'cheese-katsu': () => dish('cheese-katsu', 'steam', (o, s) => { plate(o, 'blue', true); cutletSliced(o, 5, 16, 14, '#dc9a3e', '#ffd84a', s, 4, 5); cheesePull(o, 11, 9, 16); part(o, '#c89a1a', l => { l.e(12, 9, 3, 1, '#ffe27a'); }); cabbage(o, 24, 18, 3, 2, s); return PLATE_OUT.blue!; }),
  // 연한 닭가스 + 레몬 + 소스 종지
  'chicken-katsu': () => dish('chicken-katsu', 'steam', (o, s) => { plate(o, 'cream', true); cutletSliced(o, 6, 15, 15, '#e8b45a', '#fbf6ea', s, 3, 6); limeWedge(o, 24, 15, '#e8c21a', '#fff07a'); dipDish(o, 24, 21, '#6a3418'); return PLATE_OUT.cream!; }),
  // 물고기 모양 튀김 둘 + 하얀 타르타르
  'fish-katsu': () => dish('fish-katsu', 'steam', (o, s) => { plate(o, 'green', true); for (const [x, y] of [[9, 15], [12, 20]] as const) part(o, '#7a5a1a', l => { l.e(x, y, 5, 2, (xx, yy, u, v) => lit(ramp('#e3b05a'), u, v, h2(xx, yy, s))); l.r(x + 5, y - 1, 1, 3, '#d9a04a'); l.p(x + 6, y - 2, '#d9a04a'); l.p(x + 6, y + 2, '#c8902a'); l.p(x - 3, y - 1, '#2a2420'); }); part(o, '#a8a088', l => { l.e(23, 17, 3, 2, '#fbfaf3'); l.p(22, 16, '#ffffff'); l.p(24, 17, '#6cc04f'); }); return PLATE_OUT.green!; }),
  // 꼬리 세운 새우튀김 + 주황 소스
  'saeu-tangsuyuk': () => dish('saeu-tangsuyuk', 'steam', (o, s) => { const a = plate(o, 'blue'); soup(o, a, '#f29a5a', s); shrimpTempura(o, 7, 21, 8); shrimpTempura(o, 13, 22, 9); shrimpTempura(o, 19, 21, 8); return PLATE_OUT.blue!; }),
  // 마른 고추가 우수수한 라조기
  lajogi: () => dish('lajogi', 'steam', (o, s) => { plate(o, 'white'); for (const [x, y] of [[9, 18], [15, 17], [20, 19], [12, 21]] as const) nugget(o, x, y, '#c8642a', s + x, 3, 2, '#5a1e0a', true); for (const [x, y, f] of [[6, 15, false], [17, 14, true], [23, 16, false], [18, 22, true], [7, 21, false]] as const) driedChili(o, x, y, f); return PLATE_OUT.white!; }),
  // 납작한 완자 + 갈색 소스 + 청경채
  nanjawanseu: () => dish('nanjawanseu', 'steam', (o, s) => { const a = plate(o, 'cream'); soup(o, a, '#6a3418', s); for (const [x, y] of [[10, 18], [17, 17], [13, 21]] as const) part(o, '#2a1206', l => l.e(x, y, 3, 2, (xx, yy, u, v) => lit(ramp('#8a4a26'), u, v, h2(xx, yy, s)))); leaves(o, 22, 19, 2, 1, s, '#5fae3f'); shiitake(o, 21, 15); return PLATE_OUT.cream!; }),
  // 짤막한 떡 막대를 엇갈려 쌓은 떡강정
  'tteok-gangjeong': () => dish('tteok-gangjeong', 'none', (o, s) => { plate(o, 'white', true); for (let i = 0; i < 6; i++) { const x = 5 + (i % 3) * 7, y = 15 + Math.floor(i / 3) * 4; part(o, '#5a1a0a', l => { l.r(x, y, 6, 2, '#d8622c'); l.r(x, y, 6, 1, '#f08a4a'); l.p(x + 1, y, '#ffd0a0'); }); } scatter(o, { cx: 16, cy: 18, rx: 9, ry: 3 }, 'peanut4 sesame6', s); return PLATE_OUT.white!; }),
  // 하얀 튀김 덩이 + 따로 담은 주황 소스 그릇
  tangsuyuk: () => dish('tangsuyuk', 'steam', (o, s) => { plate(o, 'cream', true); for (const [x, y] of [[6, 18], [11, 16], [16, 18], [9, 21], [14, 21]] as const) nugget(o, x, y, '#f0c27a', s + x, 3, 2, '#8a5a1a'); part(o, '#7d7466', l => { l.e(24, 15, 5, 3, '#f3efe6'); l.e(24, 14, 4, 2, (x, y) => (h2(x, y, s) > 0.7 ? '#7cc35f' : h2(x, y, s + 1) > 0.75 ? '#f39a3b' : '#f6a050')); }); return PLATE_OUT.cream!; }),
  // 빨간 윤기 + 초록·빨간 피망
  kkanpunggi: () => dish('kkanpunggi', 'steam', (o, s) => { plate(o, 'slate'); for (const [x, y] of [[8, 18], [14, 17], [20, 18], [11, 21], [17, 21]] as const) nugget(o, x, y, '#c4472a', s + y, 2, 2, '#4a0e06', true); for (const [x, y, c] of [[6, 15, '#5fae3f'], [17, 14, '#e8402e'], [24, 16, '#5fae3f'], [22, 21, '#e8402e']] as const) part(o, mix(c, '#000000', 0.5), l => l.r(x, y, 2, 2, c)); return PLATE_OUT.slate!; }),
  // 종이컵 위로 넘치는 끈적한 닭강정 + 땅콩
  dakgangjeong: () => dish('dakgangjeong', 'none', (o, s) => { paperCup(o); for (const [x, y] of [[10, 11], [15, 9], [20, 11], [13, 13], [18, 13], [16, 6]] as const) nugget(o, x, y, '#b8401f', s + x + y, 3, 2, '#4a0e06', true); scatter(o, { cx: 15, cy: 10, rx: 6, ry: 3 }, 'peanut5', s); return '#7a2a1a'; }),
  // 뼈 없는 동글 조각이 가득
  'boneless-chicken': () => dish('boneless-chicken', 'steam', (o, s) => { chickenBox(o, '#c79a62'); for (const [x, y] of [[8, 13], [13, 12], [18, 12], [10, 17], [15, 16], [20, 16], [13, 20]] as const) nugget(o, x, y, '#e8a84a', s + x * y, 3, 2, '#8a5214'); return '#5a3a1f'; }),
  // 넓적하게 펼친 꿔바로우 판 셋
  guobaorou: () => dish('guobaorou', 'steam', (o, s) => { plate(o, 'white', true); for (const [x, y] of [[10, 16], [18, 18], [12, 21]] as const) part(o, '#a8843a', l => l.e(x, y, 6, 2, (xx, yy, u, v) => (h2(xx, yy, s) > 0.86 ? '#ffffff' : lit(ramp('#f6dca0'), u, v, h2(xx, yy, s + 1))))); julienne(o, 23, 14, 2, '#f39a3b', s); herbSprig(o, 5, 20); return PLATE_OUT.white!; }),
  // 꼬챙이에 꽂은 핫도그 + 케첩 지그재그 + 설탕
  hotdog: () => dish('hotdog', 'none', (o, s) => { const a = paperTray(o, '#f2b84a'); part(o, '#8a6a3a', l => line(l, 11, 26, 14, 19, '#e8d4a8')); part(o, '#6a3e12', l => { l.e(17, 12, 4, 8, (x, y, u, v) => lit(ramp('#e8a84a'), u, v, h2(x, y, s))); }); part(o, null, l => { for (let y = 6; y <= 17; y++) l.p(17 + ((y % 4) < 2 ? -1 : 1), y, '#d8241a'); for (const [x, y] of [[15, 8], [19, 13], [16, 16], [18, 6]] as const) l.p(x, y, '#ffffff'); }); scatter(o, { ...a, cx: 24, rx: 2, ry: 1 }, 'pickle', s); return '#7a5214'; }),
  // 돈가스를 덮은 달걀물 + 파
  katsudon: () => dish('katsudon', 'steam', (o, s) => { const a = vessel(o, 'lacquer', -1); riceDome(o, a.cx, a.cy, a.rx - 1, a.ry, s); cutletSliced(o, 6, 11, 18, '#d9933a', '#fbf2e2', s, 5, 4); part(o, null, l => l.e(16, 12, 8, 2, (x, y) => (h2(x, y, s + 3) > 0.55 ? (h2(x, y, s + 4) > 0.5 ? '#ffe27a' : '#fff6d8') : null))); onionHeap(o, 15, 10, 3, s); return BOWL_OUT.lacquer!; }),
  // 하늘로 솟은 새우튀김 둘 + 단호박·깻잎 튀김
  tendon: () => dish('tendon', 'steam', (o, s) => { const a = vessel(o, 'lacquer', 1); riceDome(o, a.cx, a.cy, a.rx - 1, a.ry, s); shrimpTempura(o, 10, 15, 11); shrimpTempura(o, 16, 15, 10); part(o, '#8a5a1a', l => { l.e(22, 13, 3, 2, (x, y, u, v) => (v < -0.3 ? '#2f8a3a' : '#f6b03a')); }); perilla(o, 8, 15, s); return BOWL_OUT.lacquer!; }),
};

/* ===================== 고기 당기는 거 ===================== */
const MEAT: Record<string, () => FoodGrid> = {
  // 반짝이는 족발 덩이(뼈) + 썬 조각
  jokbal: () => dish('jokbal', 'none', (o, s) => { plate(o, 'cream', true); hock(o, 10, 15, s); slicesFan(o, 9, 19, 4, '#d9a888', '#6a3418', s, 4); part(o, '#2c5a1e', l => { l.p(25, 22, '#5fae3f'); l.p(26, 22, '#3c7d2a'); }); return PLATE_OUT.cream!; }),
  // 석쇠 위 줄무늬 삼겹살 셋 + 마늘
  samgyeopsal: () => dish('samgyeopsal', 'steam', (o, s) => { grill(o); bellyStrip(o, 6, 16, 8, s); bellyStrip(o, 15, 18, 8, s + 1); bellyStrip(o, 9, 21, 8, s + 2); scatter(o, { cx: 22, cy: 23, rx: 3, ry: 1 }, 'garlic3', s); return '#0e0c10'; }),
  // 빨간 고추장 양념 삼겹살
  'gochujang-samgyeopsal': () => dish('gochujang-samgyeopsal', 'steam', (o, s) => { skillet(o, 1); bellyStrip(o, 5, 16, 8, s, '#d0402a'); bellyStrip(o, 14, 18, 8, s + 1, '#c8382a'); bellyStrip(o, 7, 20, 8, s + 2, '#d84a2a'); part(o, '#a89ab0', l => { l.e(23, 16, 2, 1, '#f4eef6'); }); return '#120e0d'; }),
  // 둥근 불고기판 + 얇은 고기 + 당면 + 버섯
  'so-bulgogi': () => dish('so-bulgogi', 'steam', (o, s) => { o.e(16, 21, 14, 6, (x, y, u, v) => (v > 0.5 ? '#6a4a1a' : u < -0.4 ? '#e8c060' : '#b88a2a')); const a: Area = { cx: 16, cy: 19, rx: 11, ry: 4 }; soup(o, a, '#7a4026', s); part(o, '#3a1a0a', l => { for (let k = 0; k < 6; k++) line(l, 7 + k * 3, 17 + (k % 2), 10 + k * 3, 19 + (k % 2), k % 2 ? '#8a4a2c' : '#a85a36'); }); part(o, null, l => { for (let x = 8; x < 24; x++) l.p(x, 22 + Math.round(Math.sin(x)), '#d8c8a8'); }); shiitake(o, 22, 16); longOnion(o, 6, 15, 12, 14); return '#3a2a0a'; }, 15),
  // 뼈가 옆으로 나온 양념 갈비 + 석쇠 자국
  'so-galbi': () => dish('so-galbi', 'steam', (o, s) => { grill(o); for (const [y, x] of [[16, 6], [20, 9]] as const) { steakSlab(o, x + 7, y, 7, 2, '#8a3e26', s + y); bone(o, x - 2, y, x + 1, y); } scatter(o, { cx: 16, cy: 18, rx: 8, ry: 3 }, 'sesame6', s); return '#0e0c10'; }),
  // 둥근 떡갈비 둘(석쇠 자국) + 잣
  tteokgalbi: () => dish('tteokgalbi', 'steam', (o, s) => { plate(o, 'white'); leaves(o, 22, 18, 3, 2, s); steakSlab(o, 10, 18, 4, 3, '#7a3e26', s); steakSlab(o, 16, 15, 4, 3, '#8a4426', s + 1); scatter(o, { cx: 13, cy: 16, rx: 5, ry: 2 }, 'pine4', s); return PLATE_OUT.white!; }),
  // 팬 위 빨간 오리 + 깻잎 + 부추
  'ori-bulgogi': () => dish('ori-bulgogi', 'steam', (o, s) => { skillet(o, -1); for (const [x, y] of [[8, 19], [13, 21], [18, 19], [12, 17]] as const) part(o, '#5a0e0a', l => { l.r(x - 2, y, 5, 1, '#fbe0d0'); l.r(x - 2, y + 1, 5, 2, '#c44a2c'); }); perilla(o, 19, 15, s); onionHeap(o, 10, 23, 3, s); return '#120e0d'; }),
  // 가장자리 갈색 + 분홍 속 훈제오리 편 부채꼴
  'hunje-ori': () => dish('hunje-ori', 'none', (o, s) => { plate(o, 'green', true); slicesFan(o, 4, 15, 5, '#f2a8a0', '#8a3a1a', s, 4); onionHeap(o, 20, 21, 4, s); part(o, '#8a6a1a', l => l.e(8, 21, 2, 1, '#e8b81a')); return PLATE_OUT.green!; }),
  // 나무 도마 위 석쇠 자국 스테이크 + 로즈메리 + 마늘
  'deungsim-steak': () => dish('deungsim-steak', 'steam', (o, s) => { board(o, '#a8743a'); steakSlab(o, 13, 15, 8, 4, '#7a3a26', s); part(o, '#5a1a10', l => { l.r(16, 12, 3, 4, '#e86a6a'); l.r(16, 12, 3, 1, '#f6a0a0'); }); herbSprig(o, 23, 17, '#3f7a3a'); scatter(o, { cx: 6, cy: 21, rx: 2, ry: 1 }, 'garlic2', s); return mix('#a8743a', '#000000', 0.55); }),
  // 데미소스 패티 위 달걀프라이
  'hambak-steak': () => dish('hambak-steak', 'steam', (o, s) => { const a = plate(o, 'white'); soup(o, { ...a, rx: a.rx - 1 }, '#5a2a14', s); steakSlab(o, 14, 18, 7, 3, '#6a3a22', s, false); friedEgg(o, 14, 15, 5, 2, s); scatter(o, { cx: 24, cy: 20, rx: 2, ry: 1 }, 'corn4', s); return PLATE_OUT.white!; }),
  // 돌솥 속 뼈 붙은 갈비찜 + 밤·대추·당근
  'so-galbijjim': () => dish('so-galbijjim', 'steam', (o, s) => { inBowl(o, 'stone', '#6a3018', s, -1, 1); bone(o, 8, 13, 15, 9, '#7a3a1e', s); bone(o, 15, 16, 22, 11, '#8a4220', s + 1); chestnut(o, 20, 15); jujube(o, 11, 16); part(o, '#8a3a0a', l => { l.r(23, 13, 2, 2, '#f39a3b'); }); return BOWL_OUT.stone!; }),
  // 냄비 속 빨간 돼지갈비 + 감자
  'dwaeji-galbijjim': () => dish('dwaeji-galbijjim', 'steam', (o, s) => { const a = hotpot(o); soup(o, a, '#b8432a', s); bone(o, 7, 14, 13, 10, '#c8502a', s); bone(o, 12, 16, 18, 12, '#b8462a', s + 1); potato(o, 22, 14, s); return '#4f5862'; }),
  // 뼈끝이 나란히 선 등갈비 한 대
  deunggalbijjim: () => dish('deunggalbijjim', 'steam', (o, s) => { plate(o, 'cream', true); ribRack(o, 7, 18, 5, '#c4452a', s); scatter(o, { cx: 15, cy: 19, rx: 8, ry: 2 }, 'sesame6 scal3', s); return PLATE_OUT.cream!; }),
  // 얇게 썬 수육을 겹쳐 놓고 + 부추 + 소스
  'so-suyuk': () => dish('so-suyuk', 'steam', (o, s) => { plate(o, 'blue', true); slicesFan(o, 4, 16, 5, '#d9b29c', '#9a6a52', s, 4); onionHeap(o, 14, 22, 5, s); dipDish(o, 25, 15, '#c9a46a'); return PLATE_OUT.blue!; }),
  // 석쇠 위 노릇한 곱창 고리 가득 + 부추
  'so-gopchang': () => dish('so-gopchang', 'steam', (o, s) => { grill(o); for (const [x, y] of [[8, 18], [13, 17], [18, 18], [23, 19], [11, 21], [16, 21], [21, 22]] as const) tubeRing(o, x, y, '#e8b05a', s + x); onionHeap(o, 15, 14, 3, s); return '#0e0c10'; }),
  // 밥 + 윤기 나는 데리야끼 닭 + 마요 지그재그
  'chicken-teriyaki': () => dish('chicken-teriyaki', 'steam', (o, s) => { const a = plate(o, 'white', true); riceDome(o, a.cx - 6, a.cy - 1, 5, 3, s); for (const [x, y] of [[17, 17], [21, 19], [24, 16]] as const) nugget(o, x, y, '#8a4a1e', s + x, 3, 2, '#2a1206', true); zigzag(o, 15, 26, 15, '#fbfaf3'); scatter(o, { cx: 20, cy: 18, rx: 4, ry: 2 }, 'sesame4', s); return PLATE_OUT.white!; }),
  // 간장색 찜닭 + 투명한 당면 가닥 + 감자
  jjimdak: () => dish('jjimdak', 'steam', (o, s) => { const a = plate(o, 'white', true, 1); soup(o, { ...a, rx: a.rx + 1 }, '#4a2412', s); part(o, null, l => { for (let k = 0; k < 4; k++) for (let x = 5; x < 27; x++) l.p(x, 16 + k * 2 + Math.round(Math.sin(x * 0.7 + k) * 1), '#c8b8a0'); }); drumstick(o, 11, 16, ramp('#8a5a2a'), 1, s, '#2a1206'); potato(o, 21, 19, s, '#d9a85a'); driedChili(o, 16, 21); return PLATE_OUT.white!; }),
  // 하얀 비계 띠 보쌈 편 + 빨간 무김치 + 배춧잎
  bossam: () => dish('bossam', 'none', (o, s) => { plate(o, 'green', true); slicesFan(o, 4, 15, 4, '#e8a088', '#fffaf2', s, 4); part(o, '#6a1a0e', l => l.e(22, 18, 4, 3, (x, y) => (h2(x, y, s) > 0.6 ? '#f6c8a8' : '#d8402a'))); leaves(o, 10, 21, 4, 1, s, '#c8e09a'); return PLATE_OUT.green!; }),
  // 석쇠 위 굵고 둥근 막창 + 쌈장 종지
  'beef-makchang': () => dish('beef-makchang', 'steam', (o, s) => { grill(o); for (const [x, y] of [[8, 18], [14, 17], [10, 22], [16, 21]] as const) part(o, '#5a3410', l => l.e(x, y, 3, 2, (xx, yy, u, v) => (Math.abs(u) < 0.35 && Math.abs(v) < 0.5 ? '#3a2410' : lit(ramp('#d9a05a'), u, v, h2(xx, yy, s))))); dipDish(o, 24, 18, '#8a5a2a'); return '#0e0c10'; }),
  // 나무 꼬치 둘(닭·대파 번갈아)
  'dak-kkochi': () => dish('dak-kkochi', 'steam', (o, s) => { board(o, '#d9a46a'); skewer(o, 7, 14, '#c4542a', s); skewer(o, 9, 19, '#d0602a', s + 1); return mix('#d9a46a', '#000000', 0.55); }),
};

/* ===================== 색다른 거 ===================== */
/** 둥근 피자 판(테두리 빵·치즈·소스). */
function pizzaPie(o: Layer, cx: number, cy: number, rx: number, ry: number, sauce: string, cheese: string, seed: number): void {
  part(o, '#7a4a1a', l => {
    l.e(cx, cy, rx, ry, (x, y, u, v) => lit(ramp('#e2a04a'), u, v, h2(x, y, seed)));
    l.e(cx, cy, rx - 2, ry - 1, (x, y) => (h2(x, y, seed + 3) > 0.3 ? (h2(x, y, seed + 4) > 0.85 ? '#fff6c8' : cheese) : sauce));
  });
}
function pizzaBox(o: Layer): void { o.r(2, 13, 28, 14, '#d7a66d'); o.r(2, 13, 28, 1, '#ebc38d'); o.r(2, 26, 28, 1, '#a97843'); o.r(28, 14, 2, 12, '#b98648'); }
/** 포크로 감은 파스타 둥지. */
function pastaNest(o: Layer, cx: number, cy: number, c: string, seed: number): void {
  const r = ramp(c);
  part(o, r[3], l => l.e(cx, cy, 8, 4, (x, y, u, v) => { const k = Math.floor(Math.sqrt((x - cx) ** 2 + ((y - cy) * 2) ** 2) + Math.atan2(y - cy, x - cx) * 1.5 + seed) % 2; return u < -0.3 && v < -0.2 && k === 0 ? r[0] : k === 0 ? r[1] : r[2]; }));
}
const FOREIGN: Record<string, () => FoodGrid> = {
  // 밥 언덕 + 노란 카레 웅덩이 + 큼직한 감자·당근
  'curry-rice': () => dish('curry-rice', 'steam', (o, s) => { const a = plate(o, 'white', true); soup(o, { cx: a.cx + 4, cy: a.cy, rx: 9, ry: 3 }, '#e0a42a', s); riceDome(o, a.cx - 6, a.cy - 2, 5, 3, s); potato(o, 19, 18, s, '#f6dc8a'); part(o, '#8a3a0a', l => { l.r(23, 18, 3, 2, '#f39a3b'); l.p(23, 18, '#ffc07a'); }); part(o, '#3a1a0a', l => l.r(16, 20, 2, 2, '#8a5a3a')); return PLATE_OUT.white!; }),
  // 밥 + 짙은 갈색 소스 + 얇게 썬 양송이
  'hayashi-rice': () => dish('hayashi-rice', 'steam', (o, s) => { const a = plate(o, 'cream', true); soup(o, { cx: a.cx + 4, cy: a.cy, rx: 9, ry: 3 }, '#6a2a14', s); riceDome(o, a.cx - 6, a.cy - 2, 5, 3, s); for (const [x, y] of [[18, 17], [22, 19], [24, 16]] as const) part(o, '#6a5040', l => { l.e(x, y, 2, 1, (xx, yy, u, v) => (v > 0.3 ? '#c8b496' : '#f2e6d0')); l.p(x, y + 1, '#c8b496'); }); return PLATE_OUT.cream!; }),
  // 납작 쌀국수 볶음 + 새우 + 라임 + 땅콩
  'pad-thai': () => dish('pad-thai', 'steam', (o, s) => { const a = plate(o, 'green'); noodleNest(o, a.cx, a.cy - 1, a.rx, a.ry, '#e8a85a', s, true, '#8a5a1a'); shrimp(o, 12, 16, false); shrimp(o, 18, 17, true); limeWedge(o, 24, 20); sprouts(o, 8, 20, 2, 1, s); scatter(o, { cx: 15, cy: 18, rx: 5, ry: 2 }, 'peanut4', s); return PLATE_OUT.green!; }),
  // 숯불 고기 완자 담긴 국물 그릇 + 하얀 쌀국수 다발 + 허브
  'bun-cha': () => dish('bun-cha', 'none', (o, s) => { plate(o, 'white', true); part(o, '#c8c0a8', l => { for (let k = 0; k < 4; k++) l.e(8, 19 + k % 2, 4, 2, (x, y) => ((x + y + k) % 2 ? '#fbf8f0' : '#efe8d8')); }); part(o, '#7a6648', l => { l.e(21, 15, 6, 3, '#f3e4c4'); l.e(21, 14, 5, 2, '#e8b88a'); }); ball(o, 19, 13, '#7a4026', s); ball(o, 23, 14, '#6a3a22', s + 1); herbSprig(o, 13, 21); return PLATE_OUT.white!; }),
  // 속이 비치는 라이스페이퍼 말이 셋
  wolnamssam: () => dish('wolnamssam', 'none', (o, s) => { board(o, '#e8d0a0'); for (let i = 0; i < 3; i++) { const x = 4 + i * 8, y = 13 + (i % 2) * 2; part(o, '#a8a090', l => { l.r(x, y, 7, 5, '#f6f2ea'); l.r(x, y, 7, 1, '#ffffff'); for (let k = 1; k < 6; k++) l.p(x + k, y + 2, ['#ff9a6b', '#7cc35f', '#f39a3b', '#d8a8e0', '#7cc35f'][k - 1]!); for (let k = 1; k < 6; k += 2) l.p(x + k, y + 3, '#9fd06e'); }); } dipDish(o, 25, 21, '#e8803a'); return mix('#e8d0a0', '#000000', 0.55); }),
  // 상자 속 피자 + 큼직한 페퍼로니 동그라미
  'pizza-pepperoni': () => dish('pizza-pepperoni', 'steam', (o, s) => { pizzaBox(o); pizzaPie(o, 16, 19, 12, 6, '#c8402a', '#ffdb6a', s); for (const [x, y] of [[10, 17], [16, 16], [22, 18], [13, 21], [19, 21], [8, 20]] as const) part(o, '#6a120a', l => { l.e(x, y, 1, 1, '#c8342a'); l.p(x - 1, y - 1, '#ff6a4a'); }); return '#5a3a1f'; }),
  // 치즈가 쭉 늘어나는 한 조각
  'pizza-cheese': () => dish('pizza-cheese', 'steam', (o, s) => { plate(o, 'white'); pizzaPie(o, 13, 21, 10, 3, '#d9562a', '#ffe27a', s); pizzaSlice(o, 18, 6, '#d9562a', '#ffe27a', s); cheesePull(o, 15, 14, 19); return PLATE_OUT.white!; }),
  // 쟁반 위 갖가지 토핑(올리브 고리·피망·버섯·페퍼로니)
  'pizza-combination': () => dish('pizza-combination', 'steam', (o, s) => { o.e(16, 22, 15, 6, (x, y, u, v) => (v > 0.5 ? '#7c8792' : '#c9d1d9')); pizzaPie(o, 16, 20, 13, 6, '#c8402a', '#ffd86a', s); for (const [x, y] of [[9, 18], [20, 22]] as const) part(o, '#0a0a0a', l => { l.e(x, y, 1, 1, '#2a2a2a'); l.p(x, y, '#ffd86a'); }); for (const [x, y] of [[14, 17], [23, 19]] as const) part(o, '#2c5a1e', l => { l.r(x, y, 3, 1, '#5fae3f'); }); for (const [x, y] of [[17, 20], [11, 22]] as const) part(o, '#6a120a', l => l.e(x, y, 1, 1, '#c8342a')); shiitake(o, 21, 17); return '#4f5862'; }, 15),
  // 나무 판 위 불고기·대파 듬뿍 피자
  'pizza-bulgogi': () => dish('pizza-bulgogi', 'steam', (o, s) => { board(o, '#c99460'); pizzaPie(o, 15, 18, 12, 6, '#a8542a', '#ffd06a', s); part(o, '#2a1206', l => { for (let k = 0; k < 6; k++) line(l, 8 + k * 3, 16 + (k % 2) * 3, 10 + k * 3, 17 + (k % 2) * 3, '#7a4026'); }); onionHeap(o, 15, 19, 6, s); return mix('#c99460', '#000000', 0.55); }),
  // 감자 웨지 + 마요 격자 + 옥수수
  'pizza-potato': () => dish('pizza-potato', 'steam', (o, s) => { pizzaBox(o); pizzaPie(o, 16, 19, 12, 6, '#e8c08a', '#ffe08a', s); for (const [x, y] of [[9, 17], [15, 16], [20, 18], [12, 21], [19, 21]] as const) part(o, '#8a5a1a', l => { l.r(x, y, 3, 1, '#f6c86a'); l.p(x, y + 1, '#d9963a'); l.p(x + 2, y - 1, '#d9963a'); }); zigzag(o, 7, 25, 19, '#fbfaf3'); scatter(o, { cx: 16, cy: 19, rx: 8, ry: 3 }, 'corn4', s); return '#5a3a1f'; }),
  // 포크로 감은 면 + 빨간 소스 + 바질
  'pasta-tomato': () => dish('pasta-tomato', 'steam', (o, s) => { plate(o, 'white'); pastaNest(o, 15, 18, '#f2d27a', s); part(o, '#7a1a10', l => l.e(15, 16, 4, 2, (x, y, u, v) => lit(ramp('#d23a2a'), u, v, h2(x, y, s)))); herbSprig(o, 12, 16, '#2f8a3a'); fork(o, 18, 16); return PLATE_OUT.white!; }),
  // 하얀 크림 + 분홍 베이컨 + 버섯 + 파슬리
  'pasta-cream': () => dish('pasta-cream', 'steam', (o, s) => { const a = plate(o, 'cream'); soup(o, { ...a, rx: a.rx }, '#f6ecd6', s); pastaNest(o, 16, 18, '#f2d27a', s); for (const [x, y] of [[12, 16], [19, 17], [15, 20]] as const) part(o, '#8a3a2a', l => { l.r(x, y, 3, 1, '#f2a090'); l.r(x, y + 1, 3, 1, '#fff2ea'); }); shiitake(o, 21, 20); scatter(o, a, 'herb3', s); return PLATE_OUT.cream!; }),
  // 반짝이는 오일 면 + 편마늘 + 고추 플레이크
  'pasta-oil': () => dish('pasta-oil', 'steam', (o, s) => { plate(o, 'blue'); pastaNest(o, 16, 18, '#f6d86a', s); part(o, null, l => { for (const [x, y] of [[11, 16], [19, 15], [14, 20], [21, 19]] as const) { l.p(x, y, '#ffffff'); } }); for (const [x, y] of [[12, 17], [18, 17], [16, 20], [21, 18]] as const) part(o, '#c8b88a', l => l.r(x, y, 2, 1, '#fbf6e2')); scatter(o, { cx: 16, cy: 18, rx: 6, ry: 3 }, 'chiliflake6 herb2', s); return PLATE_OUT.blue!; }),
  // 빨간 면 위 큰 홍합 둘 + 새우
  'pasta-seafood-tomato': () => dish('pasta-seafood-tomato', 'steam', (o, s) => { plate(o, 'green'); pastaNest(o, 16, 18, '#e8a060', s); mussel(o, 10, 16); mussel(o, 21, 19); shrimp(o, 16, 14, false, '#ff8a5a', true); return PLATE_OUT.green!; }),
  // 빨간 면 위 큼직한 미트볼 셋
  'pasta-meatball': () => dish('pasta-meatball', 'steam', (o, s) => { plate(o, 'slate'); pastaNest(o, 16, 19, '#f2d27a', s); part(o, '#7a1a10', l => l.e(16, 17, 6, 2, '#c8341f')); ball(o, 11, 16, '#7a4026', s, 3); ball(o, 18, 15, '#6a3a22', s + 1, 3); ball(o, 15, 19, '#7a4026', s + 2, 2); return PLATE_OUT.slate!; }),
  // U자 껍질 타코 둘
  taco: () => dish('taco', 'none', (o, s) => { paperTray(o, '#2f8f5a'); taco(o, 10, 17, s); taco(o, 21, 16, s + 1); return '#1c4a30'; }),
  // 단면이 보이는 부리또 반쪽 + 라임
  burrito: () => dish('burrito', 'none', (o, s) => { paperTray(o, '#d9a43a'); burritoHalf(o, 15, 16, ['#7cc35f', '#c8402a', '#f2d27a', '#8a5a3a', '#fbf6ea'], s); limeWedge(o, 25, 21); return '#7a5214'; }),
  // 피타 주머니 위로 고기·상추가 넘치는 케밥
  kebab: () => dish('kebab', 'none', (o, s) => { paperTray(o, '#3d6fb6'); pita(o, 14, 17, s); part(o, '#5a0a0a', l => { l.p(23, 15, '#e8402e'); l.p(24, 16, '#c8281a'); l.p(23, 17, '#e8402e'); }); return '#1c3a5a'; }),
  // 비스듬히 놓인 긴 바게트 반미 + 채소 줄
  'banh-mi': () => dish('banh-mi', 'none', (o, s) => { board(o, '#c99460'); baguette(o, 3, 17, 26, ['#f39a3b', '#7cc35f', '#a35a3c', '#fbf6ea'], s); herbSprig(o, 22, 12); return mix('#c99460', '#000000', 0.55); }),
};

/* ===================== 가볍고 속 편한 거 ===================== */
const LIGHT: Record<string, () => FoodGrid> = {
  // 잎채소 위 부채꼴 닭가슴살 + 방울토마토
  'salad-chicken': () => dish('salad-chicken', 'none', (o, s) => { const a = vessel(o, 'wood'); leaves(o, a.cx, a.cy - 1, 10, 3, s); slicesFan(o, 9, 10, 3, '#f6e6d2', '#d9b48a', s, 4); tomatoHalf(o, 22, 12); tomatoHalf(o, 7, 15); return BOWL_OUT.wood!; }),
  // 잎채소 위 참치 더미 + 옥수수 + 보라 양파 고리
  'salad-tuna': () => dish('salad-tuna', 'none', (o, s) => { const a = vessel(o, 'clear', 1, 1); leaves(o, a.cx, a.cy - 1, 10, 3, s, '#8fd06a'); part(o, '#a8806a', l => l.e(16, 11, 4, 2, (x, y) => ((x + y) % 2 ? '#f3c6a8' : '#fbe2cf'))); part(o, '#6a3a7a', l => { l.e(10, 14, 2, 1, (x, y, u, v) => (Math.abs(u) < 0.5 && Math.abs(v) < 0.5 ? '#f6eaf6' : '#b878c8')); }); scatter(o, { cx: 21, cy: 13, rx: 3, ry: 2 }, 'corn5', s); return BOWL_OUT.clear!; }),
  // 주황 단호박 무스 두 덩이 + 건포도
  'salad-pumpkin': () => dish('salad-pumpkin', 'none', (o, s) => { const a = vessel(o, 'white', -1, -1); leaves(o, a.cx, a.cy, 9, 2, s, '#a8db7f'); ball(o, 12, 12, '#f2a82a', s, 3); ball(o, 19, 11, '#f6b83a', s + 1, 3); scatter(o, { cx: 15, cy: 12, rx: 6, ry: 2 }, 'raisin4', s); return BOWL_OUT.white!; }),
  // 큰 토마토 반쪽 + 오이 동그라미 + 잎
  'salad-vegetable': () => dish('salad-vegetable', 'none', (o, s) => { const a = vessel(o, 'wood', 2, -1); leaves(o, a.cx, a.cy - 1, 11, 3, s, '#6fbf4a'); tomatoHalf(o, 9, 12); tomatoHalf(o, 18, 10); cucumberRound(o, 14, 14); cucumberRound(o, 22, 14); julienne(o, 12, 9, 2, '#f39a3b', s); return BOWL_OUT.wood!; }),
  // 초록빛 죽 위 껍데기째 전복
  'jeonbok-juk': () => dish('jeonbok-juk', 'steam', (o, s) => { const a = inBowl(o, 'celadon', '#ddd8a0', s); abalone(o, 15, 13); scatter(o, a, 'sesame5', s); noriShreds(o, 22, 15, 2, s); return BOWL_OUT.celadon!; }),
  // 샛노란 호박죽 + 새알심 + 호박씨
  'hobak-juk': () => dish('hobak-juk', 'steam', (o, s) => { inBowl(o, 'celadon', '#f6a81a', s, -1, 1); for (const [x, y] of [[11, 13], [16, 12], [20, 15], [14, 16]] as const) riceBall(o, x, y); part(o, '#2c5a1e', l => { for (const [x, y] of [[18, 11], [9, 15], [22, 12]] as const) { l.p(x, y, '#7cc35a'); l.p(x + 1, y, '#4f9a3a'); } }); return BOWL_OUT.celadon!; }),
  // 알록달록 잘게 썬 채소가 가득
  'chaeso-juk': () => dish('chaeso-juk', 'steam', (o, s) => { const a = inBowl(o, 'celadon', '#f1e6c8', s, 1, -1); part(o, null, l => l.e(a.cx, a.cy, a.rx - 2, a.ry - 1, (x, y) => { const n = h2(x, y, s); return n > 0.82 ? '#f39a3b' : n > 0.66 ? '#6fbf4a' : n > 0.58 ? '#9a6a45' : null; })); return BOWL_OUT.celadon!; }),
  // 결대로 찢은 닭살 + 파 + 후추
  'dak-juk': () => dish('dak-juk', 'steam', (o, s) => { const a = inBowl(o, 'celadon', '#f1e2bc', s, 2, 1); part(o, '#c8a47a', l => { for (let k = 0; k < 5; k++) line(l, 10 + k * 2, 11 + (k % 2), 12 + k * 2, 15, k % 2 ? '#fbeedc' : '#f1d6b6'); }); onionHeap(o, 21, 13, 2, s); scatter(o, a, 'pepperdot8', s); return BOWL_OUT.celadon!; }),
  // 십자 칼집 표고버섯 둘 + 소고기
  'sogogi-beoseot-juk': () => dish('sogogi-beoseot-juk', 'steam', (o, s) => { const a = inBowl(o, 'celadon', '#e6d4b0', s, -2, -1); shiitake(o, 12, 13); shiitake(o, 19, 14); scatter(o, a, 'meat3:#7a4026 scal3', s); return BOWL_OUT.celadon!; }),
  // 검붉은 팥죽 + 하얀 새알심
  'pat-juk': () => dish('pat-juk', 'steam', (o, s) => { inBowl(o, 'celadon', '#6a2420', s, 1, 1); for (const [x, y] of [[10, 13], [15, 11], [20, 13], [13, 16], [18, 16]] as const) riceBall(o, x, y); return BOWL_OUT.celadon!; }),
  // 까만 흑임자죽 + 하얀 잣 셋 + 대추 채
  'heugimja-juk': () => dish('heugimja-juk', 'steam', (o, s) => { inBowl(o, 'celadon', '#4a4440', s, -1, -1); for (const [x, y] of [[13, 13], [16, 12], [19, 13]] as const) part(o, '#a89878', l => { l.r(x, y, 2, 1, '#fbf1d8'); }); part(o, '#4a0e0a', l => { l.r(14, 15, 4, 1, '#b83a2a'); }); return BOWL_OUT.celadon!; }),
  // 빨간 줄 게맛살 조각이 동동
  'gesal-juk': () => dish('gesal-juk', 'steam', (o, s) => { const a = inBowl(o, 'celadon', '#f2e4c2', s); for (const [x, y] of [[9, 12], [15, 11], [20, 13], [12, 15], [18, 16]] as const) crabStick(o, x, y); scatter(o, a, 'scal3', s); return BOWL_OUT.celadon!; }),
};

/* ===================== 간단한 거 ===================== */
const NORI = '#25332a', RICEW = '#fbfbf5';
/** 도마 위 큰 김밥 단면 셋 + 곁들이. 가운데 속(center)이 메뉴의 표지다. */
function gimbapBoard(id: string, tint: string, center: string, around: string[], extra: (o: Layer, s: number) => void, rx = 4, ry = 3): FoodGrid {
  return dish(id, 'none', (o, s) => { board(o, tint); bigRoll(o, 7, 14, NORI, RICEW, center, around, 0, rx, ry); bigRoll(o, 17, 13, NORI, RICEW, center, around, 2, rx, ry); bigRoll(o, 12, 19, NORI, RICEW, center, around, 1, rx, ry); extra(o, s); return mix(tint, '#000000', 0.55); });
}
const QUICK: Record<string, () => FoodGrid> = {
  // 가운데 분홍 참치마요 + 깻잎 고리
  'chamchi-gimbap': () => gimbapBoard('chamchi-gimbap', '#e2b77f', '#f6c8b0', ['#3f8a2e', '#4f9a3a', '#f6d43a'], (o, s) => { part(o, '#8a6a1a', l => { l.r(24, 18, 4, 2, '#f7d84a'); l.p(24, 18, '#fff08a'); }); }),
  // 가운데 노란 치즈 네모
  'cheese-gimbap': () => gimbapBoard('cheese-gimbap', '#d9a46a', '#ffd84a', ['#ffe486', '#f08c3c', '#4ea24b'], (o, s) => cheeseSlice(o, 22, 17, 5)),
  // 가운데 갈색 소고기 + 깨
  'sogogi-gimbap': () => gimbapBoard('sogogi-gimbap', '#ecc592', '#7a4026', ['#f6d43a', '#4ea24b', '#f08c3c', '#8b5a33'], (o, s) => scatter(o, { cx: 23, cy: 19, rx: 3, ry: 1 }, 'sesame5', s)),
  // 두툼한 롤 가운데 황금빛 돈가스 + 소스
  'donkatsu-gimbap': () => dish('donkatsu-gimbap', 'none', (o, s) => { board(o, '#c99460'); for (const [x, y, t] of [[9, 14, 0], [21, 14, 1]] as const) part(o, '#0a100c', l => { l.e(x, y + 2, 5, 2, '#16201a'); l.e(x, y, 5, 4, (xx, yy, u, v) => { const r = Math.sqrt(u * u + v * v); return r > 0.82 ? NORI : r > 0.55 ? RICEW : r > 0.3 ? (h2(xx, yy, s) > 0.5 ? '#e8a84a' : '#c8862a') : t ? '#4ea24b' : '#fbf2e2'; }); }); zigzag(o, 6, 24, 20, '#5a2a10'); return mix('#c99460', '#000000', 0.55); }),
  // 가운데 빨간 김치
  'kimchi-gimbap': () => gimbapBoard('kimchi-gimbap', '#b98650', '#d8402a', ['#e2553a', '#f6d43a', '#4ea24b'], (o, s) => kimchiChunk(o, 23, 17, 5, s)),
  // 단면 위로 상추가 삐죽
  'salad-gimbap': () => gimbapBoard('salad-gimbap', '#e8c99a', '#a8db7f', ['#7cc35a', '#f6d43a', '#f08c3c'], (o, s) => { for (const [x, y] of [[7, 10], [17, 9], [12, 15]] as const) part(o, '#2a5a1e', l => { l.e(x, y, 2, 1, (xx, yy, u) => (u < 0 ? '#a8db7f' : '#6fbf4a')); }); }),
  // 속 없는 손가락 김밥 + 빨간 오징어무침·섞박지
  'chungmu-gimbap': () => dish('chungmu-gimbap', 'none', (o, s) => { plate(o, 'white', true); for (let i = 0; i < 3; i++) part(o, '#0a100c', l => { l.r(4 + i * 2, 14 + i * 3, 9, 2, NORI); l.p(4 + i * 2, 14 + i * 3, '#46594c'); l.r(13 + i * 2, 14 + i * 3, 1, 2, RICEW); }); for (const [x, y] of [[19, 15], [23, 17], [21, 19]] as const) tofuCube(o, x, y, 3, '#ff9a7a', '#e2553a', '#b8301c'); tentacle(o, 17, 19, '#d8402a', 1, 5); return PLATE_OUT.white!; }),
  // 김 띠를 두른 세모 주먹밥 둘(소고기 알갱이)
  'sogogi-jumeokbap': () => dish('sogogi-jumeokbap', 'none', (o, s) => { plate(o, 'cream', true); onigiri(o, 11, 22, s, '#7a4026'); onigiri(o, 20, 21, s + 1, '#7a4026'); return PLATE_OUT.cream!; }),
  // 도시락 속 노릇한 유부 주머니 넷
  'yubu-chobap': () => dish('yubu-chobap', 'none', (o, s) => { o.r(3, 13, 26, 13, '#2a2526'); o.r(3, 13, 26, 1, '#4a4344'); o.r(3, 25, 26, 1, '#141011'); for (const [x, y] of [[8, 17], [15, 16], [22, 17], [11, 22], [19, 22]] as const) inari(o, x, y, s + x); part(o, '#6a1a2a', l => { l.p(25, 22, '#ef6a7a'); l.p(26, 22, '#d84a5c'); }); return '#0c0a0b'; }),
  // 키 큰 불고기 버거(상추·갈색 패티·소스 흘림)
  'bulgogi-burger': () => dish('bulgogi-burger', 'none', (o, s) => { paperTray(o, '#e8a03a'); burgerTall(o, 15, 22, ['#5a2e18', '#7cc35f', '#f6f2ea'], s); part(o, null, l => { l.p(10, 19, '#5a2a10'); l.p(10, 20, '#5a2a10'); l.p(20, 19, '#5a2a10'); }); part(o, '#8a5a1a', l => { for (let i = 0; i < 3; i++) l.r(25 + i, 14 + i, 1, 6, '#ffd06a'); }); return '#6a4a14'; }),
  // 치즈가 흘러내리는 햄버거 + 감자튀김
  hamburger: () => dish('hamburger', 'none', (o, s) => { paperTray(o, '#cf3b2c'); burgerTall(o, 14, 22, ['#6a3a22', '#ffd84a', '#e24a3a', '#7cc35f'], s); part(o, '#8a5a1a', l => { for (let i = 0; i < 4; i++) l.r(23 + i * 2, 12 + (i % 2), 1, 8, i % 2 ? '#f2c050' : '#ffd86a'); }); return '#6a1a12'; }),
  // 세모 단면: 상추·구운 닭·토마토
  'sandwich-chicken': () => dish('sandwich-chicken', 'none', (o, s) => { board(o, '#efd8b0'); sandwichWedge(o, 11, 10, ['#7cc35f', '#e8b47a', '#e24a3a'], '#f2dcae', 11); sandwichWedge(o, 22, 12, ['#7cc35f', '#e8b47a', '#e24a3a'], '#f2dcae', 9); tomatoHalf(o, 26, 22); return mix('#efd8b0', '#000000', 0.55); }),
  // 세모 단면: 연분홍 참치마요 + 옥수수
  'sandwich-tuna': () => dish('sandwich-tuna', 'none', (o, s) => { board(o, '#e2c08a'); sandwichWedge(o, 12, 9, ['#a8db7f', '#f6c8b0', '#f6c8b0', '#ffe066'], '#f6e2b8', 12); scatter(o, { cx: 24, cy: 20, rx: 2, ry: 1 }, 'corn3', s); return mix('#e2c08a', '#000000', 0.55); }),
  // 세모 단면: 분홍 햄 + 노란 달걀
  'sandwich-ham-egg': () => dish('sandwich-ham-egg', 'none', (o, s) => { board(o, '#d9b07a'); sandwichWedge(o, 10, 11, ['#f4a3a6', '#ffe486', '#ffe486'], '#f2d29a', 10); sandwichWedge(o, 21, 9, ['#f4a3a6', '#ffe486', '#7cc35f'], '#f2d29a', 11); part(o, '#8a6a1a', l => { l.r(25, 21, 3, 2, '#f7d84a'); l.p(25, 21, '#fff08a'); }); return mix('#d9b07a', '#000000', 0.55); }),
  // 세모 단면: 초록 잎·토마토·당근 줄무늬
  'sandwich-vegetable': () => dish('sandwich-vegetable', 'none', (o, s) => { board(o, '#e8d0a0'); sandwichWedge(o, 15, 8, ['#7cc35f', '#e24a3a', '#f39a3b', '#a8db7f'], '#d9b47a', 13); return mix('#e8d0a0', '#000000', 0.55); }),
  // 바닥이 노릇한 군만두 + 간장 종지
  'gun-mandu': () => dish('gun-mandu', 'steam', (o, s) => { plate(o, 'white', true); for (const [x, y] of [[8, 18], [14, 17], [20, 18], [11, 21], [17, 21]] as const) dumpling(o, x, y, '#f2d29a', s + x, true); dipDish(o, 25, 14, '#3a2416'); return PLATE_OUT.white!; }),
  // 찜기 속 주름 모은 동그란 고기만두
  'gogi-mandu': () => dish('gogi-mandu', 'steam', (o, s) => { steamer(o); bao(o, 10, 14, '#f8f3e8', s); bao(o, 17, 13, '#f8f3e8', s + 1); bao(o, 22, 15, '#f8f3e8', s + 2); bao(o, 14, 17, '#f8f3e8', s + 3); return '#5a4214'; }),
  // 피 너머로 빨간 속이 비치는 큰 김치만두
  'kimchi-mandu': () => dish('kimchi-mandu', 'steam', (o, s) => { plate(o, 'cream', true); dumpling(o, 10, 18, '#f6eadc', s, false, '#e2553a'); dumpling(o, 20, 18, '#f6eadc', s + 1, false, '#e2553a'); dumpling(o, 15, 21, '#f6eadc', s + 2, false, '#e2553a'); kimchiChunk(o, 23, 13, 4, s); return PLATE_OUT.cream!; }),
  // 순대 단면 + 갈색 간 + 소금 종지
  sundae: () => dish('sundae', 'none', (o, s) => { board(o, '#d9b07a'); for (const [x, y] of [[6, 15], [11, 14], [16, 15], [8, 19], [13, 19]] as const) sundaeSlice(o, x, y); for (const [x, y] of [[20, 15], [23, 17]] as const) part(o, '#2a1206', l => { l.r(x, y, 4, 2, '#7a3a26'); l.p(x, y, '#9a5a3a'); }); dipDish(o, 22, 21, '#e8e2d2'); return mix('#d9b07a', '#000000', 0.55); }),
};

/* ===================== 든든한 거 ===================== */
const NAMUL = ['#4f9a3a', '#f39a3b', '#fbf8ea', '#7a4a2a', '#c87a3a', '#7a4026'];
const HEARTY: Record<string, () => FoodGrid> = {
  // 놋그릇 방사형 나물 + 가운데 달걀프라이 + 고추장
  bibimbap: () => dish('bibimbap', 'none', (o, s) => { const a = vessel(o, 'brass'); radial(o, a, NAMUL, s); friedEgg(o, 16, 13, 4, 2, s); part(o, '#6a0e0a', l => { l.e(21, 15, 1, 1, '#c8281a'); }); return BOWL_OUT.brass!; }),
  // 지글거리는 돌솥 + 나물 + 날달걀 노른자
  'dolsot-bibimbap': () => dish('dolsot-bibimbap', 'steam', (o, s) => { const a = vessel(o, 'stone', 0, 1); radial(o, a, ['#6fbf4a', '#f39a3b', '#fbf8ea', '#7a4a2a', '#e8d4a8'], s); yolk(o, a.cx, a.cy - 1, true); sizzle(o, a.cx, a.cy + 3, 11); return BOWL_OUT.stone!; }),
  // 밥 + 결 따라 썬 불고기 + 깨·파
  'bulgogi-deopbap': () => dish('bulgogi-deopbap', 'steam', (o, s) => { const a = plate(o, 'white', true); riceDome(o, a.cx - 6, a.cy - 1, 5, 3, s); part(o, '#2a1206', l => { for (let k = 0; k < 6; k++) line(l, 15 + k * 2, 15 + (k % 3), 17 + k * 2, 19 + (k % 2), k % 2 ? '#8a4a2c' : '#a85a36'); }); scatter(o, { cx: 21, cy: 17, rx: 4, ry: 2 }, 'sesame5 scal3', s); return PLATE_OUT.white!; }),
  // 몽글한 달걀이 덮은 닭고기 덮밥 + 파드득나물
  'dak-deopbap': () => dish('dak-deopbap', 'steam', (o, s) => { const a = vessel(o, 'lacquer', 0, -1); riceDome(o, a.cx, a.cy, a.rx - 1, a.ry, s); for (const [x, y] of [[11, 13], [17, 12], [20, 15]] as const) nugget(o, x, y, '#e2a85a', s + x, 2, 2, '#8a5a1a'); part(o, null, l => l.e(a.cx, a.cy - 1, 8, 3, (x, y) => (h2(x, y, s + 2) > 0.5 ? (h2(x, y, s + 3) > 0.5 ? '#ffe27a' : '#fff4c8') : null))); herbSprig(o, 14, 13, '#4fae3a'); return BOWL_OUT.lacquer!; }),
  // 하얀 소스 속 새우·오징어·브로콜리
  'haemul-deopbap': () => dish('haemul-deopbap', 'steam', (o, s) => { const a = plate(o, 'blue', true); riceDome(o, a.cx - 6, a.cy - 1, 5, 3, s); soup(o, { cx: a.cx + 5, cy: a.cy, rx: 7, ry: 3 }, '#efe2c4', s); shrimp(o, 19, 16, false); squidRing(o, 24, 18); part(o, '#1e4a14', l => { l.e(22, 15, 1, 1, '#4f9a3a'); l.p(22, 17, '#7cc35a'); }); return PLATE_OUT.blue!; }),
  // 네모난 칠기 찬합 위 윤기 나는 장어 두 토막
  'jangeo-deopbap': () => dish('jangeo-deopbap', 'steam', (o, s) => { o.r(3, 14, 26, 12, '#a3302a'); o.r(3, 14, 26, 1, '#d1584a'); o.r(3, 25, 26, 1, '#511410'); o.r(27, 15, 2, 10, '#7a201c'); o.r(5, 15, 22, 5, '#f4f1e8'); eel(o, 5, 16, 11); eel(o, 16, 17, 10); part(o, '#6a1a2a', l => { l.p(24, 19, '#ef6a7a'); }); return '#33100c'; }, 15),
  // 빨간 볶음밥 언덕 위 달걀프라이
  'kimchi-bokkeumbap': () => dish('kimchi-bokkeumbap', 'steam', (o, s) => { plate(o, 'white'); riceDome(o, 16, 18, 10, 4, s, '#e8643a', '#7a2a12'); friedEgg(o, 16, 14, 5, 2, s); noriShreds(o, 22, 17, 2, s); return PLATE_OUT.white!; }),
  // 노란 볶음밥 + 새우 셋 + 완두콩
  'saeu-bokkeumbap': () => dish('saeu-bokkeumbap', 'steam', (o, s) => { plate(o, 'cream'); riceDome(o, 16, 18, 10, 4, s, '#f2d690', '#8a6a2a'); shrimp(o, 11, 15, false); shrimp(o, 19, 15, true); shrimp(o, 15, 18, false); scatter(o, { cx: 16, cy: 18, rx: 8, ry: 3 }, 'pea6', s); return PLATE_OUT.cream!; }),
  // 볶음밥 위 홍합·오징어 고리·새우
  'haemul-bokkeumbap': () => dish('haemul-bokkeumbap', 'steam', (o, s) => { plate(o, 'blue'); riceDome(o, 16, 18, 10, 4, s, '#eecb86', '#8a6a2a'); mussel(o, 10, 16); squidRing(o, 16, 15); shrimp(o, 21, 16, true); scatter(o, { cx: 16, cy: 19, rx: 7, ry: 2 }, 'scal4 carrot2', s); return PLATE_OUT.blue!; }),
  // 까만 짜장 + 오이채 + 젓가락에 걸린 짜장 묻은 면
  jajangmyeon: () => dish('jajangmyeon', 'steam', (o, s) => { const a = vessel(o, 'china', 0, 1); noodleNest(o, a.cx, a.cy, a.rx - 1, a.ry, '#f2dca0', s, false, '#a8862a'); sauceMound(o, 15, 16, 7, 4, '#3a2416', s); julienne(o, 15, 11, 3, '#6fbf4a', s); noodleLift(o, 20, 4, 12, '#5a3a20', 2); chopsticks(o, 28, 0, 20, 4); return BOWL_OUT.china!; }),
  // 하얀 면 그릇 + 따로 담은 짜장 + 달걀프라이
  'gan-jajang': () => dish('gan-jajang', 'steam', (o, s) => { const a = vessel(o, 'china', -2, -3); noodleNest(o, a.cx, a.cy, a.rx - 1, a.ry, '#f2dca0', s, false, '#a8862a'); friedEgg(o, 12, 13, 4, 2, s); part(o, '#3a2a14', l => { l.e(25, 19, 5, 3, '#f3efe6'); l.e(25, 18, 4, 2, (x, y) => (h2(x, y, s) > 0.8 ? '#f4eef6' : '#2e1a0e')); }); return BOWL_OUT.china!; }),
  // 짜장 위 새우·오징어 + 오이채
  'samseon-jajang': () => dish('samseon-jajang', 'steam', (o, s) => { const a = vessel(o, 'red', -1); noodleNest(o, a.cx, a.cy, a.rx - 1, a.ry, '#f2dca0', s, false, '#a8862a'); sauceMound(o, 16, 16, 8, 4, '#2e1a0e', s); shrimp(o, 12, 11, false, '#ff8a5a', true); squidPiece(o, 18, 11, 5, 2); julienne(o, 22, 14, 2, '#6fbf4a', s); return BOWL_OUT.red!; }),
  // 밥 + 까만 짜장 + 달걀프라이
  jajangbap: () => dish('jajangbap', 'steam', (o, s) => { const a = plate(o, 'white', true); soup(o, { cx: a.cx + 3, cy: a.cy, rx: 9, ry: 3 }, '#2e1a0e', s); riceDome(o, a.cx - 6, a.cy - 2, 5, 3, s); friedEgg(o, 20, 15, 4, 2, s); julienne(o, 22, 19, 2, '#6fbf4a', s); return PLATE_OUT.white!; }),
  // 밥 위 반짝이는 갈색 당면 + 색색 채소 채
  japchaebap: () => dish('japchaebap', 'steam', (o, s) => { const a = plate(o, 'cream', true); riceDome(o, a.cx - 6, a.cy - 1, 5, 3, s); part(o, '#3a2414', l => { for (let k = 0; k < 4; k++) for (let x = 13; x < 27; x++) l.p(x, 15 + k * 2 + Math.round(Math.sin(x * 0.8 + k) * 0.8), (x + k) % 5 === 0 ? '#c88a5a' : '#8a5a3a'); }); for (const [x, y, c] of [[16, 15, '#f39a3b'], [21, 17, '#4f9a3a'], [24, 15, '#e8402e']] as const) part(o, mix(c, '#000000', 0.5), l => l.r(x, y, 3, 1, c)); return PLATE_OUT.cream!; }),
  // 갈색 소스 해물 잡탕 + 청경채
  japtangbap: () => dish('japtangbap', 'steam', (o, s) => { const a = plate(o, 'green', true); riceDome(o, a.cx - 6, a.cy - 1, 5, 3, s); soup(o, { cx: a.cx + 5, cy: a.cy, rx: 7, ry: 3 }, '#a8642a', s); shrimp(o, 17, 16, false); squidPiece(o, 20, 18, 4, 2); shiitake(o, 24, 16); leaves(o, 21, 14, 2, 1, s, '#5fae3f'); return PLATE_OUT.green!; }),
  // 하얀 소스 속 가늘게 채 썬 재료(유산슬)
  'yusanseul-deopbap': () => dish('yusanseul-deopbap', 'steam', (o, s) => { const a = plate(o, 'blue', true); riceDome(o, a.cx - 6, a.cy - 1, 5, 3, s); soup(o, { cx: a.cx + 5, cy: a.cy, rx: 7, ry: 3 }, '#f2e8d2', s); part(o, null, l => { for (let k = 0; k < 6; k++) line(l, 15 + k * 2, 16, 16 + k * 2, 20, ['#c8a47a', '#fbf6ea', '#4a3a3a', '#f2c8a8', '#7cc35a', '#fbf6ea'][k]!); }); return PLATE_OUT.blue!; }),
  // 노란 오믈렛 언덕 + 케첩 지그재그 + 파슬리
  omurice: () => dish('omurice', 'steam', (o, s) => { const a = plate(o, 'white', true); part(o, '#a87810', l => l.e(a.cx - 1, a.cy - 1, 10, 4, (x, y, u, v) => lit(['#fff2a8', '#ffd84a', '#f2bc22', '#d39a12'], u, v, h2(x, y, s)))); part(o, '#7a0a0a', l => { for (let x = -7; x <= 6; x++) l.p(a.cx - 1 + x, a.cy - 3 + (Math.abs(x) % 4 < 2 ? 0 : 1), '#d82a1a'); }); herbSprig(o, 24, 20, '#3f9a3a'); return PLATE_OUT.white!; }),
  // 돌솥 콩나물 산 + 양념장 종지
  kongnamulbap: () => dish('kongnamulbap', 'steam', (o, s) => { const a = vessel(o, 'stone', -2, -2); riceDome(o, a.cx, a.cy, a.rx - 1, a.ry, s); sprouts(o, a.cx, a.cy - 1, 6, 2, s); dipDish(o, 26, 20, '#5a3418'); return BOWL_OUT.stone!; }),
  // 짙은 초록 나물이 섞인 밥 + 간장
  'gondeure-bap': () => dish('gondeure-bap', 'steam', (o, s) => { const a = vessel(o, 'stone', 1, -1); riceDome(o, a.cx, a.cy, a.rx - 1, a.ry, s, '#d8dcb8', '#5a6a3a'); part(o, null, l => l.e(a.cx, a.cy - 1, a.rx - 2, a.ry - 1, (x, y) => (h2(x, y, s + 5) > 0.55 ? (h2(x, y, s) > 0.5 ? '#3f5a1e' : '#5d7a2e') : null))); part(o, '#2a1206', l => l.e(16, 12, 2, 1, '#5a3a26')); return BOWL_OUT.stone!; }),
  // 돌솥 위 주황 날치알 방사형 + 김 + 김치
  albap: () => dish('albap', 'steam', (o, s) => { const a = vessel(o, 'stone'); radial(o, a, ['#ff8a2a', '#1f2a22', '#ff9a3c', '#e2553a', '#ffb05a', '#6fbf4a'], s); roe(o, 16, 13, 3, 1, s); return BOWL_OUT.stone!; }),
  // 밤·대추·은행·검은콩이 콕콕 박힌 영양밥
  'yeongyang-dolsotbap': () => dish('yeongyang-dolsotbap', 'steam', (o, s) => { const a = vessel(o, 'stone', 2); riceDome(o, a.cx, a.cy, a.rx - 1, a.ry, s, '#efe6cf'); chestnut(o, 11, 13); chestnut(o, 20, 15); jujube(o, 16, 12); jujube(o, 9, 16); scatter(o, { ...a, rx: a.rx - 3, ry: 2 }, 'ginkgo3 bean5 pine2', s); return BOWL_OUT.stone!; }),
  // 소고기·양파 + 빨간 초생강 + 날달걀 노른자
  gyudon: () => dish('gyudon', 'steam', (o, s) => { const a = vessel(o, 'lacquer', -1, 1); riceDome(o, a.cx, a.cy, a.rx - 1, a.ry, s); part(o, '#2a1206', l => l.e(a.cx, a.cy - 1, 8, 3, (x, y) => ((x + y) % 3 === 0 ? '#f4eef6' : h2(x, y, s) > 0.5 ? '#9a5a32' : '#7a4426'))); part(o, '#6a0e1a', l => l.e(23, 12, 2, 1, (x, y) => (x % 2 ? '#ef4a6a' : '#d8304a'))); yolk(o, 15, 12, true); return BOWL_OUT.lacquer!; }),
};

/** 메뉴 id → 그림(기준 5종 제외 187개). */
export const MENU_ART: Record<string, () => FoodGrid> = { ...COOL, ...SPICY, ...HOT, ...CRISPY, ...MEAT, ...FOREIGN, ...LIGHT, ...QUICK, ...HEARTY };
