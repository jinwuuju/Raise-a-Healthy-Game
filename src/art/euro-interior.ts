/** Video-derived materials and furniture (D092). No photographed people, logos or screen contents. */
import { rect, ellipse, px, sprite, hash2, pixelText, type Ctx, type Sprite } from './pixel';
import { T, tileAt, type Room } from '../world/rooms';
const ink = '#4c5255';
export function euroProp(kind: string, v = 0): Sprite | null {
  if (kind === 'benchdesk' || kind === 'shortbench' || kind === 'editorbench' || kind === 'longbench') {
    // longbench (D094): one shared double desk, six monitors per side, seats 32px apart.
    const w = kind === 'shortbench' ? 76 : kind === 'longbench' ? 200 : 140, facing = kind !== 'editorbench';
    const seats = w < 100 ? [22, 54] : w > 160 ? [20, 52, 84, 116, 148, 180] : [22, 70, 118];
    return sprite(w, 72, w / 2, 71, g => {
      rect(g, 4, 58, 3, 13, '#b4bdb9'); rect(g, w - 7, 58, 3, 13, '#b4bdb9'); if (w > 160) rect(g, w / 2 - 1, 58, 3, 13, '#b4bdb9');
      rect(g, 0, facing ? 24 : 34, w, facing ? 35 : 25, '#f2f1e9');
      rect(g, 0, facing ? 24 : 34, w, 2, '#ffffff'); rect(g, 0, 59, w, 3, '#bac1b9');
      if (facing) rect(g, 1, 40, w - 2, 1, '#b8bfba'); // Two joined desks share one central seam.
      for (const x of seats) {
        if (facing) {
          rect(g, x - 10, 9, 20, 13, '#4c5759'); rect(g, x - 8, 11, 16, 9, '#6f7c7a');
          rect(g, x - 1, 22, 2, 5, '#919c98'); rect(g, x - 6, 27, 12, 1, '#87938e');
          rect(g, x - 9, 30, 18, 2, '#b4beb7');
        }
        rect(g, x - 10, 34, 20, 13, '#35474d'); rect(g, x - 8, 36, 16, 9, '#71969a');
        rect(g, x - 7, 37, 11, 1, '#bad0ca'); rect(g, x - 1, 47, 2, 4, '#8d9b96');
        rect(g, x - 6, 51, 12, 1, '#8d9b96'); rect(g, x - 9, 55, 18, 2, '#bec8c0');
      }
    }, ink);
  }
  if (kind === 'lobbytable') return sprite(76, 44, 38, 43, g => {
    rect(g, 35, 21, 6, 17, '#d6c4a5'); ellipse(g, 38, 40, 13, 3, '#c9b697');
    ellipse(g, 38, 16, 36, 13, '#dacdb4'); ellipse(g, 38, 13, 36, 12, '#fff6df');
    rect(g, 27, 8, 15, 7, '#e8dec7'); rect(g, 29, 10, 10, 1, '#bf9e70');
  }, '#807567');
  if (kind === 'lobbysofa') return sprite(58, 32, 29, 31, g => {
    // Back along the top, seat opens toward the bottom entrance.
    rect(g, 4, 2, 50, 12, '#aba08a'); rect(g, 5, 3, 48, 2, '#d3c5ab');
    rect(g, 1, 9, 7, 16, '#978b75'); rect(g, 50, 9, 7, 16, '#978b75');
    rect(g, 8, 15, 42, 8, '#c7b99e'); rect(g, 28, 15, 1, 8, '#a89980');
    rect(g, 5, 24, 48, 4, '#8e806c'); rect(g, 5, 28, 3, 3, '#b58c52'); rect(g, 50, 28, 3, 3, '#b58c52');
  }, '#6c6458');
  if (kind === 'lobbyplant') return sprite(42, 68, 21, 67, g => {
    ellipse(g, 21, 64, 13, 3, '#aa8b59'); rect(g, 9, 46, 24, 17, '#ded0ac'); rect(g, 9, 46, 3, 16, '#f9ebc7');
    rect(g, 29, 48, 4, 15, '#bdab85'); ellipse(g, 21, 46, 13, 4, '#f3e4bf'); ellipse(g, 21, 46, 10, 2, '#8f7850');
    for (const dx of [-9, -4, 2, 8]) rect(g, 20 + dx, 17, 1, 29, '#7b8350');
    for (const [x,y,rx,ry] of [[21,9,6,8],[10,18,8,5],[31,18,8,5],[6,30,6,4],[35,30,6,4],[14,31,8,6],[27,30,8,6],[21,21,6,9]]) {
      ellipse(g,x!,y!,rx!,ry!,'#7c9252'); ellipse(g,x!-1,y!-2,rx!-1,ry!-1,'#acb96d'); px(g,x!-2,y!-3,'#d3d591');
    }
  }, '#646b43');
  if (kind === 'reception-side') return sprite(28, 96, 14, 95, g => {
    rect(g, 3, 4, 22, 89, '#c5c7bd'); rect(g, 3, 4, 22, 76, '#f1efe5');
    rect(g, 3, 4, 2, 76, '#ffffff'); rect(g, 23, 5, 2, 88, '#9eaaa4');
    rect(g, 5, 81, 18, 1, '#aeb7b0'); rect(g, 6, 20, 11, 15, '#444e52'); rect(g, 7, 22, 8, 11, '#6c9298');
    rect(g, 9, 52, 10, 7, '#ffffff'); rect(g, 10, 54, 7, 1, '#b5bfbc');
  }, ink);
  if (kind === 'sofa-side') return sprite(24, 60, 12, 59, g => {
    rect(g, 2, 2, 7, 51, '#929c98'); rect(g, 3, 3, 3, 48, '#c0c6c0');
    rect(g, 9, 6, 12, 44, '#b6bfb9'); rect(g, 9, 27, 12, 1, '#929c98');
    rect(g, 7, 2, 16, 5, '#a3ada8'); rect(g, 7, 49, 16, 5, '#a3ada8');
    rect(g, 6, 54, 3, 4, '#b09263'); rect(g, 19, 54, 3, 4, '#b09263');
  }, ink);
  if (kind === 'eurodesk' || kind === 'euroeditor') {
    const w = kind === 'euroeditor' ? 68 : 52;
    return sprite(w, 34, w / 2, 33, g => {
      rect(g, 3, 24, 3, 9, '#c6cac8'); rect(g, w - 6, 24, 3, 9, '#c6cac8');
      rect(g, 0, 16, w, 9, '#e7e8e0'); rect(g, 1, 16, w - 2, 2, '#ffffff'); rect(g, 0, 25, w, 2, '#b7bbb5');
      rect(g, 17, 1, 22, 14, '#343c40'); rect(g, 19, 3, 18, 10, '#52616a'); rect(g, 20, 4, 12, 1, '#8097a0');
      rect(g, 27, 15, 2, 4, '#626b6f'); rect(g, 23, 19, 10, 1, '#697477');
      rect(g, 17, 21, 19, 2, '#a8afaf'); rect(g, 5, 19, 8, 4, '#fafbf6'); px(g, 7, 20, '#acb5b2');
      rect(g, w - 9, 14, 4, 6, '#b1bfbc'); rect(g, w - 9, 14, 4, 1, '#e4eeeb');
    }, ink);
  }
  if (kind === 'officechair' && v === 1) return sprite(18, 25, 9, 24, g => {
    rect(g, 3, 4, 12, 7, '#cbd2cc'); rect(g, 1, 5, 3, 7, '#8e9b95'); rect(g, 14, 5, 3, 7, '#8e9b95');
    rect(g, 3, 12, 12, 8, '#949f9a'); rect(g, 4, 13, 10, 6, '#b5c0b8');
    rect(g, 8, 20, 2, 3, '#84918a'); rect(g, 3, 23, 12, 1, '#b7c3bb'); px(g, 2, 24, ink); px(g, 14, 24, ink);
  }, ink);
  if (kind === 'officechair') return sprite(18, 25, 9, 24, g => {
    rect(g, 3, 1, 12, 11, '#a3aaa9'); rect(g, 4, 2, 10, 8, '#d0d4d0');
    for (let y = 3; y < 10; y += 2) rect(g, 5, y, 8, 1, '#b2bbb6');
    rect(g, 2, 13, 14, 4, '#c7ceca'); rect(g, 0, 11, 3, 5, '#858e8c'); rect(g, 15, 11, 3, 5, '#858e8c');
    rect(g, 8, 17, 2, 5, '#929b99'); rect(g, 3, 22, 12, 1, '#bcc2c0'); px(g, 2, 23, ink); px(g, 14, 23, ink); px(g, 8, 24, ink);
  }, ink);
  if (kind === 'cabinet') return sprite(50, 30, 25, 29, g => {
    rect(g, 1, 1, 48, 27, '#e7e9e4'); rect(g, 1, 1, 48, 3, '#ffffff'); rect(g, 25, 5, 1, 22, '#bcc2be');
    rect(g, 21, 10, 1, 6, '#909a96'); rect(g, 29, 10, 1, 6, '#909a96'); rect(g, 2, 28, 46, 1, '#a1aaa5');
  }, ink);
  if (kind === 'greysofa') return sprite(52, 28, 26, 27, g => {
    rect(g, 3, 2, 46, 13, '#a3aaa8'); rect(g, 4, 3, 44, 2, '#c1c7c2');
    rect(g, 1, 9, 7, 15, '#838d8c'); rect(g, 44, 9, 7, 15, '#838d8c');
    rect(g, 8, 15, 36, 7, '#b4bcb8'); rect(g, 25, 15, 1, 7, '#929c97');
    rect(g, 4, 24, 3, 3, '#a98a60'); rect(g, 45, 24, 3, 3, '#a98a60');
  }, ink);
  if (kind === 'whitetable') return sprite(40, 24, 20, 23, g => {
    rect(g, 18, 11, 4, 9, '#c8cec9'); ellipse(g, 20, 21, 8, 2, '#bfc7c3');
    ellipse(g, 20, 9, 19, 7, '#cbd0cb'); ellipse(g, 20, 7, 19, 6, '#fafbf6');
    rect(g, 11, 5, 9, 4, '#d1dedb'); rect(g, 13, 6, 5, 1, '#759fa5');
  }, ink);
  if (kind === 'longtable') return longTable(92);
  if (kind === 'tallchair') return sprite(14, 25, 7, 24, g => {
    rect(g, 1, 1, 12, 3, '#dfc395'); rect(g, 2, 3, 2, 10, '#bc9b69'); rect(g, 10, 3, 2, 10, '#bc9b69');
    rect(g, 1, 12, 12, 3, '#e3c99c'); rect(g, 2, 15, 2, 9, '#bc9b69'); rect(g, 10, 15, 2, 9, '#bc9b69'); rect(g, 3, 21, 8, 1, '#ac8b59');
  }, '#756954');
  if (kind === 'pantry') return sprite(92, 40, 46, 39, g => {
    rect(g, 0, 18, 92, 20, '#858d8c'); rect(g, 0, 17, 92, 3, '#c8cfca');
    for (let x = 0; x < 92; x += 23) { rect(g, x, 21, 1, 17, '#606c6b'); rect(g, x + 8, 23, 7, 1, '#454f51'); }
    rect(g, 7, 4, 19, 13, '#424e50'); rect(g, 8, 6, 17, 2, '#7d8c8b'); rect(g, 12, 12, 4, 5, '#fafaf2');
    rect(g, 52, 13, 23, 4, '#c3d0cc'); rect(g, 65, 7, 2, 7, '#afbdb8'); rect(g, 59, 7, 7, 2, '#c7d2cd');
  }, ink);
  if (kind === 'meettable') return sprite(116, 40, 58, 39, g => {
    for (const x of [6, 107]) rect(g, x, 30, 3, 9, '#6b7174');
    rect(g, 0, 6, 116, 23, '#e9e6dc'); rect(g, 1, 6, 114, 2, '#ffffff'); rect(g, 0, 29, 116, 3, '#b9b5aa');
    rect(g, 8, 12, 100, 1, '#dcd8cc');
    rect(g, 44, 12, 15, 10, '#7d878a'); rect(g, 45, 13, 13, 7, '#c4d0d2'); rect(g, 46, 14, 7, 1, '#e8f0f0');
    rect(g, 72, 15, 9, 7, '#fbfaf5'); rect(g, 24, 17, 8, 6, '#fbfaf5'); rect(g, 92, 13, 4, 4, '#d9c7a0');
  }, '#6f6a60');
  if (kind === 'meetchair') {
    // v: 0 orange / 1 green facing down (back to the wall side), 2 orange / 3 green facing up.
    const [c0, hi, lo] = v % 2 ? ['#5ea55f', '#8fcf88', '#3f7a44'] : ['#e3893f', '#f4b26f', '#b8652a'];
    return sprite(16, 22, 8, 21, g => {
      if (v < 2) { rect(g, 2, 1, 12, 9, c0); rect(g, 3, 2, 10, 2, hi); rect(g, 2, 9, 12, 2, lo); rect(g, 1, 10, 14, 6, c0); rect(g, 2, 11, 12, 1, hi); rect(g, 1, 16, 14, 1, lo); }
      else { rect(g, 1, 3, 14, 6, c0); rect(g, 2, 4, 12, 1, hi); rect(g, 2, 9, 12, 8, c0); rect(g, 3, 10, 10, 2, hi); rect(g, 2, 16, 12, 2, lo); }
      rect(g, 7, 17, 2, 2, '#5d6366'); rect(g, 3, 19, 10, 1, '#7c8386'); px(g, 2, 20, ink); px(g, 13, 20, ink);
    }, ink);
  }
  if (kind === 'sidescreen') return sprite(12, 62, 6, 61, g => {
    // Large display mounted flush on the room's left wall, its face turned into the room (D095: no gap, no bracket).
    for (let x = 0; x <= 10; x++) { const t = x / 10, top = Math.round(4 + 5 * t), bot = Math.round(46 + 5 * t); rect(g, x, top, 1, bot - top, x === 0 || x === 10 ? '#1c2226' : '#2b3640'); }
    for (let x = 2; x <= 8; x++) { const t = x / 10, top = Math.round(7 + 5 * t), bot = Math.round(43 + 5 * t); rect(g, x, top, 1, bot - top, '#35566b'); }
    for (let i = 0; i < 6; i++) px(g, 3 + i, 12 + i * 3 + Math.round(i / 2), '#8fb9cc');
  }, ink);
  if (kind === 'windowdesk') return sprite(34, 72, 17, 71, g => {
    // Desk against the window wall; its two users face the window, monitors turned toward them.
    rect(g, 2, 8, 28, 56, '#f2f1e9'); rect(g, 2, 8, 28, 2, '#ffffff'); rect(g, 28, 8, 2, 56, '#c9cdc6'); rect(g, 2, 64, 28, 3, '#bac1b9');
    rect(g, 4, 67, 3, 4, '#b4bdb9'); rect(g, 25, 67, 3, 4, '#b4bdb9'); rect(g, 2, 38, 28, 1, '#d8dbd4');
    for (const y of [12, 44]) { rect(g, 5, y, 7, 16, '#35474d'); rect(g, 7, y + 2, 5, 12, '#71969a'); rect(g, 8, y + 3, 3, 1, '#bad0ca'); rect(g, 12, y + 6, 3, 2, '#8d9b96'); rect(g, 16, y + 5, 8, 3, '#bec8c0'); }
  }, ink);
  if (kind === 'sidechair') {
    // Seen from the side, facing left (toward a wall desk). v 0 grey office chair, v 1 wooden stool-chair.
    const [c0, hi, lo] = v === 1 ? ['#c99a5e', '#e3c08a', '#9a7240'] : ['#a3aaa9', '#d0d4d0', '#7f8886'];
    return sprite(16, 24, 8, 23, g => {
      rect(g, 11, 2, 4, 13, c0); rect(g, 12, 3, 2, 10, hi); rect(g, 2, 12, 12, 4, c0); rect(g, 2, 12, 12, 1, hi); rect(g, 2, 16, 12, 1, lo);
      if (v === 1) { rect(g, 3, 17, 2, 6, lo); rect(g, 11, 17, 2, 6, lo); rect(g, 3, 20, 10, 1, lo); }
      else { rect(g, 7, 17, 2, 4, '#7c8386'); rect(g, 3, 21, 10, 1, '#7c8386'); px(g, 2, 22, ink); px(g, 13, 22, ink); }
    }, ink);
  }
  if (kind === 'walldesk') return sprite(30, 104, 15, 103, g => {
    // One long single-row wooden desk along the lounge's left wall.
    rect(g, 2, 4, 24, 92, '#d6ae70'); rect(g, 2, 4, 24, 2, '#f0d09a'); rect(g, 24, 4, 2, 92, '#a77e4c');
    for (let y = 10; y < 94; y += 6) rect(g, 3, y, 20, 1, '#cba36a');
    rect(g, 2, 96, 24, 3, '#a77e4c'); rect(g, 4, 99, 2, 4, '#404849'); rect(g, 22, 99, 2, 4, '#404849');
    rect(g, 8, 22, 9, 6, '#f4efe2'); rect(g, 7, 60, 7, 5, '#8c724d'); rect(g, 9, 84, 8, 5, '#f4efe2');
  }, '#756954');
  if (kind === 'bigtable') return longTable(192);
  if (kind === 'counterbar') return sprite(240, 34, 120, 33, g => {
    rect(g, 0, 4, 240, 18, '#dcbb84'); rect(g, 0, 4, 240, 2, '#f2d7a6');
    for (let x = 8; x < 240; x += 24) rect(g, x, 8, 1, 12, '#cfac74');
    rect(g, 0, 22, 240, 10, '#7d8584'); rect(g, 0, 22, 240, 1, '#a9b1b0'); for (let x = 0; x < 240; x += 40) rect(g, x, 23, 1, 9, '#5f6867');
    rect(g, 30, 9, 10, 6, '#fbfaf5'); rect(g, 120, 10, 6, 6, '#e8e2d2'); rect(g, 190, 9, 12, 5, '#c6d4d0');
  }, ink);
  if (kind === 'bigsofa') {
    const c = '#a49b8c', hi = '#c8bfae', lo = '#7f776a', foot = '#6b5a45';
    if (v === 1) return sprite(100, 38, 50, 37, g => {
      // Against the bottom wall: seat behind, backrest toward the viewer.
      rect(g, 6, 4, 88, 14, c); rect(g, 6, 4, 88, 2, hi); rect(g, 49, 4, 1, 14, lo);
      rect(g, 0, 2, 8, 30, lo); rect(g, 92, 2, 8, 30, lo); rect(g, 1, 3, 6, 2, hi); rect(g, 93, 3, 6, 2, hi);
      rect(g, 4, 16, 92, 18, '#8e8576'); rect(g, 4, 16, 92, 2, hi); rect(g, 49, 18, 1, 16, lo);
      rect(g, 6, 34, 3, 3, foot); rect(g, 91, 34, 3, 3, foot);
    }, '#5f574c');
    return sprite(32, 76, 16, 75, g => {
      // Against the left wall: backrest on the wall side, seat opening into the room.
      rect(g, 2, 4, 8, 66, lo); rect(g, 3, 5, 5, 62, c);
      rect(g, 10, 10, 18, 56, c); rect(g, 10, 10, 18, 2, hi); rect(g, 10, 37, 18, 1, lo);
      rect(g, 6, 2, 24, 9, lo); rect(g, 6, 64, 24, 9, lo); rect(g, 7, 3, 22, 2, hi); rect(g, 7, 65, 22, 2, hi);
      rect(g, 8, 73, 3, 2, foot); rect(g, 24, 73, 3, 2, foot);
    }, '#5f574c');
  }
  if (kind === 'loungetable') return sprite(52, 30, 26, 29, g => {
    ellipse(g, 26, 26, 18, 3, 'rgba(0,0,0,0.15)'); rect(g, 24, 14, 4, 11, '#6b5a45');
    ellipse(g, 26, 12, 25, 9, '#bfa27a'); ellipse(g, 26, 10, 25, 8, '#e9d6b4');
    rect(g, 14, 7, 9, 4, '#fbfaf5'); ellipse(g, 36, 10, 3, 2, '#7aa0a6'); px(g, 35, 9, '#cfe2e4');
  }, '#6c6458');
  return null;
}

export function euroArchitecture(g: Ctx, room: Room): void {
  const kind = room.interior!.reference, W = room.cols * 16, H = room.rows * 16;
  if (kind === 'floor4') return floor4Art(g, room, W, H);
  if (kind === 'lifthall') return liftHallArt(g, W, H);
  // Keep the same cutaway convention as the rest of the game, but use the filmed neutral materials.
  rect(g, 16, 4, W - 32, 42, kind === 'lift' ? '#9aa4a6' : '#e0e1d9');
  if (kind === 'lift') {
    for (let x = 18; x < W - 18; x += 2) rect(g, x, 5, 1, 40, '#8e989b');
    rect(g, 35, 8, 90, 28, '#b8cdcf'); rect(g, 37, 10, 86, 24, '#cedbd9');
    rect(g, 20, 37, W - 40, 2, '#e1e5dd');
    rect(g, 126, 62, 12, 36, '#bbc4c3'); rect(g, 128, 64, 8, 7, '#3c555b');
    for (const y of [77, 85, 93]) { ellipse(g, 132, y, 2, 2, '#e2e5dc'); px(g, 132, y, '#dba74d'); }
  } else if (kind === 'lobby') {
    // Sketch orientation is preserved: recess to the left, glazing to the right.
    rect(g, 112, 48, 16, 128, '#c7ad87'); rect(g, 112, 46, 16, 3, '#ffe4b8');
    rect(g, 0, 256, 128, H - 256, '#c8ac83'); rect(g, 0, 254, 128, 3, '#ffe1ac');
    rect(g, 121, 268, 7, 46, '#46575a'); rect(g, 123, 271, 4, 39, '#a7cec2');
    // D094: opening in the back wall of the left recess into the separate lift hall (lit passage, lowered ceiling).
    rect(g, 30, 4, 52, 44, '#7b6a55'); rect(g, 34, 8, 44, 40, '#efe2c6'); rect(g, 34, 8, 44, 9, '#b49d7c');
    for (const x of [42, 70]) ellipse(g, x, 13, 3, 1, '#fff2cf');
    rect(g, 34, 30, 44, 18, '#e6d3ae'); rect(g, 50, 22, 12, 7, '#8f989b'); rect(g, 52, 23, 8, 6, '#b9c2c4'); rect(g, 55, 23, 1, 6, '#5b6366');
    rect(g, 52, 9, 9, 9, '#4a4036'); rect(g, 56, 10, 1, 1, '#ffb347'); rect(g, 55, 11, 3, 1, '#ffb347'); rect(g, 54, 12, 5, 1, '#ffb347');
    rect(g, 54, 14, 5, 1, '#f3e3c0'); rect(g, 55, 15, 3, 1, '#f3e3c0'); rect(g, 56, 16, 1, 1, '#f3e3c0');
    glass(g, W - 16, 80, 16, 160);
    // Rear door and restroom door are closed; their unseen rooms are not invented.
    rect(g, 244, 8, 56, 38, '#a5b9b3'); rect(g, 247, 11, 50, 31, '#d1ded6');
    rect(g, 89, 12, 21, 34, '#a6ada4'); rect(g, 92, 15, 15, 28, '#d1d4c8'); px(g, 104, 31, '#647773');
  } else {
    for (const d of room.interior!.decor.filter(d => d.kind === 'window')) {
      rect(g, d.x, 8, d.w, 27, '#8b9b9c'); rect(g, d.x + 1, 9, d.w - 2, 25, '#c6d9d7');
      for (let y = 9; y < 29; y += 2) rect(g, d.x + 1, y, d.w - 2, 1, '#e4e7df');
      rect(g, d.x, 34, d.w, 2, '#a6b2ae');
    }
  }
  if (kind === 'lounge') {
    rect(g, 20, 8, 190, 5, '#5d5a53');
    for (const x of [35, 75, 115, 155, 195]) { rect(g, x, 13, 2, 10, '#5d5a53'); rect(g, x - 2, 23, 6, 3, '#ead9b0'); }
    for (const p of room.interior!.pendants) { rect(g, p.x, p.y - 30, 1, 22, '#514f48'); ellipse(g, p.x, p.y - 5, 4, 4, '#f5e5bc'); }
  }
  rect(g, 16, 46, W - 32, 2, '#9aa7a1');
  // Exit opening is a cut in the wall, never a painted wall on top of a walkable door.
  const [a, b] = room.interior!.door;
  if (a >= 0) { rect(g, a, H - 16, b - a, 16, '#b7bab0'); rect(g, a, H - 16, b - a, 2, '#d9ded4'); }
  for (const r of room.interior!.openings ?? []) { rect(g, r.x, r.y, r.w, r.h, '#aeb1a6'); rect(g, r.x, r.y, r.w, 2, '#e0e2d9'); }
}
function glass(g: Ctx, x: number, y: number, w: number, h: number) {
  rect(g, x, y, w, h, '#9db8b7'); rect(g, x + 2, y + 2, w - 4, h - 4, '#bed0c9');
  rect(g, x + 3, y + 4, w - 6, 2, '#d6aa58'); rect(g, x + 3, y + h - 7, w - 6, 2, '#d6aa58');
  for (let yy = y + 8; yy < y + h - 8; yy += 3) for (let xx = x + 3; xx < x + w - 3; xx += 3) if (hash2(xx, yy, 9) > .5) px(g, xx, yy, '#d5dfd8');
}

/** Fixed warm room lighting, baked once; keeps pixel edges and avoids a per-frame screen filter. */
export function warmLobby(g: Ctx, w: number, h: number): void {
  rect(g, 0, 0, w, h, 'rgba(255,166,64,0.17)');
  for (const x of [48, 160, 272]) {
    ellipse(g, x, 58, 44, 24, 'rgba(255,187,91,0.10)');
    ellipse(g, x, 20, 8, 4, '#d6a45d'); ellipse(g, x, 19, 5, 2, '#ffe6ad');
  }
}

const isWall = (room: Room, x: number, y: number) => tileAt(room, x, y) === T.WALL;

/** D094 4th floor: faces, windows, meeting-room glass base lines and corridor fittings. Tiles stay authoritative. */
function floor4Art(g: Ctx, room: Room, W: number, H: number): void {
  const glassRow = (x: number, y: number) => y === 10 && x >= 1 && x <= 21 && x !== 8 && x !== 9 && x !== 19 && x !== 20;
  for (let y = 0; y < room.rows - 1; y++) for (let x = 0; x < room.cols; x++) {
    if (!isWall(room, x, y) || isWall(room, x, y + 1) || glassRow(x, y)) continue;
    if (y === 2) { // back wall: full-height face
      rect(g, x * 16, 4, 16, 40, '#e4e1d6'); rect(g, x * 16, 4, 16, 2, '#f4f2ea'); rect(g, x * 16, 40, 16, 4, '#b3ad9f'); rect(g, x * 16, 44, 16, 4, '#8f897c');
      if (x % 2 === 0) rect(g, x * 16, 8, 1, 32, '#d4d0c4');
    } else { rect(g, x * 16, y * 16 - 12, 16, 28, '#d6d9d2'); rect(g, x * 16, y * 16 - 12, 16, 2, '#f0f1eb'); rect(g, x * 16, y * 16 + 14, 16, 2, '#a6aeaa'); }
  }
  rect(g, 0, 0, W, 4, '#3d3550');
  // Meeting rooms: whiteboard strips on the back wall, frosted partition between them, glass front base line.
  for (const x0 of [48, 224]) { rect(g, x0, 12, 80, 22, '#a9b0ae'); rect(g, x0 + 1, 13, 78, 20, '#f7f8f4'); rect(g, x0 + 6, 18, 30, 1, '#9fc0d0'); rect(g, x0 + 6, 23, 44, 1, '#e2a37a'); }
  rect(g, 176, 48, 16, 112, '#a7bcbc'); rect(g, 178, 48, 12, 112, '#d4e3e1');
  for (let y = 52; y < 158; y += 18) rect(g, 178, y, 12, 1, '#b7cbca');
  rect(g, 182, 48, 4, 112, 'rgba(255,255,255,0.45)');
  for (let x = 1; x <= 21; x++) if (glassRow(x, 10)) { rect(g, x * 16, 160, 16, 12, '#c5d6d5'); rect(g, x * 16, 172, 16, 4, '#7f8d90'); rect(g, x * 16, 160, 16, 1, '#e8f1ef'); }
  for (const [a, b] of [[128, 160], [304, 336]] as const) { rect(g, a - 2, 160, 2, 16, '#5f6a6d'); rect(g, b, 160, 2, 16, '#5f6a6d'); rect(g, a, 172, b - a, 4, '#9aa3a0'); }
  // Left wall of the open office: a long run of windows with white blinds.
  rect(g, 0, 176, 16, 272, '#6f7f84');
  for (let y = 178; y < 446; y += 48) {
    rect(g, 2, y, 12, 44, '#bcd6d9');
    for (let yy = y + 1; yy < y + 44; yy += 2) rect(g, 3, yy, 10, 1, '#e7eeea');
    rect(g, 13, y, 1, 44, '#f6fbf9');
  }
  // Corridor end: glass door into the inner office.
  rect(g, 404, 10, 24, 34, '#6c7f80'); rect(g, 406, 12, 20, 32, '#b3cfcc'); rect(g, 407, 13, 18, 30, '#dde9e5'); rect(g, 422, 26, 2, 6, '#5c6a6b');
  // Corridor right wall: yellow niche, extinguisher, magazine rack, lounge doorway with frosted sidelights.
  rect(g, 464, 200, 14, 48, '#b89a43'); rect(g, 466, 202, 11, 44, '#e8cb66'); rect(g, 465, 244, 13, 4, '#d0b354');
  rect(g, 467, 258, 6, 12, '#c0453c'); rect(g, 468, 256, 3, 2, '#59605b'); rect(g, 468, 260, 1, 8, '#e57a6e');
  rect(g, 466, 290, 12, 34, '#76674f'); for (let i = 0; i < 5; i++) rect(g, 467, 292 + i * 6, 10, 4, ['#d86b4e', '#4f86c6', '#e9c35a', '#7ab07a', '#c9c3b5'][i]!);
  for (const y of [368, 432]) { rect(g, 464, y, 16, 16, '#9db8b7'); rect(g, 466, y + 2, 12, 12, '#cfe0da'); }
  rect(g, 464, 400, 16, 32, '#c2c1b7'); rect(g, 464, 400, 2, 32, '#8e978f'); rect(g, 478, 400, 2, 32, '#8e978f');
  // Lift landing: closed frosted door with the orange band on its left wall, lift doors in the bottom wall.
  glass(g, 288, 464, 16, 48); rect(g, 298, 484, 2, 8, '#354649');
  rect(g, 396, 512, 40, 16, '#7d8588'); rect(g, 400, 512, 32, 14, '#b9c2c4'); rect(g, 415, 512, 2, 14, '#5b6366');
  for (let x = 402; x < 430; x += 3) rect(g, x, 513, 1, 12, '#a7b0b3');
}

/** D094 lift hall: the lift doors sit head-on in the back wall; lowered, warmly lit ceiling over the passage. */
function liftHallArt(g: Ctx, W: number, H: number): void {
  // Back wall: warm stone panels, soffit with downlights at the top.
  rect(g, 16, 4, W - 32, 76, '#d9c7a6');
  for (let x = 16; x < W - 16; x += 32) rect(g, x, 14, 1, 62, '#c4b08c');
  rect(g, 16, 44, W - 32, 1, '#c4b08c');
  rect(g, 16, 4, W - 32, 10, '#b9a582'); for (const x of [40, 152]) { ellipse(g, x, 9, 4, 2, '#ffe6ad'); }
  rect(g, 16, 76, W - 32, 4, '#8a7860');
  // Lift: stainless frame and two brushed leaves with a centre seam, indicator above, call buttons to the right.
  rect(g, 58, 16, 76, 64, '#8f989b'); rect(g, 59, 17, 74, 2, '#d5dcdd'); rect(g, 60, 20, 2, 60, '#c6cdcf'); rect(g, 130, 20, 2, 60, '#727b7e');
  rect(g, 64, 22, 64, 58, '#b9c2c4');
  for (let x = 65; x < 128; x += 3) rect(g, x, 23, 1, 56, '#a7b0b3');
  for (let i = 0; i < 18; i++) { px(g, 70 + i, 30 + i * 2, '#e3e9ea'); px(g, 102 + i, 30 + i * 2, '#e3e9ea'); }
  rect(g, 95, 22, 2, 58, '#5b6366'); rect(g, 64, 22, 64, 1, '#6f787b');
  rect(g, 82, 5, 28, 9, '#1f2326'); pixelText(g, '1', 94, 7, '#ffb347');
  rect(g, 88, 7, 1, 1, '#ffb347'); rect(g, 87, 8, 3, 1, '#ffb347'); rect(g, 86, 9, 5, 1, '#ffb347');
  rect(g, 102, 7, 5, 1, '#8a5a2a'); rect(g, 103, 8, 3, 1, '#8a5a2a'); rect(g, 104, 9, 1, 1, '#8a5a2a');
  rect(g, 139, 38, 10, 20, '#7d8588'); rect(g, 140, 39, 8, 18, '#c8d0d2');
  ellipse(g, 144, 44, 2, 2, '#ffb347'); ellipse(g, 144, 51, 2, 2, '#e9eeee'); px(g, 144, 44, '#fff1cf');
  rect(g, 30, 30, 20, 12, '#4a4036'); pixelText(g, '1F', 34, 33, '#f3e3c0');
  // Floor: steel sill in front of the doors, warm downlight pools, side and bottom walls seen from above.
  rect(g, 62, 80, 68, 4, '#7d8588'); rect(g, 62, 81, 68, 1, '#5b6366');
  for (const [x, y] of [[48, 120], [96, 118], [144, 120], [72, 158], [120, 158]] as const) ellipse(g, x, y, 22, 8, 'rgba(255,214,150,0.16)');
  rect(g, 15, 4, 1, H - 4, '#5a4f6e'); rect(g, W - 16, 4, 1, H - 4, '#5a4f6e');
  rect(g, 48, H - 16, 48, 16, '#d8c9ae'); rect(g, 48, H - 16, 48, 2, '#efe3cc'); rect(g, 46, H - 16, 2, 16, '#7a6a55'); rect(g, 96, H - 16, 2, 16, '#7a6a55');
  rect(g, 0, 0, W, H, 'rgba(255,166,64,0.10)');
}

/** Translucent glass wall face, drawn in depth order: whatever stands behind it shows through softly. */
export function drawGlassFace(g: CanvasRenderingContext2D, r: { x: number; y: number; w: number; h: number }, cx: number, cy: number): void {
  const x = Math.round(r.x - cx), y = Math.round(r.y - cy);
  g.fillStyle = 'rgba(206,226,226,0.38)'; g.fillRect(x, y, r.w, r.h);
  g.fillStyle = 'rgba(246,250,248,0.55)'; g.fillRect(x, y + 14, r.w, 8);
  g.fillStyle = 'rgba(255,255,255,0.35)';
  for (let i = 0; i < r.w; i += 16) g.fillRect(x + i + 4, y + 2, 2, r.h - 6);
  g.fillStyle = '#6b787b'; g.fillRect(x, y, r.w, 2); g.fillRect(x, y, 1, r.h); g.fillRect(x + r.w - 1, y, 1, r.h);
  for (let i = 32; i < r.w; i += 32) g.fillRect(x + i, y, 1, r.h);
}

function longTable(w: number): Sprite {
  return sprite(w, 42, w / 2, 41, g => {
    for (const x of w > 120 ? [4, w / 2 - 1, w - 6] : [4, w - 6]) { rect(g, x, 23, 2, 18, '#404849'); rect(g, x - 2, 40, 6, 1, '#404849'); }
    rect(g, 6, 35, w - 12, 2, '#404849'); rect(g, 0, 5, w, 24, '#d6ae70'); rect(g, 0, 5, w, 2, '#f0d09a'); rect(g, 0, 29, w, 3, '#a77e4c');
    for (let y = 10; y < 28; y += 5) rect(g, 2, y, w - 4, 1, '#cba36a');
    for (let x = 40; x < w - 20; x += 50) rect(g, x, 17, 12, 2, '#8c724d');
  }, ink);
}
