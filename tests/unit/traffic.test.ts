import { expect, it, vi } from 'vitest';
import { Traffic } from '../../src/game/traffic';

// Simulation needs sprite dimensions, not a browser canvas.
vi.mock('../../src/art/vehicles', () => ({
  CAR_COLORS: ['#ffffff'],
  carSprite: () => ({ c: { width: 24, height: 48 }, ax: 12, ay: 48 }),
}));

it('braking cannot carry a fast car past a red stop line during a long frame', () => {
  const traffic = new Traffic(), car = traffic.cars.find(c => c.lane.dir === 'down')!;
  traffic.cars = [car]; traffic.t = 9.5;
  car.pos = car.lane.stop - car.len / 2 - 1; car.speed = 42;
  traffic.update(0.1, []);
  expect(car.pos + car.len / 2).toBeLessThanOrEqual(car.lane.stop);
});

it('cars keep the pedestrian clearance even while braking', () => {
  const traffic = new Traffic(), car = traffic.cars.find(c => c.lane.dir === 'down')!;
  traffic.cars = [car]; traffic.t = 1;
  car.pos = 200; car.speed = 42;
  const person = { x: car.lane.fixed, y: car.pos + car.len / 2 + 11 };
  traffic.update(0.1, [person]);
  expect(car.pos + car.len / 2).toBeLessThanOrEqual(person.y - 10);
});
