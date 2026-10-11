import { furniture } from '../domain/life';
import { ellipse, pixelText, px, rect, shade, sprite, type Ctx, type Sprite } from './pixel';

const LINE = '#514151', WOOD = '#b98861', HI = '#e0ba8b', DARK = '#79563f', PAPER = '#f2eddc';
const cache = new Map<string, Sprite>();
function board(g: Ctx, x: number, y: number, w: number, h: number): void { rect(g, x, y, w, h, WOOD); rect(g, x, y, w, 1, HI); rect(g, x + w - 2, y + 1, 2, h - 1, DARK); }
function legs(g: Ctx, x: number, y: number, w: number, h: number): void { for (const lx of [x + 1, x + w - 3]) { rect(g, lx, y, 2, h, DARK); px(g, lx, y, HI); } }
function cushion(g: Ctx, x: number, y: number, w: number, h: number, c: string): void { rect(g, x, y, w, h, c); rect(g, x + 1, y, w - 2, 1, shade(c, .35)); rect(g, x, y + h - 2, w, 2, shade(c, -.2)); }

/** Every item has its own silhouette; rotation changes its 16px footprint, never fractional pixels. */
export function furnitureSprite(id: string, rotated = false): Sprite {
  const key = id + ':' + rotated; const found = cache.get(key); if (found) return found;
  const def = furniture.find(f => f.id === id); if (!def) throw new Error('Unknown furniture art: ' + id);
  const w = (rotated ? def.h : def.w) * 16, h = (rotated ? def.w : def.h) * 16, top = 26;
  const result = sprite(w + 4, h + top + 3, Math.floor(w / 2) + 2, h + top + 1, g => {
    const x = 2, y = top, bottom = y + h, cx = x + w / 2;
    if (id === 'rug') {
      rect(g, x, y + 1, w, h - 2, '#657f93'); rect(g, x + 2, y + 3, w - 4, h - 6, '#a8c7ca'); rect(g, x + 4, y + 5, w - 8, h - 10, '#6f96a1');
      for (let yy = y + 7; yy < bottom - 5; yy += 5) for (let xx = x + 6; xx < x + w - 4; xx += 6) { px(g, xx, yy, '#e7d8b8'); px(g, xx + 1, yy + 1, '#e7d8b8'); }
      for (let xx = x + 1; xx < x + w; xx += 3) { px(g, xx, y, '#d3ccbc'); px(g, xx, bottom - 1, '#d3ccbc'); } return;
    }
    if (id === 'bed') {
      board(g, x + 1, y, w - 2, h - 2); legs(g, x + 1, bottom - 4, w - 2, 4);
      if (rotated) { board(g, x, y - 8, 6, h + 5); cushion(g, x + 6, y - 2, w - 8, h - 5, '#82a6b4'); cushion(g, x + 7, y - 4, 9, h - 9, PAPER); rect(g, x + 20, y - 2, 2, h - 5, '#d8e6de'); }
      else { board(g, x + 1, y - 12, w - 2, 12); cushion(g, x + 3, y - 2, w - 6, h - 7, '#82a6b4'); cushion(g, x + 5, y - 4, w - 10, 10, PAPER); rect(g, x + 3, y + 10, w - 6, 2, '#d8e6de'); }
    } else if (id === 'wardrobe') {
      board(g, x + 1, y - 22, w - 2, h + 20); rect(g, cx, y - 20, 1, h + 16, DARK); rect(g, x + 3, y - 19, w - 7, 1, '#c9a17b'); for (const k of [-2, 2]) rect(g, cx + k, y - 5, 1, 4, '#eac47d'); legs(g, x + 1, bottom - 3, w - 2, 3);
    } else if (id === 'desk') {
      legs(g, x + 1, y + 3, w - 2, h - 4); board(g, x, y - 5, w, h - 4); rect(g, x + 2, y - 2, Math.max(7, w - 13), 6, PAPER); rect(g, x + 4, y, Math.max(4, w - 18), 1, '#949cac'); rect(g, x + w - 9, y - 12, 7, 9, '#415e6e'); rect(g, x + w - 8, y - 11, 5, 6, '#acd4d4'); px(g, x + w - 7, y - 9, '#edf6ee');
    } else if (id === 'chair') {
      legs(g, x + 2, y + 6, w - 4, h - 7); board(g, x + 2, y - 13, w - 4, 15); rect(g, x + 4, y - 11, 1, 9, HI); rect(g, x + 9, y - 11, 1, 9, HI); cushion(g, x + 1, y + 2, w - 2, 6, '#d3a077');
    } else if (id === 'nightstand') {
      board(g, x + 1, y - 5, w - 2, h + 2); rect(g, x + 3, y + 2, w - 6, 1, DARK); px(g, cx, y + 5, '#ebc482'); rect(g, x + 5, y - 9, 5, 4, '#f3e8c9'); px(g, x + 10, y - 8, '#f3e8c9');
    } else if (id === 'dresser') {
      board(g, x + 1, y - 15, w - 2, h + 12); for (let yy = y - 9; yy < bottom - 4; yy += 7) { rect(g, x + 3, yy, w - 6, 1, DARK); rect(g, cx - 2, yy + 3, 4, 1, '#ecc68a'); } board(g, x, y - 17, w, 3);
    } else if (id === 'bookcase') {
      board(g, x + 1, y - 22, w - 2, h + 19); rect(g, x + 3, y - 20, w - 6, h + 15, DARK);
      for (const yy of [y - 19, y - 7, y + 5]) { for (let xx = x + 4; xx < x + w - 5; xx += 4) { const c = ['#b95e65', '#6e92b1', '#d4b968', '#7b9f80'][Math.floor((xx + yy) / 4) & 3]!; rect(g, xx, yy, 3, 8, c); px(g, xx + 1, yy + 2, PAPER); } rect(g, x + 3, yy + 9, w - 6, 2, HI); }
    } else if (id === 'plant') {
      rect(g, x + 4, y + 6, w - 8, h - 8, '#bb7e64'); rect(g, x + 3, y + 4, w - 6, 3, '#dc9e7f'); rect(g, cx, y - 13, 1, 17, '#58765a'); for (const [dx, dy] of [[-4, -8], [4, -13], [-3, -17], [4, -3]]) { ellipse(g, cx + dx!, y + dy!, 4, 3, '#709666'); px(g, cx + dx! - 1, y + dy! - 1, '#aaca89'); }
    } else if (id === 'lamp') {
      ellipse(g, cx, bottom - 3, 6, 2, '#586278'); rect(g, cx - 1, y - 15, 2, h + 11, '#8b8290'); rect(g, x + 3, y - 22, w - 6, 8, '#efdbab'); rect(g, x + 1, y - 14, w - 2, 2, '#bd9e74'); px(g, cx + 2, y - 19, '#fff3d0');
    } else if (id === 'sofa') {
      cushion(g, x + 2, y - 15, w - 4, h + 9, '#6e8f9e'); cushion(g, x + 4, y + 1, w - 8, h - 7, '#89acb4'); cushion(g, x, y - 7, 5, h + 2, '#557a89'); cushion(g, x + w - 5, y - 7, 5, h + 2, '#557a89'); cushion(g, x + 7, y - 10, Math.min(8, w - 12), 7, '#e9c696'); legs(g, x + 1, bottom - 3, w - 2, 3);
    } else if (id === 'lowtable') {
      legs(g, x + 1, y + 4, w - 2, h - 6); board(g, x, y - 3, w, h - 3); rect(g, x + 5, y, 8, 5, PAPER); rect(g, x + 7, y + 1, 4, 1, '#708b9e'); ellipse(g, x + w - 7, y + 3, 3, 2, '#e6b677');
    } else if (id === 'poster' || id === 'frame' || id === 'noticeboard') {
      legs(g, x + 1, y + 2, w - 2, h - 3); board(g, x, y - 20, w, 23); rect(g, x + 2, y - 18, w - 4, 18, id === 'poster' ? '#3a537c' : id === 'frame' ? PAPER : '#bba184');
      if (id === 'poster') { for (const [dx, dy] of [[3, 1], [8, 6], [4, 11], [11, 13]]) { px(g, x + dx!, y - 16 + dy!, '#efdb9a'); px(g, x + dx! + 1, y - 16 + dy!, '#efdb9a'); } } else if (id === 'frame') { rect(g, x + 4, y - 16, w - 8, 2, '#5c6270'); for (let yy = y - 11; yy < y - 2; yy += 3) rect(g, x + 4, yy, w - 8, 1, '#adb0ae'); } else { for (const [dx, dy, c] of [[4, -16, '#f3dfa5'], [Math.max(5, w - 13), -9, '#c5e1d5']]) { rect(g, x + (dx as number), y + (dy as number), 8, 6, c as string); px(g, x + (dx as number) + 4, y + (dy as number), '#b96462'); } }
    } else if (id === 'clock') {
      rect(g, cx - 1, y - 6, 2, h + 3, DARK); ellipse(g, cx, y - 14, 7, 7, '#9c7b67'); ellipse(g, cx, y - 14, 5, 5, PAPER); rect(g, cx, y - 18, 1, 5, '#59606d'); rect(g, cx, y - 14, 3, 1, '#b87165'); ellipse(g, cx, bottom - 2, 5, 1, '#806761');
    } else if (id === 'trophy') {
      board(g, x + 2, y + 4, w - 4, h - 5); rect(g, cx - 1, y - 7, 2, 12, '#bc8b3f'); rect(g, x + 4, y - 19, w - 8, 10, '#e3b957'); rect(g, x + 3, y - 19, w - 6, 2, '#f5db82'); rect(g, x + 1, y - 16, 2, 7, '#bd903c'); rect(g, x + w - 3, y - 16, 2, 7, '#bd903c'); rect(g, x + 4, y, w - 8, 3, '#e3b957');
    } else if (id === 'bin') {
      rect(g, x + 3, y - 8, w - 6, h + 5, '#81989a'); rect(g, x + 2, y - 10, w - 4, 3, '#bad0c6'); rect(g, x + 5, y - 7, 1, h + 4, '#a9bfba'); pixelText(g, '+', x + 7, y - 2, PAPER);
    } else if (id === 'screen') {
      for (let xx = x + 1; xx < x + w - 2; xx += 10) { board(g, xx, y - 22 + ((xx - x) % 3), 9, h + 19); rect(g, xx + 2, y - 19, 5, h + 12, '#dcc8ac'); rect(g, xx + 3, y - 18, 1, h + 10, PAPER); } legs(g, x, bottom - 3, w, 3);
    } else if (id === 'mirror') {
      legs(g, x + 2, y + 3, w - 4, h - 4); board(g, x + 1, y - 23, w - 2, 27); rect(g, x + 3, y - 21, w - 6, 23, '#a2cbd3'); rect(g, x + 4, y - 19, 1, 15, '#deedef'); for (let k = 0; k < 7; k++) px(g, x + 5 + k % 5, y - 17 + k, '#d6e8e8');
    } else if (id === 'shoerack') {
      board(g, x + 1, y - 12, w - 2, h + 9); for (const yy of [y - 7, y + 3]) { rect(g, x + 3, yy + 6, w - 6, 2, HI); for (let xx = x + 4; xx < x + w - 4; xx += 8) { rect(g, xx, yy + 3, 6, 3, '#586578'); px(g, xx + 5, yy + 2, '#a1adbb'); } }
    } else if (id === 'coatrack') {
      rect(g, cx - 1, y - 22, 2, h + 18, DARK); ellipse(g, cx, bottom - 3, 6, 2, DARK); rect(g, x + 2, y - 17, w - 4, 2, HI); rect(g, x + 2, y - 14, 6, 14, '#598592'); rect(g, x + 8, y - 14, 5, 10, '#d6b083');
    } else if (id === 'diningtable') {
      rect(g, cx - 1, y + 5, 2, h - 7, DARK); ellipse(g, cx, bottom - 3, Math.max(4, w / 4), 2, DARK); ellipse(g, cx, y + 5, w / 2 - 1, Math.max(4, h / 3), WOOD); ellipse(g, cx, y + 3, w / 2 - 2, Math.max(3, h / 3 - 1), HI); ellipse(g, cx, y + 3, 5, 3, PAPER); ellipse(g, cx, y + 3, 2, 1, '#b97c65');
    } else if (id === 'stool') {
      legs(g, x + 2, y + 6, w - 4, h - 7); cushion(g, x + 1, y + 2, w - 2, 6, '#c08b83'); rect(g, x + 4, y + 10, w - 8, 1, DARK);
    }
  }, id === 'rug' ? null : LINE);
  cache.set(key, result); return result;
}

export const furnitureFrame = (id: string, rotated = false): HTMLCanvasElement => furnitureSprite(id, rotated).c;
