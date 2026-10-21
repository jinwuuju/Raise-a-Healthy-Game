import type { GateKind } from '../domain/breath';
import type { Sdf } from './sdf';
import type { AirwayRoomId, Point } from './types';

/*
 * D111 Bodyscope airway rooms (design 20, RESPIRATORY-INTERIOR.md). Geometry only, no DOM.
 * Air goes both ways, so the rooms have no one-way valves: the swallow gates are the only doors that close.
 */
export type AirTexture = 'skin' | 'mucosa' | 'olfactory' | 'squamous' | 'ciliated' | 'trachealis' | 'cartilage' | 'bronchiole' | 'alveolar';

/** A swallow gate across a passage from (x, y) to (x + w, y). Shut while swallowing, in both directions. */
export type Gate = { id: string; kind: GateKind; x: number; y: number; w: number };
/** Air stream along a polyline written in the breathing-in direction (towards the alveoli). */
export type AirLane = { pts: Point[]; n: number; width: number; speed: number };
/** Cilia carpet: mucus creeps along pts in this order whatever the air does. */
export type MucusPath = { pts: Point[]; width: number; n: number };

export type AirFeature =
  /** Nasal shelf drawn as a curled scroll (a raised solid in the floor). */
  | { kind: 'concha'; x: number; y: number; rx: number; ry: number }
  | { kind: 'hairs'; x: number; y: number; w: number; h: number }
  /** Opening in the wall with an optional raised rim (auditory tube, sinus). */
  | { kind: 'orifice'; x: number; y: number; r: number; rim: boolean }
  /** Lymphoid tissue with crypts (adenoid, tonsils). */
  | { kind: 'lymph'; x: number; y: number; rx: number; ry: number }
  /** Cut edge of the nasal septum along the roof (the wall facing the viewer is drawn as a pale veil). */
  | { kind: 'septum'; pts: Point[] }
  /** C-shaped tracheal rings: bands from both side walls that stop short of the back (open behind). */
  | { kind: 'rings'; x0: number; x1: number; y0: number; y1: number; step: number; open: number }
  /** Cartilage plates scattered along a tube centre line (radius r). */
  | { kind: 'plates'; pts: Point[]; r: number }
  /** Smooth muscle wrapped around a tube without cartilage. */
  | { kind: 'muscle'; pts: Point[]; r: number }
  | { kind: 'ridge'; pts: Point[]; w: number }
  /** Larynx wall cartilages shown in the cut wall (thyroid shield, cricoid ring). */
  | { kind: 'cartilage'; x: number; y: number; w: number; h: number }
  /** Goblet cells as bright dots in a rectangle. */
  | { kind: 'goblets'; x: number; y: number; w: number; h: number; n: number };

/** Moving anatomy drawn by the live layer, keyed by what moves with the swallow. */
export type AirPart =
  | { kind: 'palate'; root: Point; tip: Point; lifted: Point; width: number }
  | { kind: 'epiglottis'; base: Point; tip: Point; width: number; inlet: { x: number; y: number; w: number } }
  | { kind: 'folds'; y: number; x0: number; x1: number; gap: number; vestibular: number }
  | { kind: 'esophagus'; x: number; y: number; w: number };

export type Airway = {
  kind: AirwayRoomId;
  /** Lumen (air side), negative inside. */
  floor: Sdf;
  /** Openings not walked into (mouth, oesophagus, orifices). */
  holes: Sdf;
  /** Raised structures inside the lumen (conchae, soft palate, folds, carina), not walkable. */
  solid: Sdf;
  /** Cut wall thickness at a point outside the lumen. */
  wall: (x: number, y: number) => number;
  texture: (x: number, y: number) => AirTexture;
  walk: (x: number, y: number) => boolean;
  gates: Gate[]; lanes: AirLane[]; mucus: MucusPath[]; features: AirFeature[]; parts: AirPart[];
  /** Alveoli of the air side (centre, radius), drawn with capillaries in the septa between them. */
  alveoli: { x: number; y: number; r: number }[];
};
