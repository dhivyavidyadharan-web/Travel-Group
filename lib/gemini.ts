import "server-only";
import { GoogleGenAI, Type, type Schema } from "@google/genai";
import { addDays } from "./dates";
import { ModelOutput, validateOptions, type Validated } from "./validate";
import type { Constraints, TripResponse } from "./types";

export const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const MOCK = process.env.GEMINI_MOCK === "1";

const SYSTEM = `You are a fair, neutral group trip planner for a group of friends in India.
Rules — follow every one:
- Suggest exactly 3 distinct destinations (ids "A", "B", "C") reachable from every participant's home city.
- NEVER violate any dealbreaker. Group dealbreakers (e.g. treks, camping, very cold/hot places, party-heavy places) apply to the whole trip.
  Travel dealbreakers ("Flights", "Overnight bus/train", "Travel over 8 hours each way") apply to the person who set them: plan THEIR route without it.
- NEVER let costPerPersonMax exceed budgetCeiling (₹, total per person including travel from their city and stay).
- startDate and endDate must fall entirely inside ONE of commonDates.windows, and the trip length (inclusive days) must be between minDays and maxDays.
- For every option give travel for EVERY participant: mode (e.g. "Train", "Bus", "Flight + cab", "Car") and approxHours one way.
- For every option score EVERY participant 0–10 on how well it fits THEIR stated preferences (their ranked types, budget, note), with a one-line reason that mentions their actual inputs.
- Prefer options where the lowest individual score is highest (nobody should be miserable), not only the highest average. Make the 3 options genuinely different (type, region or price).
- Tradeoffs: 1–3 short honest lines naming people, e.g. "Cheapest option, but City is Karan's least favourite".
- Costs are rough estimates in round numbers; don't invent exact prices. Mention in the pitch where relevant that costs are estimates.
- recommendedOptionId is your pick; recommendationReason is ONE sentence.
Return only JSON matching the schema.`;

const str = { type: Type.STRING };
const numb = { type: Type.NUMBER };
const SCHEMA: Schema = {
  type: Type.OBJECT,
  required: ["recommendedOptionId", "recommendationReason", "options"],
  properties: {
    recommendedOptionId: str,
    recommendationReason: str,
    options: {
      type: Type.ARRAY,
      minItems: "3",
      maxItems: "3",
      items: {
        type: Type.OBJECT,
        required: [
          "id", "destination", "state", "startDate", "endDate", "costPerPersonMin",
          "costPerPersonMax", "pitch", "tradeoffs", "travel", "fit",
        ],
        propertyOrdering: [
          "id", "destination", "state", "startDate", "endDate", "costPerPersonMin",
          "costPerPersonMax", "pitch", "tradeoffs", "travel", "fit",
        ],
        properties: {
          id: str,
          destination: str,
          state: str,
          startDate: { type: Type.STRING, description: "YYYY-MM-DD" },
          endDate: { type: Type.STRING, description: "YYYY-MM-DD" },
          costPerPersonMin: numb,
          costPerPersonMax: numb,
          pitch: str,
          tradeoffs: { type: Type.ARRAY, items: str },
          travel: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              required: ["participant", "from", "mode", "approxHours"],
              properties: { participant: str, from: str, mode: str, approxHours: numb },
            },
          },
          fit: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              required: ["participant", "score", "reason"],
              properties: { participant: str, score: numb, reason: str },
            },
          },
        },
      },
    },
  },
};

export function buildPayload(c: Constraints, responses: TripResponse[]) {
  return {
    participants: responses.map((r) => ({
      name: r.participant_name,
      homeCity: r.home_city,
      budgetPerPerson: { min: r.budget_min, max: r.budget_max },
      destinationTypesRanked: r.dest_types,
      wontDo: [...r.dealbreakers, ...(r.dealbreaker_other ? [r.dealbreaker_other] : [])],
      note: r.note || undefined,
    })),
    constraints: {
      minDays: c.minDays,
      maxDays: c.maxDays,
      commonDates: c.commonDates,
      budgetCeiling: c.budgetCeiling,
      budgetFloor: c.budgetFloor,
      dealbreakers: c.dealbreakers,
      destinationTypeScores: c.typeScores.filter((t) => t.total > 0).map((t) => ({ type: t.type, points: t.total })),
    },
  };
}

async function ask(payload: unknown, feedback?: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  const ai = new GoogleGenAI({ apiKey: key });
  const contents = [
    `Plan this trip. Input JSON:\n${JSON.stringify(payload)}`,
    ...(feedback ? [`Your previous answer broke these rules. Fix them and return all 3 options again:\n${feedback}`] : []),
  ].join("\n\n");
  const res = await ai.models.generateContent({
    model: MODEL,
    contents,
    config: {
      systemInstruction: SYSTEM,
      responseMimeType: "application/json",
      responseSchema: SCHEMA,
      temperature: 0.6,
    },
  });
  return res.text ?? "";
}

function parse(text: string): ModelOutput | null {
  try {
    const r = ModelOutput.safeParse(JSON.parse(text));
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}

export class GenerateError extends Error {}

/**
 * Ask the model, validate in code, and retry once (with the problems spelled
 * out) if the JSON is unparseable or fewer than 3 options survive. Returns the
 * better of the two attempts.
 */
export async function generateOptions(c: Constraints, responses: TripResponse[]): Promise<Validated & { model: string }> {
  if (MOCK) return { ...validateOptions(mockOutput(c, responses), c), model: "mock" };

  const payload = buildPayload(c, responses);
  let best: Validated | null = null;
  let feedback: string | undefined;

  for (let attempt = 0; attempt < 2; attempt++) {
    let text: string;
    try {
      text = await ask(payload, feedback);
    } catch (e) {
      if (attempt === 1) break;
      console.error("Gemini call failed", e);
      continue;
    }
    const parsed = parse(text);
    if (!parsed) {
      feedback = "The response was not valid JSON matching the schema.";
      continue;
    }
    const v = validateOptions(parsed, c);
    if (!best || v.options.length > best.options.length) best = v;
    if (v.options.length >= 3) break;
    feedback = v.dropped.map((d) => `Option ${d.id} (${d.destination}): ${d.reasons.join("; ")}`).join("\n");
  }

  if (!best || best.options.length === 0) {
    throw new GenerateError(
      best
        ? "Every suggestion broke someone's limits. Try widening the dates or budget, then generate again."
        : "We couldn't get options from the planner right now. Please try again in a minute.",
    );
  }
  return { ...best, model: MODEL };
}

/** Canned but rule-respecting output for local development (GEMINI_MOCK=1). */
function mockOutput(c: Constraints, responses: TripResponse[]): ModelOutput {
  const w = c.commonDates.windows[0];
  const places = [
    ["Gokarna", "Karnataka", "Beach"],
    ["Hampi", "Karnataka", "Heritage/Culture"],
    ["Pondicherry", "Puducherry", "Relaxation/Wellness"],
  ];
  const ceiling = c.budgetCeiling;
  return {
    recommendedOptionId: "A",
    recommendationReason: "Mock mode: the option with the fewest trade-offs for everyone.",
    options: places.map(([destination, state, type], i) => {
      const start = w ? addDays(w.start, Math.min(i, Math.max(0, w.days - c.minDays))) : "";
      return {
        id: "ABC"[i],
        destination,
        state,
        startDate: start,
        endDate: start ? addDays(start, c.minDays - 1) : "",
        costPerPersonMin: Math.round((ceiling * (0.55 + i * 0.1)) / 500) * 500,
        costPerPersonMax: Math.round((ceiling * (0.8 + i * 0.05)) / 500) * 500,
        pitch: `(Mock) ${destination} for ${c.minDays} days. Costs are rough estimates.`,
        tradeoffs: [`Mock trade-off for ${destination}`],
        travel: responses.map((r) => ({
          participant: r.participant_name,
          from: r.home_city,
          mode: r.dealbreakers.includes("Flights") ? "Train" : "Train or bus",
          approxHours: r.dealbreakers.includes("Travel over 8 hours each way") ? 7 : 8,
        })),
        fit: responses.map((r) => {
          const rank = r.dest_types.indexOf(type);
          return {
            participant: r.participant_name,
            score: rank === 0 ? 9 : rank === 1 ? 7 : rank === 2 ? 6 : 4,
            reason: rank >= 0 ? `${type} is their #${rank + 1}` : `${type} isn't in their top 3`,
          };
        }),
      };
    }),
  };
}
