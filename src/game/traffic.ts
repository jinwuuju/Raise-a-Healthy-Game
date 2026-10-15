import { carSprite, type CarDir, type CarKind } from '../art/vehicles';
import { CAR_COLORS } from '../art/props';
import type { Sprite } from '../art/pixel';
import type { Point } from '../world/types';
import { lanes, pointAt, type Lane } from '../world/district';

/*
 * Light-weight traffic on the real Nonhyeon-ro and Dosan-daero carriageways (D096). Cars follow lane polylines,
 * stop at red lights before the crosswalk, queue behind each other and always yield to people.
 */
export type Car = { lane: Lane; pos: number; speed: number; kind: CarKind; color: string; len: number; sprite: Sprite; dir: CarDir };
const dirOf = (d: Point): CarDir => Math.abs(d.x) > Math.abs(d.y) ? (d.x > 0 ? 'right' : 'left') : (d.y > 0 ? 'down' : 'up');
const CRUISE = 42;

/*
 * One 20 s cycle. NS cars: green 0-7, yellow 7-9, all red 9-10. EW cars: green 10-17, yellow 17-19, all red 19-20.
 * People may cross a road only while that road's cars are held on red, with a one-second buffer on each side.
 * The last three walking seconds blink and nobody may start crossing then.
 */
export const SIGNAL_CYCLE = 20;
export type CarPhase = 'green' | 'yellow' | 'red';
export type PedPhase = 'walk' | 'flash' | 'stop';
export function carPhase(time: number, axis: 'NS' | 'EW'): CarPhase {
  const t = (((time + (axis === 'NS' ? 0 : SIGNAL_CYCLE / 2)) % SIGNAL_CYCLE) + SIGNAL_CYCLE) % SIGNAL_CYCLE;
  return t < 7 ? 'green' : t < 9 ? 'yellow' : 'red';
}
export function pedPhase(time: number, road: 'NS' | 'EW'): PedPhase {
  // Crossing the NS road is safe while NS cars are red: cycle seconds 10-19 for NS, 0-9 for EW.
  const t = (((time + (road === 'NS' ? SIGNAL_CYCLE / 2 : 0)) % SIGNAL_CYCLE) + SIGNAL_CYCLE) % SIGNAL_CYCLE;
  return t < 5 ? 'walk' : t < 8 ? 'flash' : 'stop';
}
export function pedWait(time: number, road: 'NS' | 'EW'): number {
  const t = (((time + (road === 'NS' ? SIGNAL_CYCLE / 2 : 0)) % SIGNAL_CYCLE) + SIGNAL_CYCLE) % SIGNAL_CYCLE;
  return t < 5 ? 0 : SIGNAL_CYCLE - t;
}
const KINDS: CarKind[] = ['sedan', 'sedan', 'suv', 'taxi', 'sedan', 'taxi', 'suv', 'bus'];

export class Traffic {
  cars: Car[] = [];
  t = 0;
  private seed = 7;
  constructor() {
    for (const lane of lanes) { const n = Math.max(1, Math.round(lane.line.len / 520)); for (let i = 0; i < n; i++) this.spawn(lane, 40 + i * lane.line.len / n + this.rand() * 120); }
  }
  /** Signal phase for cars on the north-south and east-west roads. */
  phase(axis: 'NS' | 'EW'): CarPhase { return carPhase(this.t, axis); }
  /** Pedestrian signal for crosswalks that cross the given road. */
  walk(road: 'NS' | 'EW'): PedPhase { return pedPhase(this.t, road); }
  /** Seconds until the pedestrian light for this road turns green (0 while walking). */
  waitFor(road: 'NS' | 'EW'): number { return pedWait(this.t, road); }
  private rand(): number { this.seed = (this.seed * 1103515245 + 12345) >>> 0; return (this.seed >>> 8) / 16777216; }
  private spawn(lane: Lane, pos: number): void {
    const kind = KINDS[Math.floor(this.rand() * KINDS.length)]!;
    const color = kind === 'taxi' ? '#e9944a' : kind === 'bus' ? (this.rand() < 0.5 ? '#3da35d' : '#2f6fb8') : CAR_COLORS[Math.floor(this.rand() * CAR_COLORS.length)]!;
    const dir = dirOf(pointAt(lane.line, pos).dir), sprite = carSprite(kind, color, dir);
    const len = dir === 'down' || dir === 'up' ? sprite.c.height : sprite.c.width;
    this.cars.push({ lane, pos, speed: CRUISE, kind, color, len, sprite, dir });
  }
  update(dt: number, people: Point[]): void {
    this.t += dt;
    const byLane = new Map<Lane, Car[]>();
    for (const car of this.cars) { const l = byLane.get(car.lane); if (l) l.push(car); else byLane.set(car.lane, [car]); }
    // Only people near a car can make it yield; skip the per-person test for cars far from everyone.
    for (const car of this.cars) {
      const front = car.pos + car.len / 2, { p: head, dir } = pointAt(car.lane.line, front);
      let limit = Infinity;
      const toStop = car.lane.stop - front;
      if (car.lane.stop >= 0 && car.lane.axis && this.phase(car.lane.axis) !== 'green' && toStop > -2 && toStop < 70) limit = Math.min(limit, toStop);
      for (const other of byLane.get(car.lane)!) {
        if (other === car || other.pos <= car.pos) continue;
        limit = Math.min(limit, other.pos - car.pos - (other.len + car.len) / 2 - 6);
      }
      for (const q of people) {
        const along = (q.x - head.x) * dir.x + (q.y - head.y) * dir.y, lateral = Math.abs((q.x - head.x) * dir.y - (q.y - head.y) * dir.x);
        if (lateral < 14 && along > -4 && along < 46) limit = Math.min(limit, along - 10);
      }
      const target = limit < 1 ? 0 : limit < 40 ? CRUISE * Math.max(0, limit) / 40 : CRUISE;
      car.speed += (target - car.speed) * Math.min(1, dt * (target < car.speed ? 6 : 1.5));
      if (limit < 0.5) car.speed = Math.min(car.speed, 0);
      const requested = car.speed * dt, step = Math.min(requested, Math.max(0, limit));
      car.pos += step;
      if (step < requested) car.speed = 0;
      const d = dirOf(pointAt(car.lane.line, car.pos).dir);
      if (d !== car.dir) { car.dir = d; car.sprite = carSprite(car.kind, car.color, d); car.len = d === 'down' || d === 'up' ? car.sprite.c.height : car.sprite.c.width; }
    }
    for (let i = this.cars.length - 1; i >= 0; i--) {
      const car = this.cars[i]!;
      if (car.pos > car.lane.line.len - 4) {
        this.cars.splice(i, 1);
        if (!this.cars.some(o => o.lane === car.lane && o.pos < 80)) this.spawn(car.lane, 4);
        else this.cars.push({ ...car, pos: -90 });
      }
    }
  }
  /** World anchor (bottom-centre) for drawing and depth sorting. */
  anchor(car: Car): Point {
    const { p } = pointAt(car.lane.line, Math.max(0, car.pos));
    const v = car.dir === 'down' || car.dir === 'up';
    return v ? { x: p.x, y: p.y + car.len / 2 } : { x: p.x, y: p.y + 10 };
  }
}
