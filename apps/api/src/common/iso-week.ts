/**
 * ISO-8601 week helpers — used by the WEEKLY prize system (separate from the daily
 * leaderboard period in `week-key.ts`). Prizes stay weekly even though leagues are daily.
 */

/** ISO week key, e.g. "2026-W28". Thursday determines the year. */
export function getIsoWeekKey(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

/** ISO week key for the week before `now` (default: last week). */
export function previousIsoWeekKey(now: Date = new Date()): string {
  return getIsoWeekKey(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
}

/** [start, end) UTC bounds for an ISO week key like "2026-W28" (Mon 00:00 → next Mon 00:00). */
export function isoWeekRange(weekKey: string): { start: Date; end: Date } {
  const [yStr, wStr] = weekKey.split("-W");
  const year = Number(yStr);
  const week = Number(wStr);
  const jan4 = new Date(Date.UTC(year, 0, 4)); // Jan 4 is always in ISO week 1
  const jan4Day = jan4.getUTCDay() || 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - (jan4Day - 1));
  const start = new Date(week1Monday);
  start.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 7);
  return { start, end };
}
