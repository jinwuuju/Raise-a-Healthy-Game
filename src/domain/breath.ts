/*
 * D111 airway clock (design 20 section 2, RESPIRATORY-INTERIOR accuracy contract 2-3). Pure functions of game seconds.
 * Breathing in is shorter than breathing out and moves the same amount of air both ways. Every so often the body
 * swallows: breathing pauses, the soft palate lifts against the nasal way and the epiglottis tips down over the
 * larynx; breathing resumes with breathing out. All timings are slowed for observation (not measurements).
 */
export const BREATH = { period: 6.8, inhale: 0.4 } as const;
export const SWALLOW = { cycle: 16, at: 10.6, length: 2.4, ramp: 0.45 } as const;

const mod = (a: number, n: number) => ((a % n) + n) % n;

/** Seconds since this swallow began (0..length) or null when not swallowing. */
export function swallowTime(t: number): number | null {
  const c = mod(t, SWALLOW.cycle) - SWALLOW.at;
  return c >= 0 && c < SWALLOW.length ? c : null;
}
export const swallowing = (t: number): boolean => swallowTime(t) !== null;

/** Breathing clock: game time with every swallow taken out (the breath holds while swallowing). */
export function breathTime(t: number): number {
  const n = Math.floor(t / SWALLOW.cycle), c = mod(t, SWALLOW.cycle);
  const inCycle = c < SWALLOW.at ? c : c < SWALLOW.at + SWALLOW.length ? SWALLOW.at : c - SWALLOW.length;
  return n * (SWALLOW.cycle - SWALLOW.length) + inCycle;
}

/** 0..1 within one breath; below BREATH.inhale is breathing in. */
export const breathPhase = (t: number): number => mod(breathTime(t), BREATH.period) / BREATH.period;

/**
 * Air movement: positive = inward (towards the alveoli), negative = outward (towards the nostrils), 0 while swallowing.
 * The breathing-out peak is lower so the same amount of air leaves as came in.
 */
export function airflow(t: number): number {
  if (swallowing(t)) return 0;
  const p = breathPhase(t), i = BREATH.inhale;
  return p < i ? Math.sin((Math.PI * p) / i) : -(i / (1 - i)) * Math.sin((Math.PI * (p - i)) / (1 - i));
}

/** How full the lungs are, 0 (end of breathing out) .. 1 (end of breathing in). */
export function inflation(t: number): number {
  const p = breathPhase(t), i = BREATH.inhale;
  return p < i ? (1 - Math.cos((Math.PI * p) / i)) / 2 : (1 + Math.cos((Math.PI * (p - i)) / (1 - i))) / 2;
}

export type BreathWord = 'in' | 'out' | 'swallow';
export const breathWord = (t: number): BreathWord => (swallowing(t) ? 'swallow' : breathPhase(t) < BREATH.inhale ? 'in' : 'out');

const ramp = (s: number | null, delay: number): number => {
  if (s === null) return 0;
  const a = (s - delay) / SWALLOW.ramp, b = (SWALLOW.length - s) / SWALLOW.ramp;
  return Math.max(0, Math.min(1, a, b));
};
/** Soft palate and uvula lifted against the nasal way (0 resting, 1 closed). */
export const palateLift = (t: number): number => ramp(swallowTime(t), 0);
/** Epiglottis tipped down over the laryngeal inlet (0 upright, 1 covering). It follows the palate a moment later. */
export const epiglottisDown = (t: number): number => ramp(swallowTime(t), 0.2);
/** Vocal folds: wide apart while breathing, drawn together while swallowing (0 wide .. 1 closed). */
export const glottisClosed = (t: number): number => ramp(swallowTime(t), 0.15);

export type GateKind = 'palate' | 'epiglottis';
/** A swallow gate refuses passage while it is more than a little closed. */
export const gateShut = (kind: GateKind, t: number): boolean => (kind === 'palate' ? palateLift(t) : epiglottisDown(t)) > 0.15;

/** Seconds until the gate is open again (0 when open now). */
export function secondsUntilGateOpen(kind: GateKind, t: number): number {
  if (!gateShut(kind, t)) return 0;
  for (let k = 0.05; k < SWALLOW.length + 1; k += 0.05) if (!gateShut(kind, t + k)) return k;
  return SWALLOW.length;
}

/** Mucus on the cilia moves one way whatever the air does: nose -> back of the nose; trachea and bronchi -> up. */
export const MUCUS_SPEED = 7;
