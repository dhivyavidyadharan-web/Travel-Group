// Deterministic group rules, computed BEFORE the model is called.
// Everything here is a pure function so it can be unit tested.

import { addDays, dateRange } from "./dates";
import { DEST_TYPES, PERSONAL_TRAVEL_DEALBREAKERS, TYPE_POINTS } from "./options";
import type {
  CommonDates,
  Constraints,
  DateWindow,
  Dealbreaker,
  TripResponse,
  TypeScore,
} from "./types";

type Availability = Pick<TripResponse, "participant_name" | "available_dates">;
type Budget = Pick<TripResponse, "participant_name" | "budget_min" | "budget_max">;
type Rules = Pick<TripResponse, "participant_name" | "dealbreakers" | "dealbreaker_other">;
type Ranking = Pick<TripResponse, "participant_name" | "dest_types">;

/**
 * Find the contiguous windows (at least `minDays` long, inside the trip window)
 * that the most people can make. If everyone can make some window, only those
 * full-overlap windows are returned; otherwise the windows with the highest
 * attendance, with who would miss out.
 */
export function commonDates(
  people: Availability[],
  opts: { tripStart: string; tripEnd: string; minDays: number; maxWindows?: number },
): CommonDates {
  const { tripStart, tripEnd, minDays, maxWindows = 4 } = opts;
  const names = people.map((p) => p.participant_name);
  if (people.length === 0 || minDays < 1) return { fullOverlap: false, windows: [] };

  const sets = people.map((p) => new Set(p.available_dates));
  const days = dateRange(tripStart, tripEnd);

  // For each possible start day, who is free on every day of a minDays block?
  const blocks: { start: number; who: string[] }[] = [];
  for (let i = 0; i + minDays <= days.length; i++) {
    const block = days.slice(i, i + minDays);
    const who = names.filter((_, k) => block.every((d) => sets[k].has(d)));
    blocks.push({ start: i, who });
  }

  const best = Math.max(0, ...blocks.map((b) => b.who.length));
  if (best === 0) return { fullOverlap: false, windows: [] };

  // Merge consecutive start days with the same attendee set into one window.
  const windows: DateWindow[] = [];
  let run: { first: number; last: number; key: string; who: string[] } | null = null;
  const flush = () => {
    if (!run) return;
    const start = days[run.first];
    const end = addDays(days[run.last], minDays - 1);
    windows.push({
      start,
      end,
      days: run.last - run.first + minDays,
      attendees: run.who,
      missing: names.filter((n) => !run!.who.includes(n)),
    });
    run = null;
  };
  for (const b of blocks) {
    if (b.who.length !== best) {
      flush();
      continue;
    }
    const key = b.who.join("|");
    if (run && run.key === key && run.last === b.start - 1) run.last = b.start;
    else {
      flush();
      run = { first: b.start, last: b.start, key, who: b.who };
    }
  }
  flush();

  windows.sort((a, b) => b.days - a.days || a.start.localeCompare(b.start));
  return {
    fullOverlap: best === names.length,
    windows: windows.slice(0, maxWindows).sort((a, b) => a.start.localeCompare(b.start)),
  };
}

/** The lowest max budget: the trip must be affordable for everyone. */
export function budgetCeiling(people: Budget[]): number {
  return people.length ? Math.min(...people.map((p) => p.budget_max)) : 0;
}

/** The highest min budget: below this, someone feels it's too basic. */
export function budgetFloor(people: Budget[]): number {
  return people.length ? Math.max(...people.map((p) => p.budget_min)) : 0;
}

export function budgetConflict(people: Budget[]): Constraints["budgetConflict"] {
  if (!people.length) return null;
  const ceilingBy = people.reduce((a, b) => (b.budget_max < a.budget_max ? b : a));
  const floorBy = people.reduce((a, b) => (b.budget_min > a.budget_min ? b : a));
  return floorBy.budget_min > ceilingBy.budget_max
    ? { floorBy: floorBy.participant_name, ceilingBy: ceilingBy.participant_name }
    : null;
}

/** Union of everyone's won't-dos, with who set each one. */
export function dealbreakers(people: Rules[]): Dealbreaker[] {
  const map = new Map<string, string[]>();
  const add = (label: string, who: string) => {
    const list = map.get(label) ?? [];
    if (!list.includes(who)) list.push(who);
    map.set(label, list);
  };
  for (const p of people) {
    for (const d of p.dealbreakers) add(d, p.participant_name);
    const other = p.dealbreaker_other?.trim();
    if (other) add(other, p.participant_name);
  }
  return [...map.entries()].map(([label, setBy]) => ({
    label,
    setBy,
    personal: PERSONAL_TRAVEL_DEALBREAKERS.has(label),
  }));
}

/** #1 = 3 pts, #2 = 2, #3 = 1 per person, summed. Sorted high to low. */
export function typeScores(people: Ranking[]): TypeScore[] {
  const scores: TypeScore[] = DEST_TYPES.map((type) => ({ type, total: 0, byPerson: {} }));
  const byType = new Map(scores.map((s) => [s.type, s]));
  for (const p of people) {
    p.dest_types.slice(0, TYPE_POINTS.length).forEach((type, rank) => {
      const s = byType.get(type);
      if (!s) return;
      s.total += TYPE_POINTS[rank];
      s.byPerson[p.participant_name] = TYPE_POINTS[rank];
    });
  }
  return scores.sort((a, b) => b.total - a.total);
}

export function computeConstraints(
  trip: { date_start: string; date_end: string; min_days: number; max_days: number; participants: string[] },
  responses: TripResponse[],
): Constraints {
  const respondents = responses.map((r) => r.participant_name);
  return {
    respondents,
    missing: trip.participants.filter((p) => !respondents.includes(p)),
    minDays: trip.min_days,
    maxDays: trip.max_days,
    commonDates: commonDates(responses, {
      tripStart: trip.date_start,
      tripEnd: trip.date_end,
      minDays: trip.min_days,
    }),
    budgetCeiling: budgetCeiling(responses),
    budgetFloor: budgetFloor(responses),
    budgetConflict: budgetConflict(responses),
    dealbreakers: dealbreakers(responses),
    typeScores: typeScores(responses),
  };
}
