import { clock as lunchClock } from '../../data/balance/lunch.v0.1.json';

/**
 * Real-time clock (D068, lunch step 5). The game reads the device clock and interprets it in Asia/Seoul only.
 * There is no in-game time-of-day setting; old saves may still contain `settings.time`, which is read and ignored.
 * This module has no DOM and takes the instant as a parameter so that rules stay testable.
 */
export const GAME_TIME_ZONE: string = lunchClock.timezone;

/** Used only if the runtime has no time-zone data. Korea has kept UTC+9 without daylight saving since 1988. */
const SEOUL_OFFSET_MS = 9 * 60 * 60 * 1000;
/** ECMAScript Date range (±100,000,000 days). */
const MAX_TIME_MS = 8.64e15;

export type SeoulTime = {
  /** Calendar day in Seoul, `YYYY-MM-DD`. A new day starts at 00:00:00 Seoul time. */
  dateKey: string;
  year: number; month: number; day: number;
  hour: number; minute: number; second: number;
  /** Seconds since 00:00:00 Seoul time (0–86399). */
  secondOfDay: number;
};


let formatter: Intl.DateTimeFormat | null | undefined;
function seoulFormatter(): Intl.DateTimeFormat | null {
  if (formatter !== undefined) return formatter;
  try {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: GAME_TIME_ZONE, hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch { formatter = null; }
  return formatter;
}

const pad = (n: number, w = 2) => String(n).padStart(w, '0');

function build(year: number, month: number, day: number, hour: number, minute: number, second: number): SeoulTime {
  return {
    dateKey: pad(year, 4) + '-' + pad(month) + '-' + pad(day),
    year, month, day, hour, minute, second,
    secondOfDay: hour * 3600 + minute * 60 + second,
  };
}

function checkInstant(ms: number): void {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || Math.abs(ms) > MAX_TIME_MS) throw new Error('기기 시계 값이 올바르지 않아요.');
}

/** Fixed UTC+9 reading. Exported for tests that compare it with the time-zone database. */
export function seoulTimeByOffset(ms: number): SeoulTime {
  checkInstant(ms);
  const d = new Date(Math.floor(ms / 1000) * 1000 + SEOUL_OFFSET_MS);
  if (!Number.isFinite(d.getTime())) throw new Error('기기 시계 값이 올바르지 않아요.');
  return build(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds());
}

/** Reads an instant (epoch milliseconds, e.g. `Date.now()`) as Seoul wall-clock time, whatever the device time zone is. */
export function seoulTime(ms: number): SeoulTime {
  checkInstant(ms);
  const f = seoulFormatter();
  if (f) {
    try {
      const parts: Record<string, number> = {};
      for (const p of f.formatToParts(ms)) if (p.type !== 'literal') parts[p.type] = Number(p.value);
      const { year, month, day, minute, second } = parts;
      const hour = parts.hour === 24 ? 0 : parts.hour;
      const ok = [year, month, day, hour, minute, second].every(n => Number.isSafeInteger(n))
        && year! >= 1 && month! >= 1 && month! <= 12 && day! >= 1 && day! <= 31 && hour! >= 0 && hour! <= 23 && minute! >= 0 && minute! <= 59 && second! >= 0 && second! <= 59;
      if (ok) return build(year!, month!, day!, hour!, minute!, second!);
    } catch { /* fall back to the fixed offset below */ }
  }
  return seoulTimeByOffset(ms);
}
