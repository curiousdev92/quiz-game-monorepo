/**
 * Period key for leaderboards/leagues. Periods are **daily** (UTC), e.g. "2026-07-19".
 * A "league" = the leaderboard for one period; each period ends at 00:00 UTC.
 * NOTE: the DB column is still named `weekKey` (legacy) but now holds a day string.
 */
export function getPeriodKey(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

/** The period immediately before the one containing `now` (i.e. yesterday). */
export function previousPeriodKey(now: Date = new Date()): string {
  return getPeriodKey(new Date(now.getTime() - 24 * 60 * 60 * 1000));
}

/** @deprecated Periods are daily now — kept so existing imports keep working. */
export const getWeekKey = getPeriodKey;
