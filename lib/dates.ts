// Dates are plain "YYYY-MM-DD" strings everywhere; all arithmetic is done in UTC
// so the server's time zone never shifts a day.

const DAY_MS = 86_400_000;

export function toUTC(d: string): number {
  const [y, m, day] = d.split("-").map(Number);
  return Date.UTC(y, m - 1, day);
}

export function fromUTC(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(d: string, n: number): string {
  return fromUTC(toUTC(d) + n * DAY_MS);
}

/** Inclusive number of days from a to b (same day = 1). */
export function spanDays(a: string, b: string): number {
  return Math.round((toUTC(b) - toUTC(a)) / DAY_MS) + 1;
}

/** Every date from start to end inclusive. */
export function dateRange(start: string, end: string): string[] {
  const out: string[] = [];
  for (let t = toUTC(start), e = toUTC(end); t <= e; t += DAY_MS) out.push(fromUTC(t));
  return out;
}

export function isISODate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(toUTC(s));
}

export function weekday(d: string): number {
  return new Date(toUTC(d)).getUTCDay(); // 0 = Sunday
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function fmtDate(d: string): string {
  const [, m, day] = d.split("-").map(Number);
  return `${day} ${MONTHS[m - 1]}`;
}

export function fmtRange(a: string, b: string): string {
  if (a === b) return fmtDate(a);
  const [ya, ma] = a.split("-");
  const [yb, mb] = b.split("-");
  if (ya === yb && ma === mb) return `${Number(a.slice(8))}–${fmtDate(b)}`;
  return `${fmtDate(a)} – ${fmtDate(b)}`;
}
