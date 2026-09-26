import "server-only";
import { addDays, dateRange } from "./dates";
import { db } from "./supabase";
import { createTrip } from "./trips";

type Offsets = [number, number][];

const FRIENDS: {
  name: string;
  city: string;
  budget: [number, number];
  types: string[];
  wont: string[];
  other?: string;
  note?: string;
  free: Offsets;
}[] = [
  { name: "Riya", city: "Bangalore", budget: [12000, 20000], types: ["Beach", "Relaxation/Wellness", "Nature/Wildlife"], wont: ["Treks/long hikes"], note: "Would love a place where we can actually sit and talk.", free: [[5, 20], [35, 50]] },
  { name: "Siddharth", city: "Delhi", budget: [15000, 30000], types: ["Mountains/Hills", "Adventure", "Nature/Wildlife"], wont: ["Overnight bus/train"], note: "I'd love to see snow, but happy with anything outdoorsy.", free: [[10, 18], [38, 55]] },
  { name: "Karan", city: "Mumbai", budget: [8000, 15000], types: ["City", "Heritage/Culture", "Beach"], wont: ["Flights"], note: "Must be back Monday morning.", free: [[0, 15], [36, 44]] },
  { name: "Aisha", city: "Hyderabad", budget: [10000, 25000], types: ["Beach", "Nature/Wildlife", "Adventure"], wont: [], free: [[12, 25], [30, 45]] },
  { name: "Preethi", city: "Chennai", budget: [10000, 18000], types: ["Heritage/Culture", "Relaxation/Wellness", "Beach"], wont: ["Very cold places"], other: "Nothing too party-ish", free: [[14, 22], [37, 47]] },
];

/** Creates a trip ~6 weeks out with 5 friends who have all responded. */
export async function seedDemo() {
  const today = new Date().toISOString().slice(0, 10);
  const start = addDays(today, 45);
  const { id, adminKey } = await createTrip({
    name: "Goa? Manali? Somewhere! (demo)",
    dateStart: start,
    dateEnd: addDays(start, 60),
    minDays: 3,
    maxDays: 4,
    participants: FRIENDS.map((f) => f.name),
    deadline: new Date(Date.now() + 14 * 86_400_000).toISOString(),
  });

  const { error } = await db()
    .from("responses")
    .insert(
      FRIENDS.map((f) => ({
        trip_id: id,
        participant_name: f.name,
        home_city: f.city,
        budget_min: f.budget[0],
        budget_max: f.budget[1],
        available_dates: f.free.flatMap(([a, b]) => dateRange(addDays(start, a), addDays(start, b))),
        dest_types: f.types,
        dealbreakers: f.wont,
        dealbreaker_other: f.other ?? null,
        note: f.note ?? null,
      })),
    );
  if (error) throw error;
  return { id, adminKey };
}
