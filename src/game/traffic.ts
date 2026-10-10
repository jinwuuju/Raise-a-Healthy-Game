import { carSprite, type CarDir, type CarKind } from '../art/vehicles';
import { CAR_COLORS } from '../art/props';
import type { Sprite } from '../art/pixel';
import type { Point } from '../world/types';

/*
 * Light-weight traffic for the street map. Cars follow fixed lanes, stop at red lights
 * before the stop line, queue behind each other and always yield to the player.
 */
type Lane = { dir: CarDir; fixed: number; stop: number; axis: 'NS' | 'EW' };
export type Car = { lane: Lane; pos: number; speed: number; kind: CarKind; color: string; len: number; sprite: Sprite };

const LANES: Lane[] = [
  { dir: 'down', fixed: 396, stop: 410, axis: 'NS' }, { dir: 'down', fixed: 420, stop: 410, axis: 'NS' },
  { dir: 'up', fixed: 444, stop: 582, axis: 'NS' }, { dir: 'up', fixed: 468, stop: 582, axis: 'NS' },
  { dir: 'right', fixed: 508, stop: 329, axis: 'EW' }, { dir: 'right', fixed: 532, stop: 329, axis: 'EW' },
  { dir: 'left', fixed: 456, stop: 535, axis: 'EW' }, { dir: 'left', fixed: 480, stop: 535, axis: 'EW' },
];
const MIN = -80, MAX = 720, CRUISE = 42;
const KINDS: CarKind[] = ['sedan', 'sedan', 'suv', 'taxi', 'sedan', 'taxi', 'suv', 'bus'];

export class Traffic {
  cars: Car[] = [];
  private t = 0;
  private seed = 7;

  constructor() {
    for (const lane of LANES) for (let i = 0; i < 2; i++) this.spawn(lane, MIN + 60 + i * 380 + this.rand() * 120);
  }

  /** Signal phase for the north-south and east-west axes. */
  phase(axis: 'NS' | 'EW'): 'green' | 'yellow' | 'red' {
    const cycle = 30, t = this.t % cycle;
    const ns = t < 10 ? 'green' : t < 12 ? 'yellow' : 'red';
    const ew = t >= 15 && t < 25 ? 'green' : t >= 25 && t < 27 ? 'yellow' : 'red';
    return axis === 'NS' ? ns : ew;
  }

  private rand(): number { this.seed = (this.seed * 1103515245 + 12345) >>> 0; return (this.seed >>> 8) / 16777216; }

  private spawn(lane: Lane, pos: number): void {
    const kind = KINDS[Math.floor(this.rand() * KINDS.length)]!;
    const color = kind === 'taxi' ? '#e9944a' : kind === 'bus' ? (this.rand() < 0.5 ? '#3da35d' : '#2f6fb8') : CAR_COLORS[Math.floor(this.rand() * CAR_COLORS.length)]!;
    const sprite = carSprite(kind, color, lane.dir);
    const len = lane.dir === 'down' || lane.dir === 'up' ? sprite.c.height : sprite.c.width;
    this.cars.push({ lane, pos, speed: CRUISE, kind, color, len, sprite });
  }

  /** Position along the travel direction: larger = further ahead. */
  private ahead(car: Car): number { return car.lane.dir === 'down' || car.lane.dir === 'right' ? car.pos : -car.pos; }

  update(dt: number, people: Point[]): void {
    this.t += dt;
    for (const car of this.cars) {
      const sign = car.lane.dir === 'down' || car.lane.dir === 'right' ? 1 : -1;
      const front = car.pos + sign * car.len / 2;
      let limit = Infinity;
      const light = this.phase(car.lane.axis);
      const toStop = (car.lane.stop - front) * sign;
      if (light !== 'green' && toStop > -2 && toStop < 70) limit = Math.min(limit, toStop);
      for (const other of this.cars) {
        if (other === car || other.lane !== car.lane) continue;
        const gap = (this.ahead(other) - this.ahead(car)) - (other.len + car.len) / 2 - 6;
        if (this.ahead(other) > this.ahead(car)) limit = Math.min(limit, gap);
      }
      for (const player of people) {
        const vertical = car.lane.dir === 'down' || car.lane.dir === 'up';
        const lateral = vertical ? Math.abs(player.x - car.lane.fixed) : Math.abs(player.y - 4 - car.lane.fixed);
        const along = ((vertical ? player.y : player.x) - front) * sign;
        if (lateral < 14 && along > -4 && along < 46) limit = Math.min(limit, along - 10);
      }
      const target = limit < 1 ? 0 : limit < 40 ? CRUISE * Math.max(0, limit) / 40 : CRUISE;
      car.speed += (target - car.speed) * Math.min(1, dt * (target < car.speed ? 6 : 1.5));
      if (limit < 0.5) car.speed = Math.min(car.speed, 0);
      car.pos += sign * car.speed * dt;
    }
    for (let i = this.cars.length - 1; i >= 0; i--) {
      const car = this.cars[i]!;
      if (car.pos > MAX || car.pos < MIN) {
        this.cars.splice(i, 1);
        const entry = car.lane.dir === 'down' || car.lane.dir === 'right' ? MIN + 4 : MAX - 4;
        const blocked = this.cars.some(o => o.lane === car.lane && Math.abs(o.pos - entry) < 60);
        if (!blocked) this.spawn(car.lane, entry); else this.cars.push({ ...car, pos: entry + (entry < 0 ? -90 : 90) });
      }
    }
  }

  /** World anchor (bottom-centre) for drawing and depth sorting. */
  anchor(car: Car): Point {
    const v = car.lane.dir === 'down' || car.lane.dir === 'up';
    return v ? { x: car.lane.fixed, y: car.pos + car.len / 2 } : { x: car.pos, y: car.lane.fixed + 10 };
  }
}
