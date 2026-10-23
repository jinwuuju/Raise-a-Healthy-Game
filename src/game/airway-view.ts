import { bakeAirway, type AirwayArt } from '../art/airway';
import type { Ctx } from '../art/pixel';
import { MUCUS_SPEED, airflow, breathWord, epiglottisDown, glottisClosed, inflation, palateLift, type BreathWord } from '../domain/breath';
import type { AirPart, Airway } from '../world/airway-types';
import type { Room } from '../world/rooms';
import type { Point } from '../world/types';
import { fillPoly } from './heart-view';

/*
 * D111 live layer of an airway room: air specks that go in on the breath in and out on the breath out (still while
 * swallowing), the cilia carpet beating in waves and the mucus it carries one way (with dust, pollen and virus
 * particles stuck in it: dust > cells > virus particles in size), the soft palate and the epiglottis moving with the
 * swallow, the vocal folds, the oesophagus opening only while swallowing, and in the alveoli the walls swelling with each
 * breath, blood in the capillaries turning from dark to bright and oxygen/carbon dioxide crossing. Reads the airway
 * clock only; it never changes game progress.
 */
type Track = { pts: Point[]; seg: number[]; total: number; d: Float32Array; off: Float32Array; width: number; speed: number };
const arts = new Map<string, AirwayArt>();
function art(room: Room): AirwayArt { let a = arts.get(room.id); if (!a) { a = bakeAirway(room); arts.set(room.id, a); } return a; }
/** The baked room picture, shared with the nostril entry film (baked once per room). */
export const airwayGround = (room: Room): HTMLCanvasElement => art(room).ground;

function track(pts: Point[], n: number, width: number, speed: number, seed: number): Track {
  const seg: number[] = []; let total = 0;
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y); seg.push(l); total += l; }
  const d = new Float32Array(n), off = new Float32Array(n);
  for (let i = 0; i < n; i++) { d[i] = (i / n) * total + ((i * 7919 + seed * 31) % 11); off[i] = (((i * 2654435761 + seed * 97) >>> 0) % 1000) / 500 - 1; }
  return { pts, seg, total, d, off, width, speed };
}
function at(t: Track, d: number): { x: number; y: number; ux: number; uy: number } {
  let i = 0;
  while (i < t.seg.length - 1 && d > t.seg[i]!) { d -= t.seg[i]!; i++; }
  const a = t.pts[i]!, b = t.pts[i + 1]!, l = t.seg[i] || 1, k = Math.max(0, Math.min(1, d / l));
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, ux: (b.x - a.x) / l, uy: (b.y - a.y) / l };
}
const lerp = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

export class AirwayView {
  readonly airway: Airway;
  private air: Track[];
  private mucus: Track[];
  /** Cilia roots along both edges of each mucus band (found once: the wall shapes do not move). */
  private cilia: { x: number; y: number; ux: number; uy: number; s: number }[] = [];
  private time = 0;
  private clock = 0;
  private motes: { x: number; y: number; r: number; v: number }[] = [];
  constructor(readonly room: Room) {
    this.airway = room.airway!;
    this.air = this.airway.lanes.map((l, i) => track(l.pts, l.n, l.width, l.speed, i));
    this.mucus = this.airway.mucus.map((m, i) => track(m.pts, m.n, m.width, MUCUS_SPEED, i + 50));
    for (const t of this.mucus) for (let s = 0; s < t.total; s += 3) {
      const p = at(t, s);
      for (const side of [-1, 1]) {
        const x = p.x - p.uy * side * (t.width / 2 + 2), y = p.y + p.ux * side * (t.width / 2 + 2);
        if (this.airway.floor(x, y) < -1 && this.airway.solid(x, y) >= 2 && this.airway.holes(x, y) > 0) this.cilia.push({ x, y, ux: p.ux, uy: p.uy, s });
      }
    }
    for (let i = 0; i < 18; i++) this.motes.push({ x: (i * 97) % 360, y: (i * 61) % 240, r: 1 + (i % 2), v: 2 + (i % 4) });
    art(room);
  }

  /** Current breathing word ('in' | 'out' | 'swallow') for the label above the reporter. */
  word(): BreathWord { return breathWord(this.clock); }

  update(dt: number, clock: number): void {
    this.time += dt; this.clock = clock;
    const flow = airflow(clock);
    for (const t of this.air) for (let i = 0; i < t.d.length; i++) {
      let d = t.d[i]! + t.speed * flow * dt * (0.8 + 0.4 * ((i * 37) % 10) / 10);
      if (d > t.total) d -= t.total; else if (d < 0) d += t.total;
      t.d[i] = d;
    }
    for (const t of this.mucus) for (let i = 0; i < t.d.length; i++) { let d = t.d[i]! + t.speed * dt * (0.85 + 0.3 * ((i * 13) % 10) / 10); if (d > t.total) d -= t.total; t.d[i] = d; }
    for (const m of this.motes) { m.x += m.v * dt * 0.5 * (0.3 + flow); m.y += Math.sin(this.time * 0.6 + m.r) * dt * 2; }
  }

  drawFloor(g: Ctx, cx: number, cy: number, vw: number, vh: number): void {
    const a = this.airway;
    g.drawImage(art(this.room).ground, -cx, -cy);
    if (a.kind === 'alveoli') this.drawAlveoli(g, cx, cy);
    this.drawCilia(g, cx, cy, vw, vh);
    for (const t of this.mucus) this.drawMucus(g, t, cx, cy, vw, vh);
    for (const t of this.air) this.drawAir(g, t, cx, cy, vw, vh);
    for (const p of a.parts) this.drawPart(g, p, cx, cy);
  }

  drawOverlay(g: Ctx, cx: number, cy: number, vw: number, vh: number): void {
    const a = this.airway, flow = airflow(this.clock);
    if (a.kind === 'alveoli') this.drawMacrophage(g, cx, cy);
    for (const m of this.motes) {
      const x = ((m.x - cx * 0.35) % (vw + 20) + vw + 20) % (vw + 20) - 10, y = ((m.y - cy * 0.35) % (vh + 20) + vh + 20) % (vh + 20) - 10;
      g.fillStyle = `rgba(255,245,248,${(0.06 + 0.08 * Math.abs(flow)).toFixed(3)})`;
      g.fillRect(Math.round(x), Math.round(y), m.r + 1, m.r + 1);
    }
    const grd = g.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.35, vw / 2, vh / 2, Math.max(vw, vh) * 0.75);
    grd.addColorStop(0, 'rgba(40,0,12,0)'); grd.addColorStop(1, a.kind === 'alveoli' ? 'rgba(70,20,40,0.22)' : 'rgba(30,2,10,0.42)');
    g.fillStyle = grd; g.fillRect(0, 0, vw, vh);
  }

  private drawAir(g: Ctx, t: Track, cx: number, cy: number, vw: number, vh: number): void {
    const flow = airflow(this.clock), mag = Math.abs(flow);
    if (mag < 0.04) return;
    const tail = Math.round(1 + mag * 4) * Math.sign(flow);
    for (let i = 0; i < t.d.length; i++) {
      const p = at(t, t.d[i]!), half = t.width / 2, wob = Math.sin(this.time * 1.7 + i * 1.3) * 1.2;
      const x = Math.round(p.x - p.uy * (t.off[i]! * half + wob) - cx), y = Math.round(p.y + p.ux * (t.off[i]! * half + wob) - cy);
      if (x < -6 || y < -6 || x > vw + 6 || y > vh + 6) continue;
      g.fillStyle = `rgba(226,246,255,${(0.25 + 0.6 * mag).toFixed(3)})`;
      g.fillRect(x, y, 1, 1);
      g.fillStyle = `rgba(226,246,255,${(0.12 + 0.3 * mag).toFixed(3)})`;
      for (let k = 1; k <= Math.abs(tail); k++) g.fillRect(Math.round(x - p.ux * k * Math.sign(tail)), Math.round(y - p.uy * k * Math.sign(tail)), 1, 1);
    }
  }

  private drawCilia(g: Ctx, cx: number, cy: number, vw: number, vh: number): void {
    for (const c of this.cilia) {
      const x = Math.round(c.x - cx), y = Math.round(c.y - cy);
      if (x < -4 || y < -4 || x > vw + 4 || y > vh + 4) continue;
      const tip = Math.sin(this.time * 9 - c.s * 0.32) > 0 ? 2 : -1; // effective stroke points the way the mucus goes
      g.fillStyle = 'rgba(255,214,222,0.55)'; g.fillRect(x, y, 1, 1);
      g.fillStyle = 'rgba(255,230,236,0.45)'; g.fillRect(Math.round(x + c.ux * tip), Math.round(y + c.uy * tip - 1), 1, 1);
    }
  }

  private drawMucus(g: Ctx, t: Track, cx: number, cy: number, vw: number, vh: number): void {
    for (let i = 0; i < t.d.length; i++) {
      const p = at(t, t.d[i]!), off = t.off[i]! * t.width * 0.35;
      const x = Math.round(p.x - p.uy * off - cx), y = Math.round(p.y + p.ux * off - cy);
      if (x < -8 || y < -8 || x > vw + 8 || y > vh + 8) continue;
      g.fillStyle = 'rgba(236,228,170,0.55)'; g.fillRect(x - 2, y - 1, 5, 3);
      g.fillStyle = 'rgba(255,252,220,0.7)'; g.fillRect(x - 1, y - 1, 2, 1);
      if (i % 5 === 2) { g.fillStyle = '#6e5038'; g.fillRect(x - 3, y - 2, 4, 3); g.fillRect(x - 1, y - 3, 3, 5); g.fillStyle = '#9a7650'; g.fillRect(x - 2, y - 2, 2, 1); } // dust (largest)
      else if (i % 7 === 3) { g.fillStyle = '#e8c23c'; g.fillRect(x - 1, y - 1, 3, 3); g.fillStyle = '#b8901c'; g.fillRect(x - 2, y, 1, 1); g.fillRect(x + 2, y, 1, 1); g.fillRect(x, y - 2, 1, 1); g.fillRect(x, y + 2, 1, 1); } // pollen
      else if (i % 9 === 4) { g.fillStyle = '#7d4fb0'; g.fillRect(x, y, 1, 1); g.fillStyle = 'rgba(190,150,240,0.9)'; g.fillRect(x - 1, y, 1, 1); g.fillRect(x + 1, y, 1, 1); g.fillRect(x, y - 1, 1, 1); g.fillRect(x, y + 1, 1, 1); } // virus particle (smallest)
    }
  }

  private drawPart(g: Ctx, p: AirPart, cx: number, cy: number): void {
    const t = this.clock;
    if (p.kind === 'palate') {
      // Soft palate and uvula: hanging at rest, lifted back against the throat wall while swallowing.
      const tip = lerp(p.tip, p.lifted, palateLift(t)), dx = tip.x - p.root.x, dy = tip.y - p.root.y, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
      const poly = [
        { x: p.root.x + nx * p.width - cx, y: p.root.y + ny * p.width - cy }, { x: tip.x + nx * 5 - cx, y: tip.y + ny * 5 - cy },
        { x: tip.x - nx * 5 - cx, y: tip.y - ny * 5 - cy }, { x: p.root.x - nx * p.width - cx, y: p.root.y - ny * p.width - cy },
      ];
      fillPoly(g, poly.map(q => ({ x: q.x + 1, y: q.y + 2 })), 'rgba(60,10,22,0.55)');
      fillPoly(g, poly, '#d47b89');
      fillPoly(g, [poly[0]!, poly[1]!, { x: (poly[1]!.x + poly[2]!.x) / 2, y: (poly[1]!.y + poly[2]!.y) / 2 }, { x: p.root.x - cx, y: p.root.y - cy }], '#ee9faa');
      for (let k = -6; k <= 6; k++) for (let j = -6; j <= 6; j++) if (k * k + j * j <= 36) { g.fillStyle = k * k + j * j > 25 ? '#8a2e40' : j < -2 && k < 0 ? '#ffd2d8' : '#e58f9c'; g.fillRect(Math.round(tip.x + k - cx), Math.round(tip.y + j - cy), 1, 1); }
    } else if (p.kind === 'epiglottis') {
      // Leaf-shaped lid with a central vein: upright while breathing, tipped over the inlet while swallowing.
      const e = epiglottisDown(t), h = (p.base.y - p.tip.y) * (1 - 0.85 * e), w = p.width * (1 + 0.5 * e);
      for (let k = 0; k <= h; k++) {
        const u = k / Math.max(1, h), half = (w / 2) * Math.sin(Math.PI * Math.min(1, 0.15 + u * 0.95)) * (1 - 0.25 * u), y = Math.round(p.base.y - k - cy);
        for (let x = -half; x <= half; x++) {
          const edge = Math.abs(x) > half - 1.5;
          g.fillStyle = edge ? '#b65466' : Math.abs(x) < 1 ? '#c86575' : x < 0 ? '#f4b3bc' : '#e597a3';
          g.fillRect(Math.round(p.base.x + x - cx), y, 1, 1);
        }
        if (k % 6 === 3) for (const sgn of [-1, 1]) for (let j = 1; j < half * 0.7; j++) { g.fillStyle = 'rgba(176,72,92,0.6)'; g.fillRect(Math.round(p.base.x + sgn * j - cx), Math.round(y - j * 0.4), 1, 1); }
      }
      if (e > 0.05) { g.fillStyle = `rgba(214,120,136,${(0.85 * e).toFixed(3)})`; g.fillRect(Math.round(p.inlet.x - cx), Math.round(p.inlet.y - 4 - cy), p.inlet.w, 9); g.fillStyle = `rgba(120,30,48,${(0.8 * e).toFixed(3)})`; g.fillRect(Math.round(p.inlet.x - cx), Math.round(p.inlet.y + 5 - cy), p.inlet.w, 2); }
    } else if (p.kind === 'folds') {
      // Vocal folds: white, wide apart while breathing (a triangle-like gap), drawn together while swallowing.
      const closed = glottisClosed(t), mid = (p.x0 + p.x1) / 2, half = Math.max(1, (p.gap / 2) * (1 - closed));
      for (const side of [-1, 1]) {
        const outer = side < 0 ? p.x0 : p.x1;
        for (let x = outer; side < 0 ? x <= mid - half : x >= mid + half; x -= side) {
          const u = Math.abs(x - outer) / Math.abs(mid - outer), th = Math.round(12 - 7 * u);
          for (let k = -th; k <= th; k++) { g.fillStyle = Math.abs(k) >= th - 1 ? '#8f7c7a' : k < -th / 3 ? '#ffffff' : '#ece4dc'; g.fillRect(Math.round(x - cx), Math.round(p.y + k - cy), 1, 1); }
        }
        for (let x = side < 0 ? p.x0 + 6 : p.x1 - 6; side < 0 ? x <= mid - 14 : x >= mid + 14; x -= side) {
          for (let k = -4; k <= 4; k++) { g.fillStyle = Math.abs(k) > 3 ? '#7d2b3c' : k < 0 ? '#f0a2ab' : '#d27c89'; g.fillRect(Math.round(x - cx), Math.round(p.vestibular + k - cy), 1, 1); }
        }
      }
      g.fillStyle = 'rgba(20,4,10,0.85)'; g.fillRect(Math.round(mid - half + 1 - cx), Math.round(p.y - 6 - cy), Math.max(0, Math.round(half * 2 - 2)), 12);
    } else if (p.kind === 'esophagus') {
      const open = palateLift(t), hh = Math.round(1 + 9 * open);
      for (let x = -p.w / 2; x <= p.w / 2; x++) { const k = Math.round(hh * Math.sqrt(Math.max(0, 1 - (2 * x / p.w) ** 2))); g.fillStyle = '#1a0408'; g.fillRect(Math.round(p.x + x - cx), Math.round(p.y - k - cy), 1, 2 * k + 1); g.fillStyle = '#9c4656'; g.fillRect(Math.round(p.x + x - cx), Math.round(p.y + k + 1 - cy), 1, 1); }
    }
  }

  /** Alveolar walls breathe; blood in the wall capillaries turns bright as oxygen crosses in and carbon dioxide out. */
  private drawAlveoli(g: Ctx, cx: number, cy: number): void {
    const inf = inflation(this.clock);
    this.airway.alveoli.forEach((al, ai) => {
      const r = al.r - 2 + inf * 3;
      g.fillStyle = 'rgba(255,240,246,0.55)';
      for (let k = 0; k < 64; k++) { const t = (k / 64) * Math.PI * 2; g.fillRect(Math.round(al.x + Math.cos(t) * r - cx), Math.round(al.y + Math.sin(t) * r - cy), 1, 1); }
      for (let k = 0; k < 7; k++) {
        const ph = (this.time * 0.08 + k / 7 + ai * 0.17) % 1, t = ph * Math.PI * 2 + ai, rr = al.r + 5;
        const x = Math.round(al.x + Math.cos(t) * rr - cx), y = Math.round(al.y + Math.sin(t) * rr - cy);
        g.fillStyle = ph < 0.4 ? '#7a1f35' : ph < 0.6 ? '#a32a42' : '#d8394f'; g.fillRect(x - 1, y - 1, 3, 2); g.fillStyle = 'rgba(255,190,200,0.6)'; g.fillRect(x, y - 1, 1, 1);
      }
      for (let k = 0; k < 4; k++) {
        const ph = (this.time * 0.3 + k / 4 + ai * 0.21) % 1, t = (k / 4) * Math.PI * 2 + ai * 0.7, o2 = k % 2 === 0;
        const rr = o2 ? al.r - 8 + ph * 14 : al.r + 6 - ph * 14;
        g.fillStyle = o2 ? `rgba(220,246,255,${(0.9 - ph * 0.6).toFixed(3)})` : `rgba(140,148,160,${(0.85 - ph * 0.5).toFixed(3)})`;
        g.fillRect(Math.round(al.x + Math.cos(t) * rr - cx), Math.round(al.y + Math.sin(t) * rr - cy), 2, 2);
      }
    });
  }

  /** An alveolar macrophage wandering slowly over the wall of one air sac. */
  private drawMacrophage(g: Ctx, cx: number, cy: number): void {
    const al = this.airway.alveoli[this.airway.alveoli.length - 4];
    if (!al) return;
    const t = this.time * 0.15, x = Math.round(al.x + Math.cos(t) * al.r * 0.45 - cx), y = Math.round(al.y + Math.sin(t * 1.3) * al.r * 0.35 - cy);
    for (let k = -5; k <= 5; k++) for (let j = -4; j <= 4; j++) {
      const rr = (k * k) / 25 + (j * j) / 16 + 0.15 * Math.sin(Math.atan2(j, k) * 3 + this.time * 2);
      if (rr > 1) continue;
      g.fillStyle = rr > 0.8 ? '#8d6a9a' : rr < 0.2 ? '#b98fc4' : '#e4d2ea'; g.fillRect(x + k, y + j, 1, 1);
    }
    g.fillStyle = '#7d4fb0'; g.fillRect(x + 1, y - 1, 1, 1); // a virus particle it has taken in
  }
}
