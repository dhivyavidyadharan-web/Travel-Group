// Checks the model's JSON against the hard rules computed in code.
// The model suggests; this file decides what is allowed to reach the group.

import { z } from "zod";
import { dateRange, fmtDate, isISODate, spanDays } from "./dates";
import type { Constraints, DroppedOption, TripOption } from "./types";

const num = z.coerce.number().finite();

export const ModelOutput = z.object({
  recommendedOptionId: z.string().optional().default(""),
  recommendationReason: z.string().optional().default(""),
  options: z
    .array(
      z.object({
        id: z.string(),
        destination: z.string().min(1),
        state: z.string().default(""),
        startDate: z.string(),
        endDate: z.string(),
        costPerPersonMin: num,
        costPerPersonMax: num,
        pitch: z.string().default(""),
        tradeoffs: z.array(z.string()).default([]),
        travel: z
          .array(z.object({ participant: z.string(), from: z.string().default(""), mode: z.string(), approxHours: num }))
          .default([]),
        fit: z.array(z.object({ participant: z.string(), score: num, reason: z.string().default("") })).default([]),
      }),
    )
    .min(1),
});
export type ModelOutput = z.infer<typeof ModelOutput>;

export interface Validated {
  options: TripOption[];
  dropped: DroppedOption[];
  recommendedOptionId: string | null;
  recommendationReason: string;
}

const norm = (s: string) => s.trim().toLowerCase();

const TRAVEL_RULES: Record<string, (mode: string, hours: number) => boolean> = {
  Flights: (mode) => /\b(flight|fly|flying|air|plane)\b/i.test(mode),
  "Overnight bus/train": (mode) => /overnight|sleeper|night (bus|train)/i.test(mode),
  "Travel over 8 hours each way": (_, hours) => hours > 8,
};

const round1 = (n: number) => Math.round(n * 10) / 10;

export function validateOptions(raw: ModelOutput, c: Constraints): Validated {
  const people = c.respondents;
  const dropped: DroppedOption[] = [];
  const kept: TripOption[] = [];
  const seen = new Set<string>();
  const holidays = c.commonDates.windows.flatMap((w) => w.longWeekends ?? []);

  for (const o of raw.options) {
    const reasons: string[] = [];

    // Scores: every respondent, matched by name, clamped to 0–10.
    const fit = people.map((name) => {
      const f = o.fit.find((x) => norm(x.participant) === norm(name));
      if (!f) reasons.push(`No fit score for ${name}`);
      return {
        participant: name,
        score: f ? Math.max(0, Math.min(10, Math.round(f.score))) : 0,
        reason: f?.reason.trim() ?? "",
      };
    });

    // Budget: never above the lowest max.
    let [costMin, costMax] = [Math.round(o.costPerPersonMin), Math.round(o.costPerPersonMax)];
    if (costMin > costMax) [costMin, costMax] = [costMax, costMin];
    if (costMax > c.budgetCeiling) {
      reasons.push(`Costs up to ₹${costMax.toLocaleString("en-IN")}, above the ₹${c.budgetCeiling.toLocaleString("en-IN")} ceiling`);
    }

    // Dates: inside one computed window, and within the trip length.
    let days = 0;
    if (!isISODate(o.startDate) || !isISODate(o.endDate) || o.endDate < o.startDate) {
      reasons.push("Invalid dates");
    } else {
      days = spanDays(o.startDate, o.endDate);
      const inWindow = c.commonDates.windows.some((w) => o.startDate >= w.start && o.endDate <= w.end);
      if (!inWindow) reasons.push(`${fmtDate(o.startDate)}–${fmtDate(o.endDate)} is outside the dates people can make`);
      if (days < c.minDays || days > c.maxDays) {
        reasons.push(`${days} days is outside the ${c.minDays}–${c.maxDays} day trip length`);
      }
    }

    // Personal travel dealbreakers, checked against that person's own route.
    const travel = people.map((name) => {
      const t = o.travel.find((x) => norm(x.participant) === norm(name));
      return {
        participant: name,
        from: t?.from ?? "",
        mode: t?.mode ?? "Not specified",
        approxHours: t ? round1(Math.max(0, t.approxHours)) : 0,
      };
    });
    for (const rule of c.dealbreakers.filter((d) => d.personal && TRAVEL_RULES[d.label])) {
      for (const who of rule.setBy) {
        const leg = travel.find((t) => t.participant === who);
        if (leg && TRAVEL_RULES[rule.label](leg.mode, leg.approxHours)) {
          reasons.push(`${who} won't do "${rule.label}" but the route is ${leg.mode} (${leg.approxHours}h)`);
        }
      }
    }

    const key = norm(o.destination);
    if (seen.has(key)) reasons.push("Duplicate destination");

    if (reasons.length) {
      dropped.push({ id: o.id, destination: o.destination, reasons });
      continue;
    }
    seen.add(key);

    const scores = fit.map((f) => f.score);
    const inRange = new Set(dateRange(o.startDate, o.endDate));
    const hol = holidays.find((h) => inRange.has(h.date));
    kept.push({
      id: o.id.trim().toUpperCase(),
      destination: o.destination.trim(),
      state: o.state.trim(),
      startDate: o.startDate,
      endDate: o.endDate,
      days,
      costPerPersonMin: costMin,
      costPerPersonMax: costMax,
      pitch: o.pitch.trim(),
      tradeoffs: o.tradeoffs.map((t) => t.trim()).filter(Boolean),
      travel,
      fit,
      groupFit: scores.length ? round1(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
      minFit: scores.length ? Math.min(...scores) : 0,
      ...(hol ? { longWeekend: `${hol.name} (${fmtDate(hol.date)}) — long weekend` } : {}),
    });
  }

  // Keep the model's ids (its reason text refers to them) unless they clash.
  const options = kept.slice(0, 3);
  const used = new Set<string>();
  for (const o of options) {
    if (!o.id || used.has(o.id)) o.id = [..."ABCDEFG"].find((l) => !used.has(l))!;
    used.add(o.id);
  }

  // Keep the model's pick if it survived; otherwise pick in code: the option
  // where the least happy person is happiest, then the best average.
  const byModel = options.find((o) => norm(o.id) === norm(raw.recommendedOptionId));
  const best = [...options].sort((a, b) => b.minFit - a.minFit || b.groupFit - a.groupFit)[0];
  const rec = byModel ?? best;
  const reason = byModel
    ? raw.recommendationReason.trim()
    : rec
      ? `Nobody scores it below ${rec.minFit}/10, the best worst-case of the options, with a group fit of ${rec.groupFit}.`
      : "";

  return {
    options,
    dropped,
    recommendedOptionId: rec?.id ?? null,
    recommendationReason: reason,
  };
}
