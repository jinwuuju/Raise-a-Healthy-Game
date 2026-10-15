import { overlap, type Point, type Rect, type RoomId } from './types';
/** D092 walkability snapshots. They only authorize moving valid older saves out of rebuilt furniture. */
export function wasD092Position(room: RoomId, p: Point): boolean {
  if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return false;
  const f = { x: p.x - 4, y: p.y - 3, w: 8, h: 4 };
  const solid: Rect[] = [];
  const add = (x: number, y: number, w: number, h: number) => solid.push({ x: x - w / 2, y: y - h, w, h });
  let cols: number, rows: number;
  let floor: (x: number, y: number) => boolean;
  if (room === 'newsroom') {
    cols = 24; rows = 24;
    floor = (x, y) => x >= 1 && x <= 22 && y >= 3 && (y <= 22 || (y === 23 && x >= 20 && x <= 21));
    add(88,104,64,16); add(152,58,32,8); add(186,58,32,8);
    add(184,136,48,14); add(240,136,48,14); add(308,120,44,18);
    add(56,196,48,10); add(56,194,24,10); add(360,62,10,6);
    for (const x of [26,124]) add(x,62,12,5);
    for (const x of [88,152,216,280]) for (const y of [248,320]) add(x,y,48,14);
    add(52,360,48,10); add(360,340,12,5); add(88,87,10,5); add(262,159,10,5);
  } else if (room === 'floor4') {
    cols = 24; rows = 28;
    floor = (x,y) => ((x>=16&&x<=20&&y>=3&&y<=25) || (x>=7&&x<=20&&y>=24&&y<=26) || (x>=17&&x<=18&&y===27) ||
      (x>=1&&x<=14&&y>=15&&y<=22) || (x===15&&((y>=20&&y<=21)||(y>=10&&y<=11)))) && !(y===24&&(x===16||(x>=19&&x<=20)));
    add(110,306,88,28); for(const x of [78,110,142]) for(const y of [275,322]) add(x,y,10,5);
    add(70,252,88,12); add(198,280,16,6); add(192,306,20,8); add(100,354,88,6); add(214,354,12,5);
    add(178,420,36,12); add(140,426,20,8);
  } else if (room === 'outeroffice') {
    cols = 24; rows = 15;
    floor = (x,y) => y>=3&&y<=13&&x>=1&&(x<=22||(x===23&&y>=10&&y<=11));
    for(const x of [80,144,208])for(const y of [100,166])add(x,y,48,14);
    for(const y of [104,156,208])add(280,y,48,10); add(32,210,12,5);
  } else if (room === 'lobby') {
    cols = 24; rows = 22;
    floor = (x,y) => ((x>=1&&x<=22&&y>=3&&y<=20)||(y===21&&x>=15&&x<=16)||(x===0&&y>=5&&y<=6)) &&
      !(x<=8&&y>=16) && !(x===8&&y>=3&&y<=10);
    add(156,308,18,48); add(192,148,24,80); add(288,176,36,12);
    add(254,214,20,8); add(326,208,20,8); add(348,302,12,5); add(164,111,10,5);
  } else return false;
  if (f.x<0||f.y<0||f.x+f.w>cols*16||f.y+f.h>rows*16) return false;
  for(const x of [f.x,f.x+f.w-0.01])for(const y of [f.y,f.y+f.h-0.01])if(!floor(Math.floor(x/16),Math.floor(y/16)))return false;
  return !solid.some(s=>overlap(f,s));
}
