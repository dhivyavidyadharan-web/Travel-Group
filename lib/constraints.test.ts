import { describe, expect, it } from "vitest";
import { budgetCeiling, budgetConflict, budgetFloor, commonDates, dealbreakers, typeScores } from "./constraints";
import { dateRange } from "./dates";

const avail = (name: string, ...ranges: [string, string][]) => ({
  participant_name: name,
  available_dates: ranges.flatMap(([a, b]) => dateRange(a, b)),
});

describe("commonDates", () => {
  const opts = { tripStart: "2026-11-01", tripEnd: "2026-11-30", minDays: 3 };

  it("finds the full-overlap window", () => {
    const r = commonDates(
      [avail("A", ["2026-11-01", "2026-11-10"]), avail("B", ["2026-11-05", "2026-11-15"])],
      opts,
    );
    expect(r.fullOverlap).toBe(true);
    expect(r.windows).toEqual([
      { start: "2026-11-05", end: "2026-11-10", days: 6, attendees: ["A", "B"], missing: [] },
    ]);
  });

  it("ignores overlaps shorter than minDays", () => {
    const r = commonDates(
      [avail("A", ["2026-11-01", "2026-11-06"]), avail("B", ["2026-11-05", "2026-11-15"])],
      opts,
    );
    // A and B only share 5–6 Nov (2 days), so the best is a solo window for each.
    expect(r.fullOverlap).toBe(false);
    expect(r.windows.every((w) => w.attendees.length === 1)).toBe(true);
  });

  it("falls back to the window most people can make and says who misses out", () => {
    const r = commonDates(
      [
        avail("A", ["2026-11-01", "2026-11-10"]),
        avail("B", ["2026-11-03", "2026-11-08"]),
        avail("C", ["2026-11-20", "2026-11-25"]),
      ],
      opts,
    );
    expect(r.fullOverlap).toBe(false);
    expect(r.windows).toHaveLength(1);
    expect(r.windows[0]).toMatchObject({ start: "2026-11-03", end: "2026-11-08", missing: ["C"] });
  });

  it("handles non-contiguous single days", () => {
    const r = commonDates(
      [
        { participant_name: "A", available_dates: ["2026-11-01", "2026-11-03", "2026-11-05"] },
        { participant_name: "B", available_dates: ["2026-11-01", "2026-11-03", "2026-11-05"] },
      ],
      opts,
    );
    expect(r.windows).toEqual([]);
  });

  it("returns nothing when nobody responded", () => {
    expect(commonDates([], opts)).toEqual({ fullOverlap: false, windows: [] });
  });
});

describe("budget", () => {
  const people = [
    { participant_name: "Riya", budget_min: 12000, budget_max: 20000 },
    { participant_name: "Karan", budget_min: 8000, budget_max: 15000 },
    { participant_name: "Sid", budget_min: 15000, budget_max: 30000 },
  ];
  it("ceiling is the lowest max, floor is the highest min", () => {
    expect(budgetCeiling(people)).toBe(15000);
    expect(budgetFloor(people)).toBe(15000);
    expect(budgetConflict(people)).toBeNull();
  });
  it("flags when the floor is above the ceiling", () => {
    const conflict = budgetConflict([...people, { participant_name: "X", budget_min: 18000, budget_max: 40000 }]);
    expect(conflict).toEqual({ floorBy: "X", ceilingBy: "Karan" });
  });
});

describe("dealbreakers", () => {
  it("unions rules with who set them, including free text", () => {
    const r = dealbreakers([
      { participant_name: "Riya", dealbreakers: ["Treks/long hikes"], dealbreaker_other: null },
      { participant_name: "Karan", dealbreakers: ["Flights", "Treks/long hikes"], dealbreaker_other: " Seafood-only places " },
    ]);
    expect(r).toEqual([
      { label: "Treks/long hikes", setBy: ["Riya", "Karan"], personal: false },
      { label: "Flights", setBy: ["Karan"], personal: true },
      { label: "Seafood-only places", setBy: ["Karan"], personal: false },
    ]);
  });
});

describe("typeScores", () => {
  it("scores 3/2/1 by rank and sums across people", () => {
    const r = typeScores([
      { participant_name: "A", dest_types: ["Beach", "City", "Adventure"] },
      { participant_name: "B", dest_types: ["City", "Beach"] },
    ]);
    expect(r[0]).toEqual({ type: "Beach", total: 5, byPerson: { A: 3, B: 2 } });
    expect(r[1]).toEqual({ type: "City", total: 5, byPerson: { A: 2, B: 3 } });
    expect(r.find((s) => s.type === "Adventure")?.total).toBe(1);
  });
});
