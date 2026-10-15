import { expect, it, vi } from 'vitest';
import { Traffic } from '../../src/game/traffic';
import { crossroads, lanes, pointAt } from '../../src/world/district';

// Simulation needs sprite dimensions, not a browser canvas.
vi.mock('../../src/art/vehicles', () => ({
  CAR_COLORS: ['#ffffff'],
  carSprite: () => ({ c: { width: 24, height: 48 }, ax: 12, ay: 48 }),
}));

it('lanes follow the real carriageways through the crossroads, stopping before it', () => {
  expect(lanes).toHaveLength(8);
  for (const l of lanes) {
    expect(l.stop).toBeGreaterThan(0); expect(l.stop).toBeLessThan(l.line.len);
    const p = pointAt(l.line, l.stop).p;
    expect(Math.hypot(p.x - crossroads.x, p.y - crossroads.y)).toBeGreaterThan(60);
    expect(Math.hypot(p.x - crossroads.x, p.y - crossroads.y)).toBeLessThan(180);
  }
});

it('braking cannot carry a fast car past a red stop line during a long frame', () => {
  const traffic = new Traffic(), car = traffic.cars.find(c => c.lane.axis === 'NS')!;
  traffic.cars = [car]; traffic.t = 9.5;
  car.pos = car.lane.stop - car.len / 2 - 1; car.speed = 42;
  traffic.update(0.1, []);
  expect(car.pos + car.len / 2).toBeLessThanOrEqual(car.lane.stop + 0.001);
});

it('cars keep the pedestrian clearance even while braking', () => {
  const traffic = new Traffic(), car = traffic.cars.find(c => c.lane.axis === 'EW')!;
  traffic.cars = [car]; traffic.t = 11;
  car.pos = car.lane.stop - 400; car.speed = 42;
  const { p, dir } = pointAt(car.lane.line, car.pos + car.len / 2), person = { x: p.x + dir.x * 11, y: p.y + dir.y * 11 };
  traffic.update(0.1, [person]);
  const f = pointAt(car.lane.line, car.pos + car.len / 2).p;
  expect((person.x - f.x) * dir.x + (person.y - f.y) * dir.y).toBeGreaterThanOrEqual(9.9);
});
