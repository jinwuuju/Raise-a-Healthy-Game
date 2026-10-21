import type { Room } from '../world/rooms';
import type { AirFeature, AirTexture, Airway } from '../world/airway-types';
import { FACE } from '../world/organ-types';
import { noise } from '../world/sdf';
import { hash2, hex, makeCanvas, type Ctx } from './pixel';
import type { MiniMap } from './organ';

/*
 * D111 airway rooms baked pixel by pixel from their signed-distance shapes (RESPIRATORY-INTERIOR.md drawing contract):
 * the wet lining (skin at the nostril, pink nasal lining with fine vessels, the tan smell patch, matte food-way lining,
 * ciliated lining, the striped muscle of the tracheal back wall, the thin alveolar film with capillaries showing through),
 * the cut wall in layers (lining -> vessel layer -> cartilage or bone -> muscle -> outer coat), raised structures with
 * top-left light and colour outlines, and openings as pits. Code-drawn pixel art, no external images.
 */
type RGB = [number, number, number];
const C = (h: string): RGB => hex(h);
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const shade = (c: RGB, f: number): RGB => (f >= 0 ? mix(c, [255, 255, 255], f) : mix(c, [0, 0, 0], -f));
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const ridge = (v: number) => 1 - Math.abs(2 * v - 1);
const css = (c: RGB, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

export const AIR = {
  lining: C('#d97c89'), liningLight: C('#f0a2ab'), liningDark: C('#a9505f'), gloss: C('#ffd9dc'), vessel: C('#93203a'),
  skin: C('#e3b29f'), skinDark: C('#b97f6e'), smell: C('#d8ad74'), food: C('#e5a3a6'), foodDark: C('#bd7a80'),
  cart: C('#d5e3ea'), cartDark: C('#9fb8c8'), bone: C('#eadcc2'), boneDark: C('#c2ab86'), muscle: C('#9b3b4a'), muscleLight: C('#b8505f'),
  coat: C('#6e3f4a'), out: C('#170b12'), pit: C('#2a0912'), fold: C('#f4eee6'), foldDark: C('#c9bfb4'), lymph: C('#e08f9a'),
  film: C('#f2dde2'), filmDark: C('#d9b6c0'), capillary: C('#c4384f'),
};

function floorColor(a: Airway, x: number, y: number, f: number): RGB {
  const tex: AirTexture = a.texture(x, y);
  const n1 = noise(x / 22, y / 22, 3), n2 = noise(x / 6, y / 6, 4);
  let c: RGB;
  switch (tex) {
    case 'skin': {
      c = mix(AIR.skinDark, AIR.skin, clamp01(0.45 + 0.4 * n1 + 0.2 * (n2 - 0.5)));
      if (hash2(x | 0, y | 0, 5) > 0.985) c = shade(c, -0.25); // pores
      break;
    }
    case 'olfactory': c = mix(shade(AIR.smell, -0.12), AIR.smell, clamp01(0.4 + 0.6 * n2)); if (ridge(noise(x / 9, y / 9, 6)) > 0.94) c = shade(c, -0.2); break;
    case 'squamous': c = mix(AIR.foodDark, AIR.food, clamp01(0.45 + 0.4 * n1)); if (ridge(noise(x / 14, y / 5, 7)) > 0.96) c = shade(c, -0.12); break;
    case 'trachealis': {
      // Back wall of the trachea: muscle fibres running across under a thin lining.
      const s = Math.sin(y * 1.25 + (noise(x / 30, y / 8, 8) - 0.5) * 3);
      c = mix(AIR.lining, s > 0.55 ? AIR.muscleLight : s < -0.6 ? AIR.liningDark : AIR.lining, 0.5);
      break;
    }
    case 'bronchiole': { const s = Math.sin(y * 0.9 + x * 0.25 + noise(x / 10, y / 10, 9) * 2); c = mix(AIR.lining, s > 0.6 ? AIR.muscleLight : AIR.liningDark, 0.3 + 0.2 * n2); break; }
    case 'alveolar': {
      // The far wall of the air sac: a thin film with the capillary net showing through.
      c = mix(AIR.filmDark, AIR.film, clamp01(0.55 + 0.4 * n1));
      const net = ridge(noise(x / 7, y / 7, 41));
      if (net > 0.9) c = mix(c, AIR.capillary, 0.55 + (net - 0.9) * 3);
      else if (net > 0.82) c = mix(c, AIR.capillary, 0.2);
      break;
    }
    case 'ciliated': case 'cartilage': case 'mucosa': default: {
      c = mix(AIR.liningDark, AIR.liningLight, clamp01(0.3 + 0.45 * n1 + 0.2 * (n2 - 0.5)));
      // Fine vessels under the lining (warm the air in the nose).
      const v = ridge(noise(x / 16, y / 16, 27));
      if (v > (tex === 'mucosa' ? 0.94 : 0.965)) c = mix(c, AIR.vessel, tex === 'mucosa' ? 0.6 : 0.4);
      else if (ridge(noise(x / 7 + 3, y / 7, 28)) > 0.975) c = mix(c, AIR.vessel, 0.28);
      if (tex === 'ciliated' && ((x + Math.round(noise(x / 5, y / 30, 29) * 3)) % 3 === 0)) c = shade(c, 0.05); // velvet of the cilia carpet
    }
  }
  const w = noise(x / 12, y / 12, 9);
  if (w > 0.76 && tex !== 'skin') c = mix(c, AIR.gloss, 0.18 + (w - 0.76) * 1.3); // wet shine
  if (f > -4) c = mix(c, AIR.gloss, 0.22 * (1 + f / 4));
  if (hash2(x | 0, y | 0, 31) > 0.994) c = AIR.gloss;
  return c;
}

function inCartilage(a: Airway, x: number, y: number): boolean {
  for (const ft of a.features) if (ft.kind === 'cartilage' && x >= ft.x && x < ft.x + ft.w && y >= ft.y && y < ft.y + ft.h) return true;
  return false;
}

function wallColor(a: Airway, x: number, y: number, f: number, t: number): RGB {
  if (f < 1.6) return AIR.gloss; // lining
  if (f < 4.5) { const v = ridge(noise(x / 6, y / 6, 13)); return v > 0.9 ? AIR.vessel : mix(AIR.liningDark, AIR.lining, 0.5); } // vessel layer
  if (t - f < 2.5) return AIR.coat;
  const deep = (f - 4.5) / Math.max(1, t - 7);
  const band = (from: number, to: number) => deep >= from && deep < to;
  const cart = (c: RGB): RGB => { const s = noise(x / 4, y / 4, 14); return s > 0.7 ? shade(c, 0.1) : s < 0.25 ? AIR.cartDark : c; };
  switch (a.kind) {
    case 'nose': if (band(0.15, 0.7)) { const p = noise(x / 3, y / 3, 15); return p > 0.78 ? AIR.boneDark : AIR.bone; } break; // bone under the lining
    case 'larynx': if (inCartilage(a, x, y) && band(0.1, 0.75)) return cart(AIR.cart); break;
    case 'trachea': {
      // Side wall cut through the C-rings: one cartilage oval per ring, fibrous tissue between rings.
      const k = ((y - 16) % 30 + 30) % 30;
      if (band(0.05, 0.7) && k > 3 && k < 21) return cart(AIR.cart);
      if (band(0.05, 0.7)) return mix(AIR.coat, AIR.liningDark, 0.5);
      break;
    }
    case 'bronchi': if (band(0.1, 0.6) && noise(x / 9, y / 9, 16) > 0.55 && a.texture(x, y) !== 'bronchiole') return cart(AIR.cart); break;
    default: break;
  }
  const ang = noise(x / 60, y / 60, 17) * Math.PI;
  const s = Math.sin((x * Math.cos(ang) + y * Math.sin(ang)) * 1.2 + noise(x / 8, y / 8, 19) * 4);
  return s > 0.55 ? AIR.muscleLight : s < -0.6 ? shade(AIR.muscle, -0.2) : AIR.muscle;
}

/** Lung tissue beyond the alveolar walls: neighbouring air sacs in pale outline with capillary-filled septa. */
function lungBeyond(x: number, y: number): RGB {
  const v = ridge(noise(x / 26, y / 26, 51));
  if (v > 0.9) return mix(AIR.capillary, AIR.liningDark, 0.4);
  if (v > 0.8) return mix(AIR.filmDark, AIR.capillary, 0.35);
  return mix(C('#cdbfd6'), C('#e7dde9'), clamp01(noise(x / 9, y / 9, 52)));
}

function faceDepth(a: Airway, x: number, y: number): number {
  if (a.floor(x, y - FACE) <= 0) return 0;
  let lo = 0, hi = FACE;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (a.floor(x, y - m) > 0) hi = m; else lo = m; }
  return hi;
}

function solidColor(a: Airway, x: number, y: number): { base: RGB; light: RGB; dark: RGB; edge: RGB } {
  const pink = { base: AIR.lining, light: AIR.liningLight, dark: AIR.liningDark, edge: C('#7d2b3c') };
  if (a.kind === 'larynx' && y > 300) return { base: AIR.fold, light: C('#ffffff'), dark: AIR.foldDark, edge: C('#8f7c7a') }; // vocal folds
  if (a.kind === 'trachea') return { base: AIR.liningLight, light: AIR.gloss, dark: AIR.lining, edge: C('#8a3a4a') }; // carina
  if (a.kind === 'pharynx' && (y < 110 || (x < 236 && y > 360))) return { base: AIR.lymph, light: AIR.liningLight, dark: AIR.liningDark, edge: C('#7d2b3c') };
  return pink;
}

export type AirwayArt = { ground: HTMLCanvasElement };

export function bakeAirway(room: Room): AirwayArt {
  const a = room.airway!, W = room.cols * 16, H = room.rows * 16;
  const { c, g } = makeCanvas(W, H);
  const img = g.createImageData(W, H), d = img.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const fx = x + 0.5, fy = y + 0.5, f = a.floor(fx, fy);
    let col: RGB;
    if (f > 0) {
      if (a.kind === 'alveoli') {
        const t = a.wall(fx, fy);
        if (f < 1.4) col = AIR.film;
        else if (f <= t) { const net = ridge(noise(fx / 4, fy / 4, 61)); col = net > 0.75 ? AIR.capillary : mix(AIR.capillary, AIR.liningDark, 0.45); }
        else col = lungBeyond(fx, fy);
      } else {
        const t = a.wall(fx, fy);
        if (f <= t) col = wallColor(a, fx, fy, f, t);
        else { const v = noise(fx / 9, fy / 9, 23); col = f - t < 2 ? shade(AIR.out, 0.2) : v > 0.82 ? shade(AIR.out, 0.06) : AIR.out; }
      }
    } else {
      const h = a.holes(fx, fy), so = a.solid(fx, fy);
      if (h < 0) {
        const depth = -h;
        col = depth < 1.5 ? shade(AIR.lining, -0.25) : a.holes(fx, fy - 5) > 0 ? mix(shade(AIR.liningDark, -0.3), AIR.pit, clamp01(depth / 8)) : mix(C('#4a1220'), AIR.pit, clamp01(depth / 12));
      } else if (so < 0) {
        const p = solidColor(a, fx, fy);
        const nx = a.solid(fx + 1, fy) - a.solid(fx - 1, fy), ny = a.solid(fx, fy + 1) - a.solid(fx, fy - 1), l = Math.hypot(nx, ny) || 1;
        const lit = -(nx * 0.6 + ny * 0.8) / l; // light from the upper left
        col = so > -1.6 ? p.edge : lit > 0.45 ? p.light : lit < -0.35 ? p.dark : p.base;
        if (so > -4 && lit > 0.2) col = mix(col, AIR.gloss, 0.35);
        if (a.kind === 'nose' && hash2(x, y, 7) > 0.97) col = mix(col, AIR.vessel, 0.4);
      } else {
        const k = faceDepth(a, fx, fy);
        if (k > 0) {
          const top = a.kind === 'alveoli' ? C('#e9c3cc') : shade(AIR.liningDark, -0.25), bottom = a.kind === 'alveoli' ? AIR.filmDark : shade(AIR.lining, -0.35);
          col = k === 1 ? AIR.gloss : mix(top, bottom, k / FACE);
          if (noise(fx / 2.5, 3, 21) > 0.7) col = shade(col, 0.08);
        } else {
          col = floorColor(a, fx, fy, f);
          if (a.floor(fx, fy - FACE - 3) > 0) col = shade(col, -0.12);
          // Shadow cast under raised structures (meatus under each shelf, below the folds).
          if (a.solid(fx, fy - 4) < 0 && so < 6) col = shade(col, -0.22);
          if (h < 3.5) col = mix(col, AIR.liningDark, 0.4);
        }
      }
    }
    const i = (y * W + x) * 4;
    d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  for (const ft of a.features) feature(g, a, ft);
  return { ground: c };
}

function stamp(g: Ctx, x: number, y: number, w: number, h: number, color: string) { g.fillStyle = color; g.fillRect(Math.round(x), Math.round(y), w, h); }
function along(p: { x: number; y: number }[], step: number, fn: (x: number, y: number, ux: number, uy: number, s: number) => void) {
  let acc = 0;
  for (let i = 1; i < p.length; i++) {
    const a = p[i - 1]!, b = p[i]!, l = Math.hypot(b.x - a.x, b.y - a.y) || 1, ux = (b.x - a.x) / l, uy = (b.y - a.y) / l;
    for (let s = 0; s < l; s += step) fn(a.x + ux * s, a.y + uy * s, ux, uy, acc + s);
    acc += l;
  }
}
const inside = (a: Airway, x: number, y: number) => a.floor(x, y) < 0 && a.holes(x, y) > 0;

function feature(g: Ctx, a: Airway, ft: AirFeature) {
  switch (ft.kind) {
    case 'concha': {
      // Curled bony scroll: highlight on the upper rim, the curl at the front end, a dark lip over the passage below.
      for (let t = 0; t <= Math.PI; t += 0.01) {
        const x = ft.x - Math.cos(t) * ft.rx, yt = ft.y - Math.sin(t) * ft.ry, yb = ft.y + Math.sin(t) * ft.ry;
        stamp(g, x, yt + 1, 1, 1, css(AIR.gloss, 0.9));
        stamp(g, x, yb - 1, 1, 2, css(shade(AIR.liningDark, -0.35)));
      }
      const fx = ft.x - ft.rx + ft.ry * 0.9, fy = ft.y;
      for (let t = 0; t < Math.PI * 3.2; t += 0.04) { const r = ft.ry * 0.8 * (1 - t / (Math.PI * 3.6)); stamp(g, fx + Math.cos(t) * r, fy + Math.sin(t) * r * 0.9, 1, 1, css(shade(AIR.liningDark, -0.2), 0.9)); }
      for (let x = ft.x - ft.rx * 0.7; x < ft.x + ft.rx * 0.8; x += 9) stamp(g, x, ft.y - ft.ry * 0.25, 4, 1, css(AIR.vessel, 0.45)); // vessels in the thick lining
      break;
    }
    case 'hairs':
      for (let i = 0; i < 70; i++) {
        const x = ft.x + hash2(i, 1, 3) * ft.w, y = ft.y + hash2(i, 2, 3) * ft.h;
        if (!inside(a, x, y) || a.floor(x, y) < -14) continue; // hairs grow from the walls of the vestibule
        const up = a.floor(x, y - 6) > a.floor(x, y + 6) ? 1 : -1, len = 4 + Math.floor(hash2(i, 3, 3) * 4);
        for (let k = 0; k < len; k++) stamp(g, x + k * 0.8, y + up * k * 0.7, 1, 1, css(C(k < 2 ? '#3b2a26' : '#5b4038')));
      }
      break;
    case 'orifice':
      for (let t = 0; t < Math.PI * 2; t += 0.04) {
        const x = ft.x + Math.cos(t) * (ft.r + 1.5), y = ft.y + Math.sin(t) * (ft.r + 1.5);
        stamp(g, x, y, 1, 1, css(Math.sin(t) > 0.2 ? AIR.gloss : shade(AIR.liningDark, -0.3)));
        if (ft.rim && Math.sin(t) < 0.5) { stamp(g, ft.x + Math.cos(t) * (ft.r + 4), ft.y + Math.sin(t) * (ft.r + 4), 2, 2, css(AIR.liningLight)); stamp(g, ft.x + Math.cos(t) * (ft.r + 6), ft.y + Math.sin(t) * (ft.r + 6), 1, 1, css(AIR.gloss)); }
      }
      break;
    case 'lymph':
      for (let i = 0; i < Math.round(ft.rx * ft.ry / 14); i++) {
        const t = hash2(i, 5, 8) * Math.PI * 2, r = Math.sqrt(hash2(i, 6, 8)) * 0.85, x = ft.x + Math.cos(t) * ft.rx * r, y = ft.y + Math.sin(t) * ft.ry * r;
        stamp(g, x, y, 2, 1, css(shade(AIR.liningDark, -0.3))); stamp(g, x - 1, y - 1, 2, 1, css(AIR.liningLight));
      }
      break;
    case 'septum':
      // Cut edge of the middle wall that faces the viewer: a pale cartilage-and-bone veil along the roof.
      along(ft.pts, 1, (x, y) => { stamp(g, x, y + 2, 1, 4, css(AIR.cart, 0.55)); stamp(g, x, y + 6, 1, 1, css(AIR.cartDark, 0.6)); stamp(g, x, y + 1, 1, 1, 'rgba(255,255,255,0.7)'); });
      break;
    case 'rings': {
      // C-rings seen from the back wall: each ring's free ends curl in from both sides and stop before the middle.
      for (let y = ft.y0; y < ft.y1; y += ft.step) {
        for (const side of [-1, 1]) {
          const edge = side < 0 ? ft.x0 : ft.x1, stop = (ft.x0 + ft.x1) / 2 + side * ft.open / 2;
          for (let x = edge; side < 0 ? x < stop : x > stop; x -= side) {
            for (let k = 0; k < 12; k++) {
              const yy = y + k;
              if (!inside(a, x, yy)) continue;
              const tip = Math.abs(x - stop) < 6 ? Math.abs(x - stop) / 6 : 1, edgeK = Math.abs(k - 5.5) / 6;
              if (edgeK > tip * 0.95) continue;
              stamp(g, x, yy, 1, 1, css(k < 3 ? AIR.cart : k > 9 ? AIR.cartDark : mix(AIR.cart, AIR.lining, 0.35), 0.75));
            }
          }
        }
      }
      break;
    }
    case 'plates':
      along(ft.pts, 3, (x, y, ux, uy, s) => {
        if (noise(s / 18, 0, 71) < 0.4) return;
        for (const side of [-1, 1]) {
          const px = x - uy * side * (ft.r - 6), py = y + ux * side * (ft.r - 6);
          if (!inside(a, px, py)) continue;
          stamp(g, px, py, 4, 3, css(AIR.cart, 0.7)); stamp(g, px, py + 3, 4, 1, css(AIR.cartDark, 0.7));
        }
      });
      break;
    case 'muscle':
      along(ft.pts, 5, (x, y, ux, uy) => {
        for (let k = -ft.r; k <= ft.r; k++) { const px = x - uy * k, py = y + ux * k; if (inside(a, px, py)) stamp(g, px, py, 1, 1, css(AIR.muscleLight, 0.45)); }
      });
      break;
    case 'ridge':
      along(ft.pts, 1, (x, y) => { stamp(g, x + 1, y + 1, ft.w, 1, css(shade(AIR.liningDark, -0.3))); stamp(g, x, y, ft.w, 1, css(AIR.gloss)); });
      break;
    case 'goblets':
      for (let i = 0; i < ft.n; i++) {
        const x = ft.x + hash2(i, 11, 4) * ft.w, y = ft.y + hash2(i, 12, 4) * ft.h;
        if (!inside(a, x, y)) continue;
        stamp(g, x - 1, y - 1, 4, 4, css(shade(AIR.liningDark, -0.1))); stamp(g, x, y, 2, 2, 'rgba(255,250,240,0.95)'); stamp(g, x, y - 2, 2, 1, 'rgba(255,250,240,0.6)');
      }
      break;
    case 'cartilage': break; // drawn in the wall pass
  }
}

/** Small square overview of an airway room: lumen, raised structures, openings, doors and the return pad. */
export function airwayMinimap(room: Room, scale: number): MiniMap {
  const a = room.airway!, W = room.cols * 16, H = room.rows * 16;
  const w = Math.ceil(W * scale), h = Math.ceil(H * scale), n = Math.max(w, h);
  const { c, g } = makeCanvas(n, n);
  const ox = Math.floor((n - w) / 2), oy = Math.floor((n - h) / 2);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const wx = (x + 0.5) / scale, wy = (y + 0.5) / scale, f = a.floor(wx, wy);
    let col: string | null = null;
    if (f < 0) col = a.holes(wx, wy) < 0 ? '#2a0912' : a.solid(wx, wy) < 0 ? '#e8a1ab' : a.kind === 'alveoli' ? '#ead6dc' : '#c96b7a';
    else if (f <= a.wall(wx, wy)) col = a.kind === 'alveoli' ? '#b8394f' : '#6a2232';
    if (col) { g.fillStyle = col; g.fillRect(ox + x, oy + y, 1, 1); }
  }
  for (const gt of a.gates) { g.fillStyle = '#fff1bf'; g.fillRect(ox + Math.round(gt.x * scale), oy + Math.round(gt.y * scale - 1), Math.max(2, Math.round(gt.w * scale)), 2); }
  for (const d of room.doors) {
    const cx = ox + (d.zone.x + d.zone.w / 2) * scale, cy = oy + (d.zone.y + d.zone.h / 2) * scale, r = Math.max(2, Math.round(scale * 8));
    g.fillStyle = '#f1cf8b'; g.fillRect(Math.round(cx - r), Math.round(cy - r / 2), r * 2, r);
  }
  const pad = room.targets.find(q => q.id === 'return-pad');
  if (pad) { const r = Math.max(2, Math.round(scale * 7)); g.fillStyle = '#7ff0f2'; g.fillRect(Math.round(ox + pad.x * scale - r / 2), Math.round(oy + pad.y * scale - r / 2), r, r); }
  return { c, s: scale, ox, oy };
}
