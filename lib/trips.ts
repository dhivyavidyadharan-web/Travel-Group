import "server-only";
import { z } from "zod";
import { addDays, isISODate, spanDays } from "./dates";

const todayUTC = () => new Date().toISOString().slice(0, 10);
import { db } from "./supabase";
import { newAdminKey } from "./data";

export const CreateTrip = z
  .object({
    name: z.string().trim().min(1, "Give the trip a name.").max(80),
    dateStart: z.string().refine(isISODate, "Pick the earliest start date."),
    dateEnd: z.string().refine(isISODate, "Pick the latest end date."),
    minDays: z.coerce.number().int().min(1, "Trip length must be at least 1 day.").max(30),
    maxDays: z.coerce.number().int().min(1).max(30),
    participants: z.array(z.string().trim().max(40)).transform((l) => [...new Set(l.filter(Boolean))]),
    deadline: z.string().datetime({ offset: true }).nullable().optional(),
  })
  .refine((t) => t.dateEnd >= t.dateStart, "The latest end date must be after the start date.")
  .refine((t) => t.maxDays >= t.minDays, "Max days must be at least min days.")
  .refine((t) => spanDays(t.dateStart, t.dateEnd) >= t.minDays, "The date window is shorter than the trip.")
  // Next 3 months only (a day of slack either side for time zones).
  .refine((t) => t.dateStart >= addDays(todayUTC(), -1), "Pick dates from today onwards.")
  .refine((t) => t.dateEnd <= addDays(todayUTC(), 93), "Pick dates within the next 3 months.")
  .refine((t) => t.participants.length >= 2 && t.participants.length <= 20, "Add 2–20 people.");

export async function createTrip(t: z.infer<typeof CreateTrip>) {
  const adminKey = newAdminKey();
  const { data, error } = await db()
    .from("trips")
    .insert({
      name: t.name,
      date_start: t.dateStart,
      date_end: t.dateEnd,
      min_days: t.minDays,
      max_days: t.maxDays,
      participants: t.participants,
      deadline: t.deadline ?? null,
      admin_key: adminKey,
      status: "draft",
    })
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id as string, adminKey };
}
