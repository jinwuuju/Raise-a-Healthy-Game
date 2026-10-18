import rules from '../../data/balance/heart-run.v0.1.json';
import content from '../../data/content/heart-mastery.v0.1.json';
import { seoulTime } from './clock';
import { discoveries, discoveryIds, hxKey } from './heart';
import { isOpen, rng } from './mastery';
import type { GameState } from './state';

/*
 * D106 blood-delivery run (design 18): carry one red cell from the right atrium through the lungs (load oxygen at the
 * gas exchange) to the ascending aorta, finding three clue-only waypoints on the way. Repeatable: every finished run
 * pays gold (XP only for firsts: first run, first S, a new sighting), with grade, best, first-of-day and combo bonuses and a chance to sight a
 * rarer blood cell. Nothing is ever taken away. The run itself lives in memory; only the result is saved.
 */
export type Grade = 'S' | 'A' | 'B' | 'C';
export type Sighting = { id: string; name: string; text: string; weight: number };
export const sightings = content.sightings as Sighting[];
export const RUN = rules;
export const START_ROOM = 'heart', LOAD = 'hx-exchange', DELIVER = 'hx-ascending';
/** Waypoints come one from each stretch of the route so the run always passes them in blood-flow order. */
export const STRETCHES: string[][] = [['heart', 'rv'], ['lung', 'la'], ['lv', 'aorta']];

export type HeartRunState = {
  runs: number; best: number | null; bestGrade: Grade | null; combo: number; lastDay: string | null;
  lastRunId: string | null; seen: string[]; goldEarned: number; perfect: number;
};
export const emptyHeartRun = (): HeartRunState => ({ runs: 0, best: null, bestGrade: null, combo: 0, lastDay: null, lastRunId: null, seen: [], goldEarned: 0, perfect: 0 });
const grades: Grade[] = ['S', 'A', 'B', 'C'];
const count = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const DAY = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/, RUN_ID = /^[A-Za-z0-9_-]{1,40}$/;

export function validateHeartRun(v: unknown): HeartRunState {
  if (v === undefined) return emptyHeartRun();
  const s = v as Record<string, unknown> | null;
  if (!s || typeof s !== 'object' || !count(s.runs) || !count(s.combo) || !count(s.goldEarned) || !count(s.perfect)
    || !(s.best === null || count(s.best)) || !(s.bestGrade === null || grades.includes(s.bestGrade as Grade))
    || !(s.lastDay === null || (typeof s.lastDay === 'string' && DAY.test(s.lastDay)))
    || !(s.lastRunId === null || (typeof s.lastRunId === 'string' && RUN_ID.test(s.lastRunId)))
    || !Array.isArray(s.seen) || !s.seen.every(id => sightings.some(x => x.id === id)) || new Set(s.seen).size !== s.seen.length) throw new Error('배달 런 기록이 잘못되었습니다.');
  return { runs: s.runs, best: s.best as number | null, bestGrade: s.bestGrade as Grade | null, combo: s.combo, lastDay: s.lastDay as string | null,
    lastRunId: s.lastRunId as string | null, seen: [...s.seen] as string[], goldEarned: s.goldEarned, perfect: s.perfect };
}

/** Three waypoints, one per stretch, preferring recorded structures (asked by clue); otherwise an open new one (found). */
export function pickWaypoints(s: GameState, seed: string): string[] {
  const r = rng('run:' + seed);
  return STRETCHES.map(rooms => {
    const pool = discoveryIds.filter(id => rooms.includes(discoveries[id]!.room) && id !== LOAD && id !== DELIVER && isOpen(s, id));
    const known = pool.filter(id => s.inspected.includes(hxKey(id))), from = known.length ? known : pool;
    return from[Math.floor(r() * from.length)]!;
  });
}

export const gradeOf = (seconds: number, correct: number): Grade => {
  const g = rules.grades, par = rules.parSeconds;
  if (correct >= g.S.correct && seconds <= par * g.S.parRatio) return 'S';
  if (correct >= g.A.correct && seconds <= par * g.A.parRatio) return 'A';
  if (correct >= g.B.correct || seconds <= par * g.B.parRatio) return 'B';
  return 'C';
};

export type RunResult = { runId: string; seconds: number; oxygen: boolean; waypoints: { id: string; correct: boolean }[] };
export type RunReward = { grade: Grade; gold: number; xp: number; lines: string[]; best: boolean; firstOfDay: boolean; combo: number; sighting: (Sighting & { first: boolean }) | null };

/** Applies a finished delivery once (same run id twice changes nothing). */
export function finishRun(s: GameState, res: RunResult, now = Date.now()): { state: GameState; reward: RunReward | null } {
  if (s.at.room !== 'aorta') throw new Error('대동맥 뿌리에서 배달을 마칠 수 있어요.');
  if (!RUN_ID.test(res.runId)) throw new Error('잘못된 배달이에요.');
  if (s.heartRun.lastRunId === res.runId) return { state: s, reward: null };
  if (!res.oxygen) throw new Error('폐에서 산소를 싣지 않았어요.');
  if (!Number.isFinite(res.seconds) || res.seconds < rules.minSeconds || res.seconds > 24 * 3600) throw new Error('배달 시간이 올바르지 않아요.');
  if (res.waypoints.length !== 3 || res.waypoints.some(w => !discoveries[w.id])) throw new Error('경유지 기록이 잘못되었어요.');
  const h = s.heartRun, correct = res.waypoints.filter(w => w.correct).length, seconds = Math.round(res.seconds);
  const grade = gradeOf(seconds, correct), day = seoulTime(now).dateKey;
  const firstOfDay = h.lastDay !== day, best = h.best === null || seconds < h.best;
  const combo = grade === 'S' || grade === 'A' ? h.combo + 1 : 0;
  const mult = rules.combo[Math.min(combo, rules.combo.length - 1)]!;
  const lines: string[] = [];
  let gold = rules.gold.base; lines.push('배달 완료 +' + rules.gold.base + 'G');
  if (correct) { gold += correct * rules.gold.perCheckpoint; lines.push('경유지 정답 ' + correct + '곳 +' + correct * rules.gold.perCheckpoint + 'G'); }
  const gb = rules.gold.grade[grade]; if (gb) { gold += gb; lines.push(grade + '등급 +' + gb + 'G'); }
  if (mult > 1) { const extra = Math.round(gold * mult) - gold; gold += extra; lines.push('연속 배달 ×' + mult + ' +' + extra + 'G'); }
  if (firstOfDay) { gold += rules.gold.firstOfDay; lines.push('오늘 첫 배달 +' + rules.gold.firstOfDay + 'G'); }
  if (best && h.best !== null) { gold += rules.gold.personalBest; lines.push('최고 기록 경신 +' + rules.gold.personalBest + 'G'); }
  // A rarer cell drifts past now and then (deterministic per run id so the result cannot be re-rolled).
  const r = rng('sight:' + res.runId);
  let sighting: RunReward['sighting'] = null;
  if (r() < rules.sightingChance) {
    const total = sightings.reduce((n, x) => n + x.weight, 0); let roll = r() * total;
    const hit = sightings.find(x => (roll -= x.weight) < 0) ?? sightings[0]!;
    const first = !h.seen.includes(hit.id), g = first ? rules.gold.sightingNew : rules.gold.sightingRepeat;
    gold += g; lines.push((first ? '새 목격 · ' : '다시 목격 · ') + hit.name + ' +' + g + 'G');
    sighting = { ...hit, first };
  }
  // XP only for things done for the first time (design 02: an identical repeat gives 0%); gold is paid every run.
  const xpParts: [number, string][] = [];
  if (h.runs === 0) xpParts.push([rules.xp.firstRun, '첫 배달']);
  if (grade === 'S' && h.bestGrade !== 'S') xpParts.push([rules.xp.firstS, '첫 S등급']);
  if (sighting?.first) xpParts.push([rules.xp.newSighting, '새 목격']);
  const xp = xpParts.reduce((n, [v]) => n + v, 0);
  for (const [v, why] of xpParts) lines.push(why + ' 경험치 +' + v + 'XP');
  const next: HeartRunState = {
    runs: h.runs + 1, best: best ? seconds : h.best, bestGrade: !h.bestGrade || grades.indexOf(grade) < grades.indexOf(h.bestGrade) ? grade : h.bestGrade,
    combo, lastDay: day, lastRunId: res.runId, seen: sighting?.first ? [...h.seen, sighting.id] : h.seen, goldEarned: h.goldEarned + gold, perfect: h.perfect + (correct === 3 ? 1 : 0),
  };
  return { state: { ...s, gold: s.gold + gold, totalXp: s.totalXp + xp, heartRun: next }, reward: { grade, gold, xp, lines, best, firstOfDay, combo, sighting } };
}
