import { ellipse, makeCanvas, outline, px, rect } from './pixel';

/*
 * D112 nostril entry film art (design 20 section 2: Bodyscope -> face -> nostril -> nasal cavity). Same scan palette as
 * the heart entry body (entry.ts). Front view: screen left is the person's right. Schematic position and shape only.
 */
const SKIN = '#658e99', LINE = '#314e65', MID = '#436c80', LIGHT = '#9fc3c5', TIP = '#7aa3ad';

/** Where the nose tip sits on the face sprite (the zoom target). */
export const NOSE_POSITION = { x: 48, y: 68 };

export function entryFace(): HTMLCanvasElement {
  const { c, g } = makeCanvas(96, 124);
  ellipse(g, 48, 54, 30, 38, SKIN);
  ellipse(g, 17, 58, 5, 9, SKIN); ellipse(g, 79, 58, 5, 9, SKIN);
  rect(g, 38, 86, 20, 24, SKIN);
  rect(g, 12, 108, 72, 16, SKIN);
  outline(c, LINE);
  ellipse(g, 48, 26, 27, 10, MID); rect(g, 22, 26, 52, 5, MID);
  rect(g, 31, 45, 11, 2, MID); rect(g, 54, 45, 11, 2, MID);
  rect(g, 33, 50, 8, 3, '#24384a'); rect(g, 55, 50, 8, 3, '#24384a'); px(g, 34, 50, LIGHT); px(g, 56, 50, LIGHT);
  ellipse(g, 17, 58, 2, 5, MID); ellipse(g, 79, 58, 2, 5, MID);
  // Nose: bridge, rounded tip, the two alae (soft cartilage wings) and the two nostrils seen from the front.
  rect(g, 46, 50, 4, 13, '#6f98a3'); rect(g, 47, 51, 1, 10, LIGHT);
  ellipse(g, 48, 66, 7, 5, TIP); ellipse(g, 46, 64, 3, 2, LIGHT);
  ellipse(g, 41, 68, 4, 3, '#567f8c'); ellipse(g, 55, 68, 4, 3, '#567f8c');
  ellipse(g, 44, 70, 2, 1, '#1b2a38'); ellipse(g, 52, 70, 2, 1, '#1b2a38');
  rect(g, 47, 72, 2, 5, '#5f8894');
  rect(g, 41, 80, 14, 2, MID); px(g, 40, 79, MID); px(g, 55, 79, MID);
  rect(g, 30, 112, 36, 1, '#739eaa');
  return c;
}

/** Close-up of the nose from below and in front: both nostrils, hairs at the entrance and a glimpse of the moist wall. */
export function entryNostril(): HTMLCanvasElement {
  const { c, g } = makeCanvas(96, 80);
  rect(g, 0, 0, 96, 80, SKIN);
  ellipse(g, 48, 26, 40, 26, TIP); ellipse(g, 42, 15, 15, 8, LIGHT); ellipse(g, 38, 12, 5, 3, '#c6e0de');
  ellipse(g, 17, 46, 16, 14, '#5f8894'); ellipse(g, 79, 46, 16, 14, '#5f8894');
  ellipse(g, 14, 42, 6, 5, '#6f98a3'); ellipse(g, 82, 42, 6, 5, '#6f98a3');
  rect(g, 44, 44, 8, 22, '#6f98a3'); rect(g, 45, 46, 2, 18, '#86adb6');
  for (const [cx, side] of [[30, -1], [66, 1]] as const) {
    ellipse(g, cx, 55, 14, 10, '#3b2b3a');
    ellipse(g, cx, 55, 12, 8, '#241822');
    ellipse(g, cx + side, 56, 8, 5, '#120c16');
    ellipse(g, cx - side * 4, 52, 4, 2, '#b05a6e'); px(g, cx - side * 5, 51, '#e08a9a');
    // Nasal hairs pointing into the opening from the rim.
    for (let k = 0; k < 9; k++) {
      const a = Math.PI * (0.15 + 0.7 * (k / 8)), rx = Math.cos(a) * 12, ry = Math.sin(a) * 8;
      for (let j = 0; j < 4; j++) px(g, Math.round(cx + rx * (1 - j * 0.14)), Math.round(55 + ry * (1 - j * 0.16)), j === 3 ? '#8b7a5c' : '#4a3d2c');
    }
  }
  rect(g, 0, 70, 96, 10, '#567f8c'); rect(g, 0, 70, 96, 1, LINE);
  return c;
}

/** Centre of the left-on-screen nostril in the close-up (the dive target). */
export const NOSTRIL_POSITION = { x: 30, y: 55 };
