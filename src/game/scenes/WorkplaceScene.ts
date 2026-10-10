import { avatarAtlas,directions,type Facing } from '../art/avatar';
import { MovementController, movementSettings } from '../systems/movement';
import Phaser from 'phaser';
import { doors,doorAt,doorFor,streetTrees, rooms, targetInRange, type RoomId, type Point } from '../../domain/world';
import type { GameApplication } from '../../application/game';
import { makeTerrain } from '../art/terrain';
import { findWalkPath } from '../systems/pathfinding';
import actorsUrl from '../../../public/assets/runtime/pixel/reporters-v1.png?url';
import officeUrl from '../../../public/assets/runtime/pixel/office-props-v1.png?url';
import cityUrl from '../../../public/assets/runtime/pixel/city-props-v1.png?url';
import cafeUrl from '../../../public/assets/runtime/pixel/b2bc-v1.png?url';
import euroUrl from '../../../public/assets/runtime/pixel/europlaza-v1.png?url';
type Direction = Facing;
type Occluder = { x: number; y: number; width: number; height: number; object: Phaser.GameObjects.Image };
export class WorkplaceScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite;
  private playerShadow!: Phaser.GameObjects.Ellipse;
  private cursor!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private currentRoom: RoomId | null = null;
  private unsubscribe: (() => void) | null = null;
  private scenery: Phaser.GameObjects.GameObject[] = [];
  private markers: { id: string; object: Phaser.GameObjects.Text }[] = [];
  private occluders: Occluder[] = [];
  private pedestrians: { sprite: Phaser.GameObjects.Sprite; start: Point; end: Point; offset: number; speed: number }[] = [];
  private cars: { object: Phaser.GameObjects.Container; direction: 'horizontal' | 'vertical'; lane: number; speed: number; offset: number }[] = [];
  private path: Point[] = [];
  private afterWalk: string | null = null;
  private motor = new MovementController();
  private facing: Direction = 'down';
  private presetIndex = 0;
  private lookSignature='';
  private walked=0;
  private doorLatch:string|null=null;
  private failedLoad = false;
  private lastNear: string | null | undefined;
  private blurStop = () => { this.motor.reset();this.app.cancelSteps();this.app.setDirectionInput(0,0);this.path=[];this.afterWalk=null; };
  constructor(private app: GameApplication, private interact: (id: string) => void, private proximity: (id: string | null) => void = () => {}) { super('workplace'); }
  preload(): void {
    this.load.image('reporters', actorsUrl); this.load.image('office-props', officeUrl); this.load.image('city-props', cityUrl); this.load.image('europlaza', euroUrl); this.load.image('cafe-building', cafeUrl);
    this.load.on('loaderror', () => { this.failedLoad = true; });
  }
  create(): void {
    if (this.failedLoad) { document.getElementById('status')!.textContent = '게임 자산을 불러오지 못했습니다. 새로고침해 주세요. 저장은 보존했습니다.'; return; }
    makeTerrain(this); this.registerFrames();
    this.cursor = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D') as Record<string, Phaser.Input.Keyboard.Key>;
    const e = this.input.keyboard!.addKey('E');
    e.on('down', () => {
      if (this.app.mode !== 'world') return;
      const near = rooms[this.app.room].targets.filter(t => !doorFor(this.app.room,t.id) && targetInRange(this.app.room, this.app.position, t.id)).sort((a,b) => Phaser.Math.Distance.BetweenPoints(a,this.app.position)-Phaser.Math.Distance.BetweenPoints(b,this.app.position))[0];
      if (near) this.interact(near.id);
    });
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (this.app.mode !== 'world' || over.length) return;
      const p = pointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
      this.afterWalk = null; this.path = findWalkPath(this.app.room, this.app.position, p);
      this.game.canvas.focus();
    });
    this.unsubscribe = this.app.subscribe(() => this.refresh());
    this.scale.on('resize', this.resizeCamera, this); this.game.events.on('blur',this.blurStop);
    this.events.once('shutdown', () => { this.unsubscribe?.(); e.removeAllListeners(); this.scale.off('resize', this.resizeCamera, this); this.input.removeAllListeners(); this.game.events.off('blur',this.blurStop); });
    this.refresh(); this.resizeCamera();
  }
  private registerFrames(): void {
    const sheet = this.textures.get('reporters'); const w = sheet.getSourceImage().width;
    const rows = [{ y:64,h:250 }, { y:332,h:270 }, { y:606,h:277 }];
    for (let row=0; row<3; row++) for (let col=0; col<12; col++) {
      const r=rows[row]!; const left=Math.floor(col*w/12), right=Math.floor((col+1)*w/12);
      sheet.add(`${row}-${col}`,0,left,r.y,right-left,r.h);
    }
    for (const key of ['office-props']) {
      const t=this.textures.get(key);
      for(let i=0;i<6;i++) t.add(String(i),0,(i%3)*512,Math.floor(i/3)*512,512,512);
    }
    const city=this.textures.get('city-props');
    city.add('tree',0,610,0,472,574); city.add('bench',0,0,592,512,432); city.add('shop',0,512,578,528,446); city.add('bush',0,1040,616,496,408);
    for(let p=0;p<3;p++) for(const [d,start] of Object.entries({ down:0,left:3,right:6,up:9 })) this.anims.create({ key:`walk-${p}-${d}`, frames:[0,1,0,2].map(i=>({key:'reporters',frame:`${p}-${start+i}`})),frameRate:8,repeat:-1 });
  }
  private resizeCamera(): void {
    if(!this.player) return;
    const room=rooms[this.app.room];
    const fillZoom=Math.ceil(Math.max(this.scale.width/room.width,this.scale.height/room.height)-.05);
    const zoom=Math.max(1,fillZoom,Math.min(3,Math.floor(Math.min(this.scale.width/480,this.scale.height/270))));
    this.cameras.main.setZoom(zoom).setBounds(0,0,rooms[this.app.room].width,rooms[this.app.room].height).startFollow(this.player,true,0.15,0.15).setFollowOffset(this.app.room === 'street' ? 64 : 0, this.app.room === 'street' ? 120 : 40);
  }
  private addProp(key:string, frame:string|undefined, x:number, y:number, width:number, height:number, footprintWidth=width): Phaser.GameObjects.Image {
    const image=this.add.image(x,y,key,frame).setDisplaySize(width,height).setOrigin(.5,.92).setDepth(y+.01);
    this.scenery.push(image); this.occluders.push({ x:x-footprintWidth/2,y,width:footprintWidth,height,object:image }); return image;
  }
  private tiles(key:string,x:number,y:number,width:number,height:number): void {
    this.scenery.push(this.add.tileSprite(x,y,width,height,`terrain-${key}`).setOrigin(0).setDepth(-100));
  }
  private interior(room:RoomId): void {
    const height=rooms[room].height;
    this.tiles('floor',24,24,592,height-40);
    const wall=this.add.graphics().setDepth(-50); this.scenery.push(wall);
    wall.fillStyle(0x4a5351).fillRect(24,24,592,42);
    wall.fillStyle(0xc5c9ba).fillRect(24,24,592,30);
    wall.fillStyle(0x747e77).fillRect(24,54,592,4);
    wall.fillStyle(0x617267).fillRect(24,24,10,height-40).fillRect(606,24,10,height-40);
    wall.fillStyle(0x909a8a).fillRect(26,24,4,height-40).fillRect(608,24,4,height-40);
    for(const x of [196,392]) {
      wall.fillStyle(0x394e51).fillRect(x,27,88,27); wall.fillStyle(0x8bb8bf).fillRect(x+4,30,80,20);
      wall.fillStyle(0xc0d9ca).fillRect(x+7,31,32,17); wall.fillStyle(0x455c5d).fillRect(x+42,29,3,24);
      // Window view: dense 2026 city silhouettes beyond the office.
      wall.fillStyle(0x607e83).fillRect(x+12,39,10,11).fillRect(x+51,35,19,15);
    }
    const rug=this.add.rectangle(326,279,172,116,0x75847c).setStrokeStyle(3,0x45564c).setDepth(-40);this.scenery.push(rug);
    if(room==='newsroom') {
      this.addProp('office-props','0',300,158,158,142,140);
      this.addProp('office-props','1',138,228,125,124,100);
      this.addProp('office-props','2',496,168,95,110,74);
      this.addProp('office-props','3',116,100,124,106,104);
      this.addProp('office-props','5',126,382,134,104,112);
      this.addProp('office-props','4',489,376,124,106,100);
      const editor=this.add.sprite(300,183,'reporters','0-0').setDisplaySize(29,49).setOrigin(.5,1).setDepth(183); this.scenery.push(editor);
      const label=this.add.text(300,119,'편집장',{fontSize:'10px',color:'#eee6ce',backgroundColor:'#33453be6',padding:{x:4,y:2}}).setOrigin(.5).setDepth(183); this.scenery.push(label);
      const sign=this.add.text(320,35,'MEDICAL QUEST  /  건강기자 편집국',{fontSize:'11px',color:'#213c35',fontStyle:'bold'}).setOrigin(.5).setDepth(2);this.scenery.push(sign);
    } else if (room === 'cafe') {
      this.cafeInterior();
    } else {
      this.addProp('office-props','4',336,180,149,145,128);
      this.addProp('office-props','5',148,110,148,100,130);
      this.addProp('office-props','3',510,110,109,105,88);
      const sign=this.add.text(330,38,'EURO PLAZA · 1F',{fontSize:'14px',color:'#2c433d',fontStyle:'bold'}).setOrigin(.5); this.scenery.push(sign);
    }
    if(room==='lobby'){const backDoor=this.add.graphics().setDepth(-30);backDoor.fillStyle(0x303a38).fillRect(31,208,22,44);backDoor.fillStyle(0x8ea8a0).fillRect(36,213,12,34);this.scenery.push(backDoor);}
    const door=this.add.graphics().setDepth(-30); this.scenery.push(door);
    door.fillStyle(0x303a38).fillRect(540,278,52,42);door.fillStyle(0x789b96).fillRect(547,282,38,34);door.fillStyle(0xb6c5b3).fillRect(563,283,2,30);
  }
  private cafeInterior(): void {
    this.addProp('office-props','3',116,100,118,104,104);
    this.addProp('office-props','5',523,158,122,114,106);
    const counter=this.add.container(230,158).setDepth(158);const g=this.add.graphics();counter.add(g);this.scenery.push(counter);
    g.fillStyle(0x624c35).fillRect(0,-34,140,34);g.fillStyle(0xad8c60).fillRect(0,-44,140,20);g.fillStyle(0xddceb0).fillRect(-3,-46,146,8);
    // Temporary modern espresso machine and cup rack; replace with interior-photo assets later.
    g.fillStyle(0x777f7d).fillRect(12,-75,48,27);g.fillStyle(0xc5cfca).fillRect(14,-77,44,6);g.fillStyle(0x293d3f).fillRect(18,-68,35,13);
    g.fillStyle(0xebe8d9).fillRect(19,-53,8,8).fillRect(39,-53,8,8);g.fillStyle(0x435a50).fillRect(14,-79,42,2);
    for(let x=94;x<125;x+=10){g.fillStyle(0xf0ead7).fillRect(x,-57,7,9);g.fillStyle(0x7b8b72).fillRect(x,-57,7,2);}
    const table=this.add.container(88,228).setDepth(228);const t=this.add.graphics();table.add(t);this.scenery.push(table);
    t.fillStyle(0x615b49).fillRect(20,-8,6,8).fillRect(72,-8,6,8);t.fillStyle(0xb59667).fillEllipse(50,-14,100,36);t.lineStyle(2,0x786346).strokeEllipse(50,-14,100,36);
    t.fillStyle(0xebdfc6).fillEllipse(48,-18,15,8);t.fillStyle(0xf7ecce).fillRect(44,-25,8,6);t.fillStyle(0x6c5840).fillRect(45,-26,6,2);
    const barista=this.add.sprite(300,183,'reporters','1-0').setDisplaySize(28,49).setOrigin(.5,1).setDepth(183);this.scenery.push(barista);
    const name=this.add.text(320,36,'비투비씨  ·  B2BC COFFEE',{fontSize:'14px',color:'#3c4e40',fontStyle:'bold'}).setOrigin(.5);this.scenery.push(name);
  }
  private street(): void {
    this.tiles('sidewalk',0,0,1280,1280);
    this.tiles('asphalt',800,0,192,1280); this.tiles('asphalt',0,800,1280,192);
    // Local alleys on the west side of Nonhyeon-ro, simplified for game scale.
    this.tiles('asphalt',0,700,800,60);
    this.tiles('asphalt',0,432,736,80);this.tiles('asphalt',368,32,64,704);
    const g=this.add.graphics().setDepth(-60);this.scenery.push(g);
    g.lineStyle(3,0xd8bd63);g.lineBetween(894,0,894,800).lineBetween(899,0,899,800).lineBetween(894,992,894,1280).lineBetween(899,992,899,1280);
    g.lineBetween(0,894,800,894).lineBetween(0,899,800,899).lineBetween(992,894,1280,894).lineBetween(992,899,1280,899);
    g.lineStyle(2,0xd9dace);
    for(let y=0;y<1280;y+=40) if(y<800||y>992) for(const x of [831,863,928,960])g.lineBetween(x,y,x,y+20);
    for(let x=0;x<1280;x+=40) if(x<800||x>992) for(const y of [831,863,928,960])g.lineBetween(x,y,x+20,y);
    g.fillStyle(0xe0e0d6);
    for(let x=808;x<984;x+=16){g.fillRect(x,752,8,32);g.fillRect(x,1008,8,32);}
    for(let y=808;y<984;y+=16){g.fillRect(752,y,32,8);g.fillRect(1008,y,32,8);}
    g.lineStyle(3,0xbbbdaf);g.strokeRect(788,0,12,750).strokeRect(992,0,12,750).strokeRect(0,788,750,12);
    for(let rail=48;rail<1260;rail+=32) if(rail<744||rail>1048){ g.fillStyle(0x353b39).fillRect(892,rail,5,12);g.fillStyle(0xd4b655).fillRect(892,rail+4,5,3); }
    g.fillStyle(0xcab95e).fillRect(0,738,748,2);
    const alleyName=this.add.text(438,745,'논현로159길 · 30',{fontSize:'12px',color:'#d8d9c9'}).setOrigin(.5).setDepth(-10);this.scenery.push(alleyName);
    for(const o of rooms.street.obstacles) {
      if (o.label === '가로수' || o.label === '거리 벤치') continue;
      if(o.label==='유로프라자') this.addProp('europlaza',undefined,578,680,324,304,o.width);
      else if(o.label==='비투비씨') { this.addProp('cafe-building',undefined,216,684,218,234,o.width); const sign=this.add.text(212,649,'비투비씨',{fontSize:'13px',color:'#f1ebd4',fontStyle:'bold',backgroundColor:'#1e282b'}).setOrigin(.5).setDepth(685);this.scenery.push(sign); }
      else if(o.label==='상가 거리') this.addProp('city-props','shop',578,388,310,252,o.width);
      else this.building(o.x,o.y,o.width,o.height,o.color,o.label==='도심 상가'?5:3);
    }
    for(const {x,y} of streetTrees)this.addProp('city-props','tree',x,y,94,127,22);
    this.addProp('city-props','bench',659,780,80,65,76);
    this.addProp('city-props','bush',68,650,96,70,80);
    for(const [x,y] of [[786,736],[1000,736],[786,1000],[1000,1000]]) {
      const light=this.add.graphics().setDepth(y!);light.fillStyle(0x414b4d).fillRect(x!-2,y!-48,4,48).fillRect(x!-6,y!-65,12,22);light.fillStyle(0x80a975).fillRect(x!-3,y!-53,6,6);this.scenery.push(light);
    }
    for (const [x,y,color] of [[480,748,0x293c49],[580,748,0xe0e1d6],[166,744,0x53697c]]) { const parked=this.car(color!); parked.setPosition(x!,y!).setRotation(Math.PI/2).setDepth(y!);this.scenery.push(parked); }
    for(let i=0;i<24;i++) {
      const vertical=i%2===0,lane=vertical?[818,850,881,915,946,977][i%6]!:[818,850,881,915,946,977][i%6]!;
      const car=this.car([0xe8ece8,0x353d49,0x688395,0xbfc2b7,0x4d6b81,0xc6a487][i%6]!);
      car.setRotation(vertical ? (i%6<3 ? Math.PI : 0) : (i%6<3 ? Math.PI/2 : -Math.PI/2));this.cars.push({object:car,direction:vertical?'vertical':'horizontal',lane,speed:i%6<3?32:-32,offset:i*107});
      this.scenery.push(car);
    }
    const routes=[{a:{x:740,y:120},b:{x:740,y:736}},{a:{x:1008,y:124},b:{x:1008,y:724}},{a:{x:60,y:752},b:{x:732,y:752}},{a:{x:64,y:1048},b:{x:736,y:1048}}];
    for(let i=0;i<12;i++){
      const route=routes[i%routes.length]!;const npc=this.add.sprite(route.a.x,route.a.y,'reporters',`${i%2}-0`).setDisplaySize(25,44).setOrigin(.5,1);
      npc.setTint([0xd1d4d8,0xc4b8a7,0x9bb8b8,0xd5c3b1][i%4]!);this.scenery.push(npc);
      this.pedestrians.push({sprite:npc,start:route.a,end:route.b,offset:i*43,speed:18+i%3*3});
    }
    const streetLabel=this.add.text(765,480,'논\n현\n로',{fontSize:'14px',color:'#597068',align:'center'}).setOrigin(.5).setDepth(-20);this.scenery.push(streetLabel);
    const dosan=this.add.text(590,777,'도산대로  /  을지병원 사거리',{fontSize:'13px',color:'#5d6b62'}).setOrigin(.5).setDepth(-20);this.scenery.push(dosan);
  }
  private building(x:number,y:number,width:number,height:number,color:number,floors:number): void {
    const rise=floors*26; const object=this.add.container(x,y+height).setDepth(y+height+.01);const g=this.add.graphics();object.add(g);this.scenery.push(object);
    g.fillStyle(0x283038,.2).fillRect(8,-rise,width+8,rise+12);
    g.fillStyle(color).fillRect(0,-rise,width,rise);g.fillStyle(0x45555d).fillRect(width-12,-rise,12,rise);
    g.fillStyle(0xc3c6bb).fillRect(-3,-rise-22,width+6,24);g.fillStyle(0x6e7c7b).fillRect(3,-rise-19,width-6,17);
    for(let floor=0;floor<floors;floor++){
      g.fillStyle(0x657175).fillRect(0,-floor*26-2,width,2);
      for(let wx=12;wx<width-22;wx+=28){g.fillStyle(0x344c59).fillRect(wx,-floor*26-22,18,17);g.fillStyle(0x91adb0).fillRect(wx+2,-floor*26-20,6,12);g.fillStyle(0xcbd0bf).fillRect(wx+8,-floor*26-20,2,12);}
    }
    for(let vent=24;vent<width-24;vent+=64){g.fillStyle(0xb7bdb5).fillRect(vent,-rise-26,22,14);g.fillStyle(0x626d69).fillRect(vent+3,-rise-22,16,6);}
    g.fillStyle(0x304842).fillRect(8,-23,width-30,10);g.fillStyle(0x243b43).fillRect(width/2-10,-20,20,20);
  }
  private car(color:number): Phaser.GameObjects.Container {
    const g=this.add.graphics();g.fillStyle(0x141e25,.25).fillRect(-12,-25,26,53);g.fillStyle(0x242b2d).fillRect(-13,-17,26,34);g.fillStyle(color).fillRoundedRect(-11,-25,22,50,4);g.fillStyle(0x293d4c).fillRect(-8,-15,16,9).fillRect(-8,11,16,7);g.fillStyle(0xb9c6be).fillRect(-9,-24,4,3).fillRect(5,-24,4,3);g.fillStyle(0x973e36).fillRect(-9,22,4,2).fillRect(5,22,4,2);return this.add.container(0,0,[g]);
  }
  private refresh(): void {
    const s=this.app.snapshot;
    if(this.currentRoom!==s.safeLocation.room){
      this.scenery.forEach(o=>o.destroy());this.scenery=[];this.markers=[];this.occluders=[];this.cars=[];this.pedestrians=[];this.path=[];this.afterWalk=null;this.motor.reset();
      this.currentRoom=s.safeLocation.room;
      if(this.currentRoom==='street')this.street();else this.interior(this.currentRoom);
      this.doorLatch=null;
      for(const d of doors.filter(d=>d.room===this.currentRoom)){const mark=this.add.graphics().setDepth(-15);mark.lineStyle(1,0xc6d8ad,.7).strokeEllipse(d.x,d.y+4,20,7);this.scenery.push(mark);}
      for(const t of rooms[this.currentRoom].targets.filter(t=>!doorFor(this.currentRoom!,t.id))){
        const label=this.add.text(t.x,t.y+10,`◆ ${t.label}`,{fontSize:'10px',color:'#eee5c9',backgroundColor:'#253c31dd',padding:{x:5,y:2}}).setOrigin(.5).setDepth(3000).setInteractive({useHandCursor:true});
        label.on('pointerdown',()=>{
          if(this.app.mode!=='world')return;
          if(targetInRange(this.app.room,this.app.position,t.id)){this.interact(t.id);return;}
          this.path=findWalkPath(this.app.room,this.app.position,t);this.afterWalk=t.id;this.game.canvas.focus();
        });this.scenery.push(label);this.markers.push({id:t.id,object:label});
      }
    }
    this.presetIndex=s.avatar.preset==='alien'?2:s.avatar.preset==='female'?1:0;
    const signature=JSON.stringify({preset:s.avatar.preset,appearance:s.avatar.appearance});
    if(!this.player || signature!==this.lookSignature){
      this.player?.destroy();this.playerShadow?.destroy();
      if(this.textures.exists('player-avatar'))this.textures.remove('player-avatar');
      const texture=this.textures.addCanvas('player-avatar',avatarAtlas(s.avatar))!;
      for(let d=0;d<4;d++)for(let f=0;f<8;f++)texture.add(`${directions[d]}-${f}`,0,f*48,d*64,48,64);
      this.playerShadow=this.add.ellipse(this.app.position.x,this.app.position.y,22,8,0x1c2b29,.25);
      this.player=this.add.sprite(this.app.position.x,this.app.position.y,'player-avatar','down-0').setDisplaySize(36,48).setOrigin(.5,1);
      this.lookSignature=signature;this.walked=0;
    }
    this.player.setPosition(this.app.position.x,this.app.position.y);
    this.resizeCamera();
  }
  update(time:number,delta:number): void {
    if(!this.player||!this.cursor)return;
    const before=this.app.position;
    const dt=Math.min(delta,movementSettings.maxFrameMilliseconds);
    let dx=Number(this.cursor.right.isDown||this.wasd.D!.isDown)-Number(this.cursor.left.isDown||this.wasd.A!.isDown);
    let dy=Number(this.cursor.down.isDown||this.wasd.S!.isDown)-Number(this.cursor.up.isDown||this.wasd.W!.isDown);
    if(document.activeElement!==this.game.canvas){dx=0;dy=0;}
    const virtual=this.app.directionInput;if(!dx&&!dy){dx=virtual.x;dy=virtual.y;}
    let goal:Point|undefined;
    if(this.app.mode!=='world'){this.motor.reset();this.app.cancelSteps();this.path=[];this.afterWalk=null;dx=0;dy=0;}
    else if(dx||dy){this.path=[];this.afterWalk=null;this.app.cancelSteps();}
    else goal=this.app.stepGoal ?? this.path[0];
    if(goal){dx=goal.x-before.x;dy=goal.y-before.y;}
    const distance=goal ? Phaser.Math.Distance.BetweenPoints(before,goal) : Infinity;
    const maxSpeed=goal ? Math.min(movementSettings.walkPixelsPerSecond,Math.sqrt(2*movementSettings.walkPixelsPerSecond/(movementSettings.releaseMilliseconds/1000)*distance)) : movementSettings.walkPixelsPerSecond;
    const movement=this.motor.advance({x:dx,y:dy},dt,maxSpeed);
    if(goal && distance<=Math.hypot(movement.x,movement.y)+.05){
      this.app.move(goal.x-before.x,goal.y-before.y);
      if(this.app.stepGoal)this.app.completeStep();else this.path.shift();
      this.motor.reset();
    } else this.app.move(movement.x,movement.y);
    if(goal && distance>.1 && Math.hypot(movement.x,movement.y)>.1 && Phaser.Math.Distance.BetweenPoints(before,this.app.position)<.01){
      this.app.cancelSteps();this.path=[];this.afterWalk=null;this.motor.reset();
    }
    if(!this.path.length && this.afterWalk){const target=this.afterWalk;this.afterWalk=null;this.interact(target);}
    const p=this.app.position;const moved=Math.hypot(p.x-before.x,p.y-before.y)>.01;
    if(moved){const mx=p.x-before.x,my=p.y-before.y;this.facing=Math.abs(mx)>Math.abs(my)?mx>0?'right':'left':my>0?'down':'up';this.walked+=Math.hypot(mx,my);this.player.setFrame(`${this.facing}-${Math.floor(this.walked/movementSettings.walkFramePixels)%movementSettings.walkFrames}`);}
    else{this.player.anims.stop();this.player.setFrame(`${this.facing}-0`);}
    this.player.setPosition(Math.round(p.x),Math.round(p.y)).setDepth(p.y);
    this.playerShadow.setPosition(p.x,p.y).setDepth(p.y-.01);
    for(const o of this.occluders)o.object.setAlpha(p.y<o.y&&p.y>o.y-o.height*.6&&p.x>o.x-8&&p.x<o.x+o.width+8?.55:1);
    const nearest=rooms[this.app.room].targets.filter(t=>!doorFor(this.app.room,t.id) && targetInRange(this.app.room,p,t.id)).sort((a,b)=>Phaser.Math.Distance.BetweenPoints(a,p)-Phaser.Math.Distance.BetweenPoints(b,p))[0];
    const nearId=this.app.mode==='world' ? nearest?.id ?? null : null;
    if(nearId!==this.lastNear){this.lastNear=nearId;this.proximity(nearId);}
    for(const marker of this.markers){const near=marker.id===nearId;const target=rooms[this.app.room].targets.find(t=>t.id===marker.id)!;marker.object.setText(near ? target.label : '◇').setAlpha(near?1:.65);}
    const world=document.getElementById('world');if(world){world.dataset.moving=String(moved||this.motor.moving||!!this.app.stepGoal||this.path.length>0);world.dataset.playerX=p.x.toFixed(3);world.dataset.playerY=p.y.toFixed(3);world.dataset.cameraX=this.cameras.main.worldView.x.toFixed(3);world.dataset.cameraY=this.cameras.main.worldView.y.toFixed(3);world.dataset.zoom=String(this.cameras.main.zoom);world.dataset.facing=this.facing;world.dataset.walkFrame=String(this.player.frame.name);world.dataset.appearance=this.lookSignature;}
    const atDoor=doorAt(this.app.room,p);
    if(!atDoor)this.doorLatch=null;
    if(moved && atDoor && Math.hypot(before.x-atDoor.x,before.y-atDoor.y)>atDoor.radius && this.app.mode==='world' && !this.app.busy && this.doorLatch!==`${this.app.room}:${atDoor.id}`){this.doorLatch=`${this.app.room}:${atDoor.id}`;this.interact(atDoor.id);}
    if(this.app.room==='street'){
      const trafficPhase=Math.floor(time/9000)%2;
      for(const car of this.cars){
        const distance=(time/1000*car.speed+car.offset+2560)%1280;
        let coordinate=distance;
        if((car.direction==='vertical'?trafficPhase===1:trafficPhase===0)&&distance>700&&distance<800)coordinate=700+car.offset%64;
        if(car.direction==='vertical')car.object.setPosition(car.lane,coordinate%1280);else car.object.setPosition(coordinate,car.lane);
        car.object.setDepth(car.object.y);
      }
      for(const npc of this.pedestrians){
        const length=Phaser.Math.Distance.BetweenPoints(npc.start,npc.end);const period=(time/1000*npc.speed+npc.offset)%(length*2);const forward=period<length;const fraction=(forward?period:2*length-period)/length;
        npc.sprite.setPosition(Phaser.Math.Linear(npc.start.x,npc.end.x,fraction),Phaser.Math.Linear(npc.start.y,npc.end.y,fraction)).setDepth(npc.sprite.y);
        const direction=npc.start.x===npc.end.x?forward?'down':'up':forward?'right':'left';
        npc.sprite.play(`walk-${Number(npc.sprite.frame.name.split('-')[0])}-${direction}`,true);
      }
    }
  }
}
