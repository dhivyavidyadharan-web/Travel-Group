import { describe, expect, it } from "vitest";
import { validateOptions, ModelOutput } from "./validate";
import type { Constraints } from "./types";

const c: Constraints = {
  respondents: ["Riya", "Karan"],
  missing: [],
  minDays: 3,
  maxDays: 4,
  commonDates: {
    fullOverlap: true,
    windows: [{ start: "2026-12-20", end: "2026-12-28", days: 9, attendees: ["Riya", "Karan"], missing: [], longWeekends: [{ date: "2026-12-25", name: "Christmas" }] }],
  },
  budgetCeiling: 15000,
  budgetFloor: 12000,
  budgetConflict: null,
  dealbreakers: [{ label: "Flights", setBy: ["Karan"], personal: true }],
  typeScores: [],
};

const opt = (over: Record<string, unknown>) => ({
  id: "A",
  destination: "Gokarna",
  state: "Karnataka",
  startDate: "2026-12-24",
  endDate: "2026-12-27",
  costPerPersonMin: 9000,
  costPerPersonMax: 14000,
  pitch: "",
  tradeoffs: [],
  travel: [
    { participant: "Riya", from: "Bangalore", mode: "Train", approxHours: 7 },
    { participant: "Karan", from: "Mumbai", mode: "Train", approxHours: 8 },
  ],
  fit: [
    { participant: "Riya", score: 9, reason: "Beach is her #1" },
    { participant: "karan", score: 6, reason: "Not his type but cheap" },
  ],
  ...over,
});

const run = (options: unknown[], rec = "A") =>
  validateOptions(ModelOutput.parse({ recommendedOptionId: rec, recommendationReason: "why", options }), c);

describe("validateOptions", () => {
  it("keeps a valid option and computes fit in code", () => {
    const r = run([opt({})]);
    expect(r.dropped).toEqual([]);
    expect(r.options[0]).toMatchObject({ days: 4, groupFit: 7.5, minFit: 6, longWeekend: expect.stringContaining("Christmas") });
    expect(r.recommendedOptionId).toBe("A");
  });

  it("drops options over the budget ceiling, outside dates, or breaking travel rules", () => {
    const r = run([
      opt({ id: "A", costPerPersonMax: 18000 }),
      opt({ id: "B", destination: "Goa", startDate: "2026-12-27", endDate: "2026-12-30" }),
      opt({ id: "C", destination: "Pondy", travel: [{ participant: "Karan", from: "Mumbai", mode: "Flight", approxHours: 2 }] }),
    ]);
    expect(r.options).toEqual([]);
    expect(r.dropped.map((d) => d.id)).toEqual(["A", "B", "C"]);
    expect(r.dropped[2].reasons[0]).toMatch(/Karan won't do "Flights"/);
  });

  it("drops options missing a participant's score and re-picks the recommendation", () => {
    const r = run([
      opt({ id: "A", fit: [{ participant: "Riya", score: 9, reason: "" }] }),
      opt({ id: "B", destination: "Hampi" }),
    ]);
    expect(r.dropped[0].reasons).toContain("No fit score for Karan");
    expect(r.recommendedOptionId).toBe("B");
    expect(r.recommendationReason).toMatch(/Nobody scores it below 6/);
  });
});
