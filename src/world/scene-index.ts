import type { Rect } from './types';

/*
 * Uniform grid over fixed boxes (D102). Big rooms (the 1 km district: about 4,800 buildings and 2,100 props) ask only
 * the cells around the camera instead of testing every item every frame. Queries return item indexes in ascending
 * order, so callers keep the original list order (and any stable sort after it) exactly as a full scan would.
 * Boxes and queries outside the grid are clamped to its edge cells, which keeps every overlap findable.
 */
export type SceneGrid = { cell: number; cols: number; rows: number; cells: Map<number, number[]> };

export function buildSceneGrid(width: number, height: number, boxes: readonly Rect[], cell = 256): SceneGrid {
  const cols = Math.max(1, Math.ceil(width / cell)), rows = Math.max(1, Math.ceil(height / cell));
  const grid: SceneGrid = { cell, cols, rows, cells: new Map() };
  boxes.forEach((b, i) => {
    const [x0, x1, y0, y1] = span(grid, b.x, b.y, b.w, b.h);
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
      const k = cy * cols + cx, list = grid.cells.get(k);
      if (list) list.push(i); else grid.cells.set(k, [i]);
    }
  });
  return grid;
}

/** Indexes (ascending) of every box that may overlap the rectangle; a superset of the exact overlaps. */
export function querySceneGrid(grid: SceneGrid, x: number, y: number, w: number, h: number): number[] {
  const [x0, x1, y0, y1] = span(grid, x, y, w, h), hits = new Set<number>();
  for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) for (const i of grid.cells.get(cy * grid.cols + cx) ?? []) hits.add(i);
  return [...hits].sort((a, b) => a - b);
}

function span(g: SceneGrid, x: number, y: number, w: number, h: number): [number, number, number, number] {
  const c = (v: number, n: number) => Math.max(0, Math.min(n - 1, Math.floor(v / g.cell)));
  return [c(x, g.cols), c(x + w, g.cols), c(y, g.rows), c(y + h, g.rows)];
}
