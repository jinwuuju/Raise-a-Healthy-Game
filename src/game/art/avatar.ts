import type { Appearance } from '../../domain/appearance';
export type AvatarLook = { preset:'male'|'female'|'alien'; appearance:Appearance };
export const directions = ['down','left','right','up'] as const;
export type Facing = typeof directions[number];
export const avatarSize = { width:48,height:64,frames:8 };
const skin = {peach:['#f1ceaf','#d09b7c'],honey:['#ddb98b','#b4865e'],tan:['#ba8866','#946144'],deep:['#885c48','#634234'],mint:['#b8e2c0','#78b39c'],lilac:['#d6c9ef','#a394c6'],sky:['#b9dfef','#7faec6']} as const;
const hair = {ink:['#343a46','#535b65'],brown:['#584031','#80604a'],chestnut:['#815040','#aa7357'],gold:['#cba36a','#ead091'],silver:['#a4b3bc','#dbe1db'],teal:['#427c77','#79a9a0']} as const;
// One native pixel compositor for the world, creator and HUD. Every frame shares its foot anchor.
export function drawAvatar(ctx:CanvasRenderingContext2D,look:AvatarLook,direction:Facing,frame=0):void {
  ctx.clearRect(0,0,48,64);ctx.imageSmoothingEnabled=false;
  const a=look.appearance, s=skin[a.skinId], h=hair[a.hairColor];
  const stride=Math.round(Math.sin(frame*Math.PI/4)*3), bob=frame===2||frame===6?-1:0;
  const side=direction==='left'||direction==='right', back=direction==='up', sign=direction==='left'?-1:1;
  const rect=(x:number,y:number,w:number,height:number,c:string)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,height);};
  const outline='#283d3e';
  // Shoes keep a planted foot at y=63 even while the other leg swings.
  const legA=side?22+stride:18+stride,legB=side?22-stride:27-stride;
  rect(legA,49,5,11,outline);rect(legB,49,5,11,outline);
  rect(legA+1,50,3,9,'#526376');rect(legB+1,50,3,9,'#6f7f89');
  rect(legA-1,59,7,4,'#4b4038');rect(legB-1,59,7,4,'#53453a');rect(legA,59,5,1,'#9b8a67');rect(legB,59,5,1,'#a29272');
  const jacket=a.outfitId==='reporter'?['#486c66','#779281']:a.outfitId==='knit'?['#9b735b','#c7a27d']:a.outfitId==='hoodie'?['#71978e','#abc9ad']:['#4b617d','#8b9baa'];
  const bodyX=side?18:14,bodyW=side?13:21;
  rect(bodyX,32+bob,bodyW,19,outline);rect(bodyX+1,33+bob,bodyW-2,16,jacket[0]!);rect(bodyX+2,33+bob,4,16,jacket[1]!);
  if(!back){rect(side?23:22,32+bob,side?4:6,13,'#ede8cd');rect(side?25:24,35+bob,2,10,'#b0ab91');}
  if(a.outfitId==='hoodie'){rect(bodyX+2,30+bob,bodyW-4,4,jacket[1]!);rect(22,33+bob,1,7,'#e5ead7');}
  if(a.outfitId==='coat'){rect(bodyX,48+bob,bodyW,5,jacket[0]!);}
  // Arms move counter to the legs, with a compact reporter bag as a separate layer.
  const armSwing=Math.round(stride/2);
  rect(bodyX-3,34+bob+armSwing,4,13,outline);rect(bodyX-2,35+bob+armSwing,2,10,jacket[1]!);rect(bodyX-2,45+bob+armSwing,3,4,s[0]);
  if(!side){rect(bodyX+bodyW-1,34+bob-armSwing,4,13,outline);rect(bodyX+bodyW,35+bob-armSwing,2,9,jacket[0]!);rect(bodyX+bodyW,45+bob-armSwing,3,4,s[0]);}
  rect(side?(sign<0?28:15):30,43+bob,7,9,'#574c3f');rect(side?(sign<0?29:16):31,44+bob,5,6,'#a28458');
  if(!back)for(let y=32;y<44;y++)rect(side?20+Math.floor((y-32)/4):16+Math.floor((y-32)/2),y+bob,2,1,'#8d7450');
  rect(22,27+bob,5,6,s[1]);
  // Stepped silhouettes, highlights and warm cheeks rather than a flat face rectangle.
  const hx=side?17:13, hw=side?17:23, hy=look.preset==='alien'?9:11;
  rect(hx+3,hy+bob,hw-6,20,outline);rect(hx+1,hy+2+bob,hw-2,16,outline);rect(hx,hy+5+bob,hw,10,outline);
  rect(hx+3,hy+1+bob,hw-6,18,s[1]);rect(hx+2,hy+3+bob,hw-4,13,s[0]);rect(hx+4,hy+2+bob,hw-8,16,s[0]);rect(hx+4,hy+4+bob,3,8,'#ffffff25');
  if(look.preset==='alien'){
    const cx=hx+hw/2,cy=hy+10+bob;
    // Native pixel ellipse: stepped silhouette, no smoothed vector edge.
    ctx.clearRect(hx-1,hy-1+bob,hw+2,22);
    for(let row=-10;row<=10;row++){
      const edge=Math.floor((hw/2)*Math.sqrt(Math.max(0,1-row*row/100)));
      rect(cx-edge,cy+row,edge*2+1,1,outline);
      if(edge>1&&Math.abs(row)<10){rect(cx-edge+1,cy+row,edge*2-1,1,s[0]);rect(cx+Math.max(1,edge-2),cy+row,2,1,s[1]);}
    }
    rect(hx+5,hy+5+bob,3,6,'#ffffff38');
  }
  if(look.preset==='alien'){
    if(a.hairId==='ears'){rect(hx-3,hy-8+bob,5,14,outline);rect(hx-2,hy-7+bob,3,11,s[0]);rect(hx+hw-2,hy-8+bob,5,14,outline);rect(hx+hw-1,hy-7+bob,3,11,s[0]);}
    else if(a.hairId==='buds'){for(const x of [hx+4,hx+hw-6]){rect(x,hy-6+bob,2,7,s[1]);rect(x-1,hy-9+bob,4,4,outline);rect(x,hy-8+bob,2,2,h[1]);}}
    else {rect(20,hy-6+bob,8,7,h[0]);rect(23,hy-8+bob,3,3,h[1]);rect(18,hy-2+bob,14,3,h[1]);}
  }else{
    rect(hx+2,hy-3+bob,hw-4,7,h[0]);rect(hx+4,hy-4+bob,hw-8,3,h[1]);
    rect(hx,hy+1+bob,4,a.hairId==='bob'?20:10,h[0]);rect(hx+hw-4,hy+bob,4,a.hairId==='bob'?21:11,h[0]);
    if(a.hairId==='wave'){for(const x of [hx-1,hx+hw-4]){rect(x,hy+4+bob,5,7,h[1]);rect(x+1,hy+11+bob,5,9,h[0]);}rect(hx+6,hy+bob,9,4,h[0]);}
    else {rect(hx+5,hy+bob,6,5,h[0]);rect(hx+10,hy+bob,6,3,h[1]);}
  }
  if(back){rect(hx+3,hy+3+bob,hw-6,15,look.preset==='alien'?s[0]:h[0]);if(look.preset!=='alien')rect(hx+4,hy+5+bob,3,10,h[1]);}
  else {
    const eyeY=hy+10+bob, positions=side?[sign<0?hx+3:hx+hw-6]:[hx+6,hx+hw-9];
    for(const x of positions){rect(x,eyeY,look.preset==='alien'?4:3,a.faceId==='calm'?2:look.preset==='alien'?5:4,outline);if(a.faceId!=='calm')rect(x,eyeY,1,1,'#fff6dc');if(a.faceId==='bright')rect(x-1,eyeY-1,4,1,h[0]);}
    if(side)rect(sign<0?hx-1:hx+hw-1,hy+12+bob,2,3,s[0]);
    rect(side?(sign<0?hx+5:hx+9):hx+10,hy+16+bob,a.faceId==='smile'?4:3,1,'#925f54');
    rect(hx+3,hy+14+bob,3,2,'#d9928c');if(!side)rect(hx+hw-6,hy+14+bob,3,2,'#d9928c');
  }
}
export function avatarAtlas(look:AvatarLook):HTMLCanvasElement {
  const canvas=document.createElement('canvas');canvas.width=48*8;canvas.height=64*4;
  const ctx=canvas.getContext('2d')!;const frame=document.createElement('canvas');frame.width=48;frame.height=64;
  for(let d=0;d<4;d++)for(let f=0;f<8;f++){drawAvatar(frame.getContext('2d')!,look,directions[d]!,f);ctx.drawImage(frame,f*48,d*64);}
  return canvas;
}
export function avatarPortrait(look:AvatarLook,direction:Facing='down'):string {const c=document.createElement('canvas');c.width=48;c.height=64;drawAvatar(c.getContext('2d')!,look,direction);return c.toDataURL('image/png');}
