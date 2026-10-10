import { it, expect } from 'vitest';
import { MovementController, movementSettings } from '../../src/game/systems/movement';
function distance(fps:number,x:number,y:number,holdMs=1000){
  const controller=new MovementController();let dx=0,dy=0;
  for(let t=0;t<holdMs;t+=1000/fps){const d=controller.advance({x,y},Math.min(1000/fps,holdMs-t));dx+=d.x;dy+=d.y;}
  for(let t=0;t<100;t+=1000/fps){const d=controller.advance({x:0,y:0},1000/fps);dx+=d.x;dy+=d.y;}
  return Math.hypot(dx,dy);
}
it('movement distance is stable across refresh rates and diagonal holds are not faster',()=>{
  const baseline=distance(60,1,0);
  for(const fps of [30,60,120,144]){
    expect(Math.abs(distance(fps,1,0)-baseline)).toBeLessThan(.4);
    expect(Math.abs(distance(fps,1,1)-distance(fps,1,0))).toBeLessThan(.001);
  }
  expect(baseline).toBeGreaterThan(108);expect(baseline).toBeLessThan(113);
});
it('short press travels approximately a quarter tile and release settles within its declared time',()=>{
  expect(distance(120,1,0,80)).toBeGreaterThan(7);expect(distance(120,1,0,80)).toBeLessThan(9);
  const controller=new MovementController();for(let i=0;i<12;i++)controller.advance({x:1,y:0},10);
  for(let i=0;i<6;i++)controller.advance({x:0,y:0},10);
  expect(controller.moving).toBe(false);expect(movementSettings.buttonTapPixels).toBe(movementSettings.logicalTilePixels/4);
});
it('background-frame spikes and explicit reset cannot cause a large resumed leap',()=>{
  const controller=new MovementController();for(let i=0;i<10;i++)controller.advance({x:1,y:0},16);
  expect(controller.advance({x:1,y:0},5000).x).toBeCloseTo(5.6,9);
  controller.reset();expect(controller.advance({x:0,y:0},16)).toEqual({x:0,y:0});
});
