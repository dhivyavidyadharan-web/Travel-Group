export const DEST_TYPES = [
  "Beach",
  "Mountains/Hills",
  "City",
  "Heritage/Culture",
  "Nature/Wildlife",
  "Adventure",
  "Relaxation/Wellness",
] as const;

export const DEALBREAKERS = [
  "Treks/long hikes",
  "Overnight bus/train",
  "Flights",
  "Travel over 8 hours each way",
  "Camping",
  "Very cold places",
  "Very hot places",
  "Party-heavy places",
] as const;

/** Dealbreakers about how *that person* travels; checked per person, not group-wide. */
export const PERSONAL_TRAVEL_DEALBREAKERS = new Set<string>([
  "Overnight bus/train",
  "Flights",
  "Travel over 8 hours each way",
]);

export const TYPE_POINTS = [3, 2, 1] as const;

/** "Generate options" unlocks once this many people have responded. */
export function minResponses(total: number) {
  return Math.min(3, total);
}
