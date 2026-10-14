import { T, tileAt, type Room, type WallDecor } from '../world/rooms';
import { TILE } from '../world/types';
import { ellipse, hash2, hex, makeCanvas, pixelText, px, rect, shade, textWidth, type Ctx } from './pixel';

type RGB = [number, number, number];
const C = (h: string): RGB => hex(h);
const pick = <T,>(arr: T[], t: number): T => arr[Math.min(arr.length - 1, Math.floor(t * arr.length))]!;
const add = (c: RGB, d: number): RGB => [c[0] + d, c[1] + d, c[2] + d];

const PAVE = [C('#cfc7b7'), C('#c8bfad'), C('#d6cebe'), C('#cbc2b0')], PAVE_M = C('#aaa192');
const PLAZA = [C('#bfbab0'), C('#b7b2a7'), C('#c6c1b7')], PLAZA_M = C('#9e998f');
const ROAD = C('#4f5460'), LANE = C('#5d606a'), PARK = C('#575b64');
const GRASS = C('#6fae4b'), GRASS_L = C('#8bc75c'), GRASS_D = C('#5a9a3f');
const GRAVEL = C('#d9c8a2');
const WOOD = [C('#c68c55'), C('#bb814b'), C('#cf9760')], WOOD_GAP = C('#8b5c35');
const HERR = [C('#a8693f'), C('#9b5f38'), C('#b27346')], HERR_GAP = C('#6d4428');
const MARBLE = [C('#ece8e0'), C('#e3ded4')], MARBLE_G = C('#c9c2b5');

function texel(t: number, x: number, y: number): RGB {
  const n = hash2(x, y, 3);
  switch (t) {
    case T.PAVE: {
      const R = y >> 2, off = (R & 1) * 4, cx = (x + off) >> 3, lx = (x + off) & 7, ly = y & 3;
      if (lx === 7 || ly === 3) return PAVE_M;
      const base = pick(PAVE, hash2(cx, R, 1));
      if (ly === 0) return add(base, 10);
      return n < 0.04 ? add(base, -10) : base;
    }
    case T.PLAZA: {
      const lx = x & 15, ly = y & 7;
      if (lx === 15 || ly === 7) return PLAZA_M;
      const base = pick(PLAZA, hash2(x >> 4, y >> 3, 2));
      if (ly === 0) return add(base, 9);
      return n < 0.08 ? add(base, n < 0.04 ? -9 : 7) : base;
    }
    case T.ROAD: case T.CROSS: case T.PARKING: {
      const b = t === T.PARKING ? PARK : ROAD;
      return n < 0.05 ? add(b, 10) : n < 0.09 ? add(b, -7) : n < 0.095 ? add(b, 22) : b;
    }
    case T.LANE: return n < 0.06 ? add(LANE, 9) : n < 0.1 ? add(LANE, -7) : LANE;
    case T.GRASS: {
      if (n < 0.1) return GRASS_L;
      if (hash2(x, y - 1, 3) < 0.1) return GRASS_D;
      return n > 0.965 ? add(GRASS, 12) : n > 0.93 ? add(GRASS, -8) : GRASS;
    }
    case T.GRAVEL: return n < 0.15 ? add(GRAVEL, -20) : n > 0.9 ? add(GRAVEL, 14) : n > 0.86 ? add(GRAVEL, -38) : GRAVEL;
    case T.DRIVE: return (x + y) % 6 === 0 ? C('#a09c93') : n < 0.08 ? C('#bab6ad') : C('#b2aea5');
    case T.TURF: return x % 4 === 0 ? C('#6cbd5a') : n < 0.1 ? C('#55a345') : C('#5eae4d');
    case T.TACTILE: {
      const lx = x & 15, ly = y & 15;
      if (lx === 15 || ly === 15) return C('#b8953a');
      const dx = x & 3, dy = y & 3;
      if (dx === 1 && dy === 1) return C('#f6d76a');
      if ((dx === 1 || dx === 2) && (dy === 1 || dy === 2)) return C('#d0a82c');
      return C('#e8bf3c');
    }
    case T.WOOD: {
      const R = y >> 2, off = Math.floor(hash2(0, R, 5) * 24), cx = Math.floor((x + off) / 24);
      if ((y & 3) === 3) return WOOD_GAP;
      if ((x + off) % 24 === 0) return add(WOOD_GAP, 18);
      const base = pick(WOOD, hash2(cx, R, 6));
      if ((y & 3) === 0) return add(base, 10);
      return n < 0.05 ? add(base, -12) : base;
    }
    case T.HERRING: {
      const cx = x >> 3, cy = y >> 3, horiz = ((cx + cy) & 1) === 0;
      const lx = x & 7, ly = y & 7;
      const plank = horiz ? ly >> 2 : lx >> 2, along = horiz ? lx : ly;
      if ((horiz ? ly : lx) % 4 === 3 || along === 7) return HERR_GAP;
      const base = pick(HERR, hash2(cx * 2 + plank, cy, 7));
      return (horiz ? ly % 4 : lx % 4) === 0 ? add(base, 10) : n < 0.05 ? add(base, -10) : base;
    }
    case T.MARBLE: {
      const lx = x & 15, ly = y & 15;
      if (lx === 15 || ly === 15) return MARBLE_G;
      const base = MARBLE[((x >> 4) + (y >> 4)) & 1]!;
      const vein = Math.abs(((x * 0.7 + y * 1.3 + hash2(x >> 4, y >> 4, 8) * 40) % 23) - 11) < 0.5;
      return vein ? add(base, -14) : lx === 0 || ly === 0 ? add(base, 6) : base;
    }
    case T.FLESH: {
      // Soft model floor: rounded cell tiles with a faint membrane line.
      const lx = x & 15, ly = y & 15, d = (lx - 7.5) ** 2 + (ly - 7.5) ** 2;
      if (lx === 15 || ly === 15) return C('#d98a97');
      if (d < 9 && hash2(x >> 4, y >> 4, 11) < 0.45) return C('#f7c4c9');
      return n < 0.05 ? C('#f0aab3') : d > 40 ? C('#ebb0b8') : C('#f2bcc2');
    }
    case T.VESSEL: {
      const ly = y & 15, lx = x & 15;
      const edge = Math.min(lx, 15 - lx, ly, 15 - ly);
      return edge === 0 ? C('#7a1e33') : edge === 1 ? C('#a52a42') : n < 0.08 ? C('#c9384f') : C('#b8304a');
    }
    case T.BRIDGE: {
      const ly = y & 15;
      if (ly === 0 || ly === 15) return C('#9c8f86');
      return (x & 3) === 0 ? C('#d6cbbf') : C('#efe6da');
    }
    case T.WALL: return C('#3d3550');
    default: return C('#2a2e3a');
  }
}

export function bakeGround(room: Room): HTMLCanvasElement {
  const W = room.cols * TILE, H = room.rows * TILE;
  const { c, g } = makeCanvas(W, H);
  const img = g.createImageData(W, H), d = img.data;
  for (let ty = 0; ty < room.rows; ty++) for (let tx = 0; tx < room.cols; tx++) {
    const t = tileAt(room, tx, ty);
    for (let y = ty * TILE; y < ty * TILE + TILE; y++) for (let x = tx * TILE; x < tx * TILE + TILE; x++) {
      const [r, gg, b] = texel(t, x, y), i = (y * W + x) * 4;
      d[i] = r; d[i + 1] = gg; d[i + 2] = b; d[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  if (room.interior) interior(g, room); else outdoor(g, room);
  return c;
}

const roadish = (t: number) => t === T.ROAD || t === T.CROSS || t === T.LANE;
const raised = (t: number) => t === T.PAVE || t === T.PLAZA || t === T.TACTILE || t === T.TURF || t === T.DRIVE;

function outdoor(g: Ctx, room: Room) {
  for (let ty = 0; ty < room.rows; ty++) for (let tx = 0; tx < room.cols; tx++) {
    const t = tileAt(room, tx, ty), x = tx * TILE, y = ty * TILE;
    const up = tileAt(room, tx, ty - 1), dn = tileAt(room, tx, ty + 1), lf = tileAt(room, tx - 1, ty), rt = tileAt(room, tx + 1, ty);
    if (raised(t) && t !== T.TACTILE) {
      const curb = (n: number) => roadish(n) && !(t === T.DRIVE && n === T.LANE);
      if (curb(dn)) { rect(g, x, y + 13, TILE, 1, '#efebe3'); rect(g, x, y + 14, TILE, 2, '#9a958b'); }
      if (curb(up)) { rect(g, x, y, TILE, 1, '#7f7a72'); rect(g, x, y + 1, TILE, 1, '#e8e4dc'); }
      if (curb(lf)) { rect(g, x, y, 1, TILE, '#8a857c'); rect(g, x + 1, y, 1, TILE, '#e8e4dc'); }
      if (curb(rt)) { rect(g, x + 14, y, 1, TILE, '#e8e4dc'); rect(g, x + 15, y, 1, TILE, '#8a857c'); }
    }
    if (t === T.GRASS) {
      const edge = (n: number) => n !== T.GRASS && n !== T.GRAVEL;
      if (edge(up)) { rect(g, x, y, TILE, 1, '#ddd6c6'); rect(g, x, y + 1, TILE, 1, '#4f8a37'); }
      if (edge(lf)) { rect(g, x, y, 1, TILE, '#ddd6c6'); rect(g, x + 1, y, 1, TILE, '#5a9640'); }
      if (edge(rt)) { rect(g, x + 15, y, 1, TILE, '#c9c2b2'); }
      if (edge(dn)) { rect(g, x, y + 13, TILE, 1, '#e3dccc'); rect(g, x, y + 14, TILE, 2, '#a9a090'); }
      const h = hash2(tx, ty, 9);
      if (h < 0.3) { const fx = x + 3 + Math.floor(h * 30) % 9, fy = y + 3 + Math.floor(h * 70) % 8; const col = ['#ffffff', '#f8e070', '#f4a0b8', '#c8a8f0'][Math.floor(h * 13) % 4]!; px(g, fx, fy, col); px(g, fx + 1, fy + 1, col); px(g, fx - 1, fy + 1, col); px(g, fx, fy + 2, col); px(g, fx, fy + 1, '#f6c040'); }
    }
    if (t === T.GRAVEL) {
      if (up === T.GRASS) rect(g, x, y, TILE, 1, '#b9a57e');
      if (dn === T.GRASS) rect(g, x, y + 15, TILE, 1, '#c8b48c');
    }
  }
  for (const m of room.markings) {
    if (m.kind === 'crossV') for (let x = m.x + 2; x < m.x + m.w - 2; x += 8) zebra(g, x, m.y + 3, 4, m.h - 6);
    else if (m.kind === 'crossH') for (let y = m.y + 2; y < m.y + m.h - 2; y += 8) zebra(g, m.x + 3, y, m.w - 6, 4);
    else if (m.kind === 'centerV') { rect(g, m.x, m.y, 2, m.h, '#e8bb3c'); rect(g, m.x + 3, m.y, 2, m.h, '#e8bb3c'); }
    else if (m.kind === 'centerH') { rect(g, m.x, m.y, m.w, 2, '#e8bb3c'); rect(g, m.x, m.y + 3, m.w, 2, '#e8bb3c'); }
    else if (m.kind === 'dashV') for (let y = m.y; y < m.y + m.h; y += 16) rect(g, m.x, y + 4, m.w, Math.min(8, m.y + m.h - y - 4), '#e6e6de');
    else if (m.kind === 'dashH') for (let x = m.x; x < m.x + m.w; x += 16) rect(g, x + 4, m.y, Math.min(8, m.x + m.w - x - 4), m.h, '#e6e6de');
    else if (m.kind === 'stop') rect(g, m.x, m.y, m.w, m.h, '#eeeee6');
    else if (m.kind === 'edgeH') rect(g, m.x, m.y, m.w, 1, '#e3b437');
    else if (m.kind === 'edgeV') rect(g, m.x, m.y, 1, m.h, '#e3b437');
    else if (m.kind === 'stall') { rect(g, m.x, m.y, 1, m.h, '#e6e6de'); rect(g, m.x + m.w, m.y, 1, m.h, '#e6e6de'); }
    else if (m.kind === 'slow30') { ellipse(g, m.x, m.y, 9, 7, '#d6493e'); ellipse(g, m.x, m.y, 7, 5, '#5d606a'); pixelText(g, '30', m.x - 3, m.y - 2, '#f2f2ea'); }
  }
  for (const [mx, my] of [[400, 184], [456, 300], [96, 470], [560, 520], [200, 504]] as [number, number][]) { ellipse(g, mx, my, 5, 4, '#3b3f48'); ellipse(g, mx, my, 4, 3, '#5a5f6a'); for (let k = -3; k <= 3; k += 2) rect(g, mx + k, my - 2, 1, 5, '#474b55'); }
  for (let y = 4; y < 640; y += 48) { if (y > 380 && y < 600) continue; drain(g, 386, y); drain(g, 474, y); }
  g.save(); g.fillStyle = 'rgba(32,26,64,0.22)';
  for (const b of room.buildings) {
    const s = Math.min(26, Math.round(b.h * 0.28)), top = b.y;
    g.beginPath(); g.moveTo(b.x + b.w, top); g.lineTo(b.x + b.w + s, top + s * 0.5); g.lineTo(b.x + b.w + s, b.y + b.d + 4); g.lineTo(b.x + b.w, b.y + b.d); g.closePath(); g.fill();
    g.fillRect(b.x + 4, b.y + b.d, b.w, 3);
  }
  for (const p of room.props) {
    const big = p.kind === 'ginkgo' || p.kind === 'parktree';
    if (big) ellipse(g, p.x + 3, p.y - 1, 12, 4, 'rgba(32,26,64,0.20)');
    else if (p.kind === 'fountain') ellipse(g, p.x + 2, p.y - 5, 22, 8, 'rgba(32,26,64,0.16)');
    else if (p.solid) g.fillRect(p.solid.x + 2, p.y - 2, p.solid.w, 3);
  }
  g.restore();
}

function zebra(g: Ctx, x: number, y: number, w: number, h: number) {
  rect(g, x, y, w, h, '#ebebe4');
  for (let i = 0; i < w * h / 6; i++) { const a = hash2(x + i, y, 4), b = hash2(y + i, x, 5); px(g, x + Math.floor(a * w), y + Math.floor(b * h), '#c9c9c1'); }
}
function drain(g: Ctx, x: number, y: number) { rect(g, x, y, 6, 3, '#34373f'); for (let i = 1; i < 6; i += 2) px(g, x + i, y + 1, '#5d616b'); }

function interior(g: Ctx, room: Room) {
  const it = room.interior!;
  const W = room.cols * TILE, H = room.rows * TILE;
  for (const r of it.rugs) {
    const col = it.wall === 'office' ? ['#5b7f86', '#4c6f76', '#7aa0a6'] : ['#a35a4a', '#8a4a3c', '#c9806e'];
    rect(g, r.x, r.y, r.w, r.h, col[0]!); rect(g, r.x + 2, r.y + 2, r.w - 4, r.h - 4, col[1]!); rect(g, r.x + 4, r.y + 4, r.w - 8, r.h - 8, col[0]!);
    for (let x = r.x + 6; x < r.x + r.w - 6; x += 6) px(g, x, r.y + 3, col[2]!);
    rect(g, r.x, r.y + r.h, r.w, 1, 'rgba(0,0,0,0.18)');
  }
  // Back wall face (3 tiles tall) with cap.
  const face = it.wall === 'office' ? '#efe6d2' : it.wall === 'lobby' ? '#dfe3e8' : '#c4785a';
  rect(g, 0, 0, W, 48, face);
  if (it.wall === 'office') for (let x = 0; x < W; x += 6) rect(g, x, 4, 1, 30, '#e6dcc6');
  if (it.wall === 'lobby') { for (let x = 0; x < W; x += 32) rect(g, x, 4, 1, 32, '#c9ced6'); rect(g, 0, 20, W, 1, '#c9ced6'); }
  if (it.wall === 'cafe') for (let y = 4; y < 34; y += 4) for (let x = ((y / 4) % 2) * 4; x < W; x += 8) { rect(g, x, y + 3, 8, 1, '#a75f45'); px(g, x, y, '#a75f45'); }
  const wain = it.wall === 'office' ? ['#a87a4f', '#c0915f'] : it.wall === 'lobby' ? ['#8c919b', '#a8adb6'] : ['#6e4630', '#8a5a3c'];
  rect(g, 0, 34, W, 12, wain[0]!); rect(g, 0, 34, W, 1, wain[1]!); for (let x = 8; x < W; x += 16) rect(g, x, 36, 1, 9, shade(wain[0]!, -0.15));
  rect(g, 0, 46, W, 2, '#4e3a2c'); rect(g, 0, 48, W, 2, 'rgba(0,0,0,0.16)');
  const edge = '#3d3550', edgeHi = '#5a4f6e';
  rect(g, 0, 0, W, 4, edge); rect(g, 0, 4, W, 1, edgeHi);
  for (const dcr of it.decor) decor(g, dcr, it.wall);
  // Side walls and front wall seen from above.
  rect(g, 0, 0, 16, H, edge); rect(g, 15, 4, 1, H - 4, edgeHi); rect(g, W - 16, 0, 16, H, edge); rect(g, W - 16, 4, 1, H - 4, edgeHi);
  if (it.bottom === 'glass') {
    for (let x = 16; x < W - 16; x += 16) {
      if (x >= it.door[0] && x < it.door[1]) continue;
      rect(g, x, H - 16, 16, 16, '#9cc8d4'); rect(g, x, H - 16, 16, 2, '#cfe8ee'); rect(g, x, H - 16, 1, 16, '#4a5866'); rect(g, x + 3, H - 12, 1, 6, '#e6f6fa'); rect(g, x + 4, H - 13, 1, 3, '#e6f6fa');
    }
    rect(g, 16, H - 2, W - 32, 2, '#4a5866');
  } else rect(g, 0, H - 16, W, 16, edge);
  if (it.door[0] >= 0) {
    rect(g, it.door[0] - 2, H - 16, 2, 16, '#4a5866'); rect(g, it.door[1], H - 16, 2, 16, '#4a5866');
    rect(g, it.door[0] + 2, H - 30, it.door[1] - it.door[0] - 4, 10, it.wall === 'cafe' ? '#7a4a33' : '#5b6472');
    for (let x = it.door[0] + 4; x < it.door[1] - 4; x += 2) rect(g, x, H - 29, 1, 8, it.wall === 'cafe' ? '#93603f' : '#6f7987');
  }
}

function decor(g: Ctx, d: WallDecor, wall: string) {
  const x = d.x, w = d.w;
  switch (d.kind) {
    case 'window': {
      rect(g, x, 8, w, 26, '#4a5160'); rect(g, x + 2, 10, w - 4, 22, '#a8d8f0');
      for (let y = 10; y < 32; y++) rect(g, x + 2, y, w - 4, 1, y < 18 ? '#b8e0f4' : y < 25 ? '#cfe9f6' : '#e0f1f8');
      for (let i = 0; i < 6; i++) { const bw = 4 + ((i * 7) % 5), bh = 6 + ((i * 5) % 9); rect(g, x + 3 + i * 7, 32 - bh, bw, bh, i % 2 ? '#8db4c8' : '#9cc0d2'); for (let k = 0; k < bh - 2; k += 3) px(g, x + 4 + i * 7, 33 - bh + k, '#d8eef6'); }
      rect(g, x + Math.floor(w / 2) - 1, 10, 2, 22, '#4a5160'); rect(g, x, 32, w, 2, '#6a7180');
      for (let i = 0; i < 5; i++) px(g, x + 5 + i, 12 + i, '#ffffff');
      break;
    }
    case 'whiteboard': {
      rect(g, x, 15, w, 18, '#9aa0aa'); rect(g, x + 1, 16, w - 2, 16, '#f7f7f3');
      for (let i = 0; i < 4; i++) rect(g, x + 4, 19 + i * 3, 10 + ((i * 9) % 18), 1, i % 2 ? '#3d6fb8' : '#d24a4a');
      rect(g, x + w - 16, 18, 6, 5, '#f8e070'); rect(g, x + w - 9, 18, 6, 5, '#f4a0b8'); rect(g, x + w - 13, 25, 6, 5, '#9fe0c8');
      rect(g, x + 2, 32, w - 4, 2, '#b8bdc6');
      break;
    }
    case 'clock': ellipse(g, x + 5, 20, 5, 5, '#3a3e48'); ellipse(g, x + 5, 20, 4, 4, '#ffffff'); rect(g, x + 5, 17, 1, 3, '#3a3e48'); rect(g, x + 5, 20, 3, 1, '#d24a4a'); break;
    case 'elevator': {
      rect(g, x - 2, 6, w + 4, 42, '#7c828c'); rect(g, x, 12, w, 36, '#bcc3cb'); rect(g, x + w / 2, 12, 1, 36, '#6e747c');
      rect(g, x, 12, w, 1, '#e4e8ec'); rect(g, x + 2, 14, 2, 30, '#d4dae0'); rect(g, x + w / 2 + 3, 14, 2, 30, '#d4dae0');
      rect(g, x + w / 2 - 5, 7, 10, 4, '#24272e'); pixelText(g, d.text, x + w / 2 - 1, 7, '#ff7a5a');
      rect(g, x + w + 3, 26, 3, 6, '#9aa0aa'); px(g, x + w + 4, 27, '#f0c050'); px(g, x + w + 4, 30, '#f0c050');
      break;
    }
    case 'sign': {
      const tw = textWidth(d.text), sx = Math.round(x + (w - tw) / 2);
      rect(g, sx - 4, 6, tw + 8, 9, '#2c3140'); rect(g, sx - 4, 6, tw + 8, 1, '#4a5166'); pixelText(g, d.text, sx, 8, '#e8c88a');
      break;
    }
    case 'notice': {
      rect(g, x, 12, w, 22, '#8a5a35'); rect(g, x + 2, 14, w - 4, 18, '#c99a62');
      const cols = ['#ffffff', '#f8e070', '#bfe3f2', '#f4c0cc'];
      for (let i = 0; i < 5; i++) { const px0 = x + 4 + (i % 3) * 10, py = 16 + Math.floor(i / 3) * 8; rect(g, px0, py, 8, 6, cols[i % 4]!); px(g, px0 + 3, py, '#d24a4a'); rect(g, px0 + 1, py + 2, 5, 1, '#9aa0aa'); }
      break;
    }
    case 'menu': {
      rect(g, x, 8, w, 24, '#6e4630'); rect(g, x + 2, 10, w - 4, 20, '#2f3a35');
      pixelText(g, d.text, x + Math.round((w - textWidth(d.text)) / 2), 12, '#f6e6c4');
      for (let i = 0; i < 3; i++) { rect(g, x + 6, 19 + i * 3, 18, 1, '#d8d4c8'); rect(g, x + w - 14, 19 + i * 3, 8, 1, '#e8c060'); rect(g, x + 32, 19 + i * 3, 10, 1, '#d8d4c8'); }
      break;
    }
    case 'neon': {
      const tw = textWidth(d.text), sx = Math.round(x + (w - tw) / 2);
      rect(g, sx - 3, 12, tw + 6, 9, 'rgba(255,120,190,0.25)'); pixelText(g, d.text, sx, 14, '#ffb3dd'); pixelText(g, d.text, sx, 13, '#fff0f8');
      break;
    }
    case 'shelf': {
      for (const y of [16, 28]) { rect(g, x, y, w, 2, '#7a5034'); rect(g, x, y + 2, w, 1, 'rgba(0,0,0,0.2)'); }
      for (let i = 0; i < 6; i++) { rect(g, x + 2 + i * 7, 10, 5, 6, ['#a8744c', '#e8e0d0', '#5f9c45', '#d6493e'][i % 4]!); rect(g, x + 2 + i * 7, 10, 5, 1, '#ffffff'); }
      for (let i = 0; i < 8; i++) { rect(g, x + 2 + i * 5, 23, 4, 5, i % 2 ? '#f2ede4' : '#3a6ea8'); }
      break;
    }
    case 'poster': {
      rect(g, x, 12, w, 20, '#3a3e48'); rect(g, x + 1, 13, w - 2, 18, wall === 'cafe' ? '#f2e2c4' : '#f6f2ea');
      ellipse(g, x + w / 2, 20, 4, 3, '#e05a6a'); px(g, x + w / 2 - 2, 18, '#ffffff'); rect(g, x + 3, 26, w - 6, 1, '#3a6ea8'); rect(g, x + 3, 28, w - 8, 1, '#9aa0aa');
      break;
    }
    case 'mailbox': {
      rect(g, x, 12, w, 22, '#9aa1aa');
      for (let r = 0; r < 4; r++) for (let k = 0; k < Math.floor(w / 8); k++) { rect(g, x + 1 + k * 8, 13 + r * 5, 7, 4, '#c5cbd2'); rect(g, x + 2 + k * 8, 14 + r * 5, 4, 1, '#6e747c'); }
      break;
    }
  }
}
