import motion from '../../data/balance/movement.v0.2.json';
import { buildingArt } from '../art/buildings';
import { AX, AY, FIGURE_TOP, WALK_CYCLE, characterFrame, idleFrame } from '../art/character';
import { bakeGround } from '../art/ground';
import { ellipse, makeCanvas, pixelText, type Sprite } from '../art/pixel';
import { propSprite } from '../art/props';
import type { Look } from '../domain/appearance';
import type { TimeMode } from '../domain/state';
import { canStand, crossingAt, doorAt, moveWithCollision, nearestTarget } from '../world/collision';
import { findPath } from '../world/path';
import { T, rooms, tileAt, type Building, type Crossing, type Door, type Room, type Target } from '../world/rooms';
import { TILE, type Dir, type Point, type RoomId } from '../world/types';
import { Traffic } from './traffic';

export type Actor = { id: string; name: string; look: Look; x: number; y: number; facing: Dir; homeFacing: Dir; walk: number; moving: boolean; route: Point[] | null; leg: number; step: number; speed: number; wait: number };
export type Input = { vx: number; vy: number; steer: Point | null };
type Drawable = { y: number; x: number; draw: () => void; occluder: { x: number; y: number; w: number; h: number } | null };

const LABEL_FONT = (px: number) => `700 ${px}px 'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',system-ui,sans-serif`;

export class World {
  roomId: RoomId;
  room: Room;
  player: Actor;
  npcs: Actor[] = [];
  traffic = new Traffic();
  path: Point[] = [];
  pendingTarget: Target | null = null;
  near: Target | null = null;
  locked = false;
  timeMode: TimeMode = 'day';
  questNpc: string | null = null;
  /** Non-person targets that carry a quest marker (e.g. the Bodyscope, observation points). */
  questTargets: string[] = [];
  /** Waiting at a red pedestrian light: crossing being waited for. */
  waitingAt: Crossing | null = null;
  onSignalWait: (c: Crossing, seconds: number) => void = () => {};
  onDoor: (d: Door) => void = () => {};
  onNear: (t: Target | null) => void = () => {};
  onTarget: (t: Target) => void = () => {};

  private vel = { x: 0, y: 0 };
  private time = 0;
  private stuck = 0;
  private marker: { x: number; y: number; t: number } | null = null;
  private doorLatch: string | null = null;
  private grounds = new Map<RoomId, HTMLCanvasElement>();
  private buffer = makeCanvas(2, 2);
  private light = makeCanvas(2, 2);
  private cam = { x: 0, y: 0, ready: false };
  private leaves: { x: number; y: number; vx: number; vy: number; c: string; life: number }[] = [];
  view = { x: 0, y: 0, w: 1, h: 1, zoom: 1 };

  constructor(roomId: RoomId, x: number, y: number, facing: Dir, look: Look, name: string) {
    this.roomId = roomId; this.room = rooms[roomId];
    this.player = { id: 'player', name, look, x, y, facing, homeFacing: facing, walk: 0, moving: false, route: null, leg: 0, step: 1, speed: 0, wait: 0 };
    this.loadNpcs();
    const d = doorAt(roomId, { x, y }); this.doorLatch = d ? d.id : null;
  }

  setRoom(roomId: RoomId, x: number, y: number, facing: Dir): void {
    this.roomId = roomId; this.room = rooms[roomId];
    this.player.x = x; this.player.y = y; this.player.facing = facing; this.player.moving = false;
    this.vel = { x: 0, y: 0 }; this.path = []; this.pendingTarget = null; this.marker = null; this.cam.ready = false; this.leaves = [];
    this.stuck = 0; this.waitingAt = null;
    const d = doorAt(roomId, { x, y }); this.doorLatch = d ? d.id : null;
    this.loadNpcs();
    this.near = null; this.onNear(null);
  }

  private loadNpcs(): void {
    this.npcs = this.room.npcs.map(n => ({ id: n.id, name: n.name, look: n.look, x: n.x, y: n.y, facing: n.facing, homeFacing: n.facing, walk: 0, moving: false, route: n.route, leg: n.route ? 1 : 0, step: 1, speed: n.speed, wait: 0 }));
  }

  stop(): void { this.vel = { x: 0, y: 0 }; this.path = []; this.pendingTarget = null; this.player.moving = false; }

  /** Click/tap: walk to the point, or to the touched person/object and talk to it on arrival. */
  tap(pt: Point): void {
    if (this.locked) return;
    const p = this.player;
    const t = this.targetAt(pt);
    if (t) {
      if (Math.hypot(t.x - p.x, t.y - p.y) <= t.r) { this.stop(); this.onTarget(t); return; }
      const goal = this.approach(t);
      this.path = goal ? findPath(this.roomId, p, goal) : [];
      this.pendingTarget = this.path.length ? t : null;
      this.marker = { x: goal?.x ?? t.x, y: goal?.y ?? t.y, t: this.time };
      return;
    }
    this.path = findPath(this.roomId, p, pt);
    this.pendingTarget = null;
    this.marker = this.path.length ? { ...this.path[this.path.length - 1]!, t: this.time } : null;
  }

  private targetAt(pt: Point): Target | null {
    for (const t of this.room.targets) {
      if (t.npc) {
        const n = this.npcs.find(a => a.id === t.npc);
        if (n && pt.x >= n.x - 10 && pt.x <= n.x + 10 && pt.y >= n.y - FIGURE_TOP && pt.y <= n.y + 4) return t;
      } else if (Math.hypot(pt.x - t.x, pt.y - (t.y - 6)) < 16) return t;
    }
    return null;
  }

  private approach(t: Target): Point | null {
    if (canStand(this.roomId, t)) return { x: t.x, y: t.y };
    let best: Point | null = null, bestD = Infinity;
    for (let r = 4; r <= t.r - 2; r += 3) for (let a = 0; a < 16; a++) {
      const q = { x: t.x + Math.cos((a / 16) * Math.PI * 2) * r, y: t.y + Math.sin((a / 16) * Math.PI * 2) * r };
      if (!canStand(this.roomId, q)) continue;
      const d = Math.hypot(q.x - this.player.x, q.y - this.player.y) + r * 2;
      if (d < bestD) { bestD = d; best = q; }
    }
    return best;
  }

  faceToward(t: Point): void {
    const p = this.player, dx = t.x - p.x, dy = t.y - 6 - p.y;
    p.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  }

  update(dt: number, input: Input, inputEnabled = true): void {
    dt = Math.min(dt, motion.maxFrameMilliseconds / 1000);
    this.time += dt;
    const p = this.player;
    const locked = this.locked || !inputEnabled;
    if (locked) this.stop();
    let dx = 0, dy = 0;
    const manual = !locked && (input.vx !== 0 || input.vy !== 0 || input.steer !== null);
    if (!locked) {
      if (input.vx || input.vy) { dx = input.vx; dy = input.vy; }
      else if (input.steer) { const ex = input.steer.x - p.x, ey = input.steer.y - 10 - p.y, d = Math.hypot(ex, ey); if (d > 7) { dx = ex / d; dy = ey / d; } }
      if (manual && (this.path.length || this.pendingTarget)) { this.path = []; this.pendingTarget = null; this.marker = null; }
      if (!manual && this.path.length) {
        const wp = this.path[0]!, ex = wp.x - p.x, ey = wp.y - p.y, d = Math.hypot(ex, ey);
        if (d < 1.2) { this.path.shift(); if (!this.path.length) this.arrive(); }
        else { dx = ex / d; dy = ey / d; }
      }
    }
    const len = Math.hypot(dx, dy); if (len > 1) { dx /= len; dy /= len; }
    const speed = motion.walkPixelsPerSecond;
    const tau = ((dx || dy) ? motion.accelerationMilliseconds : motion.releaseMilliseconds) / 1000;
    const k = 1 - Math.exp(-dt / tau);
    this.vel.x += (dx * speed - this.vel.x) * k; this.vel.y += (dy * speed - this.vel.y) * k;
    if (!dx && !dy && Math.hypot(this.vel.x, this.vel.y) < 3) this.vel = { x: 0, y: 0 };
    let mx = this.vel.x * dt, my = this.vel.y * dt;
    if (!manual && this.path.length) {
      const wp = this.path[0]!, rem = Math.hypot(wp.x - p.x, wp.y - p.y), st = Math.hypot(mx, my);
      if (st > rem && st > 0) { mx *= rem / st; my *= rem / st; }
    }
    let waiting: Crossing | null = null;
    if (mx || my) {
      const r = moveWithCollision(this.roomId, p, mx, my);
      waiting = this.lightBlocks(p, r);
      if (waiting) { r.x = p.x; r.y = p.y; this.vel = { x: 0, y: 0 }; }
      const moved = Math.hypot(r.x - p.x, r.y - p.y);
      p.x = r.x; p.y = r.y; p.walk += moved; p.moving = moved > 0.02;
      if (r.blockedX) this.vel.x = 0;
      if (r.blockedY) this.vel.y = 0;
      const fx = dx || this.vel.x, fy = dy || this.vel.y;
      if (Math.abs(fx) > 0.05 || Math.abs(fy) > 0.05) p.facing = Math.abs(fx) > Math.abs(fy) * 1.08 ? (fx > 0 ? 'right' : 'left') : (fy > 0 ? 'down' : 'up');
      this.stuck = moved < 0.05 && this.path.length && !waiting ? this.stuck + dt : 0;
      if (this.stuck > 0.5) { this.path = []; this.pendingTarget = null; this.stuck = 0; }
    } else p.moving = false;
    if (waiting && waiting.id !== this.waitingAt?.id) this.onSignalWait(waiting, this.traffic.waitFor(waiting.road));
    this.waitingAt = waiting ?? (this.waitingAt && (input.vx || input.vy || input.steer || this.path.length) ? this.waitingAt : null);
    if (this.waitingAt && this.traffic.walk(this.waitingAt.road) === 'walk') this.waitingAt = null;

    const door = doorAt(this.roomId, p);
    if (door && this.doorLatch !== door.id && !locked) { this.doorLatch = door.id; this.stop(); this.onDoor(door); return; }
    if (!door) this.doorLatch = null;

    const near = locked ? null : nearestTarget(this.roomId, p) ?? null;
    if ((near?.id ?? null) !== (this.near?.id ?? null)) { this.near = near; this.onNear(near); }

    this.updateNpcs(dt);
    if (this.roomId === 'street') { this.traffic.update(dt, [p, ...this.npcs]); this.updateLeaves(dt); }
  }

  /** A person may step onto a crosswalk only on a green pedestrian light; once on it they may finish crossing. */
  private lightBlocks(from: { x: number; y: number }, to: { x: number; y: number }): Crossing | null {
    if (!this.room.crossings.length) return null;
    const c = crossingAt(this.roomId, to);
    if (!c || crossingAt(this.roomId, from)?.id === c.id) return null;
    return this.traffic.walk(c.road) === 'walk' ? null : c;
  }

  private arrive(): void {
    const t = this.pendingTarget; this.pendingTarget = null; this.marker = null;
    if (t && Math.hypot(t.x - this.player.x, t.y - this.player.y) <= t.r + 2) this.onTarget(t);
  }

  private updateNpcs(dt: number): void {
    const p = this.player;
    for (const n of this.npcs) {
      if (!n.route) {
        const d = Math.hypot(p.x - n.x, p.y - n.y);
        if (d < 34) { const dx = p.x - n.x, dy = p.y - n.y; n.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); }
        else n.facing = n.homeFacing;
        continue;
      }
      if (n.wait > 0) { n.wait -= dt; n.moving = false; continue; }
      const tgt = n.route[n.leg]!;
      const ex = tgt.x - n.x, ey = tgt.y - n.y, d = Math.hypot(ex, ey);
      if (d < 0.8) {
        n.leg += n.step;
        if (n.leg >= n.route.length) { n.step = -1; n.leg = n.route.length - 2; n.wait = 1.2 + (n.x % 7) / 5; }
        else if (n.leg < 0) { n.step = 1; n.leg = 1; n.wait = 1.2 + (n.y % 7) / 5; }
        continue;
      }
      if (Math.hypot(p.x - (n.x + ex / d * 10), p.y - (n.y + ey / d * 10)) < 9) { n.moving = false; continue; }
      const step = Math.min(d, n.speed * dt);
      if (this.lightBlocks(n, { x: n.x + ex / d * (step + 1), y: n.y + ey / d * (step + 1) })) { n.moving = false; n.facing = Math.abs(ex) > Math.abs(ey) ? (ex > 0 ? 'right' : 'left') : (ey > 0 ? 'down' : 'up'); continue; }
      n.x += ex / d * step; n.y += ey / d * step; n.walk += step; n.moving = true;
      n.facing = Math.abs(ex) > Math.abs(ey) ? (ex > 0 ? 'right' : 'left') : (ey > 0 ? 'down' : 'up');
    }
  }

  private updateLeaves(dt: number): void {
    const trees = this.room.props.filter(pr => pr.kind === 'ginkgo');
    while (this.leaves.length < 22) {
      const tr = trees[Math.floor(Math.random() * trees.length)];
      if (!tr) break;
      this.leaves.push({ x: tr.x - 12 + Math.random() * 24, y: tr.y - 40 + Math.random() * 18, vx: 4 + Math.random() * 6, vy: 6 + Math.random() * 6, c: Math.random() < 0.5 ? '#f4d75c' : '#e8b83a', life: 2.5 + Math.random() * 3 });
    }
    for (const l of this.leaves) { l.life -= dt; l.x += (l.vx + Math.sin(this.time * 3 + l.y) * 8) * dt; l.y += l.vy * dt; }
    this.leaves = this.leaves.filter(l => l.life > 0);
  }

  private resolvedTime(): 'day' | 'dusk' | 'night' {
    if (this.timeMode !== 'auto') return this.timeMode;
    const h = new Date().getHours();
    return h >= 7 && h < 17 ? 'day' : h >= 17 && h < 19 ? 'dusk' : 'night';
  }

  ground(id: RoomId): HTMLCanvasElement {
    let c = this.grounds.get(id);
    if (!c) { c = bakeGround(rooms[id]); this.grounds.set(id, c); }
    return c;
  }

  /** Interiors may step one zoom level down so that the whole room (including the back wall) fits. */
  fitZoom(z: number, W: number, H: number): number {
    if (!this.room.interior) return z;
    const RW = this.room.cols * TILE, RH = this.room.rows * TILE;
    if (RW * z <= W && RH * z <= H) return z;
    return z - 1 >= 2 && RW * (z - 1) <= W && RH * (z - 1) <= H ? z - 1 : z;
  }

  screenToWorld(sx: number, sy: number): Point { return { x: this.view.x + sx / this.view.zoom, y: this.view.y + sy / this.view.zoom }; }

  render(out: CanvasRenderingContext2D, W: number, H: number, zoom: number, dpr: number): void {
    const vw = Math.ceil(W / zoom), vh = Math.ceil(H / zoom);
    const buf = this.buffer;
    if (buf.c.width !== vw || buf.c.height !== vh) { buf.c.width = vw; buf.c.height = vh; buf.g.imageSmoothingEnabled = false; }
    const room = this.room, RW = room.cols * TILE, RH = room.rows * TILE, p = this.player;
    const tx = p.x - vw / 2, ty = p.y - 14 - vh / 2;
    if (!this.cam.ready) { this.cam = { x: tx, y: ty, ready: true }; }
    this.cam.x += (tx - this.cam.x) * 0.18; this.cam.y += (ty - this.cam.y) * 0.18;
    const clamp = (v: number, size: number, max: number) => max > size ? Math.max(0, Math.min(max - size, v)) : (max - size) / 2;
    const cx = Math.round(clamp(this.cam.x, vw, RW)), cy = Math.round(clamp(this.cam.y, vh, RH));
    this.view = { x: cx, y: cy, w: vw, h: vh, zoom };
    const g = buf.g;
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    g.fillStyle = room.interior ? '#17141f' : '#2a2e3a'; g.fillRect(0, 0, vw, vh);
    g.drawImage(this.ground(this.roomId), -cx, -cy);
    const tod = room.interior ? 'day' : this.resolvedTime();

    if (this.marker) {
      const age = this.time - this.marker.t, r = 3 + (age * 10) % 5;
      ellipse(g, this.marker.x - cx, this.marker.y - cy, r + 1, Math.max(1, Math.round((r + 1) / 2)), 'rgba(255,240,190,0.55)');
    }

    if (room.flow) this.drawFlow(g, cx, cy);
    const items: Drawable[] = [];
    const inView = (x: number, y: number, w: number, h: number) => x + w > cx - 8 && x < cx + vw + 8 && y + h > cy - 8 && y < cy + vh + 8;
    for (const b of room.buildings) {
      if (!inView(b.x, b.y - b.h, b.w, b.d + b.h)) continue;
      items.push({ y: b.y + b.d, x: b.x, occluder: { x: b.x, y: b.y - b.h, w: b.w, h: b.d + b.h }, draw: () => this.drawBuilding(g, b, cx, cy, tod === 'night') });
    }
    const frame4 = Math.floor(this.time * 6) % 4, beat4 = Math.floor(this.time * 4.4) % 4;
    for (const pr of room.props) {
      const s = propSprite(pr.kind, pr.v, pr.kind === 'heartcore' ? beat4 : pr.kind === 'fountain' || pr.kind === 'bodyscope' || pr.kind === 'robot' || pr.kind === 'pad' ? frame4 : 0);
      if (!inView(pr.x - s.ax, pr.y - s.ay, s.c.width, s.c.height)) continue;
      const tall = pr.kind === 'ginkgo' || pr.kind === 'parktree' || pr.kind === 'bookshelf' || pr.kind === 'lamp' || pr.kind === 'heartcore';
      items.push({ y: pr.y, x: pr.x, occluder: tall ? { x: pr.x - s.ax + 3, y: pr.y - s.ay, w: s.c.width - 6, h: s.c.height - 10 } : null, draw: () => {
        this.blit(g, s, pr.x, pr.y, cx, cy);
        if (pr.kind === 'signal') this.drawSignal(g, pr.x, pr.y, pr.v === 1 ? 'EW' : 'NS', cx, cy);
        if (pr.kind === 'pedsignal') this.drawPedSignal(g, pr.x, pr.y, pr.v === 1 ? 'EW' : 'NS', cx, cy);
      } });
    }
    for (const n of this.npcs) items.push({ y: n.y, x: n.x, occluder: null, draw: () => this.drawActor(g, n, cx, cy) });
    if (this.roomId === 'street') for (const car of this.traffic.cars) {
      const a = this.traffic.anchor(car);
      if (!inView(a.x - car.sprite.ax, a.y - car.sprite.ay, car.sprite.c.width, car.sprite.c.height)) continue;
      items.push({ y: a.y, x: a.x, occluder: null, draw: () => this.blit(g, car.sprite, a.x, a.y, cx, cy) });
    }
    const me: Drawable = { y: p.y, x: p.x, occluder: null, draw: () => this.drawActor(g, p, cx, cy) };
    items.push(me);
    items.sort((a, b) => a.y - b.y || a.x - b.x);
    for (const it of items) it.draw();
    const pr = { x: p.x - 9, y: p.y - FIGURE_TOP, w: 18, h: FIGURE_TOP };
    const hidden = items.some(it => it.occluder && it.y > p.y && it.occluder.x < pr.x + pr.w && it.occluder.x + it.occluder.w > pr.x && it.occluder.y < pr.y + pr.h && it.occluder.y + it.occluder.h > pr.y);
    if (hidden) { g.globalAlpha = 0.45; this.drawActor(g, p, cx, cy, false); g.globalAlpha = 1; }

    for (const l of this.leaves) { g.fillStyle = l.c; g.fillRect(Math.round(l.x - cx), Math.round(l.y - cy), 2, 1); }
    if (room.interior) for (const pd of room.interior.pendants) this.drawPendant(g, pd.x - cx, pd.y - cy);
    if (!room.interior && tod !== 'day') this.applyLight(g, vw, vh, cx, cy, tod);
    if (this.roomId === 'heart') { const pulse = Math.max(0, Math.sin(this.time * Math.PI * 2 * 1.1)) ** 3; g.fillStyle = `rgba(220,40,80,${(0.03 + pulse * 0.07).toFixed(3)})`; g.fillRect(0, 0, vw, vh); }

    out.imageSmoothingEnabled = false;
    out.drawImage(buf.c, 0, 0, vw * zoom, vh * zoom);
    this.drawLabels(out, cx, cy, zoom, dpr);
  }

  private blit(g: CanvasRenderingContext2D, s: Sprite, x: number, y: number, cx: number, cy: number): void {
    g.drawImage(s.c, Math.round(x - s.ax - cx), Math.round(y - s.ay - cy));
  }

  private drawActor(g: CanvasRenderingContext2D, a: Actor, cx: number, cy: number, shadow = true): void {
    const x = Math.round(a.x - cx), y = Math.round(a.y - cy);
    if (shadow) ellipse(g, x, y - 1, 6, 2, 'rgba(30,22,52,0.28)');
    const frame = a.moving ? WALK_CYCLE[Math.floor(a.walk / motion.walkFramePixels) % 4]! : idleFrame(this.time, (a.id.charCodeAt(0) % 7) / 7);
    g.drawImage(characterFrame(a.look, a.facing, frame), x - AX, y - AY);
  }

  private drawBuilding(g: CanvasRenderingContext2D, b: Building, cx: number, cy: number, night: boolean): void {
    const art = buildingArt(b);
    const ox = b.x - cx, oy = b.y - b.h - cy;
    g.drawImage(night ? art.night : art.day, ox, oy);
    const bb = art.billboard;
    if (!bb) return;
    const x0 = ox + bb.x, y0 = oy + bb.y, scene = Math.floor(this.time / 4) % 3, t = this.time;
    if (scene === 0) {
      const pal = ['#ff5fa2', '#5fd3ff', '#ffd35f', '#8d6bff', '#5fffb0'];
      for (let x = 0; x < bb.w; x++) { g.fillStyle = pal[Math.floor((x + t * 14) / 5) % pal.length]!; g.fillRect(x0 + x, y0, 1, bb.h); }
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x0, y0 + ((Math.floor(t * 20)) % bb.h), bb.w, 2);
    } else if (scene === 1) {
      g.fillStyle = '#1d1640'; g.fillRect(x0, y0, bb.w, bb.h);
      const s = 1 + (Math.sin(t * 6) > 0.6 ? 1 : 0), hx = x0 + Math.floor(bb.w / 2), hy = y0 + 9;
      g.fillStyle = '#ff5f87';
      for (const [dx, dy, w] of [[-4, -2, 3], [1, -2, 3], [-5, -1, 10], [-5, 0, 10], [-4, 1, 8], [-3, 2, 6], [-2, 3, 4], [-1, 4, 2]] as [number, number, number][]) g.fillRect(hx + dx * s, hy + dy * s, w * s, s);
      pixelText(g, 'HEALTH', x0 + 2, y0 + bb.h - 7, '#ffe6f0');
    } else {
      for (let y = 0; y < bb.h; y++) { g.fillStyle = y < bb.h / 2 ? '#2f6fd0' : '#6a4fd8'; g.fillRect(x0, y0 + y, bb.w, 1); }
      pixelText(g, 'NEWS', x0 + 5, y0 + 6, '#ffffff');
      for (let i = 0; i < 4; i++) { g.fillStyle = i === Math.floor(t * 3) % 4 ? '#ffd35f' : '#9fb4ff'; g.fillRect(x0 + 6 + i * 4, y0 + 16, 2, 2); }
    }
  }

  private drawSignal(g: CanvasRenderingContext2D, x: number, y: number, axis: 'NS' | 'EW', cx: number, cy: number): void {
    const ph = this.traffic.phase(axis);
    const lx = ph === 'red' ? 2 : ph === 'yellow' ? 6 : 10;
    g.fillStyle = ph === 'red' ? '#ff4a3a' : ph === 'yellow' ? '#ffc23a' : '#3ae07a';
    g.fillRect(Math.round(x - 7 + lx - cx), Math.round(y - 47 + 3 - cy), 2, 2);
  }

  /** Pedestrian head: red standing figure on top, green walking figure below (blinks before turning red). */
  private drawPedSignal(g: CanvasRenderingContext2D, x: number, y: number, road: 'NS' | 'EW', cx: number, cy: number): void {
    const ph = this.traffic.walk(road);
    const ox = Math.round(x - 5 - cx), oy = Math.round(y - 39 - cy);
    const fig = (rows: string[], top: number, color: string) => {
      g.fillStyle = color;
      rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] === '#') g.fillRect(ox + 2 + i, oy + top + j, 1, 1); });
    };
    if (ph === 'stop') fig(['..##..', '.####.', '..##..', '.#..#.'], 2, '#ff4a3a');
    else if (ph === 'walk' || Math.floor(this.time * 4) % 2 === 0) fig(['...##.', '..###.', '.#.#..', '#...#.'], 9, '#3ae07a');
  }

  /** Moving blood markers along the model loop; every other one carries a white delivery slip. */
  private drawFlow(g: CanvasRenderingContext2D, cx: number, cy: number): void {
    const pts = this.room.flow!;
    const seg: number[] = [];
    let total = 0;
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y); seg.push(d); total += d; }
    const offset = this.time * 30 + 3 * Math.sin(this.time * Math.PI * 2 * 1.1);
    const n = 18;
    for (let k = 0; k < n; k++) {
      let d = (offset + (k * total) / n) % total;
      let i = 0;
      while (i < seg.length - 1 && d > seg[i]!) { d -= seg[i]!; i++; }
      const a = pts[i]!, b = pts[i + 1]!, t = seg[i] ? d / seg[i]! : 0;
      const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
      if (this.room.flowHidden.some(h => x >= h.x && x < h.x + h.w && y >= h.y && y < h.y + h.h)) continue;
      const sx = Math.round(x - cx), sy = Math.round(y - cy);
      ellipse(g, sx, sy, 3, 2, '#7a1428'); ellipse(g, sx, sy - 1, 3, 2, '#ee3b55');
      g.fillStyle = '#ff9aaa'; g.fillRect(sx - 2, sy - 2, 2, 1);
      if (k % 2 === 0) { g.fillStyle = '#ffffff'; g.fillRect(sx, sy - 2, 2, 2); }
    }
  }

  private drawPendant(g: CanvasRenderingContext2D, x: number, y: number): void {
    g.fillStyle = '#3a3040'; g.fillRect(Math.round(x), Math.round(y - 30), 1, 26);
    g.fillStyle = '#2d2a33'; g.fillRect(Math.round(x - 3), Math.round(y - 5), 7, 3);
    g.fillStyle = '#ffe3a0'; g.fillRect(Math.round(x - 2), Math.round(y - 2), 5, 1);
    g.fillStyle = 'rgba(255,230,160,0.12)'; g.fillRect(Math.round(x - 6), Math.round(y - 1), 13, 3);
  }

  private applyLight(g: CanvasRenderingContext2D, vw: number, vh: number, cx: number, cy: number, tod: 'dusk' | 'night'): void {
    const lm = this.light;
    if (lm.c.width !== vw || lm.c.height !== vh) { lm.c.width = vw; lm.c.height = vh; }
    const l = lm.g;
    l.globalCompositeOperation = 'source-over';
    l.fillStyle = tod === 'night' ? '#7682b6' : '#f2c9ad'; l.fillRect(0, 0, vw, vh);
    l.globalCompositeOperation = 'lighter';
    const strength = tod === 'night' ? 1 : 0.35;
    const glow = (x: number, y: number, r: number, a: number) => {
      const grd = l.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, `rgba(255,214,150,${a * strength})`); grd.addColorStop(1, 'rgba(255,214,150,0)');
      l.fillStyle = grd; l.fillRect(x - r, y - r, r * 2, r * 2);
    };
    for (const pr of this.room.props) {
      if (pr.kind === 'lamp') glow(pr.x - cx, pr.y - 36 - cy, 44, 0.62);
      if (pr.kind === 'vending') glow(pr.x - cx, pr.y - 12 - cy, 18, 0.5);
    }
    if (tod === 'night') {
      for (const b of this.room.buildings) {
        const art = buildingArt(b);
        const ox = b.x - cx, oy = b.y - b.h - cy;
        if (ox > vw || ox + b.w < 0 || oy > vh || oy + b.d + b.h < 0) continue;
        l.fillStyle = 'rgba(255,232,180,0.9)';
        for (const r of art.lights) l.fillRect(ox + r.x, oy + r.y, r.w, r.h);
        if (art.billboard) { l.fillStyle = 'rgba(255,255,255,0.95)'; l.fillRect(ox + art.billboard.x, oy + art.billboard.y, art.billboard.w, art.billboard.h); glow(ox + art.billboard.x + 13, oy + art.billboard.y + 14, 30, 0.35); }
        glow(ox + b.w / 2, oy + b.d + b.h - 4, b.w * 0.45, 0.25);
      }
      for (const car of this.traffic.cars) {
        const a = this.traffic.anchor(car), d = car.lane.dir;
        const hx = a.x - cx + (d === 'right' ? 18 : d === 'left' ? -18 : 0), hy = a.y - cy + (d === 'down' ? 8 : d === 'up' ? -car.len - 4 : -6);
        glow(hx, hy, 18, 0.6);
      }
      glow(this.player.x - cx, this.player.y - 12 - cy, 26, 0.32);
    }
    g.globalCompositeOperation = 'multiply'; g.drawImage(lm.c, 0, 0); g.globalCompositeOperation = 'source-over';
  }

  private drawLabels(out: CanvasRenderingContext2D, cx: number, cy: number, zoom: number, dpr: number): void {
    const fs = Math.round(11 * dpr);
    out.font = LABEL_FONT(fs); out.textAlign = 'center'; out.textBaseline = 'bottom'; out.lineJoin = 'round';
    const label = (text: string, wx: number, wy: number, color: string) => {
      const sx = (wx - cx) * zoom, sy = (wy - cy) * zoom;
      out.lineWidth = 3.5 * dpr; out.strokeStyle = 'rgba(22,18,34,0.85)'; out.strokeText(text, sx, sy);
      out.fillStyle = color; out.fillText(text, sx, sy);
    };
    const top = FIGURE_TOP + 2;
    for (const n of this.npcs) if (n.name) label(n.name, n.x, n.y - top, this.near?.npc === n.id ? '#fff3c4' : '#f6d98a');
    label(this.player.name, this.player.x, this.player.y - top, '#ffffff');
    const bob = Math.sin(this.time * 5) * 2;
    const mark = (wx: number, wy: number) => {
      const sx = (wx - cx) * zoom, sy = (wy - cy) * zoom + bob * dpr;
      out.beginPath(); out.arc(sx, sy - 7 * dpr, 8 * dpr, 0, Math.PI * 2); out.fillStyle = '#f2b53a'; out.fill();
      out.lineWidth = 2 * dpr; out.strokeStyle = '#3a2a12'; out.stroke();
      out.fillStyle = '#3a2a12'; out.font = LABEL_FONT(Math.round(12 * dpr)); out.textBaseline = 'middle'; out.fillText('!', sx, sy - 7 * dpr);
      out.font = LABEL_FONT(fs); out.textBaseline = 'bottom';
    };
    for (const id of this.questTargets) {
      const t = this.room.targets.find(q => q.id === id);
      if (t && this.near?.id !== id) mark(t.x, t.y - 34);
    }
    const nearNpc = this.near?.npc ? this.npcs.find(a => a.id === this.near!.npc) : null;
    if (nearNpc && nearNpc.id !== this.questNpc && !this.locked) {
      const sx = (nearNpc.x - cx) * zoom, sy = (nearNpc.y - top - 13 - cy) * zoom;
      out.fillStyle = '#ffffff'; out.strokeStyle = 'rgba(22,18,34,0.85)'; out.lineWidth = 1.5 * dpr;
      out.beginPath(); out.roundRect(sx - 11 * dpr, sy - 16 * dpr, 22 * dpr, 13 * dpr, 6 * dpr); out.fill(); out.stroke();
      out.fillStyle = '#3a2a40'; for (const k of [-5, 0, 5]) { out.beginPath(); out.arc(sx + k * dpr, sy - 9.5 * dpr, 1.6 * dpr, 0, Math.PI * 2); out.fill(); }
    }
    if (this.questNpc) {
      const n = this.npcs.find(a => a.id === this.questNpc);
      if (n) {
        const sx = (n.x - cx) * zoom, sy = (n.y - top - 13 - cy) * zoom + bob * dpr;
        out.beginPath(); out.arc(sx, sy - 7 * dpr, 8 * dpr, 0, Math.PI * 2); out.fillStyle = '#f2b53a'; out.fill();
        out.lineWidth = 2 * dpr; out.strokeStyle = '#3a2a12'; out.stroke();
        out.fillStyle = '#3a2a12'; out.font = LABEL_FONT(Math.round(12 * dpr)); out.textBaseline = 'middle'; out.fillText('!', sx, sy - 7 * dpr);
        out.font = LABEL_FONT(fs); out.textBaseline = 'bottom';
      }
    }
    const t = this.near;
    if (t && !t.npc && !this.locked) {
      const sx = (t.x - cx) * zoom, sy = (t.y - 20 - cy) * zoom + bob * dpr;
      out.beginPath(); out.moveTo(sx - 5 * dpr, sy - 6 * dpr); out.lineTo(sx + 5 * dpr, sy - 6 * dpr); out.lineTo(sx, sy); out.closePath();
      out.fillStyle = '#fff3c4'; out.fill(); out.lineWidth = 1.5 * dpr; out.strokeStyle = 'rgba(22,18,34,0.85)'; out.stroke();
      label(t.label, t.x, t.y - 23 + bob / zoom * dpr, '#fff3c4');
    }
  }

  /** Small overview used by the HUD minimap (street only). */
  minimapBase(): HTMLCanvasElement {
    const room = rooms.street, s = 2;
    const { c, g } = makeCanvas(room.cols * s, room.rows * s);
    const col: Record<number, string> = { [T.ROAD]: '#4b505b', [T.CROSS]: '#d8d8d0', [T.LANE]: '#666a74', [T.GRASS]: '#6faa4c', [T.GRAVEL]: '#c9b78f', [T.PARKING]: '#5a5e67', [T.VOID]: '#3a3e48', [T.TACTILE]: '#d8b440', [T.TURF]: '#5eae4d' };
    for (let y = 0; y < room.rows; y++) for (let x = 0; x < room.cols; x++) { g.fillStyle = col[tileAt(room, x, y)] ?? '#bdb5a5'; g.fillRect(x * s, y * s, s, s); }
    for (const b of room.buildings) {
      g.fillStyle = b.id === 'europlaza' ? '#e8c88a' : b.id === 'b2bc' ? '#f08a6a' : '#8b8f9c';
      g.fillRect(Math.floor(b.x / 8), Math.floor(b.y / 8), Math.ceil(b.w / 8), Math.ceil(b.d / 8));
    }
    return c;
  }
}
