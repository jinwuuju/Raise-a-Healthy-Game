import { bakeOrgan, type OrganArt } from '../art/organ';
import type { Ctx } from '../art/pixel';
import { coronaryFlowFactor, openness, squeeze, travel, type ValveSet } from '../domain/cardiac';
import type { Band, Lane, Organ, Valve } from '../world/organ-types';
import type { Room } from '../world/rooms';
import type { Point } from '../world/types';
import { comparisonOpening, hasBackflow, type ValveMode } from '../domain/valve-model';
import type { RhythmMode } from '../domain/rhythm-model';

/** Small integer hash for repeatable, seed-fixed patterns (no Math.random in rendering). */
function hash(n: number): number {
  let x = Math.imul(n | 0, 2654435761) >>> 0;
  x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; x ^= x >>> 13;
  return x >>> 0;
}
/** Game-second gaps between irregular arrivals at the AV node in the AF layer (qualitative, not measured). */
const AF_ARRIVALS = [1.9, 3.1, 1.4, 2.6, 1.7, 3.4, 2.2];
const AF_CYCLE = AF_ARRIVALS.reduce((a, b) => a + b, 0);

/*
 * Live layer of an organ room: blood cells streaming along lanes and piling up at closed valves, leaflets and
 * cusps that open and shut with the beat, chordae that go taut in systole, the conduction signal, wall
 * thickening while the chamber squeezes, gas exchange dots in the lung, floating motes and a soft vignette.
 * It only reads the cardiac clock; it never changes game progress.
 */
export const valveSet = (v: Valve): ValveSet => (v.kind === 'tricuspid' || v.kind === 'mitral' ? 'av' : 'sl');

type Track = { lane: Lane; seg: number[]; total: number; gateD: number; valve: Valve | null; d: Float32Array; off: Float32Array; kind: Uint8Array };

const arts = new Map<string, OrganArt>();
function art(room: Room): OrganArt { let a = arts.get(room.id); if (!a) { a = bakeOrgan(room); arts.set(room.id, a); } return a; }

function lanePoint(t: Track, d: number): { x: number; y: number; nx: number; ny: number } {
  const pts = t.lane.pts;
  let i = 0;
  while (i < t.seg.length - 1 && d > t.seg[i]!) { d -= t.seg[i]!; i++; }
  const a = pts[i]!, b = pts[i + 1]!, l = t.seg[i] || 1, k = Math.max(0, Math.min(1, d / l));
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, nx: -(b.y - a.y) / l, ny: (b.x - a.x) / l };
}

/** Distance along a lane where it first crosses a valve line (Infinity when it does not). */
function crossing(lane: Lane, seg: number[], v: Valve | null): number {
  if (!v) return Infinity;
  let acc = 0;
  for (let i = 1; i < lane.pts.length; i++) {
    const a = lane.pts[i - 1]!, b = lane.pts[i]!;
    if ((a.y - v.y) * (b.y - v.y) <= 0 && a.y !== b.y) { const k = (v.y - a.y) / (b.y - a.y); return acc + seg[i - 1]! * k; }
    acc += seg[i - 1]!;
  }
  return Infinity;
}

/** Scanline polygon fill with whole pixels (keeps the pixel-art look crisp). */
export function fillPoly(g: Ctx, pts: Point[], color: string): void {
  let y0 = Infinity, y1 = -Infinity;
  for (const p of pts) { y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
  g.fillStyle = color;
  for (let y = Math.ceil(y0); y <= Math.floor(y1); y++) {
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i]!, b = pts[(i + 1) % pts.length]!;
      if ((a.y <= y && b.y > y) || (b.y <= y && a.y > y)) xs.push(a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x));
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) { const xa = Math.round(xs[k]!), xb = Math.round(xs[k + 1]!); if (xb > xa) g.fillRect(xa, y, xb - xa, 1); }
  }
}

export class HeartView {
  comparison: ValveMode = 'normal';
  /** D077 signal observer: 'af' swaps the atrial conduction drawing only. Valves, blood lanes and passage stay normal. */
  rhythm: RhythmMode = 'normal';
  readonly organ: Organ;
  private tracks: Track[];
  private motes: { x: number; y: number; r: number; v: number }[] = [];
  private time = 0;

  constructor(readonly room: Room) {
    this.organ = room.organ!;
    this.tracks = this.organ.lanes.map((lane, li) => {
      const seg: number[] = [];
      let total = 0;
      for (let i = 1; i < lane.pts.length; i++) { const d = Math.hypot(lane.pts[i]!.x - lane.pts[i - 1]!.x, lane.pts[i]!.y - lane.pts[i - 1]!.y); seg.push(d); total += d; }
      const valve = lane.valve ? this.organ.valves.find(v => v.id === lane.valve) ?? null : null;
      const d = new Float32Array(lane.n), off = new Float32Array(lane.n), kind = new Uint8Array(lane.n);
      for (let i = 0; i < lane.n; i++) {
        d[i] = (i / lane.n) * total + ((i * 7919 + li * 31) % 13);
        off[i] = (((i * 2654435761 + li * 97) >>> 0) % 1000) / 500 - 1;
        kind[i] = (i * 13 + li) % 97 === 5 ? 2 : i % 9 === 4 ? 1 : 0;
      }
      return { lane, seg, total, gateD: crossing(lane, seg, valve), valve, d, off, kind };
    });
    for (let i = 0; i < 16; i++) this.motes.push({ x: (i * 97) % 360, y: (i * 61) % 240, r: 1 + (i % 3), v: 3 + (i % 5) });
    art(room);
  }

  update(dt: number, real: number): void {
    this.time += dt;
    for (const t of this.tracks) {
      const L = t.lane;
      const o = openness(L.when === 'sl' ? 'sl' : 'av', real);
      const gateOpen = t.valve ? openness(valveSet(t.valve), real) > 0.3 : true;
      for (let i = 0; i < L.n; i++) {
        let d = t.d[i]!;
        const up = d < t.gateD;
        let f: number;
        if (L.when === 'av') f = up ? 0.55 + 0.45 * o : 0.12 + 1.1 * o;
        else if (L.when === 'sl') f = up ? 0.06 + 1.25 * o : 0.2 + 1.5 * o;
        else if (L.when === 'coronary-left' || L.when === 'coronary-right') f = coronaryFlowFactor(L.when === 'coronary-left' ? 'left' : 'right', real);
        else f = 0.8 + 0.2 * Math.sin(this.time * 1.3 + i);
        const step = L.speed * f * dt * (0.85 + 0.3 * ((i * 37) % 10) / 10);
        const hold = t.gateD - 2 - (i % 6) * 2.2;
        if (!gateOpen && up && d + step >= hold) d = Math.max(d, Math.min(hold, d + step * 0.1));
        else d += step;
        if (d > t.total) d -= t.total;
        t.d[i] = d;
      }
    }
    for (const m of this.motes) { m.x += m.v * dt * 0.6; m.y += Math.sin(this.time * 0.7 + m.r) * dt * 2; }
  }

  /** Floor-level layer: wall thickening, conduction, blood, gas exchange and valves. */
  drawFloor(g: Ctx, cx: number, cy: number, vw: number, vh: number, real: number): void {
    const o = this.organ, a = art(this.room);
    g.drawImage(a.ground, -cx, -cy);
    if (o.squeeze !== 'none') {
      const s = this.squeezeAt(real);
      if (s > 0.01) { g.globalAlpha = Math.min(1, s * 0.85); g.drawImage(a.edge, -cx, -cy); g.globalAlpha = 1; }
    }
    this.drawSignals(g, cx, cy, real);
    if (o.kind === 'lung') this.drawGas(g, cx, cy);
    for (const t of this.tracks) this.drawTrack(g, t, cx, cy, vw, vh);
    for (const v of o.valves) {
      const affected = this.room.id === 'heart' && v.kind === 'tricuspid';
      const normal = openness(valveSet(v), real);
      drawValve(g, v, affected ? comparisonOpening(this.comparison, normal) : normal, cx, cy);
      if (affected && hasBackflow(this.comparison, normal)) {
        const x = Math.round(v.x + v.w / 2 - cx), y = Math.round(v.y - cy);
        g.fillStyle = '#682138'; g.fillRect(x - 2, y - 5, 5, 12);
        // Separate qualitative reverse-flow marks, never reversing actor movement or normal blood tracks.
        for (let i = 0; i < 5; i++) {
          const d = (this.time * 18 + i * 10) % 50;
          rbc(g, x + (i % 2 ? 2 : -2), Math.round(y + 16 - d), 0, false);
        }
        g.fillStyle = '#ffcb8a';
        for (let k = 0; k < 3; k++) { g.fillRect(x - k, y - 21 + k, 1, 1); g.fillRect(x + k, y - 21 + k, 1, 1); }
      }
    }
  }

  /** Above actors: chordae (held up in the blood), raised bands are drawn through drawBand. */
  drawOverlay(g: Ctx, cx: number, cy: number, vw: number, vh: number, real: number): void {
    const o = this.organ;
    for (const c of o.cords) {
      const v = o.valves.find(q => q.id === c.valve);
      if (!v) continue;
      const normal = openness(valveSet(v), real);
      const open = this.room.id === 'heart' && v.kind === 'tricuspid' ? comparisonOpening(this.comparison, normal) : normal;
      for (const slot of c.slots) drawCord(g, c.x - cx, c.y - cy, v, slot, open, cx, cy);
    }
    // Floating plasma motes give depth to the blood-filled space.
    for (const m of this.motes) {
      const x = ((m.x - cx * 0.35) % (vw + 20) + vw + 20) % (vw + 20) - 10, y = ((m.y - cy * 0.35) % (vh + 20) + vh + 20) % (vh + 20) - 10;
      g.fillStyle = o.kind === 'lung' ? 'rgba(255,240,245,0.10)' : 'rgba(255,180,190,0.08)';
      g.fillRect(Math.round(x), Math.round(y), m.r + 1, m.r + 1);
    }
    const sq = this.squeezeAt(real);
    const grd = g.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.35, vw / 2, vh / 2, Math.max(vw, vh) * 0.75);
    grd.addColorStop(0, 'rgba(40,0,10,0)');
    grd.addColorStop(1, o.kind === 'lung' ? 'rgba(60,10,30,0.28)' : `rgba(30,0,8,${(0.42 + sq * 0.16).toFixed(3)})`);
    g.fillStyle = grd; g.fillRect(0, 0, vw, vh);
  }

  bandY(b: Band, x: number): number {
    const k = Math.max(0, Math.min(1, (x - b.x1) / (b.x2 - b.x1 || 1)));
    return b.y1 + (b.y2 - b.y1) * k;
  }

  drawBand(g: Ctx, b: Band, cx: number, cy: number, real: number): void {
    const n = Math.ceil(Math.hypot(b.x2 - b.x1, b.y2 - b.y1));
    const pulse = b.signal ? travel(real, b.signal[0], b.signal[1]) : -1;
    for (let k = 0; k <= n; k++) {
      const t = k / n, x = Math.round(b.x1 + (b.x2 - b.x1) * t - cx), y = Math.round(b.y1 + (b.y2 - b.y1) * t - cy);
      g.fillStyle = 'rgba(40,6,14,0.35)'; g.fillRect(x, y - 1, 1, 3);
      const top = y - b.lift - b.thick;
      for (let j = 0; j < b.thick; j++) {
        const u = j / (b.thick - 1);
        g.fillStyle = u < 0.2 ? '#d56b7a' : u < 0.55 ? ((k + j) % 5 === 0 ? '#b24a5b' : '#a94353') : u < 0.85 ? '#86303f' : '#62202e';
        g.fillRect(x, top + j, 1, 1);
      }
      if (pulse >= 0 && Math.abs(t - pulse) < 0.12) { g.fillStyle = `rgba(255,236,160,${(0.85 - Math.abs(t - pulse) * 6).toFixed(3)})`; g.fillRect(x, top + 1, 1, b.thick - 3); }
    }
    for (const [x, y] of [[b.x1, b.y1], [b.x2, b.y2]] as [number, number][]) {
      for (let j = 0; j < b.lift + 2; j++) { g.fillStyle = j < 2 ? '#c45c6b' : '#8e3444'; g.fillRect(Math.round(x - cx - 3), Math.round(y - cy - b.lift + j), 7, 1); }
    }
  }

  private drawTrack(g: Ctx, t: Track, cx: number, cy: number, vw: number, vh: number): void {
    const L = t.lane, half = L.width / 2;
    for (let i = 0; i < L.n; i++) {
      const p = lanePoint(t, t.d[i]!);
      const wob = Math.sin(this.time * 2.1 + i * 1.7) * 1.5;
      const x = Math.round(p.x + p.nx * (t.off[i]! * half + wob) - cx), y = Math.round(p.y + p.ny * (t.off[i]! * half + wob) - cy);
      if (x < -6 || y < -6 || x > vw + 6 || y > vh + 6) continue;
      if (this.organ.holes(p.x, p.y) < -3 && t.d[i]! > 8 && t.d[i]! < t.total - 8) continue;
      const k = t.kind[i]!;
      if (k === 2) { cell(g, x, y, ['#ece6f4', '#d8cde8', '#8a69b3']); continue; }
      if (k === 1) { g.fillStyle = '#e9cddb'; g.fillRect(x, y, 2, 1); continue; }
      let ox = 0;
      if (L.blood === 'arterial') ox = 1;
      else if (L.blood === 'mix') ox = Math.max(0, Math.min(1, (p.x - 150) / 280));
      rbc(g, x, y, ox, (i + Math.floor(this.time * 3)) % 7 === 0);
    }
  }

  private fibrillating(): boolean { return this.rhythm === 'af' && (this.organ.kind === 'ra' || this.organ.kind === 'la'); }

  /** Wall thickening; in the AF layer the atria only quiver instead of squeezing together. */
  private squeezeAt(real: number): number {
    const o = this.organ;
    if (o.squeeze === 'none') return 0;
    if (o.squeeze === 'atria' && this.fibrillating()) return 0.1 + 0.08 * Math.abs(Math.sin(this.time * 23) * Math.sin(this.time * 7.3));
    return squeeze(o.squeeze, real);
  }

  /** Scattered, broken wavelets over the atrial floor and irregular arrivals at the AV node. */
  private drawFibrillation(g: Ctx, cx: number, cy: number): void {
    const o = this.organ, w = this.room.cols * 16, h = this.room.rows * 16, t = this.time;
    for (let i = 0; i < 22; i++) {
      const life = 0.42 + (i % 5) * 0.09, k = (t + i * 0.37) / life, n = Math.floor(k), p = k - n, hv = hash(i * 131 + n * 977 + 7);
      const x = (hv % 1000) / 1000 * w, y = ((hv >>> 10) % 1000) / 1000 * h;
      if (o.floor(x, y) > -4 || o.holes(x, y) < 2) continue;
      const r = 3 + p * 20, m = Math.max(8, Math.round(r * 0.9)), a0 = (hv % 628) / 100;
      g.fillStyle = `rgba(255,236,170,${(0.6 * (1 - p)).toFixed(3)})`;
      for (let j = 0; j < m; j++) {
        const ang = a0 + (j / m) * Math.PI * 1.2, px = x + Math.cos(ang) * r, py = y + Math.sin(ang) * r;
        if (o.floor(px, py) < 0) g.fillRect(Math.round(px - cx), Math.round(py - cy), 2, 1);
      }
    }
    const av = o.kind === 'ra' ? [...o.signals].reverse().find(s => s.kind === 'glow') : undefined;
    if (!av) return;
    let pos = (t + 0.4) % AF_CYCLE, start = 0;
    for (const gap of AF_ARRIVALS) { if (pos < start + gap) break; start += gap; }
    const pr = (pos - start) / 0.9;
    if (pr < 0 || pr >= 1) return;
    const p0 = av.pts[0]!, a = Math.sin(pr * Math.PI);
    const grd = g.createRadialGradient(p0.x - cx, p0.y - cy, 0, p0.x - cx, p0.y - cy, av.r * 1.6);
    grd.addColorStop(0, `rgba(255,246,190,${(0.9 * a).toFixed(3)})`); grd.addColorStop(1, 'rgba(255,220,140,0)');
    g.fillStyle = grd; g.fillRect(p0.x - cx - av.r * 2, p0.y - cy - av.r * 2, av.r * 4, av.r * 4);
  }

  private drawSignals(g: Ctx, cx: number, cy: number, real: number): void {
    if (this.fibrillating()) { this.drawFibrillation(g, cx, cy); return; }
    for (const s of this.organ.signals) {
      const pr = travel(real, s.from, s.to);
      if (pr < 0) continue;
      const p0 = s.pts[0]!;
      if (s.kind === 'glow') {
        const a = Math.sin(pr * Math.PI);
        const grd = g.createRadialGradient(p0.x - cx, p0.y - cy, 0, p0.x - cx, p0.y - cy, s.r * 1.6);
        grd.addColorStop(0, `rgba(255,246,190,${(0.95 * a).toFixed(3)})`); grd.addColorStop(1, 'rgba(255,220,140,0)');
        g.fillStyle = grd; g.fillRect(p0.x - cx - s.r * 2, p0.y - cy - s.r * 2, s.r * 4, s.r * 4);
      } else if (s.kind === 'ripple') {
        const r = pr * s.r, alpha = 0.4 * (1 - pr), n = Math.max(24, Math.round(r * 1.2));
        g.fillStyle = `rgba(255,236,170,${alpha.toFixed(3)})`;
        for (let k = 0; k < n; k++) {
          const ang = (k / n) * Math.PI * 2, x = p0.x + Math.cos(ang) * r, y = p0.y + Math.sin(ang) * r;
          if (this.organ.floor(x, y) < 0) g.fillRect(Math.round(x - cx), Math.round(y - cy), 2, 1);
        }
      } else {
        let total = 0; const seg: number[] = [];
        for (let i = 1; i < s.pts.length; i++) { const d = Math.hypot(s.pts[i]!.x - s.pts[i - 1]!.x, s.pts[i]!.y - s.pts[i - 1]!.y); seg.push(d); total += d; }
        const head = pr * total;
        for (let d = Math.max(0, head - 46); d <= head; d += 1) {
          let rem = d, i = 0;
          while (i < seg.length - 1 && rem > seg[i]!) { rem -= seg[i]!; i++; }
          const a = s.pts[i]!, b = s.pts[i + 1]!, k = rem / (seg[i] || 1);
          const alpha = 0.15 + 0.8 * (1 - (head - d) / 46);
          g.fillStyle = `rgba(255,240,170,${alpha.toFixed(3)})`;
          g.fillRect(Math.round(a.x + (b.x - a.x) * k - cx), Math.round(a.y + (b.y - a.y) * k - cy), 2, 2);
        }
      }
    }
  }

  /** Oxygen leaves each alveolus towards the capillaries; carbon dioxide goes the other way. */
  private drawGas(g: Ctx, cx: number, cy: number): void {
    this.organ.alveoli.forEach((a, ai) => {
      for (let k = 0; k < 6; k++) {
        const ang = (k / 6) * Math.PI * 2 + ai, ph = (this.time * 0.35 + k / 6 + ai * 0.13) % 1;
        const o2 = k % 2 === 0;
        const r = o2 ? a.r - 10 + ph * 22 : a.r + 12 - ph * 22;
        const x = Math.round(a.x + Math.cos(ang) * r - cx), y = Math.round(a.y + Math.sin(ang) * r - cy);
        g.fillStyle = o2 ? `rgba(225,245,255,${(0.9 - ph * 0.6).toFixed(3)})` : `rgba(150,158,170,${(0.85 - ph * 0.5).toFixed(3)})`;
        g.fillRect(x, y, 2, 2);
      }
    });
  }
}

/** Red blood cell, a biconcave disc: paler centre, darker rim shadow. ox: 0 oxygen-poor (dark red) … 1 oxygen-rich (bright red). */
function rbc(g: Ctx, x: number, y: number, ox: number, edgeOn: boolean): void {
  const lerp = (a: number[], b: number[]) => `rgb(${Math.round(a[0]! + (b[0]! - a[0]!) * ox)},${Math.round(a[1]! + (b[1]! - a[1]!) * ox)},${Math.round(a[2]! + (b[2]! - a[2]!) * ox)})`;
  const body = lerp([122, 28, 50], [214, 44, 66]), rim = lerp([92, 18, 36], [168, 26, 48]), pale = lerp([150, 52, 70], [246, 108, 118]);
  if (edgeOn) { g.fillStyle = rim; g.fillRect(x - 2, y, 4, 1); g.fillStyle = body; g.fillRect(x - 1, y - 1, 2, 1); return; }
  g.fillStyle = body; g.fillRect(x - 1, y - 1, 3, 1); g.fillRect(x - 2, y, 1, 1); g.fillRect(x + 2, y, 1, 1);
  g.fillStyle = pale; g.fillRect(x - 1, y, 3, 1);
  g.fillStyle = rim; g.fillRect(x - 1, y + 1, 3, 1);
}

function cell(g: Ctx, x: number, y: number, c: [string, string, string]): void {
  g.fillStyle = c[1]; g.fillRect(x - 3, y - 2, 6, 5); g.fillRect(x - 2, y - 3, 4, 7);
  g.fillStyle = c[0]; g.fillRect(x - 2, y - 2, 3, 2);
  g.fillStyle = c[2]; g.fillRect(x - 1, y, 1, 2); g.fillRect(x + 1, y - 1, 1, 2); g.fillRect(x, y + 1, 2, 1);
}

const LEAF = '#efdfd0', LEAF_D = '#cfb0a6', LEAF_EDGE = '#8c4b55';

/** Leaflets (tricuspid 3, mitral 2) or semilunar cusps (3), opening towards the downstream side. */
export function drawValve(g: Ctx, v: Valve, open: number, cx: number, cy: number): void {
  const x0 = v.x - cx, y0 = v.y - cy, w = v.w, s = v.toward;
  g.fillStyle = '#f2e2d3'; g.fillRect(Math.round(x0 - 3), Math.round(y0 - 2), 4, 4); g.fillRect(Math.round(x0 + w - 1), Math.round(y0 - 2), 4, 4);
  g.fillStyle = '#b98c8a'; g.fillRect(Math.round(x0 - 3), Math.round(y0 + 2), 4, 1); g.fillRect(Math.round(x0 + w - 1), Math.round(y0 + 2), 4, 1);
  if (v.kind === 'tricuspid' || v.kind === 'mitral') {
    const cuts = v.kind === 'mitral' ? [0, 0.56, 1] : [0, 0.36, 0.7, 1];
    const n = cuts.length - 1;
    for (let i = 0; i < n; i++) {
      const a = x0 + w * cuts[i]!, b = x0 + w * cuts[i + 1]!, m = (a + b) / 2;
      const anchor = i === 0 ? a : i === n - 1 ? b : m, k = 0.62 * open;
      const fa = a + (anchor - a) * k, fb = b + (anchor - b) * k;
      const len = 3 + 30 * open, billow = (1 - open) * 4;
      const tip = { x: (fa + fb) / 2, y: y0 + s * (len + 3 * open) - s * billow };
      const poly = [{ x: a, y: y0 }, { x: b, y: y0 }, { x: fb, y: y0 + s * len }, tip, { x: fa, y: y0 + s * len }];
      fillPoly(g, poly, LEAF_EDGE);
      fillPoly(g, poly.map(p => ({ x: p.x + (p.x < m ? 1 : -1), y: p.y - s * 0.5 })), LEAF);
      fillPoly(g, [{ x: m - 1, y: y0 + s }, { x: m + 1, y: y0 + s }, { x: (fa + fb) / 2 + 1, y: y0 + s * Math.max(2, len - 3) }, { x: (fa + fb) / 2 - 1, y: y0 + s * Math.max(2, len - 3) }], LEAF_D);
      if (open < 0.2) { g.fillStyle = LEAF_EDGE; g.fillRect(Math.round(b) - (i === n - 1 ? 0 : 0), Math.round(Math.min(y0, y0 - s * billow) - 1), 1, Math.round(billow + 4)); }
    }
  } else {
    const third = w / 3;
    for (let i = 0; i < 3; i++) {
      const a = x0 + third * i, b = a + third;
      const wa = i === 0 ? x0 : i === 2 ? x0 + w - 7 : x0 + w / 2 - 9, wb = i === 0 ? x0 + 7 : i === 2 ? x0 + w : x0 + w / 2 + 9;
      const ca = a + (wa - a) * open, cb = b + (wb - b) * open;
      const depth = 8 * (1 - open) + 4 * open, dir = open < 0.5 ? -s : s;
      const pts: Point[] = [];
      for (let k = 0; k <= 12; k++) { const t = k / 12; pts.push({ x: ca + (cb - ca) * t, y: y0 + dir * depth * Math.sin(t * Math.PI) }); }
      pts.push({ x: cb, y: y0 }, { x: ca, y: y0 });
      fillPoly(g, pts, LEAF_EDGE);
      fillPoly(g, pts.map(p => ({ x: p.x + (p.x < (ca + cb) / 2 ? 1 : -1), y: p.y - dir * 0.8 })), i === 1 && open > 0.5 ? 'rgba(239,223,208,0.55)' : LEAF);
      g.fillStyle = LEAF_D; g.fillRect(Math.round((ca + cb) / 2 - 1), Math.round(y0 + dir * depth * 0.55), 3, 1);
    }
  }
}

function drawCord(g: Ctx, x0: number, y0: number, v: Valve, slot: number, open: number, cx: number, cy: number): void {
  const s = v.toward, cuts = v.kind === 'mitral' ? [0, 0.56, 1] : [0, 0.36, 0.7, 1];
  let i = 0; while (i < cuts.length - 2 && slot > cuts[i + 1]!) i++;
  const a = cuts[i]!, b = cuts[i + 1]!, n = cuts.length - 1;
  const anchor = i === 0 ? a : i === n - 1 ? b : (a + b) / 2;
  const sx = slot + (anchor - slot) * 0.62 * open;
  const tx = v.x + v.w * sx - cx, ty = v.y + s * (3 + 30 * open) - cy;
  const sag = 6 * open, mx = (x0 + tx) / 2 + sag, my = (y0 + ty) / 2;
  for (let k = 0; k <= 1; k += 1 / 80) {
    const x = (1 - k) * (1 - k) * x0 + 2 * (1 - k) * k * mx + k * k * tx, y = (1 - k) * (1 - k) * y0 + 2 * (1 - k) * k * my + k * k * ty;
    if (k > 0.82) {
      for (const dx of [-2.5, 2.5]) { const f = (k - 0.82) / 0.18; g.fillStyle = 'rgba(243,230,220,0.85)'; g.fillRect(Math.round(x + dx * f), Math.round(y), 1, 1); }
    } else { g.fillStyle = open > 0.5 ? 'rgba(236,222,212,0.8)' : 'rgba(250,240,232,0.95)'; g.fillRect(Math.round(x), Math.round(y), 1, 1); }
  }
}
