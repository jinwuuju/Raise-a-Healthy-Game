import balance from '../../data/balance/lunch.v0.1.json';
import { seoulTime } from './clock';

/*
 * 오늘의 점심 상태 규칙(D068~D069, 점심 ⑥, D085). DOM과 메뉴 데이터 없이 순수 함수만 둔다.
 * 메뉴 목록·문구 id는 호출하는 쪽(application)이 넘긴다(LunchPool). 화면·연출은 저장된 결과를 읽기만 한다.
 * - 시계: 기기 시계를 Asia/Seoul로 읽는다(clock.ts). 00:00부터 11:30:00 전까지 주문·굶기 확정.
 * - 굶음: 직접 고르거나, 그날 게임을 연 상태에서 11:30을 넘기면 자동. 보상 0·벌칙 0·상태 변화 없음. 열지 않은 날은 만들지 않는다.
 * - 보상: 종류·크기가 미정(⑦)이라 이 단계는 XP·골드를 주지 않는다.
 */

export const CRAVES = ['cool', 'spicy', 'hot', 'crispy', 'meat', 'foreign', 'light', 'quick', 'hearty'] as const;
export type Crave = typeof CRAVES[number];
export type CraveChoice = Crave | 'any';
/** 당김 칩 이름(LUNCH-QUEST 2절). */
export const CRAVE_NAMES: Record<CraveChoice, string> = { cool: '시원·상큼한 거', spicy: '매콤한 거', hot: '뜨끈한 거', crispy: '바삭한 거', meat: '고기 당기는 거', foreign: '색다른 거', light: '가볍고 속 편한 거', quick: '간단한 거', hearty: '든든한 거', any: '아무거나' };

const hm = (t: string) => { const [h, m] = t.split(':').map(Number); return h! * 3600 + m! * 60; };
/** 11:30:00 = 41,400초(서울 하루 중). 이 초부터는 마감. */
export const LUNCH_CLOSE_SEC = hm(balance.window.closesAt);
export const CANDIDATE_RULE = balance.candidates;
export const DAY_LIMIT = 120, DEX_LIMIT = 500;

export type LunchCard = { menu: string; claim: string; hype: boolean };
export type LunchDay = {
  date: string;
  crave: CraveChoice | null;
  cards: LunchCard[];
  report: { menu: string; hit: boolean; who: string; line: number } | null;
  outcome: 'ordered' | 'skipped' | null;
  menu: string | null;
  menuName: string | null;
  tips: string[];
  skip: 'manual' | 'auto' | null;
  decidedAt: string | null;
  who: string | null;
  line: number | null;
  seen: boolean;
};
export type LunchState = { days: LunchDay[]; dex: string[] };
/** 메뉴 데이터에서 뽑아 넘기는 후보 풀. */
export type LunchPool = { menus: { id: string; crave: Crave; name: string }[]; hype: string[]; fair: string[] };
export type Random = () => number;
type HasLunch = { started: boolean; lunch: LunchState };

export const emptyLunch = (): LunchState => ({ days: [], dex: [] });
export const lunchDate = (now: number): string => seoulTime(now).dateKey;
export const lunchOpen = (now: number): boolean => seoulTime(now).secondOfDay < LUNCH_CLOSE_SEC;
export const lunchDay = (s: { lunch: LunchState }, date: string): LunchDay | null => s.lunch.days.find(d => d.date === date) ?? null;
export const lunchToday = (s: { lunch: LunchState }, now: number): LunchDay | null => lunchDay(s, lunchDate(now));
/** HUD 현재 목표 자리의 한 줄(자정까지 그날 결과, 마감 전 미확정이면 고르기 안내). */
export function lunchHudText(s: HasLunch, now: number): string | null {
  if (!s.started) return null;
  const d = lunchToday(s, now);
  if (d?.outcome === 'ordered') return '오늘 점심: ' + d.menuName;
  if (d?.outcome === 'skipped' || !lunchOpen(now)) return '오늘 점심: 건너뜀';
  return d?.cards.length ? '오늘 점심 후보 보기 · 11:30까지' : '오늘 점심 고르기 · 11:30까지';
}
/** 남은 시간(초). 마감 뒤에는 0. */
export const lunchSecondsLeft = (now: number): number => Math.max(0, LUNCH_CLOSE_SEC - seoulTime(now).secondOfDay);

const blank = (date: string): LunchDay => ({ date, crave: null, cards: [], report: null, outcome: null, menu: null, menuName: null, tips: [], skip: null, decidedAt: null, who: null, line: null, seen: false });
function put<S extends HasLunch>(s: S, day: LunchDay, dex = s.lunch.dex): S {
  const days = [...s.lunch.days.filter(d => d.date !== day.date), day].sort((a, b) => a.date.localeCompare(b.date)).slice(-DAY_LIMIT);
  return { ...s, lunch: { days, dex } };
}
const pick = <T>(list: readonly T[], random: Random): T => { if (!list.length) throw new Error('후보가 없어요.'); return list[Math.min(list.length - 1, Math.floor(random() * list.length))]!; };
function take<T>(list: readonly T[], n: number, random: Random): T[] {
  const rest = [...list], out: T[] = [];
  while (out.length < n && rest.length) out.push(rest.splice(Math.min(rest.length - 1, Math.floor(random() * rest.length)), 1)[0]!);
  if (out.length < n) throw new Error('후보가 모자라요.');
  return out;
}

/** 지난 날의 미확정 기록과, 오늘 11:30이 지난 미확정(또는 아직 없는) 기록을 자동 굶음으로 정리한다. 열지 않은 날은 만들지 않는다. */
export function settleLunch<S extends HasLunch>(s: S, now: number): S {
  if (!s.started) return s;
  const today = lunchDate(now);
  let next = s;
  for (const d of s.lunch.days) if (d.date < today && d.outcome === null) next = put(next, { ...d, outcome: 'skipped', skip: 'auto' });
  if (!lunchOpen(now)) {
    const d = lunchDay(next, today);
    if (!d || d.outcome === null) next = put(next, { ...(d ?? blank(today)), outcome: 'skipped', skip: 'auto' });
  }
  return next;
}

function openDay<S extends HasLunch>(s: S, now: number): LunchDay {
  if (!s.started) throw new Error('먼저 기자를 만들어 주세요.');
  if (!lunchOpen(now)) throw new Error('11:30이 지나 오늘 점심 주문은 마감됐어요.');
  const d = lunchToday(s, now) ?? blank(lunchDate(now));
  if (d.outcome) throw new Error('오늘 점심은 이미 정했어요.');
  return d;
}

/** 당김 고르기 → 후보 4장(같은 칸 3 + 다른 칸 1, 아무거나는 서로 다른 칸 4)과 과장 문구 1장. 하루 한 번. */
export function drawLunch<S extends HasLunch>(s: S, now: number, crave: CraveChoice, pool: LunchPool, random: Random): S {
  const d = openDay(s, now);
  if (d.cards.length) return s;
  if (crave !== 'any' && !CRAVES.includes(crave)) throw new Error('없는 당김이에요.');
  const by = (c: Crave) => pool.menus.filter(m => m.crave === c);
  let menus: string[];
  if (crave === 'any') menus = take(CRAVES, CANDIDATE_RULE.anyCraveDistinct, random).map(c => pick(by(c), random).id);
  else {
    const same = take(by(crave), CANDIDATE_RULE.sameCrave, random).map(m => m.id);
    const other = pick(CRAVES.filter(c => c !== crave), random);
    menus = take([...same, pick(by(other), random).id], same.length + CANDIDATE_RULE.otherCrave, random);
  }
  const hypeAt = Math.min(menus.length - 1, Math.floor(random() * menus.length)), fair = take(pool.fair, menus.length - 1, random);
  let f = 0;
  const cards = menus.map((menu, i) => (i === hypeAt ? { menu, claim: pick(pool.hype, random), hype: true } : { menu, claim: fair[f++]!, hype: false }));
  return put(s, { ...d, crave, cards });
}

/** 과장 신고(선택). 하루 한 번, 주문 전. 틀려도 감점 없음. */
export function reportLunch<S extends HasLunch>(s: S, now: number, menu: string, who: string, line: number): S {
  const d = openDay(s, now);
  if (d.report) return s;
  const card = d.cards.find(c => c.menu === menu);
  if (!card) throw new Error('후보에 없는 메뉴예요.');
  return put(s, { ...d, report: { menu, hit: card.hype, who, line } });
}

/** 주문 확정. tips는 이 메뉴에 맞는 요령(applicable) 안에서만. */
export function orderLunch<S extends HasLunch>(s: S, now: number, menu: string, menuName: string, tips: string[], applicable: string[], who: string, line: number): S {
  const d = openDay(s, now);
  if (!d.cards.some(c => c.menu === menu)) throw new Error('후보에 없는 메뉴예요.');
  if (new Set(tips).size !== tips.length || tips.some(t => !applicable.includes(t))) throw new Error('이 메뉴에 맞지 않는 주문 요령이에요.');
  const dex = s.lunch.dex.includes(menu) ? s.lunch.dex : [...s.lunch.dex, menu].slice(-DEX_LIMIT);
  return put(s, { ...d, outcome: 'ordered', menu, menuName, tips: [...tips], skip: null, decidedAt: new Date(now).toISOString(), who, line, seen: false }, dex);
}

/** 직접 굶기(후보를 뽑기 전이나 뒤 모두 가능). */
export function skipLunch<S extends HasLunch>(s: S, now: number, who: string, line: number): S {
  const d = openDay(s, now);
  return put(s, { ...d, outcome: 'skipped', skip: 'manual', decidedAt: new Date(now).toISOString(), who, line, seen: false });
}

/** 식탁 연출·카드를 한 번 보여 줬다는 표시(보상 없음, 다시 보기는 읽기만). */
export function seeLunch<S extends HasLunch>(s: S, date: string): S {
  const d = lunchDay(s, date);
  return !d || d.seen || !d.outcome ? s : put(s, { ...d, seen: true });
}

/* ---------- 저장 검사(데이터 없이 형식·일관성만) ---------- */
const ID = /^[a-z0-9-]{1,40}$/, DATE = /^\d{4}-\d{2}-\d{2}$/;
const isId = (v: unknown): v is string => typeof v === 'string' && ID.test(v);
const isIndex = (v: unknown) => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 && v < 100;

export function validateLunch(raw: unknown): LunchState {
  if (raw === undefined || raw === null) return emptyLunch(); // schema4 saves before D085
  const r = raw as Record<string, unknown>;
  if (typeof r !== 'object' || !Array.isArray(r.days) || !Array.isArray(r.dex) || r.days.length > DAY_LIMIT || r.dex.length > DEX_LIMIT) throw new Error('점심 기록이 잘못되었습니다.');
  if (!r.dex.every(isId) || new Set(r.dex).size !== r.dex.length) throw new Error('점심 도감 기록이 잘못되었습니다.');
  const days: LunchDay[] = [];
  for (const x of r.days as Record<string, unknown>[]) {
    const bad = () => new Error('점심 기록이 잘못되었습니다.');
    if (!x || typeof x !== 'object' || typeof x.date !== 'string' || !DATE.test(x.date) || !Number.isFinite(Date.parse(x.date + 'T00:00:00Z'))) throw bad();
    if (x.crave !== null && x.crave !== 'any' && !CRAVES.includes(x.crave as Crave)) throw bad();
    if (!Array.isArray(x.cards) || (x.cards.length !== 0 && x.cards.length !== 4)) throw bad();
    const cards = (x.cards as Record<string, unknown>[]).map(c => { if (!c || !isId(c.menu) || !isId(c.claim) || typeof c.hype !== 'boolean') throw bad(); return { menu: c.menu, claim: c.claim, hype: c.hype }; });
    if (cards.length && (new Set(cards.map(c => c.menu)).size !== 4 || cards.filter(c => c.hype).length !== 1 || x.crave === null)) throw bad();
    const rp = x.report as Record<string, unknown> | null;
    if (rp !== null && (!rp || !isId(rp.menu) || typeof rp.hit !== 'boolean' || !isId(rp.who) || !isIndex(rp.line) || cards.find(c => c.menu === rp.menu)?.hype !== rp.hit)) throw bad();
    if (x.outcome !== null && x.outcome !== 'ordered' && x.outcome !== 'skipped') throw bad();
    if (!Array.isArray(x.tips) || x.tips.length > 8 || !x.tips.every(isId) || new Set(x.tips).size !== x.tips.length) throw bad();
    if (typeof x.seen !== 'boolean' || (x.decidedAt !== null && (typeof x.decidedAt !== 'string' || !Number.isFinite(Date.parse(x.decidedAt))))) throw bad();
    if (x.who !== null && !isId(x.who)) throw bad();
    if (x.line !== null && !isIndex(x.line)) throw bad();
    const ordered = x.outcome === 'ordered', skipped = x.outcome === 'skipped';
    if (ordered && (!isId(x.menu) || !cards.some(c => c.menu === x.menu) || typeof x.menuName !== 'string' || !x.menuName || x.menuName.length > 30 || !x.decidedAt || x.skip !== null || !(r.dex as string[]).includes(x.menu as string))) throw bad();
    if (!ordered && (x.menu !== null || x.menuName !== null || x.tips.length)) throw bad();
    if (skipped && x.skip !== 'manual' && x.skip !== 'auto') throw bad();
    if (!skipped && x.skip !== null) throw bad();
    if (x.outcome === null && (x.decidedAt !== null || x.seen)) throw bad();
    days.push({ date: x.date, crave: x.crave as CraveChoice | null, cards, report: rp ? { menu: rp.menu as string, hit: rp.hit as boolean, who: rp.who as string, line: rp.line as number } : null, outcome: x.outcome as LunchDay['outcome'], menu: (x.menu as string | null), menuName: (x.menuName as string | null), tips: [...x.tips as string[]], skip: x.skip as LunchDay['skip'], decidedAt: x.decidedAt as string | null, who: x.who as string | null, line: x.line as number | null, seen: x.seen });
  }
  if (new Set(days.map(d => d.date)).size !== days.length) throw new Error('점심 기록 날짜가 겹쳐요.');
  days.sort((a, b) => a.date.localeCompare(b.date));
  return { days, dex: [...r.dex as string[]] };
}
