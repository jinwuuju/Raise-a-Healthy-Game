/**
 * D108 Q008 blood-pressure observer (basic hypertension layer). Rendering only: never controls collision, valve passage,
 * the walking heartbeat or rewards. The push is qualitative (0..1), not a measurement, and no threshold numbers exist here.
 */
export type PressureMode = 'rest' | 'moved' | 'high';
export const pressureModes: PressureMode[] = ['rest', 'moved', 'high'];

/** Seconds of one ‘just climbed the stairs’ loop: the push starts high, settles back over SETTLE seconds, then rests. */
export const MOVED_LOOP = 10;
export const SETTLE = 7;

/** 1 right after moving, falling to 0 as the body rests (repeats so the observer keeps showing it). */
export function settle(since: number): number {
  const t = ((since % MOVED_LOOP) + MOVED_LOOP) % MOVED_LOOP;
  return Math.max(0, 1 - t / SETTLE);
}

/**
 * Push of blood on the aortic wall. `wave` is 1 while the left ventricle ejects and falls between beats (0..1).
 * Rest swings between a low floor (the wall recoil keeps it above zero) and a peak; ‘moved’ adds a short-lived rise;
 * ‘high’ stays above even the resting peak between beats (high while resting).
 */
export function pressurePush(mode: PressureMode, wave: number, since = 0): number {
  const w = Math.max(0, Math.min(1, wave));
  const base = mode === 'high' ? 0.62 : 0.34, swing = mode === 'high' ? 0.3 : 0.26;
  const extra = mode === 'moved' ? 0.3 * settle(since) : 0;
  return Math.min(1, base + swing * w + extra);
}

/** Beat speed factor shown in the observer only (the walking heart keeps its own clock). */
export const beatSpeed = (mode: PressureMode, since = 0): number => (mode === 'moved' ? 1 + 0.6 * settle(since) : 1);
