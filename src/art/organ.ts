import type { Room } from '../world/rooms';
import { FACE, type Feature, type Organ } from '../world/organ-types';
import { noise } from '../world/sdf';
import { hash2, hex, makeCanvas, type Ctx } from './pixel';

/*
 * Bakes an organ room (heart chamber, vessel, lung) pixel by pixel from its signed-distance shapes:
 * glossy endocardium floor with pectinate/trabecular relief, the visible inner wall face under north walls,
 * the cut wall (myocardium with fibres, epicardium and fat), vein/artery openings as pits, and an overlay
 * used to thicken the walls while the chamber contracts. Code-drawn pixel art, no external images.
 */
type RGB = [number, number, number];
const C = (h: string): RGB => hex(h);
const mixc = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const shadeC = (c: RGB, f: number): RGB => (f >= 0 ? mixc(c, [255, 255, 255], f) : mixc(c, [0, 0, 0], -f));
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

type Pal = { base: RGB; light: RGB; dark: RGB; gloss: RGB; faceTop: RGB; myo: [RGB, RGB, RGB]; endo: RGB; epi: RGB; fat: RGB; out: RGB };
function palette(o: Organ): Pal {
  const myo: [RGB, RGB, RGB] = [C('#7b2434'), C('#8e2f40'), C('#64192a')];
  const common = { myo, endo: C('#e8949c'), epi: C('#c46d64'), fat: C('#d9b468'), out: C('#170a12') };
  if (o.kind === 'aorta') return { ...common, base: C('#cf9a9c'), light: C('#e6bcbb'), dark: C('#a87479'), gloss: C('#fbe4df'), faceTop: C('#8a4a54'), myo: [C('#c4878a'), C('#d39c9c'), C('#b0757b')], endo: C('#f2cfcb') };
  if (o.kind === 'lung') return { ...common, base: C('#a43a4c'), light: C('#c25668'), dark: C('#7c2537'), gloss: C('#ec9aa4'), faceTop: C('#c98593'), endo: C('#f6cfd6'), out: C('#c47d8b') };
  const arterial = o.kind === 'la' || o.kind === 'lv';
  return arterial
    ? { ...common, base: C('#b04456'), light: C('#cc6271'), dark: C('#873041'), gloss: C('#f2a2a9'), faceTop: C('#5e1627') }
    : { ...common, base: C('#a23d4e'), light: C('#bd5666'), dark: C('#7a2a3a'), gloss: C('#e7929b'), faceTop: C('#581424') };
}

const ridge = (v: number) => 1 - Math.abs(2 * v - 1);

function floorColor(o: Organ, p: Pal, x: number, y: number, f: number): RGB {
  const tx = o.texture(x, y);
  const n1 = noise(x / 24, y / 24, 3), n2 = noise(x / 6, y / 6, 4);
  let c = mixc(p.dark, p.light, clamp01(0.3 + 0.45 * n1 + 0.2 * (n2 - 0.5)));
  if (tx.kind === 'pect') {
    const u = x * Math.cos(tx.angle) + y * Math.sin(tx.angle) + (noise(x / 26, y / 26, 5) - 0.5) * 16;
    const w = Math.sin((u * Math.PI * 2) / 9), dw = Math.cos((u * Math.PI * 2) / 9);
    if (w > 0.55) c = dw < -0.2 ? shadeC(p.light, 0.12) : p.light;
    else if (w > 0.15) c = mixc(p.base, p.light, 0.4);
    else if (w < -0.55) c = shadeC(p.dark, -0.18);
    else c = p.base;
  } else if (tx.kind === 'trab' || tx.kind === 'fine') {
    const s = tx.kind === 'trab' ? 1 : 0.5;
    const r = (xx: number, yy: number) => Math.max(ridge(noise(xx / (15 * s), yy / (15 * s), 7)), 0.92 * ridge(noise(xx / (9 * s) + 7, yy / (11 * s), 8)));
    const v = r(x, y), lit = v - r(x - 1.5, y - 1.5);
    if (v > 0.86) c = lit > 0.02 ? shadeC(p.light, 0.1) : p.light;
    else if (v > 0.72) c = mixc(p.base, p.light, 0.35);
    else if (v < 0.3) c = shadeC(p.dark, -0.28);
    else if (v < 0.5) c = p.dark;
    else c = p.base;
  } else if (tx.kind === 'intima') {
    const s = Math.sin(x * 0.7 + (noise(x / 9, y / 40, 9) - 0.5) * 7);
    c = mixc(p.base, s > 0.6 ? p.light : s < -0.7 ? p.dark : p.base, 0.45);
    if (noise(x / 14, y / 14, 10) > 0.8) c = mixc(c, p.gloss, 0.35);
  } else if (tx.kind === 'lung') {
    const v = ridge(noise(x / 11, y / 11, 12));
    c = v > 0.93 ? p.dark : mixc(p.base, p.light, 0.3 * n1);
  } else {
    // Smooth endocardium: soft mottling, faint vessels showing through, wet highlights.
    if (ridge(noise(x / 19, y / 19, 27)) > 0.955) c = mixc(c, p.dark, 0.55);
    else if (ridge(noise(x / 8 + 3, y / 8, 28)) > 0.97) c = mixc(c, p.dark, 0.3);
    const w = noise(x / 13, y / 13, 9);
    if (w > 0.74) c = mixc(c, p.gloss, 0.22 + (w - 0.74) * 1.4);
    else if (w < 0.22) c = shadeC(c, -0.06);
  }
  if (f > -4) c = mixc(c, p.gloss, 0.25 * (1 + f / 4));
  if (hash2(x | 0, y | 0, 31) > 0.993) c = p.gloss;
  return c;
}

function wallColor(o: Organ, p: Pal, x: number, y: number, f: number, t: number): RGB {
  const outer = t - f;
  if (f < 1.6) return p.endo;
  if (o.kind === 'aorta') {
    const band = Math.sin(f * 1.1 + noise(x / 10, y / 10, 15) * 2);
    return outer < 2 ? p.epi : band > 0.7 ? p.myo[1] : band < -0.8 ? p.myo[2] : p.myo[0];
  }
  if (outer < 2) return p.epi;
  if (outer < t * 0.5 && noise(x / 15, y / 15, 13) > 0.6) {
    const g = noise(x / 3, y / 3, 14);
    return g > 0.75 ? shadeC(p.fat, 0.2) : g < 0.25 ? shadeC(p.fat, -0.15) : p.fat;
  }
  const a = noise(x / 70, y / 70, 17) * Math.PI;
  const s = Math.sin((x * Math.cos(a) + y * Math.sin(a)) * 1.25 + noise(x / 8, y / 8, 19) * 4);
  let c = s > 0.55 ? p.myo[1] : s < -0.6 ? p.myo[2] : p.myo[0];
  if (f < 4) c = mixc(c, p.endo, 0.25);
  return c;
}

function lungOutside(o: Organ, p: Pal, x: number, y: number, f: number): RGB {
  for (const a of o.alveoli) {
    const d = Math.hypot(x - a.x, y - a.y);
    if (d > a.r + 1) continue;
    if (f < 2.5) return p.endo;
    const nx = (x - a.x) / a.r, ny = (y - a.y) / a.r, l = -(nx * 0.55 + ny * 0.8);
    let c = mixc(C('#c3cde6'), C('#f2f6fc'), clamp01(0.5 + 0.5 * l));
    if (Math.hypot(nx + 0.38, ny + 0.45) < 0.16) c = C('#ffffff');
    if (ridge(noise(x / 7, y / 7, 41)) > 0.9 && d < a.r - 4) c = mixc(c, C('#d98e9c'), 0.75);
    return c;
  }
  const v = noise(x / 5, y / 18, 43);
  return v > 0.7 ? shadeC(p.out, 0.12) : v < 0.3 ? shadeC(p.out, -0.1) : p.out;
}

/** First k (1..FACE) above the point that is outside the floor, or 0 when there is none. */
function faceDepth(o: Organ, x: number, y: number): number {
  if (o.floor(x, y - FACE) <= 0) return 0;
  let lo = 0, hi = FACE;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (o.floor(x, y - m) > 0) hi = m; else lo = m; }
  return hi;
}

export type OrganArt = { ground: HTMLCanvasElement; edge: HTMLCanvasElement };

export function bakeOrgan(room: Room): OrganArt {
  const o = room.organ!, pal = palette(o);
  const W = room.cols * 16, H = room.rows * 16;
  const { c, g } = makeCanvas(W, H), e = makeCanvas(W, H);
  const img = g.createImageData(W, H), d = img.data;
  const eimg = e.g.createImageData(W, H), ed = eimg.data;
  const edgeC = C('#3f0c18');
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const fx = x + 0.5, fy = y + 0.5, f = o.floor(fx, fy);
    let col: RGB;
    if (f > 0) {
      if (o.kind === 'lung') col = f <= 3 && o.alveoli.every(a => Math.hypot(fx - a.x, fy - a.y) > a.r + 1) ? pal.endo : lungOutside(o, pal, fx, fy, f);
      else {
        const t = o.wall(fx, fy);
        if (f <= t) col = wallColor(o, pal, fx, fy, f, t);
        else { const v = noise(fx / 9, fy / 9, 23); col = f - t < 2 ? shadeC(pal.out, 0.2) : v > 0.82 ? shadeC(pal.out, 0.06) : pal.out; }
      }
    } else {
      const h = o.holes(fx, fy);
      if (h < 0) {
        const depth = -h;
        if (depth < 1.6) col = shadeC(pal.endo, -0.15);
        else if (o.holes(fx, fy - 6) > 0) col = mixc(C('#8e2c40'), C('#5a1222'), clamp01(depth / 10));
        else col = mixc(C('#4d0e1d'), C('#1c0308'), clamp01(depth / 14));
      } else {
        const k = faceDepth(o, fx, fy);
        if (k > 0) {
          const top = o.kind === 'lung' ? C('#e9b2bd') : pal.faceTop;
          const bottom = o.kind === 'lung' ? C('#b9707f') : shadeC(pal.base, -0.3);
          col = k === 1 ? pal.endo : mixc(top, bottom, k / FACE);
          if (noise(fx / 2.5, 3, 21) > 0.7) col = shadeC(col, 0.08);
        } else {
          col = floorColor(o, pal, fx, fy, f);
          if (o.floor(fx, fy - FACE - 3) > 0) col = shadeC(col, -0.14);
          if (h < 3.5) col = mixc(col, pal.endo, 0.5);
        }
        if (f > -14 && o.kind !== 'lung' && o.kind !== 'aorta') {
          const i = (y * W + x) * 4;
          ed[i] = edgeC[0]; ed[i + 1] = edgeC[1]; ed[i + 2] = edgeC[2]; ed[i + 3] = Math.round(235 * (1 + f / 14) ** 1.4);
        }
      }
    }
    const i = (y * W + x) * 4;
    d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  e.g.putImageData(eimg, 0, 0);
  for (const ft of o.features) feature(g, ft, pal);
  return { ground: c, edge: e.c };
}

function stamp(g: Ctx, x: number, y: number, w: number, color: string) {
  g.fillStyle = color; g.fillRect(Math.round(x - w / 2), Math.round(y - w / 2), w, w);
}
function along(pts: { x: number; y: number }[], fn: (x: number, y: number) => void) {
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!, b = pts[i]!, n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * 2);
    for (let k = 0; k <= n; k++) fn(a.x + ((b.x - a.x) * k) / n, a.y + ((b.y - a.y) * k) / n);
  }
}
const css = (c: RGB, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

function feature(g: Ctx, ft: Feature, p: Pal) {
  switch (ft.kind) {
    case 'crista':
      along(ft.pts, (x, y) => stamp(g, x + 2, y + 2, 7, css(shadeC(p.dark, -0.35))));
      along(ft.pts, (x, y) => stamp(g, x, y, 7, css(mixc(p.base, p.light, 0.55))));
      along(ft.pts, (x, y) => stamp(g, x - 1.5, y - 1.5, 2, css(p.gloss)));
      break;
    case 'ridge':
      along(ft.pts, (x, y) => stamp(g, x + 1, y + 2, ft.w, css(shadeC(p.dark, -0.3))));
      along(ft.pts, (x, y) => stamp(g, x, y, ft.w, css(mixc(p.light, p.gloss, 0.3))));
      break;
    case 'tendon':
      along(ft.pts, (x, y) => stamp(g, x, y, 1, css(mixc(p.base, p.gloss, 0.45), 0.8)));
      break;
    case 'rim':
      for (let a = ft.a0; a <= ft.a1; a += 0.03) {
        const x = ft.x + Math.cos(a) * (ft.r + 1.5), y = ft.y + Math.sin(a) * (ft.r + 1.5);
        stamp(g, x, y, 3, css(mixc(p.light, p.gloss, 0.5)));
        stamp(g, ft.x + Math.cos(a) * (ft.r - 0.5), ft.y + Math.sin(a) * (ft.r - 0.5), 1, css(shadeC(p.dark, -0.4)));
      }
      break;
    case 'fossa': {
      for (let y = -ft.ry - 3; y <= ft.ry + 3; y++) for (let x = -ft.rx - 3; x <= ft.rx + 3; x++) {
        const k = Math.hypot(x / ft.rx, y / ft.ry);
        if (k > 1.18) continue;
        let col: RGB;
        if (ft.flap) col = k > 0.92 ? (x < 0 && y < 0 ? shadeC(p.gloss, 0.05) : mixc(p.light, p.gloss, 0.2)) : mixc(p.base, C('#e7b9bd'), 0.35 + 0.15 * noise(x / 4, y / 4, 33));
        else if (k > 1) col = y < 0 ? mixc(p.light, p.gloss, 0.35) : shadeC(p.dark, -0.15);
        else col = mixc(shadeC(p.base, -0.12), C('#c98d95'), 0.35 * (1 - k));
        g.fillStyle = css(col); g.fillRect(Math.round(ft.x + x), Math.round(ft.y + y), 1, 1);
      }
      break;
    }
    case 'fan':
      for (let b = 0; b < 6; b++) {
        const spread = (b - 2.5) * 0.11, curve = (b - 2.5) * 0.4;
        for (let s = 0; s < ft.len; s += 0.5) {
          const x = ft.x + Math.sin(spread) * s + curve * Math.sin(s / 30) * 3, y = ft.y + Math.cos(spread) * s;
          if (b % 2 === 0 || s > 40) { g.fillStyle = s % 9 < 6 ? 'rgba(244,214,160,0.55)' : 'rgba(244,214,160,0.25)'; g.fillRect(Math.round(x), Math.round(y), 1, 1); }
        }
      }
      break;
  }
}

export type MiniMap = { c: HTMLCanvasElement; s: number; ox: number; oy: number; /** Show only a square window of this size around the player (big maps). */ view?: number };

/** Small square overview of an organ room: lumen, openings, cut wall, valves (bright = way out), exit and return pad. */
export function organMinimap(room: Room, scale: number): MiniMap {
  const o = room.organ!, W = room.cols * 16, H = room.rows * 16;
  const w = Math.ceil(W * scale), h = Math.ceil(H * scale), n = Math.max(w, h);
  const { c, g } = makeCanvas(n, n);
  const ox = Math.floor((n - w) / 2), oy = Math.floor((n - h) / 2);
  const lumen = { ra: '#9a394b', rv: '#9a394b', la: '#cf4a5d', lv: '#cf4a5d', aorta: '#dfa0a2', lung: '#bf4a5d' }[o.kind];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const wx = (x + 0.5) / scale, wy = (y + 0.5) / scale, f = o.floor(wx, wy);
    let col: string | null = null;
    if (f < 0) col = o.holes(wx, wy) < 0 ? '#36091a' : lumen;
    else if (o.kind === 'lung') col = o.alveoli.some(a => Math.hypot(wx - a.x, wy - a.y) < a.r - 2) ? '#dfe8f5' : f < 5 ? '#f0b9c4' : null;
    else if (f <= o.wall(wx, wy)) col = f < 2.5 / scale ? '#7a2434' : '#561626';
    if (col) { g.fillStyle = col; g.fillRect(ox + x, oy + y, 1, 1); }
  }
  const t = Math.max(1, Math.round(scale * 6));
  for (const v of o.valves) { g.fillStyle = v.pass ? '#fff1bf' : '#c9b2a8'; g.fillRect(ox + Math.round(v.x * scale), oy + Math.round(v.y * scale - t / 2), Math.max(2, Math.round(v.w * scale)), t); }
  for (const d of room.doors) {
    const cx = ox + (d.zone.x + d.zone.w / 2) * scale, cy = oy + (d.zone.y + d.zone.h / 2) * scale, r = Math.max(2, Math.round(scale * 8));
    g.fillStyle = '#f1cf8b'; g.fillRect(Math.round(cx - r), Math.round(cy - r / 2), r * 2, r);
  }
  const pad = room.targets.find(q => q.id === 'return-pad');
  if (pad) { const r = Math.max(2, Math.round(scale * 7)); g.fillStyle = '#7ff0f2'; g.fillRect(Math.round(ox + pad.x * scale - r / 2), Math.round(oy + pad.y * scale - r / 2), r, r); }
  return { c, s: scale, ox, oy };
}
