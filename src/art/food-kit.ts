/* 오늘의 점심 음식 그림 공용 도구(D070 기준 5종에서 분리, D082). DOM 없음. */
export const FOOD_W = 32, FOOD_H = 32, FOOD_AX = 16, FOOD_AY = 30;
export type FoodGrid = (string | null)[];

export const SHADOW = '#2d273433';

export function h2(x: number, y: number, s = 0): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export type Shade = (x: number, y: number, u: number, v: number) => string | null;

export class Layer {
  readonly d: FoodGrid = new Array<string | null>(FOOD_W * FOOD_H).fill(null);
  p(x: number, y: number, c: string | null): void {
    const X = Math.round(x), Y = Math.round(y);
    if (X < 0 || Y < 0 || X >= FOOD_W || Y >= FOOD_H) return;
    this.d[Y * FOOD_W + X] = c;
  }
  at(x: number, y: number): string | null {
    return x < 0 || y < 0 || x >= FOOD_W || y >= FOOD_H ? null : this.d[y * FOOD_W + x] ?? null;
  }
  r(x: number, y: number, w: number, h: number, c: string): void {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.p(x + i, y + j, c);
  }
  /** pixel.ts의 ellipse와 같은 행 계산. 색 대신 함수를 주면 (u, v)는 -1..1 정규화 좌표. */
  e(cx: number, cy: number, rx: number, ry: number, c: string | Shade): void {
    for (let y = -ry; y <= ry; y++) {
      const t = 1 - ((y + (y < 0 ? 0.5 : -0.5)) ** 2) / (ry * ry);
      const w = Math.max(0, Math.round(rx * Math.sqrt(Math.max(0, t))));
      if (!(w > 0 || Math.abs(y) < ry)) continue;
      for (let x = -w; x <= w; x++) {
        const col = typeof c === 'string' ? c : c(cx + x, cy + y, x / Math.max(1, rx), y / Math.max(1, ry));
        if (col) this.p(cx + x, cy + y, col);
      }
    }
  }
  /** 4방향 이웃 기준 1px 외곽선(빈 칸에만). */
  outline(c: string): void {
    const marks: number[] = [];
    for (let y = 0; y < FOOD_H; y++) for (let x = 0; x < FOOD_W; x++) {
      if (this.at(x, y)) continue;
      if (this.at(x - 1, y) || this.at(x + 1, y) || this.at(x, y - 1) || this.at(x, y + 1)) marks.push(y * FOOD_W + x);
    }
    for (const i of marks) this.d[i] = c;
  }
  put(o: Layer): void { o.d.forEach((c, i) => { if (c) this.d[i] = c; }); }
}

export function stack(...ls: Layer[]): FoodGrid {
  const out = new Layer();
  for (const l of ls) out.put(l);
  return out.d;
}

/** 위가 넓고 아래로 둥글게 좁아지는 그릇 몸통. 왼쪽이 밝다. */
export function body(l: Layer, cx: number, top: number, bottom: number, wTop: number, wBot: number, ramp: string[]): void {
  for (let y = top; y <= bottom; y++) {
    const t = (y - top) / Math.max(1, bottom - top);
    const hw = Math.round(wTop + (wBot - wTop) * t * t);
    for (let x = -hw; x <= hw; x++) {
      const u = x / Math.max(1, hw);
      let i = u < -0.6 ? 0 : u < 0.05 ? 1 : u < 0.65 ? 2 : 3;
      if (t > 0.8 && i < 3) i++;
      l.p(cx + x, y, ramp[i]!);
    }
  }
}

export function steam(l: Layer, x: number, y0: number, len: number, phase: number): void {
  for (let i = 0; i < len; i++) {
    const dx = Math.round(Math.sin((i + phase) * 0.9));
    l.p(x + dx, y0 - i, i % 3 === 2 ? '#ffffff55' : '#ffffffaa');
  }
}

export function sparkle(l: Layer, x: number, y: number): void {
  l.p(x, y, '#ffffff');
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) l.p(x + dx, y + dy, '#a9def5');
}

