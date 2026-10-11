import type { Task } from '../domain/content';
export type DiagramPoint = { x:number; y:number };

/** A single layout serves drawing and pointer selection so shuffled boards stay tappable. */
export function workbenchNodes(t:Task):Map<string,DiagramPoint> {
  const nodes = new Map(t.scene.nodes.map(n => [n.id,{x:Math.round(n.x/2),y:Math.round(n.y/2)}]));
  if(t.kind==='match')t.slots.forEach((s,i)=>nodes.set(s.id,{x:t.id==='transfer'?128-(i%2)*80:48+(i%2)*80,y:32+Math.floor(i/2)*44}));
  if(t.kind==='routes'||t.kind==='synthesis')t.slots.forEach((s,i)=>{const a=-Math.PI/2+(i/t.slots.length)*Math.PI*2;nodes.set(s.id,{x:88+Math.round(Math.cos(a)*56),y:56+Math.round(Math.sin(a)*36)});});
  if(t.kind==='sequence')t.slots.forEach((s,i)=>nodes.set(s.id,{x:28+i*40,y:48}));
  if(t.kind==='valves'){nodes.set('start',{x:16,y:52});t.slots.forEach((s,i)=>nodes.set(s.id,{x:64+i*48,y:52}));nodes.set('end',{x:160,y:52});}
  if(t.kind==='planning')t.slots.forEach((s,i)=>nodes.set(s.id,{x:32+(i%3)*56,y:36+Math.floor(i/3)*40}));
  return nodes;
}
export function nearestWorkbenchSlot(t:Task,p:DiagramPoint):number {
  const nodes=workbenchNodes(t);let nearest=0,distance=Infinity;
  t.slots.forEach((s,i)=>{const n=nodes.get(s.id)!;const d=(n.x-p.x)**2+(n.y-p.y)**2;if(d<distance){distance=d;nearest=i;}});
  return nearest;
}
