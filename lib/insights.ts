// Small date helpers shared by the admin Dashboard and SEO & Health charts.

/** Monday (UTC) of the week containing `d`, as YYYY-MM-DD. */
export function weekStart(d: Date): string {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7));
  return x.toISOString().slice(0, 10);
}

/** The last `n` week-starts, oldest first, ending with the current week. */
export function lastWeeks(n: number): string[] {
  const out: string[] = [];
  const start = new Date(weekStart(new Date()) + 'T00:00:00Z');
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() - i * 7);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

/** Counts dates per week for the given weeks (dates outside them are ignored). */
export function perWeek(dates: unknown[], weeks: string[]) {
  const counts = new Map(weeks.map((w) => [w, 0]));
  for (const v of dates) {
    const d = new Date(String(v || ''));
    if (Number.isNaN(d.getTime())) continue;
    const w = weekStart(d);
    if (counts.has(w)) counts.set(w, (counts.get(w) || 0) + 1);
  }
  return weeks.map((week) => ({ week, count: counts.get(week) || 0 }));
}
