/** Qualitative comparison only. These factors never control collision or rewards. */
export type ValveMode = 'normal' | 'stenosis' | 'regurgitation';
export const valveModes: ValveMode[] = ['normal', 'stenosis', 'regurgitation'];
export function comparisonOpening(mode: ValveMode, normal: number): number {
  return mode === 'stenosis' ? normal * .3 : normal;
}
export const hasBackflow = (mode: ValveMode, normal: number): boolean => mode === 'regurgitation' && normal < .05;
