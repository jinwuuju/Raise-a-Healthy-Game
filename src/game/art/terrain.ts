import Phaser from 'phaser';
// Deterministic native pixel terrain. The world uses these as actual tile textures.
const colors = {
  asphalt: ['#4b5157', '#50575d', '#586068', '#444c52', '#62686c', '#747a79'],
  sidewalk: ['#c2c2b7', '#b5b9af', '#d0cfc1', '#a4ada5', '#ded9ca', '#8e9a91'],
  grass: ['#617b3d', '#698344', '#728b49', '#7d9451', '#59723b', '#a0ad65'],
  path: ['#c4a575', '#c8ac7c', '#cfb487', '#b69c6e', '#e0c394', '#a98e65'],
  stone: ['#a19f87', '#aaa78f', '#bcb69a', '#888d7b', '#d3c5a1', '#747e72'],
  water: ['#376d78', '#407e8b', '#52919b', '#356371', '#699fa3', '#8ab5ae'],
  floor: ['#806344', '#8c6c48', '#99794f', '#73573f', '#b28c59', '#5f4939'],
};
export function makeTerrain(scene: Phaser.Scene): void {
  for (const [key, palette] of Object.entries(colors)) {
    if (scene.textures.exists(`terrain-${key}`)) continue;
    const texture = scene.textures.createCanvas(`terrain-${key}`, 32, 32)!;
    const ctx = texture.context; ctx.fillStyle = palette[0]!; ctx.fillRect(0, 0, 32, 32);
    let seed = key.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    for (let i = 0; i < 150; i++) {
      ctx.fillStyle = palette[Math.floor(rand() * palette.length)]!;
      const x = Math.floor(rand() * 32), y = Math.floor(rand() * 32);
      ctx.fillRect(x, y, key === 'water' ? 3 : 1 + Math.floor(rand() * 2), 1);
    }
    if (key === 'stone' || key === 'sidewalk') {
      ctx.fillStyle = '#777d6c'; ctx.fillRect(0, 0, 32, 1); ctx.fillRect(0, 16, 32, 1);
      ctx.fillRect(0, 0, 1, 16); ctx.fillRect(16, 16, 1, 16);
      ctx.fillStyle = '#c8bea1'; ctx.fillRect(1, 1, 30, 1); ctx.fillRect(17, 17, 14, 1);
    }
    if (key === 'floor') {
      ctx.fillStyle = '#5b4738'; ctx.fillRect(0, 0, 32, 1); ctx.fillRect(0, 16, 32, 1); ctx.fillRect(8, 0, 1, 16); ctx.fillRect(26, 16, 1, 16);
      ctx.fillStyle = '#a28255'; ctx.fillRect(0, 2, 31, 1); ctx.fillRect(0, 18, 31, 1);
    }
    texture.refresh();
  }
}
