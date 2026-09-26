import { dateRange, weekday } from "./dates";
import type { DateWindow } from "./types";

interface Holiday {
  date: string;
  localName: string;
  name: string;
}

async function fetchYear(year: number): Promise<Holiday[]> {
  const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/IN`, {
    next: { revalidate: 60 * 60 * 24 * 7 },
    signal: AbortSignal.timeout(3000),
  });
  if (!res.ok) return [];
  return (await res.json()) as Holiday[];
}

/**
 * Tag windows with long weekends: a public holiday on a Friday or Monday
 * (or a weekend + holiday run of 3+ days). Fails quietly: if the API is down
 * the windows come back untouched.
 */
export async function tagLongWeekends(windows: DateWindow[]): Promise<DateWindow[]> {
  if (!windows.length) return windows;
  try {
    const years = new Set(windows.flatMap((w) => [Number(w.start.slice(0, 4)), Number(w.end.slice(0, 4))]));
    const holidays = (await Promise.all([...years].map(fetchYear))).flat();
    const byDate = new Map(holidays.map((h) => [h.date, h.name]));
    return windows.map((w) => {
      const tags = dateRange(w.start, w.end)
        .filter((d) => byDate.has(d) && [1, 5].includes(weekday(d)))
        .map((d) => ({ date: d, name: byDate.get(d)! }));
      return tags.length ? { ...w, longWeekends: tags } : w;
    });
  } catch {
    return windows;
  }
}
