/**
 * ISO-8601 week key, e.g. "2026-W28". This is the single source of truth for
 * "which week" a score/membership/prize belongs to. Used by both FE and BE so
 * weekly leaderboards line up exactly with what the close job computes.
 */
export function getWeekKey(date: Date = new Date()): string {
  // Copy so we don't mutate the input.
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  // ISO week: Thursday determines the year.
  const day = d.getUTCDay() || 7; // Sunday = 7
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}
