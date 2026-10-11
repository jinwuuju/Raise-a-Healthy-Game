/*
 * Cardiac cycle inside the Bodyscope heart (draft, not medically reviewed — see data/content/heart-interior.v0.1.json).
 * Timing follows the common textbook resting example: 75 beats/min = 0.8 s per beat, ventricular systole about
 * 0.3 s, diastole about 0.5 s, atrial systole about 0.1 s. Electrical events come before the mechanical ones
 * (P wave -> atrial contraction, QRS -> ventricular contraction). The Bodyscope plays the beat SLOW times slower
 * so a reporter can walk through a valve while it is open. Pure functions only.
 */
export const BPM = 75;
export const REAL_CYCLE = 60 / BPM;
export const SLOW = 7;
export const GAME_CYCLE = REAL_CYCLE * SLOW;

/** Event times within one real 0.8 s beat. */
export const EV = {
  pOn: 0, pOff: 0.08,          // P wave: the signal spreads over both atria
  atrial: 0.08,                // atria contract (after the P wave)
  qrs: 0.14, qrsEnd: 0.19,     // QRS: the signal spreads over the ventricles
  s1: 0.19,                    // AV valves (tricuspid, mitral) close: first sound
  slOpen: 0.24,                // pulmonary and aortic valves open: ejection
  s2: 0.49,                    // pulmonary and aortic valves close: second sound
  avOpen: 0.57,                // AV valves open again: filling
} as const;

export type PhaseId = 'fill' | 'atrial' | 'ivc' | 'eject' | 'ivr';
export type Phase = { id: PhaseId; from: number; to: number; name: string; note: string };

export const phases: Phase[] = [
  { id: 'fill', from: 0, to: EV.atrial, name: '심실 충만', note: '방실판막이 열려 있어 심방의 피가 심실로 흘러들어요' },
  { id: 'atrial', from: EV.atrial, to: EV.s1, name: '심방 수축', note: '심방이 조여 남은 피를 심실로 밀어 넣어요' },
  { id: 'ivc', from: EV.s1, to: EV.slOpen, name: '등용적 수축', note: '심실이 조이기 시작했어요 · 네 판막이 모두 닫혀 있어요' },
  { id: 'eject', from: EV.slOpen, to: EV.s2, name: '심실 박출', note: '반달판막이 열려 피가 폐동맥·대동맥으로 나가요' },
  { id: 'ivr', from: EV.s2, to: EV.avOpen, name: '등용적 이완', note: '심실이 풀리기 시작했어요 · 네 판막이 모두 닫혀 있어요' },
  { id: 'fill', from: EV.avOpen, to: REAL_CYCLE, name: '심실 충만', note: '방실판막이 열려 심방의 피가 심실로 흘러들어요' },
];

/** Position within the beat (0 <= c < 0.8) for a time in real seconds. */
export const beat = (real: number): number => ((real % REAL_CYCLE) + REAL_CYCLE) % REAL_CYCLE;
export const realTime = (gameSeconds: number): number => gameSeconds / SLOW;

export function phaseAt(real: number): Phase {
  const c = beat(real);
  return phases.find(p => c >= p.from && c < p.to) ?? phases[0]!;
}

/** av = tricuspid + mitral, sl = pulmonary + aortic (semilunar). */
export type ValveSet = 'av' | 'sl';

/** 0 = shut … 1 = fully open, with short opening/closing ramps used for drawing the leaflets. */
export function openness(v: ValveSet, real: number): number {
  const c = beat(real);
  let x = c, open: number = EV.slOpen, shut: number = EV.s2;
  if (v === 'av') { open = EV.avOpen; shut = EV.s1 + REAL_CYCLE; if (c < EV.avOpen) x = c + REAL_CYCLE; }
  if (x < open || x >= shut) return 0;
  return Math.min(1, (x - open) / 0.035, (shut - x) / 0.02);
}

/** A reporter may pass a valve only while it is clearly open. */
export const passable = (v: ValveSet, real: number): boolean => openness(v, real) >= 0.5;

/** Qualitative animation only, not measured flow. Left systolic suppression is stronger than right.
 * Coronary flow depends on myocardial compression, not whether the aortic leaflets cover the ostia.
 * Source: human measurements in data/content/heart-interior.v0.1.json (coronary-phasic).
 */
export function coronaryFlowFactor(side: 'left' | 'right', real: number): number {
  const c = beat(real), systole = c >= EV.s1 && c < EV.s2;
  return systole ? (side === 'left' ? 0.12 : 0.6) : 1;
}

/** Game seconds until the valve can be passed (0 if it already can). */
export function secondsUntilOpen(v: ValveSet, real: number): number {
  for (let k = 0; k <= 160; k++) if (passable(v, real + k * 0.005)) return (k * 0.005) * SLOW;
  return GAME_CYCLE;
}

const bump = (c: number, a: number, b: number) => (c < a || c > b ? 0 : Math.sin(((c - a) / (b - a)) * Math.PI));

/** How strongly the atria or the ventricles are squeezing (0..1), for wall thickening on screen. */
export function squeeze(which: 'atria' | 'ventricles', real: number): number {
  const c = beat(real);
  return which === 'atria' ? bump(c, EV.atrial, EV.s1 + 0.01) : bump(c, EV.s1 - 0.01, EV.s2 + 0.02);
}

/** Simplified lead-II–shaped trace for the HUD (P, QRS, T). Roughly -0.3..1. */
export function ecg(real: number): number {
  const c = beat(real), g = (m: number, w: number, a: number) => a * Math.exp(-(((c - m) / w) ** 2));
  return g(0.04, 0.017, 0.14) + g(0.146, 0.006, -0.12) + g(0.16, 0.007, 1) + g(0.173, 0.007, -0.26) + g(0.42, 0.033, 0.27);
}

/** Progress (0..1) of a signal travelling between two beat times, or -1 when it is not travelling. */
export function travel(real: number, from: number, to: number): number {
  const c = beat(real);
  return c >= from && c < to ? (c - from) / (to - from) : -1;
}

/** Heart sound heard when the beat passes s1 or s2 between two moments (real seconds). */
export function soundBetween(prevReal: number, nowReal: number): 'S1' | 'S2' | null {
  if (nowReal <= prevReal || nowReal - prevReal > REAL_CYCLE / 2) return null;
  const a = beat(prevReal), b = beat(nowReal);
  const crossed = (e: number) => (a <= b ? a < e && e <= b : a < e || e <= b);
  return crossed(EV.s1) ? 'S1' : crossed(EV.s2) ? 'S2' : null;
}
