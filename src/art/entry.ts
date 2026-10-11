import { ellipse, makeCanvas, outline, rect, type Ctx } from './pixel';

// Front view: screen right is the person's left. Position/shape are schematic,
// using the same draft anatomy contract as body-map and heart-interior.
export const HEART_POSITION = { x: 85, y: 73 };
function polygon(g: Ctx, points: number[][], color: string): void {
  // Rasterize at pixel centres; no antialiased/vector edges in the sprite.
  for (let y = 0; y < g.canvas.height; y++) for (let x = 0; x < g.canvas.width; x++) {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const a = points[i]!, b = points[j]!;
      if ((a[1]! > y + .5) !== (b[1]! > y + .5) && x + .5 < (b[0]! - a[0]!) * (y + .5 - a[1]!) / (b[1]! - a[1]!) + a[0]!) inside = !inside;
    }
    if (inside) rect(g, x, y, 1, 1, color);
  }
}

export function entryBody(): HTMLCanvasElement {
  const { c, g } = makeCanvas(160, 224);
  const skin = '#658e99';
  ellipse(g, 80, 22, 12, 16, skin);
  rect(g, 75, 34, 10, 12, skin);
  polygon(g, [[65,44],[95,44],[105,51],[105,76],[97,100],[97,121],[104,137],[96,149],[64,149],[56,137],[63,121],[63,100],[55,76],[55,51]], skin);
  polygon(g, [[57,48],[65,58],[54,91],[49,125],[43,139],[37,137],[40,122],[43,84],[48,59]], skin);
  polygon(g, [[103,48],[95,58],[106,91],[111,125],[117,139],[123,137],[120,122],[117,84],[112,59]], skin);
  polygon(g, [[64,142],[78,144],[77,169],[72,196],[71,211],[55,211],[58,203],[59,179]], skin);
  polygon(g, [[96,142],[82,144],[83,169],[88,196],[89,211],[105,211],[102,203],[101,179]], skin);
  outline(c, '#314e65');
  ellipse(g, 66, 70, 9, 19, '#436c80'); ellipse(g, 94, 70, 9, 19, '#436c80');
  rect(g, 77, 45, 5, 18, '#9fc3c5');
  rect(g, 70, 100, 20, 1, '#739eaa');
  const heart = entryHeart(0);
  g.drawImage(heart, HEART_POSITION.x - 10, HEART_POSITION.y - 13, 21, 26);
  return c;
}

/** Five authored contraction frames; great vessels stay fixed, ventricles shorten. */
export function entryHeart(contraction: number): HTMLCanvasElement {
  const { c, g } = makeCanvas(64, 80);
  const k = Math.max(0, Math.min(4, Math.round(contraction)));
  // Superior vena cava (person's right), aortic arch, pulmonary trunk.
  rect(g, 12, 6, 9, 24, '#77445e'); rect(g, 13, 7, 3, 18, '#b57890');
  polygon(g, [[29,32],[25,17],[27,9],[32,6],[43,6],[49,11],[49,28],[42,29],[42,15],[39,13],[34,14],[34,20],[37,32]], '#bc475b');
  rect(g, 31, 0, 5, 8, '#d46a70'); rect(g, 39, 0, 5, 8, '#d46a70');
  polygon(g, [[34,36],[33,23],[38,18],[56,18],[58,25],[43,26],[42,37]], '#867197');
  rect(g, 42, 19, 13, 2, '#b8a4bd');
  polygon(g, [[15,25],[27,25],[40,31],[48,36],[51-k,48],[48-k,61-k],[42,74-k],[35,77-k],[22+k,66-k],[12+k,51],[9,37]], '#b7415e');
  polygon(g, [[12,33],[22,29],[32,34],[31,49],[25+k,63-k],[17+k,54],[12+k,45]], '#d46476');
  polygon(g, [[35,35],[44,39],[47-k,50],[43-k,62-k],[36,72-k],[31,63-k],[30,49]], '#db6a7c');
  polygon(g, [[39,48],[45-k,46],[44-k,57],[38,68-k],[34,67-k]], '#ed8d94');
  ellipse(g, 15, 31, 7, 8, '#ce6a7b'); ellipse(g, 43, 33, 6, 5, '#b95770');
  // Surface groove and coronary vessel marks, qualitative rather than a measured model.
  polygon(g, [[22,39],[26,40],[31,46],[33,57],[37,69-k],[35,71-k],[30,59],[28,48]], '#71344f');
  polygon(g, [[13,37],[23,37],[33,41],[43,39],[45,41],[33,44],[22,40],[13,40]], '#efb187');
  rect(g, 17, 29, 6, 2, '#f39ca2');
  outline(c, '#4c293f');
  return c;
}
