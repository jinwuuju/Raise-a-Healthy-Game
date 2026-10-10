import settings from '../../../data/balance/movement.v0.1.json';
import type { Point } from '../../domain/world';
export const movementSettings = settings;
export class MovementController {
  private velocity: Point = { x: 0, y: 0 };
  get moving(): boolean { return Math.hypot(this.velocity.x,this.velocity.y) > .01; }
  reset(): void { this.velocity = { x: 0, y: 0 }; }
  advance(direction: Point, milliseconds: number, maxSpeed = settings.walkPixelsPerSecond): Point {
    const dt=Math.max(0,Math.min(milliseconds,settings.maxFrameMilliseconds))/1000;
    const magnitude=Math.hypot(direction.x,direction.y);
    const desired=magnitude ? {x:direction.x/magnitude*maxSpeed,y:direction.y/magnitude*maxSpeed} : {x:0,y:0};
    const dx=desired.x-this.velocity.x,dy=desired.y-this.velocity.y;
    const change=Math.hypot(dx,dy);
    const rate=settings.walkPixelsPerSecond/(magnitude ? settings.accelerationMilliseconds/1000 : settings.releaseMilliseconds/1000);
    const factor=change ? Math.min(1,rate*dt/change) : 0;
    const before={...this.velocity}; this.velocity={x:before.x+dx*factor,y:before.y+dy*factor};
    // Integrate average velocity instead of frame-end velocity, keeping displacement stable across refresh rates.
    return { x:(before.x+this.velocity.x)*.5*dt, y:(before.y+this.velocity.y)*.5*dt };
  }
}
