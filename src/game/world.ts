import motion from '../../data/balance/movement.v0.2.json';
import { buildingArt } from '../art/buildings';
import { AX, AY, FIGURE_TOP, WALK_CYCLE, characterFrame, idleFrame } from '../art/character';
import { bakeGround } from '../art/ground';
import { organMinimap, type MiniMap } from '../art/organ';
import { ellipse, makeCanvas, pixelText, type Sprite } from '../art/pixel';
import { propSprite } from '../art/props';
import { drawGlassFace } from '../art/euro-interior';
import { districtMinimap, drawDistrictGround } from '../art/district';
import type { Look } from '../domain/appearance';
import { passable, realTime, secondsUntilOpen, soundBetween } from '../domain/cardiac';
import { canStand, crossingAt, doorAt, footRect, moveWithCollision, nearestTarget } from '../world/collision';
import type { Valve } from '../world/organ-types';
import { findPath } from '../world/path';
import { T, rooms, tileAt, type Building, type Crossing, type Door, type Prop, type Room, type Target } from '../world/rooms';
import { TILE, overlap, type Dir, type Point, type RoomId } from '../world/types';
import { buildSceneGrid, querySceneGrid, type SceneGrid } from '../world/scene-index';
import { HeartView, valveSet } from './heart-view';
import { Traffic } from './traffic';

export type Actor = { id: string; name: string; look: Look; x: number; y: number; facing: Dir; homeFacing: Dir; walk: number; moving: boolean; route: Point[] | null; leg: number; step: number; speed: number; wait: number };
export type Input = { vx: number; vy: number; steer: Point | null };
type Drawable = { y: number; x: number; draw: () => void; occluder: { x: number; y: number; w: number; h: number } | null };

/*
 * Fixed scenery of big rooms is looked up through a grid (D102, src/world/scene-index.ts) so that each frame only
 * tests what is near the camera; small rooms keep the plain lists.
 */
type Scenery = { buildings: SceneGrid; props: SceneGrid };
const sceneries = new WeakMap<Room, Scenery | null>();
const ANIMATED_PROPS = new Set(['fountain', 'bodyscope', 'robot', 'pad']);
function scenery(room: Room): Scenery | null {
  if (sceneries.has(room)) return sceneries.get(room)!;
  let out: Scenery | null = null;
  if (room.buildings.length + room.props.length >= 400) {
    const W = room.cols * TILE, H = room.rows * TILE;
    const props = room.props.map(pr => {
      // Union of every animation frame, so the box is never narrower than the sprite drawn this frame.
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (let f = 0; f < (ANIMATED_PROPS.has(pr.kind) ? 4 : 1); f++) {
        const sp = propSprite(pr.kind, pr.v, f);
        x0 = Math.min(x0, pr.x - sp.ax); y0 = Math.min(y0, pr.y - sp.ay); x1 = Math.max(x1, pr.x - sp.ax + sp.c.width); y1 = Math.max(y1, pr.y - sp.ay + sp.c.height);
      }
      return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    });
    out = { buildings: buildSceneGrid(W, H, room.buildings.map(b => ({ x: b.x, y: b.y - b.h, w: b.w, h: b.d + b.h }))), props: buildSceneGrid(W, H, props) };
  }
  sceneries.set(room, out);
  return out;
}
/** Buildings and props of the room that may show in the rectangle, in their original order. */
function sceneryIn<K extends 'buildings' | 'props'>(room: Room, kind: K, x: number, y: number, w: number, h: number): Room[K] {
  const sc = scenery(room);
  if (!sc) return room[kind];
  const list = room[kind] as readonly unknown[];
  return querySceneGrid(sc[kind], x, y, w, h).map(i => list[i]) as Room[K];
}
/** Ginkgo trees of a room (falling leaves), found once per room. */
const ginkgoTrees = new WeakMap<Room, Prop[]>();

const distToRect = (q: Point, r: { x: number; y: number; w: number; h: number }) =>
  Math.hypot(Math.max(r.x - q.x, 0, q.x - (r.x + r.w)), Math.max(r.y - q.y, 0, q.y - (r.y + r.h)));

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
  /** Nearby things worth naming before the reporter reaches them (wider in the heart). */
  aware: Target[] = [];
  /** Touch screens say ‘누르기’, keyboards say ‘E’. */
  touchHint = false;
  locked = false;
  questNpc: string | null = null;
  /** Non-person targets that carry a quest marker (e.g. the Bodyscope, observation points). */
  questTargets: string[] = [];
  /** Waiting at a red pedestrian light: crossing being waited for. */
  waitingAt: Crossing | null = null;
  /** Bodyscope heart: live layer of the current organ room, the beat clock (game seconds) and a valve being waited at. */
  heart: HeartView | null = null;
  heartClock = 0;
  heldAt: Valve | null = null;
  /** Undiscovered structures that sparkle faintly (heart rooms). */
  sparkTargets: string[] = [];
  /** D106: tag text, action word and badge per target id (hidden names for field checks, locked deeper structures). */
  labelOverride: Record<string, string> = {};
  verbOverride: Record<string, string> = {};
  badges: Record<string, string> = {};
  onValveWait: (v: Valve, seconds: number) => void = () => {};
  onBeat: (sound: 'S1' | 'S2') => void = () => {};
  private beatWord: { text: string; t: number } | null = null;
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
    this.heart = this.room.organ ? new HeartView(this.room) : null;
    const d = doorAt(roomId, { x, y }); this.doorLatch = d ? d.id : null;
  }

  /** Beat time in real (unslowed) seconds. */
  get real(): number { return realTime(this.heartClock); }

  /** Shows the heart-sound word above the reporter. */
  showBeat(text: string): void { this.beatWord = { text, t: 0 }; }

  setRoom(roomId: RoomId, x: number, y: number, facing: Dir): void {
    this.roomId = roomId; this.room = rooms[roomId];
    this.player.x = x; this.player.y = y; this.player.facing = facing; this.player.moving = false;
    this.vel = { x: 0, y: 0 }; this.path = []; this.pendingTarget = null; this.marker = null; this.cam.ready = false; this.leaves = [];
    this.stuck = 0; this.waitingAt = null; this.heldAt = null; this.beatWord = null;
    const d = doorAt(roomId, { x, y }); this.doorLatch = d ? d.id : null;
    this.loadNpcs();
    this.heart = this.room.organ ? new HeartView(this.room) : null;
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
    if (this.heart) {
      const before = this.real;
      this.heartClock += dt;
      this.heart.update(dt, this.real);
      const snd = soundBetween(before, this.real);
      if (snd) this.onBeat(snd);
      if (this.beatWord) { this.beatWord.t += dt; if (this.beatWord.t > 1.1) this.beatWord = null; }
    }
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
    let waiting: Crossing | null = null, held: { valve: Valve; backward: boolean } | null = null;
    if (mx || my) {
      const r = moveWithCollision(this.roomId, p, mx, my);
      waiting = this.lightBlocks(p, r);
      held = waiting ? null : this.valveBlocks(p, r);
      if (waiting || held) { r.x = p.x; r.y = p.y; this.vel = { x: 0, y: 0 }; }
      const moved = Math.hypot(r.x - p.x, r.y - p.y);
      p.x = r.x; p.y = r.y; p.walk += moved; p.moving = moved > 0.02;
      if (r.blockedX) this.vel.x = 0;
      if (r.blockedY) this.vel.y = 0;
      const fx = dx || this.vel.x, fy = dy || this.vel.y;
      if (Math.abs(fx) > 0.05 || Math.abs(fy) > 0.05) p.facing = Math.abs(fx) > Math.abs(fy) * 1.08 ? (fx > 0 ? 'right' : 'left') : (fy > 0 ? 'down' : 'up');
      this.stuck = moved < 0.05 && this.path.length && !waiting && !held ? this.stuck + dt : 0;
      if (this.stuck > 0.5) { this.path = []; this.pendingTarget = null; this.stuck = 0; }
      if (held?.backward) { this.path = []; this.pendingTarget = null; this.marker = null; }
    } else p.moving = false;
    if (held && held.valve.id !== this.heldAt?.id) this.onValveWait(held.valve, held.backward ? -1 : secondsUntilOpen(valveSet(held.valve), this.real));
    this.heldAt = held && !held.backward ? held.valve : this.heldAt && (input.vx || input.vy || input.steer || this.path.length) ? this.heldAt : null;
    if (this.heldAt && passable(valveSet(this.heldAt), this.real)) this.heldAt = null;
    if (waiting && waiting.id !== this.waitingAt?.id) this.onSignalWait(waiting, this.traffic.waitFor(waiting.road));
    this.waitingAt = waiting ?? (this.waitingAt && (input.vx || input.vy || input.steer || this.path.length) ? this.waitingAt : null);
    if (this.waitingAt && this.traffic.walk(this.waitingAt.road) === 'walk') this.waitingAt = null;

    const door = doorAt(this.roomId, p);
    // D103: a tapped route that only passes a door on its way somewhere else (the shop doors line the lanes) does not
    // enter it; walking into a door by hand or tapping the door itself still does.
    const end = this.path[this.path.length - 1];
    const passing = !!door && !manual && !!end && distToRect(end, door.zone) > 24;
    if (door && this.doorLatch !== door.id && !locked && !passing) { this.doorLatch = door.id; this.stop(); this.onDoor(door); return; }
    if (!door) this.doorLatch = null;

    const near = locked ? null : nearestTarget(this.roomId, p) ?? null;
    if ((near?.id ?? null) !== (this.near?.id ?? null)) { this.near = near; this.onNear(near); }
    const reach = this.room.organ ? 84 : 44;
    this.aware = locked ? [] : this.room.targets
      .map(t => ({ t, d: Math.hypot(t.x - p.x, t.y - p.y) }))
      .filter(({ t, d }) => !t.npc && d <= Math.max(t.r, reach))
      .sort((a, b) => a.d - b.d).slice(0, 4).map(({ t }) => t);

    this.updateNpcs(dt);
    if (this.roomId === 'district') { this.traffic.update(dt, [p, ...this.npcs]); this.updateLeaves(dt); }
  }

  /** A person may step onto a crosswalk only on a green pedestrian light; once on it they may finish crossing. */
  private lightBlocks(from: { x: number; y: number }, to: { x: number; y: number }): Crossing | null {
    if (!this.room.crossings.length) return null;
    const c = crossingAt(this.roomId, to);
    if (!c || crossingAt(this.roomId, from)?.id === c.id) return null;
    // Where two crosswalk bands overlap at a real corner, only the one being walked across applies (D098).
    if (c.poly) {
      const [a, b] = c.poly as [Point, Point], L = Math.hypot(b.x - a.x, b.y - a.y) || 1, m = Math.hypot(to.x - from.x, to.y - from.y) || 1;
      if (Math.abs(((to.x - from.x) * (b.x - a.x) + (to.y - from.y) * (b.y - a.y)) / (L * m)) < 0.5) return null;
    }
    return this.traffic.walk(c.road) === 'walk' ? null : c;
  }

  /**
   * Heart valves: the reporter may step into an open valve in the direction of blood flow only.
   * Approaching from the downstream side is always refused (valves stop backflow).
   */
  private valveBlocks(from: Point, to: Point): { valve: Valve; backward: boolean } | null {
    const o = this.room.organ;
    if (!o) return null;
    const fa = footRect(from), fb = footRect(to);
    for (const v of o.valves) {
      if (!v.pass) continue;
      const gate = { x: v.x, y: v.y - 5, w: v.w, h: 10 };
      if (!overlap(fb, gate) || overlap(fa, gate)) continue;
      const backward = v.toward === 1 ? from.y > v.y : from.y < v.y;
      if (backward) return { valve: v, backward: true };
      if (!passable(valveSet(v), this.real)) return { valve: v, backward: false };
    }
    return null;
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
    let ginkgos = ginkgoTrees.get(this.room);
    if (!ginkgos) { ginkgos = this.room.props.filter(pr => pr.kind === 'ginkgo'); ginkgoTrees.set(this.room, ginkgos); }
    const trees = ginkgos.length ? ginkgos.filter(pr => Math.abs(pr.x - this.player.x) < 260 && Math.abs(pr.y - this.player.y) < 200) : ginkgos;
    while (this.leaves.length < 22) {
      const tr = trees[Math.floor(Math.random() * trees.length)];
      if (!tr) break;
      this.leaves.push({ x: tr.x - 12 + Math.random() * 24, y: tr.y - 40 + Math.random() * 18, vx: 4 + Math.random() * 6, vy: 6 + Math.random() * 6, c: Math.random() < 0.5 ? '#f4d75c' : '#e8b83a', life: 2.5 + Math.random() * 3 });
    }
    for (const l of this.leaves) { l.life -= dt; l.x += (l.vx + Math.sin(this.time * 3 + l.y) * 8) * dt; l.y += l.vy * dt; }
    this.leaves = this.leaves.filter(l => l.life > 0);
  }

  /** The world is always in daylight (D103, user): no dusk or night lighting, whatever the clock says. */
  get timeOfDay(): 'day' { return 'day'; }

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
    g.fillStyle = room.organ ? '#170a12' : room.interior ? '#17141f' : '#2a2e3a'; g.fillRect(0, 0, vw, vh);
    if (this.heart) this.heart.drawFloor(g, cx, cy, vw, vh, this.real);
    else if (this.roomId === 'district') drawDistrictGround(g, cx, cy, vw, vh);
    else g.drawImage(this.ground(this.roomId), -cx, -cy);

    if (this.marker) {
      const age = this.time - this.marker.t, r = 3 + (age * 10) % 5;
      ellipse(g, this.marker.x - cx, this.marker.y - cy, r + 1, Math.max(1, Math.round((r + 1) / 2)), 'rgba(255,240,190,0.55)');
    }

    if (this.heart) ellipse(g, Math.round(p.x - cx), Math.round(p.y - cy), 8, 3, `rgba(127,240,242,${(0.25 + 0.15 * Math.sin(this.time * 3)).toFixed(3)})`);
    const items: Drawable[] = [];
    const inView = (x: number, y: number, w: number, h: number) => x + w > cx - 8 && x < cx + vw + 8 && y + h > cy - 8 && y < cy + vh + 8;
    const nearBuildings = sceneryIn(room, 'buildings', cx - 8, cy - 8, vw + 16, vh + 16), nearProps = sceneryIn(room, 'props', cx - 8, cy - 8, vw + 16, vh + 16);
    for (const b of nearBuildings) {
      if (!inView(b.x, b.y - b.h, b.w, b.d + b.h)) continue;
      items.push({ y: b.y + b.d, x: b.x, occluder: { x: b.x, y: b.y - b.h, w: b.w, h: b.d + b.h }, draw: () => this.drawBuilding(g, b, cx, cy) });
    }
    const frame4 = Math.floor(this.time * 6) % 4;
    for (const pr of nearProps) {
      const s = propSprite(pr.kind, pr.v, pr.kind === 'fountain' || pr.kind === 'bodyscope' || pr.kind === 'robot' || pr.kind === 'pad' ? frame4 : 0);
      if (!inView(pr.x - s.ax, pr.y - s.ay, s.c.width, s.c.height)) continue;
      const tall = pr.kind === 'ginkgo' || pr.kind === 'parktree' || pr.kind === 'bookshelf' || pr.kind === 'lamp' || pr.kind === 'papillary';
      items.push({ y: pr.y, x: pr.x, occluder: tall ? { x: pr.x - s.ax + 3, y: pr.y - s.ay, w: s.c.width - 6, h: s.c.height - 10 } : null, draw: () => {
        this.blit(g, s, pr.x, pr.y, cx, cy);
        if (pr.kind === 'signal') this.drawSignal(g, pr.x, pr.y, pr.v === 1 ? 'EW' : 'NS', cx, cy);
        if (pr.kind === 'pedsignal') this.drawPedSignal(g, pr.x, pr.y, pr.v === 1 ? 'EW' : 'NS', cx, cy);
      } });
    }
    for (const n of this.npcs) items.push({ y: n.y, x: n.x, occluder: null, draw: () => this.drawActor(g, n, cx, cy) });
    for (const gl of room.interior?.glass ?? []) items.push({ y: gl.y + gl.h, x: gl.x, occluder: null, draw: () => drawGlassFace(g, gl, cx, cy) });
    const hv = this.heart;
    if (hv) for (const b of hv.organ.bands) {
      const x0 = Math.min(b.x1, b.x2), y0 = Math.min(b.y1, b.y2) - b.lift - b.thick;
      items.push({ y: hv.bandY(b, p.x), x: x0, occluder: { x: x0, y: y0, w: Math.abs(b.x2 - b.x1), h: b.thick + 2 }, draw: () => hv.drawBand(g, b, cx, cy, this.real) });
    }
    if (this.roomId === 'district') for (const car of this.traffic.cars) {
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
    if (this.heart) this.heart.drawOverlay(g, cx, cy, vw, vh, this.real);

    out.imageSmoothingEnabled = false;
    const shake = this.beatWord && this.beatWord.t < 0.12 ? (this.beatWord.text === '쿵' ? zoom : -zoom) : 0;
    out.drawImage(buf.c, 0, shake, vw * zoom, vh * zoom);
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

  private drawBuilding(g: CanvasRenderingContext2D, b: Building, cx: number, cy: number): void {
    const art = buildingArt(b);
    const ox = b.x - cx, oy = b.y - b.h - cy;
    g.drawImage(art.day, ox, oy);
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

  private drawPendant(g: CanvasRenderingContext2D, x: number, y: number): void {
    g.fillStyle = '#3a3040'; g.fillRect(Math.round(x), Math.round(y - 30), 1, 26);
    g.fillStyle = '#2d2a33'; g.fillRect(Math.round(x - 3), Math.round(y - 5), 7, 3);
    g.fillStyle = '#ffe3a0'; g.fillRect(Math.round(x - 2), Math.round(y - 2), 5, 1);
    g.fillStyle = 'rgba(255,230,160,0.12)'; g.fillRect(Math.round(x - 6), Math.round(y - 1), 13, 3);
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
    for (const id of this.sparkTargets) {
      const t = this.room.targets.find(q => q.id === id);
      if (!t || this.aware.includes(t) || this.questTargets.includes(id)) continue;
      const tw = 0.5 + 0.5 * Math.sin(this.time * 2.6 + t.x * 0.05);
      const sx = (t.x - cx) * zoom, sy = (t.y - 10 - cy) * zoom, r = (2 + tw * 2.5) * dpr;
      out.fillStyle = `rgba(255,246,214,${(0.35 + tw * 0.5).toFixed(3)})`;
      out.beginPath(); out.moveTo(sx, sy - r * 2); out.lineTo(sx + r * 0.5, sy - r * 0.5); out.lineTo(sx + r * 2, sy); out.lineTo(sx + r * 0.5, sy + r * 0.5);
      out.lineTo(sx, sy + r * 2); out.lineTo(sx - r * 0.5, sy + r * 0.5); out.lineTo(sx - r * 2, sy); out.lineTo(sx - r * 0.5, sy - r * 0.5); out.closePath(); out.fill();
    }
    if (this.beatWord) {
      const w = this.beatWord, a = Math.max(0, 1 - w.t / 1.1), rise = w.t * 14;
      const sx = (this.player.x + 16 - cx) * zoom, sy = (this.player.y - top - 6 - cy) * zoom - rise * dpr;
      out.save(); out.globalAlpha = a; out.font = LABEL_FONT(Math.round(20 * dpr)); out.lineWidth = 5 * dpr; out.strokeStyle = 'rgba(40,6,16,0.9)';
      out.strokeText(w.text, sx, sy); out.fillStyle = w.text === '쿵' ? '#ffd1d6' : '#fff2c4'; out.fillText(w.text, sx, sy); out.restore();
      out.font = LABEL_FONT(fs);
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
    if (!this.locked) this.drawAware(out, cx, cy, zoom, dpr, bob);
  }

  /** HUD minimap for the current room: the street, or a heart room (null indoors at the office and cafe). */
  miniMap(): MiniMap | null {
    if (this.roomId === 'district') return { c: this.minimapBase(), s: 1 / 8, ox: 0, oy: 0, view: 220 };
    return this.room.organ ? organMinimap(this.room, 1 / 4) : null;
  }

  /**
   * Name tags for things around the reporter: a bouncing arrow over each one and a readable tag.
   * The one within reach is gold and says how to look at it; farther ones fade with distance.
   * New heart structures carry a ‘새 구조’ badge. Tags are stacked so they never cover each other.
   */
  private drawAware(out: CanvasRenderingContext2D, cx: number, cy: number, zoom: number, dpr: number, bob: number): void {
    const placed: { x: number; y: number; w: number; h: number }[] = [];
    const p = this.player, reach = this.room.organ ? 84 : 44;
    for (const t of this.aware) {
      const isNear = this.near?.id === t.id, d = Math.hypot(t.x - p.x, t.y - p.y);
      const a = isNear ? 1 : Math.max(0.55, 1 - (d - t.r) / (reach * 1.4));
      const fresh = this.sparkTargets.includes(t.id), quest = this.questTargets.includes(t.id);
      const ax = (t.x - cx) * zoom, ay = (t.y - 16 - cy) * zoom + (isNear ? bob * dpr : 0);
      out.save(); out.globalAlpha = a;
      const aw = (isNear ? 8 : 6) * dpr;
      out.beginPath(); out.moveTo(ax - aw, ay - aw * 1.3); out.lineTo(ax + aw, ay - aw * 1.3); out.lineTo(ax, ay); out.closePath();
      out.fillStyle = isNear || quest ? '#f6d27a' : '#fff6e4'; out.fill(); out.lineWidth = 2 * dpr; out.strokeStyle = 'rgba(22,14,26,0.9)'; out.stroke();
      const verb = this.verbOverride[t.id] ?? t.verb, name = this.labelOverride[t.id] ?? t.label;
      const sub = isNear ? (this.touchHint ? '눌러서 ' + verb : 'E · ' + verb) : fresh ? '새 구조' : this.badges[t.id] ?? '';
      const fs1 = Math.round((isNear ? 16 : 14) * dpr), fs2 = Math.round(12 * dpr), pad = 9 * dpr;
      out.font = LABEL_FONT(fs1); const w1 = out.measureText(name).width;
      out.font = LABEL_FONT(fs2); const w2 = sub ? out.measureText(sub).width + 14 * dpr : 0;
      const w = w1 + w2 + pad * 2, h = (isNear ? 30 : 26) * dpr;
      let x = Math.round(ax - w / 2), y = Math.round(ay - aw * 1.3 - 6 * dpr - h);
      for (let k = 0; k < 6 && placed.some(r => x < r.x + r.w && x + w > r.x && y < r.y + r.h && y + h > r.y); k++) y -= h + 4 * dpr;
      placed.push({ x, y, w, h });
      out.beginPath(); out.roundRect(x, y, w, h, h / 2);
      out.fillStyle = isNear ? 'rgba(40,26,14,0.92)' : 'rgba(24,16,30,0.84)'; out.fill();
      out.lineWidth = (isNear ? 2 : 1.2) * dpr; out.strokeStyle = isNear || quest ? 'rgba(246,210,122,0.95)' : fresh ? 'rgba(127,240,242,0.65)' : 'rgba(255,240,220,0.3)'; out.stroke();
      out.textAlign = 'left'; out.textBaseline = 'middle';
      out.font = LABEL_FONT(fs1); out.fillStyle = isNear ? '#fff3cf' : '#fbf1e6'; out.fillText(name, x + pad, y + h / 2 + dpr);
      if (sub) {
        const bx = x + pad + w1 + 8 * dpr, bw = w2 - 4 * dpr, bh = 18 * dpr;
        out.beginPath(); out.roundRect(bx, y + (h - bh) / 2, bw, bh, bh / 2);
        out.fillStyle = isNear ? '#f6d27a' : 'rgba(127,240,242,0.2)'; out.fill();
        out.font = LABEL_FONT(fs2); out.fillStyle = isNear ? '#2b1c06' : '#a9f6f3'; out.textAlign = 'center'; out.fillText(sub, bx + bw / 2, y + h / 2 + dpr);
      }
      out.restore();
    }
    out.textAlign = 'center'; out.textBaseline = 'bottom'; out.font = LABEL_FONT(Math.round(11 * dpr));
  }

  /** Small overview used by the HUD minimap (street only). */
  minimapBase(): HTMLCanvasElement {
    if (this.roomId === 'district' || !this.room.interior) return districtMinimap();
    const room = rooms.street, s = 2;
    const { c, g } = makeCanvas(room.cols * s, room.rows * s);
    const col: Record<number, string> = { [T.ROAD]: '#4b505b', [T.CROSS]: '#d8d8d0', [T.LANE]: '#666a74', [T.GRASS]: '#6faa4c', [T.GRAVEL]: '#c9b78f', [T.PARKING]: '#5a5e67', [T.VOID]: '#3a3e48', [T.TACTILE]: '#d8b440', [T.TURF]: '#5eae4d' };
    for (let y = 0; y < room.rows; y++) for (let x = 0; x < room.cols; x++) { g.fillStyle = col[tileAt(room, x, y)] ?? '#bdb5a5'; g.fillRect(x * s, y * s, s, s); }
    for (const b of room.buildings) {
      const top = b.block ? b.y - b.h : b.y, depth = b.block ? b.d + b.h : b.d;
      g.fillStyle = b.id === 'europlaza' ? '#e8c88a' : b.id === 'b2bc' ? '#f08a6a' : b.id === 'jinu' ? '#2fa59a' : '#8b8f9c';
      g.fillRect(Math.floor(b.x / 8), Math.floor(top / 8), Math.ceil(b.w / 8), Math.ceil(depth / 8));
    }
    return c;
  }
}
