import motionRules from '../../data/balance/movement.v0.1.json';
export type RoomId = 'newsroom' | 'lobby' | 'street' | 'cafe';
export type Point = { x: number; y: number };
export type Obstacle = Point & { width: number; height: number; label: string; color: number };
export type Target = Point & { id: string; label: string };
export type Room = { width: number; height: number; title: string; spawn: Point; obstacles: Obstacle[]; targets: Target[] };
export const streetTrees: Point[] = [
  {x:744,y:414},{x:1040,y:414},{x:744,y:168},{x:1048,y:686},
  {x:748,y:1080},
];
export const rooms: Record<RoomId, Room> = {
  newsroom: {
    width: 640, height: 448, title: '유로프라자 · 편집국', spawn: { x: 320, y: 270 },
    obstacles: [
      { x: 230, y: 126, width: 140, height: 32, label: '편집장 책상', color: 0x64786e },
      { x: 88, y: 200, width: 100, height: 28, label: '취재 책상', color: 0x64786e },
      { x: 460, y: 132, width: 74, height: 36, label: '탐사 장치', color: 0x60858d },
      { x: 64, y: 76, width: 104, height: 24, label: '자료 선반', color: 0x798372 },
      { x: 70, y: 358, width: 112, height: 24, label: '휴게 소파', color: 0x45615d },
      { x: 439, y: 352, width: 100, height: 24, label: '인쇄 코너', color: 0x798372 },
    ],
    targets: [
      { id: 'editor', label: '편집장', x: 300, y: 185 },
      { id: 'device', label: '탐사 장치', x: 496, y: 192 },
      { id: 'exit', label: '로비로', x: 565, y: 296 },
    ],
  },
  lobby: {
    width: 640, height: 360, title: '유로프라자 · 1층 로비', spawn: { x: 110, y: 270 },
    obstacles: [{ x: 272, y: 148, width: 128, height: 32, label: '안내 데스크', color: 0x64786e },
      { x: 83, y: 90, width: 130, height: 20, label: '로비 소파', color: 0x45615d },
      { x: 466, y: 88, width: 88, height: 22, label: '안내 자료', color: 0x798372 }],
    targets: [
      { id: 'return', label: '편집국으로', x: 78, y: 230 },
      { id: 'notice', label: '소식 게시판', x: 336, y: 214 },
      { id: 'street-exit', label: '논현로로 나가기', x: 565, y: 296 },
    ],
  },
  street: {
    width: 1280, height: 1280, title: '논현로 · 을지병원 사거리', spawn: { x: 666, y: 694 },
    obstacles: [
      { x: 438, y: 552, width: 278, height: 128, label: '유로프라자', color: 0xbeb9a8 },
      { x: 1056, y: 560, width: 168, height: 144, label: '도심 상가', color: 0x777e80 },
      { x: 440, y: 228, width: 272, height: 160, label: '상가 거리', color: 0x999e91 },
      { x: 116, y: 544, width: 200, height: 140, label: '비투비씨', color: 0xc3c4b9 },
      { x: 120, y: 240, width: 220, height: 144, label: '이면도로 블록', color: 0x929a9b },
      ...streetTrees.map(p => ({ x: p.x-7, y: p.y-4, width: 14, height: 8, label: '가로수', color: 0x5e7850 })),
      { x: 621, y: 770, width: 76, height: 10, label: '거리 벤치', color: 0x896c47 },
      { x: 48, y: 64, width: 264, height: 100, label: '북서 상가', color: 0x8d9a96 },
      { x: 414, y: 64, width: 300, height: 100, label: '논현로 상가', color: 0xc0b9a7 },
      { x: 1040, y: 104, width: 188, height: 150, label: '맞은편 상가', color: 0x9d8372 },
      { x: 1040, y: 360, width: 188, height: 126, label: '병원·업무 블록', color: 0xacb6b1 },
      { x: 116, y: 1072, width: 208, height: 132, label: '남서 상가', color: 0x958c81 },
      { x: 416, y: 1072, width: 300, height: 132, label: '도산대로 상가', color: 0xb4b3a2 },
      { x: 1072, y: 1072, width: 160, height: 132, label: '남동 업무 블록', color: 0x8b999c },
    ],
    targets: [
      { id: 'building-return', label: '유로프라자 로비', x: 658, y: 694 },
      { id: 'street-notice', label: '거리 안내', x: 748, y: 520 },
      { id: 'station', label: '압구정역 방향', x: 760, y: 124 },
      { id: 'cafe-enter', label: '비투비씨 카페', x: 304, y: 712 },
    ],
  },
  cafe: {
    width: 640, height: 360, title: '비투비씨 · 카페', spawn: { x: 320, y: 270 },
    obstacles: [
      { x: 230, y: 126, width: 140, height: 32, label: '주문 카운터', color: 0x967452 },
      { x: 88, y: 200, width: 100, height: 28, label: '창가 테이블', color: 0x967452 },
      { x: 64, y: 76, width: 104, height: 24, label: '잡지 선반', color: 0x798372 },
      { x: 470, y: 134, width: 106, height: 24, label: '카페 소파', color: 0x45615d },
    ],
    targets: [
      { id: 'barista', label: '음료 주문', x: 300, y: 185 },
      { id: 'table', label: '잠시 앉기', x: 138, y: 260 },
      { id: 'cafe-exit', label: '거리로 나가기', x: 565, y: 296 },
    ],
  },
};
export function canStand(room: RoomId, p: Point): boolean {
  if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || p.x < 40 || p.x > rooms[room].width - 40 || p.y < 76 || p.y > rooms[room].height - 36) return false;
  if (room === 'street') {
    const vertical = p.x > 800 && p.x < 992, horizontal = p.y > 800 && p.y < 992;
    const crossingVertical = (p.y >= 752 && p.y <= 784) || (p.y >= 1008 && p.y <= 1040);
    const crossingHorizontal = (p.x >= 752 && p.x <= 784) || (p.x >= 1008 && p.x <= 1040);
    if ((vertical && !crossingVertical) || (horizontal && !crossingHorizontal)) return false;
  }
  return !rooms[room].obstacles.some(o => p.x + 8 > o.x && p.x - 8 < o.x + o.width && p.y + 5 > o.y && p.y - 5 < o.y + o.height);
}
export function targetInRange(room: RoomId, pose: Point, id: string): Target | undefined {
  return rooms[room].targets.find(t => t.id === id && Math.hypot(t.x - pose.x, t.y - pose.y) <= 56);
}

export type Door = { id:string; room:RoomId; x:number;y:number; destination:RoomId; arrival:Point; radius:number };
export const doors:Door[] = [
  {id:'exit',room:'newsroom',x:565,y:296,destination:'lobby',arrival:{x:110,y:270},radius:motionRules.doorTriggerPixels},
  {id:'return',room:'lobby',x:48,y:230,destination:'newsroom',arrival:{x:320,y:270},radius:motionRules.doorTriggerPixels},
  {id:'street-exit',room:'lobby',x:565,y:296,destination:'street',arrival:{x:666,y:718},radius:motionRules.doorTriggerPixels},
  {id:'building-return',room:'street',x:658,y:694,destination:'lobby',arrival:{x:545,y:270},radius:motionRules.doorTriggerPixels},
  {id:'cafe-enter',room:'street',x:280,y:699,destination:'cafe',arrival:{x:320,y:270},radius:motionRules.doorTriggerPixels},
  {id:'cafe-exit',room:'cafe',x:565,y:296,destination:'street',arrival:{x:280,y:723},radius:motionRules.doorTriggerPixels},
];
export function doorFor(room:RoomId,id:string):Door|undefined{return doors.find(d=>d.room===room&&d.id===id);}
export function doorAt(room:RoomId,p:Point):Door|undefined{return doors.find(d=>d.room===room&&Math.hypot(d.x-p.x,d.y-p.y)<=d.radius);}
