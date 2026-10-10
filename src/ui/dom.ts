export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}
export function button(cls: string, text: string, onClick: () => void, label = ''): HTMLButtonElement {
  const b = el('button', cls, text);
  b.type = 'button';
  if (label) b.setAttribute('aria-label', label);
  b.addEventListener('click', e => { e.stopPropagation(); onClick(); });
  return b;
}
export function pixelCanvas(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = el('canvas');
  c.width = src.width; c.height = src.height;
  const g = c.getContext('2d')!; g.imageSmoothingEnabled = false; g.drawImage(src, 0, 0);
  return c;
}
export const ICONS = {
  note: '<svg viewBox=\'0 0 24 24\' aria-hidden=\'true\'><path d=\'M6 3h10l3 3v15H6z\'/><path d=\'M9 9h7M9 13h7M9 17h4\'/></svg>',
  menu: '<svg viewBox=\'0 0 24 24\' aria-hidden=\'true\'><path d=\'M4 7h16M4 12h16M4 17h16\'/></svg>',
};
