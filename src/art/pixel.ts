export type Ctx = CanvasRenderingContext2D;
export type Sprite = { c: HTMLCanvasElement; ax: number; ay: number };

export function makeCanvas(w: number, h: number): { c: HTMLCanvasElement; g: Ctx } {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.imageSmoothingEnabled = false;
  return { c, g };
}

export function rect(g: Ctx, x: number, y: number, w: number, h: number, color: string): void {
  if (w <= 0 || h <= 0) return;
  g.fillStyle = color; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
export function px(g: Ctx, x: number, y: number, color: string): void { g.fillStyle = color; g.fillRect(Math.round(x), Math.round(y), 1, 1); }

export function ellipse(g: Ctx, cx: number, cy: number, rx: number, ry: number, color: string): void {
  g.fillStyle = color;
  for (let y = -ry; y <= ry; y++) {
    const t = 1 - ((y + (y < 0 ? 0.5 : -0.5)) ** 2) / (ry * ry);
    const w = Math.max(0, Math.round(rx * Math.sqrt(Math.max(0, t))));
    if (w > 0 || Math.abs(y) < ry) g.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1);
  }
}

export function hex(c: string): [number, number, number] {
  const n = parseInt(c.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function toHex(r: number, g: number, b: number): string {
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return '#' + f(r) + f(g) + f(b);
}
/** f > 0 lightens toward white, f < 0 darkens toward black. */
export function shade(c: string, f: number): string {
  const [r, g, b] = hex(c);
  const t = (v: number) => (f >= 0 ? v + (255 - v) * f : v * (1 + f));
  return toHex(t(r), t(g), t(b));
}
export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hex(a), [r2, g2, b2] = hex(b);
  return toHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

/** Adds a 1px outline around every opaque pixel (4-neighbourhood). */
export function outline(c: HTMLCanvasElement, color: string): void {
  const g = c.getContext('2d', { willReadFrequently: true })!;
  const w = c.width, h = c.height;
  const img = g.getImageData(0, 0, w, h), d = img.data;
  const [r, gg, b] = hex(color);
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && (d[(y * w + x) * 4 + 3] ?? 0) > 96;
  const marks: number[] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (solid(x, y)) continue;
    if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) marks.push(y * w + x);
  }
  for (const i of marks) { d[i * 4] = r; d[i * 4 + 1] = gg; d[i * 4 + 2] = b; d[i * 4 + 3] = 255; }
  g.putImageData(img, 0, 0);
}

export function mirror(src: HTMLCanvasElement): HTMLCanvasElement {
  const { c, g } = makeCanvas(src.width, src.height);
  g.translate(src.width, 0); g.scale(-1, 1); g.drawImage(src, 0, 0);
  return c;
}

export function hash2(x: number, y: number, s = 0): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
export function rng(seed: number): () => number {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

export function sprite(w: number, h: number, ax: number, ay: number, paint: (g: Ctx) => void, line: string | null = null, post: ((g: Ctx) => void) | null = null): Sprite {
  const { c, g } = makeCanvas(w, h);
  paint(g);
  if (line) outline(c, line);
  if (post) post(g);
  return { c, ax, ay };
}

// 3x5 pixel font for signs (uppercase, digits).
const GLYPHS: Record<string, string> = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
  F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010',
  K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010',
  P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010',
  Z: '111001010100111', '0': '111101101101111', '1': '010110010010111', '2': '110001010100111', '3': '110001010001110',
  '4': '101101111001001', '5': '111100110001110', '6': '011100111101111', '7': '111001010010010', '8': '111101111101111',
  '9': '111101111001110', ' ': '000000000000000', '+': '000010111010000', '.': '000000000000010', '-': '000000111000000',
};
export function textWidth(text: string): number { return Math.max(0, text.length * 4 - 1); }
export function pixelText(g: Ctx, text: string, x: number, y: number, color: string, scale = 1): void {
  g.fillStyle = color;
  let cx = Math.round(x);
  for (const ch of text.toUpperCase()) {
    const glyph = GLYPHS[ch] ?? GLYPHS[' ']!;
    for (let i = 0; i < 15; i++) if (glyph[i] === '1') g.fillRect(cx + (i % 3) * scale, Math.round(y) + Math.floor(i / 3) * scale, scale, scale);
    cx += 4 * scale;
  }
}

// Wordmark of the fictional Jin-U convenience store (game-original lettering): Hangul 진 + U, 13x8 px.
const JIN = ['1111101', '0010001', '0101001', '1000101', '0000001', '0100000', '0100000', '0111110'];
const BIG_U = ['1001', '1001', '1001', '1001', '1001', '1001', '1001', '0110'];
export const JINU_WIDTH = 13;
export function jinU(g: Ctx, x: number, y: number, color: string): void {
  g.fillStyle = color;
  const X = Math.round(x), Y = Math.round(y);
  JIN.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === '1') g.fillRect(X + i, Y + j, 1, 1); });
  BIG_U.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === '1') g.fillRect(X + 9 + i, Y + j, 1, 1); });
}
