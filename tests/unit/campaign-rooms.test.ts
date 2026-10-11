import { describe, expect, it } from 'vitest';
import { heartAnatomy } from '../../src/domain/anatomy';
import { newHome } from '../../src/domain/life';
import { canStand, canStandInRoom } from '../../src/world/collision';
import { findPath } from '../../src/world/path';
import { projectHomeRoom, rooms } from '../../src/world/rooms';
import type { Point, RoomId } from '../../src/world/types';
function candidates(id:RoomId,t:Point & {r:number}):Point[]{const out:Point[]=[];for(let r=0;r<t.r-2;r+=3)for(let a=0;a<16;a++){const q={x:t.x+Math.cos(a*Math.PI/8)*r,y:t.y+Math.sin(a*Math.PI/8)*r};if(canStand(id,q))out.push(q);}return out;}
describe('campaign and life room reachability',()=>{
  for(const d of heartAnatomy.districts)it(d.room+' has reachable observations, workbench, map, return and foot links',()=>{
    const id=d.room as RoomId,room=rooms[id];expect(canStand(id,room.spawn)).toBe(true);
    for(const t of room.targets)expect(candidates(id,t).some(p=>findPath(id,room.spawn,p).length>0),t.id).toBe(true);
    for(const door of room.doors){const p={x:door.zone.x+door.zone.w/2,y:door.zone.y+door.zone.h/2};expect(canStand(id,p),door.id+' floor').toBe(true);expect(findPath(id,room.spawn,p).length,door.id+' path').toBeGreaterThan(0);expect(canStand(door.to,door.arrive),door.id+' destination').toBe(true);}
    expect(room.doors.map(d=>d.to).sort()).toEqual([...d.neighbors].sort());
  });
  it('both life door arrivals and storefront approaches are walkable from the same street',()=>{
    for(const to of ['home','store'] as const){const door=rooms.street.doors.find(d=>d.to===to)!;const exit=rooms[to].doors[0]!;expect(canStand('street',exit.arrive),to+' street arrival').toBe(true);const p={x:door.zone.x+door.zone.w/2,y:door.zone.y+door.zone.h/2};expect(canStand('street',p),to+' door floor').toBe(true);expect(findPath('street',exit.arrive,p).length,to+' door path').toBeGreaterThan(0);expect(canStand(to,door.arrive),to+' arrival').toBe(true);}
  });
  it('furniture has 16px collision and free exit space without changing static rooms',()=>{const home=projectHomeRoom(newHome());expect(canStandInRoom(home,home.spawn)).toBe(true);expect(canStandInRoom(home,{x:112,y:80})).toBe(false);expect(home.furnishings).toHaveLength(4);});
});
