import content from '../../data/content/heart-mastery.v0.1.json';
import rules from '../../data/balance/heart-run.v0.1.json';
import { discoveries, discoveryIds, hxKey } from './heart';
import type { GameState } from './state';
import type { RoomId } from '../world/types';

/*
 * D106 heart learning loop, step 1 (design 18): field checks and core-first tiers.
 * A recorded structure is learned by answering about it again later (retrieval), not by reading it again.
 * Three question kinds per structure; each kind answered right once gives one star (max 3). Wrong answers cost nothing.
 * Tiers: the 12 core structures shine first; deeper ones open with stars. Draft content (검수 전 모형).
 */
export type QuizKind = 'name' | 'hint' | 'room';
export const QUIZ_KINDS: QuizKind[] = ['name', 'hint', 'room'];
export type Mastery = Record<string, { stars: number; kinds: QuizKind[] }>;
export type TierId = 'core' | 'deep' | 'detail';
export type Tier = { id: TierId; title: string; ids: string[]; unlockStars: number };

export const masteryContent = content;
export const tiers = content.tiers as Tier[];
export const hints = content.hints as Record<string, string>;
export const roomNames = content.roomNames as Record<string, string>;
export const MASTERY_DISCLAIMER: string = content.disclaimer;
const STAR_GOLD: number = rules.star.gold;
const twins = content.twins as [string, string][];
const NL = String.fromCharCode(10);

export const emptyMastery = (): Mastery => ({});

/** Older saves have no mastery record and read as empty (their exploration records stay; stars start at 0). */
export function validateMastery(v: unknown): Mastery {
  if (v === undefined) return {};
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('구조 숙련 기록이 잘못되었습니다.');
  const out: Mastery = {};
  for (const [id, raw] of Object.entries(v as Record<string, unknown>)) {
    const m = raw as Record<string, unknown> | null;
    if (!discoveries[id] || !m || typeof m !== 'object' || !Array.isArray(m.kinds)) throw new Error('구조 숙련 기록이 잘못되었습니다.');
    const kinds = m.kinds as unknown[];
    if (kinds.length > 3 || new Set(kinds).size !== kinds.length || !kinds.every(k => QUIZ_KINDS.includes(k as QuizKind)) || m.stars !== kinds.length) throw new Error('구조 숙련 기록이 잘못되었습니다.');
    out[id] = { stars: kinds.length, kinds: [...kinds] as QuizKind[] };
  }
  return out;
}

export const tierOf = (id: string): Tier => tiers.find(t => t.ids.includes(id)) ?? tiers[tiers.length - 1]!;
export const starsOf = (s: GameState, id: string): number => s.mastery[id]?.stars ?? 0;
export const totalStars = (s: GameState): number => Object.values(s.mastery).reduce((n, m) => n + m.stars, 0);
export const maxStars = (): number => discoveryIds.length * 3;
/** A tier is open when the stars collected so far reach its threshold. */
export const tierOpen = (s: GameState, t: Tier): boolean => totalStars(s) >= t.unlockStars;
/** Structures you may newly explore: open tiers. Already recorded structures always stay open. */
export const isOpen = (s: GameState, id: string): boolean => tierOpen(s, tierOf(id)) || s.inspected.includes(hxKey(id));
export const nextLocked = (s: GameState): Tier | null => tiers.find(t => !tierOpen(s, t)) ?? null;
/** The kind to ask next: the first one not answered right yet (all done: practice in turn, no reward). */
export function nextKind(s: GameState, id: string, practice = 0): QuizKind {
  const done = s.mastery[id]?.kinds ?? [];
  return QUIZ_KINDS.find(k => !done.includes(k)) ?? QUIZ_KINDS[practice % 3]!;
}

/** Small deterministic generator so questions are reproducible in tests. */
export function rng(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h += 0x6d2b79f5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const isTwin = (a: string, b: string) => twins.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
export const shortName = (id: string): string => discoveries[id]!.name;

export type Question = { id: string; kind: QuizKind; prompt: string; choices: { id: string; label: string }[]; answer: string };

/** Three choices: the right one and two others (same room first for 'name', never a confusable twin). */
export function makeQuestion(id: string, kind: QuizKind, seed: string): Question {
  const d = discoveries[id];
  if (!d) throw new Error('없는 구조예요.');
  const r = rng(seed + ':' + id + ':' + kind);
  const pick = <T,>(xs: T[], n: number): T[] => { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j]!, a[i]!]; } return a.slice(0, n); };
  const others = discoveryIds.filter(o => o !== id && !isTwin(o, id));
  let options: { id: string; label: string }[], prompt: string, answer: string;
  if (kind === 'room') {
    const rooms = Object.keys(roomNames).filter(k => k !== d.room);
    options = [{ id: d.room, label: roomNames[d.room]! }, ...pick(rooms, 2).map(k => ({ id: k, label: roomNames[k]! }))];
    prompt = '‘' + d.name + '’은(는) 어디에 있었나요?'; answer = d.room;
  } else {
    const same = others.filter(o => discoveries[o]!.room === d.room), rest = others.filter(o => discoveries[o]!.room !== d.room);
    const wrong = [...pick(same, 2), ...pick(rest, 2)].slice(0, 2);
    if (kind === 'name') { options = [id, ...wrong].map(o => ({ id: o, label: shortName(o) })); prompt = '단서: ' + hints[id] + NL + '이 구조의 이름은?'; }
    else { options = [id, ...wrong].map(o => ({ id: o, label: hints[o]! })); prompt = '‘' + d.name + '’을(를) 바르게 설명한 것은?'; }
    answer = id;
  }
  return { id, kind, prompt, choices: pick(options, options.length), answer };
}

/** Records an answer. A right answer of a new kind adds a star and a little gold; everything else changes nothing. */
export function answerQuiz(s: GameState, id: string, kind: QuizKind, correct: boolean, here: RoomId | null = s.at.room): { state: GameState; star: boolean; gold: number } {
  const d = discoveries[id];
  if (!d || !QUIZ_KINDS.includes(kind)) throw new Error('없는 문제예요.');
  if (here !== d.room) throw new Error('그 구조가 있는 곳에서 풀 수 있어요.');
  if (!s.inspected.includes(hxKey(id))) throw new Error('먼저 탐험 기록에 남겨야 해요.');
  const m = s.mastery[id] ?? { stars: 0, kinds: [] };
  if (!correct || m.kinds.includes(kind)) return { state: s, star: false, gold: 0 };
  const kinds = [...m.kinds, kind];
  return { state: { ...s, gold: s.gold + STAR_GOLD, mastery: { ...s.mastery, [id]: { stars: kinds.length, kinds } } }, star: true, gold: STAR_GOLD };
}
