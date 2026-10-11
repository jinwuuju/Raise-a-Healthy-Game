import type { Sdf } from './sdf';
import type { Point } from './types';

export type OrganKind = 'ra' | 'rv' | 'lung' | 'la' | 'lv' | 'aorta';
export type ValveKind = 'tricuspid' | 'mitral' | 'pulmonary' | 'aortic';

/**
 * A heart valve drawn across a passage. The annulus runs from (x, y) to (x + w, y).
 * toward: +1 when the downstream side is below the line (larger y), -1 when it is above.
 * pass: true when blood leaves the room through it (the reporter may follow while it is open);
 * false when blood arrived through it (the reporter can never go back that way).
 */
export type Valve = { id: string; kind: ValveKind; x: number; y: number; w: number; toward: 1 | -1; pass: boolean };

/** A stream of blood cells following a polyline. `valve` gates the stream where it crosses that valve. */
export type Lane = {
  pts: Point[]; when: 'av' | 'sl' | 'always' | 'coronary-left' | 'coronary-right'; blood: 'venous' | 'arterial' | 'mix';
  n: number; speed: number; width: number; valve: string | null;
};

/** Chordae tendineae: from a papillary-muscle tip to points (0..1 across the valve) on the leaflet edges. */
export type Cord = { x: number; y: number; valve: string; slots: number[] };

/** A muscle band raised above the floor that the reporter walks under (moderator band). */
export type Band = { x1: number; y1: number; x2: number; y2: number; lift: number; thick: number; signal: [number, number] | null };

/** Conduction display: a pulse along a line, an expanding ripple, or a glow, between two beat times. */
export type Signal = { kind: 'line' | 'ripple' | 'glow'; pts: Point[]; from: number; to: number; r: number };

export type Feature =
  | { kind: 'crista'; pts: Point[] }
  | { kind: 'fossa'; x: number; y: number; rx: number; ry: number; flap: boolean }
  | { kind: 'rim'; x: number; y: number; r: number; a0: number; a1: number }
  | { kind: 'tendon'; pts: Point[] }
  | { kind: 'fan'; x: number; y: number; len: number }
  | { kind: 'ridge'; pts: Point[]; w: number };

export type TextureKind = 'smooth' | 'pect' | 'trab' | 'fine' | 'intima' | 'lung';

export type Organ = {
  kind: OrganKind;
  /** Chamber/vessel lumen, negative inside. */
  floor: Sdf;
  /** Openings in the floor (vein orifices, coronary ostia): not walkable. */
  holes: Sdf;
  /** Thickness of the cut wall (pixels) at a point outside the lumen. */
  wall: (x: number, y: number) => number;
  texture: (x: number, y: number) => { kind: TextureKind; angle: number };
  walk: (x: number, y: number) => boolean;
  squeeze: 'atria' | 'ventricles' | 'none';
  valves: Valve[]; lanes: Lane[]; cords: Cord[]; bands: Band[]; signals: Signal[]; features: Feature[];
  alveoli: { x: number; y: number; r: number }[];
};

/** Height of the visible inner wall face below every north-facing wall (not walkable). */
export const FACE = 10;
