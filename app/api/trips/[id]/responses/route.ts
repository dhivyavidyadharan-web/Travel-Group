import { NextResponse } from "next/server";
import { z } from "zod";
import { deadlinePassed, getSubmissions, getTrip } from "@/lib/data";
import { isISODate } from "@/lib/dates";
import { fail, MIGRATION_MSG, needsMigration, readBody, type RouteCtx } from "@/lib/http";
import { devicePerson, hashToken, newToken, readToken, saveToken } from "@/lib/identity";
import { DEALBREAKERS, DEST_TYPES } from "@/lib/options";
import { db } from "@/lib/supabase";

const Body = z
  .object({
    name: z.string(),
    homeCity: z.string().trim().min(1, "Add your home city.").max(60),
    budgetMin: z.coerce.number({ message: "Add your minimum budget." }).int().min(0).max(1_000_000),
    budgetMax: z.coerce.number({ message: "Add your maximum budget." }).int().min(0).max(1_000_000),
    availableDates: z.array(z.string().refine(isISODate)).min(1, "Pick at least one date you're free."),
    destTypes: z
      .array(z.enum(DEST_TYPES))
      .min(1, "Rank at least one destination type.")
      .max(3)
      .refine((l) => new Set(l).size === l.length, "Each type can only be ranked once."),
    dealbreakers: z.array(z.enum(DEALBREAKERS)).default([]),
    dealbreakerOther: z.string().trim().max(200).optional().default(""),
    note: z.string().trim().max(300).optional().default(""),
  })
  .refine((b) => b.budgetMax >= b.budgetMin, "Max budget must be at least the min.")
  .refine((b) => b.budgetMax >= 1000, "Max budget looks too low (it's per person for the whole trip).");

/**
 * Submit or update your own answers. The first submit ties this browser to the
 * chosen name; after that, this browser can only edit that person, and nobody
 * else can overwrite them.
 */
export async function POST(req: Request, { params }: RouteCtx) {
  const { id } = await params;
  const trip = await getTrip(id);
  if (!trip || trip.status === "draft") return fail(404, "Trip not found.");
  if (trip.status === "decided") return fail(409, "The trip is already decided, so answers are locked.");
  if (deadlinePassed(trip)) return fail(409, "The response deadline has passed. Ask the coordinator.");

  const b = await readBody(req, Body);
  if (b instanceof NextResponse) return b;
  if (!trip.participants.includes(b.name)) return fail(400, "Pick your name from the list.");

  const dates = [...new Set(b.availableDates)].filter((d) => d >= trip.date_start && d <= trip.date_end).sort();
  if (!dates.length) return fail(400, "Pick at least one date inside the trip window.");

  const row = {
    home_city: b.homeCity,
    budget_min: b.budgetMin,
    budget_max: b.budgetMax,
    available_dates: dates,
    dest_types: b.destTypes,
    dealbreakers: b.dealbreakers,
    dealbreaker_other: b.dealbreakerOther || null,
    note: b.note || null,
    updated_at: new Date().toISOString(),
  };

  try {
    const me = await devicePerson(id);
    if (me) {
      if (me !== b.name) return fail(403, `This browser already answered as ${me}. Each person fills in the form on their own phone.`);
      const token = (await readToken(id))!;
      const { error } = await db()
        .from("responses")
        .update(row)
        .eq("trip_id", id)
        .eq("participant_name", me)
        .eq("edit_token_hash", hashToken(token));
      if (error) throw error;
    } else {
      const token = newToken();
      const { error } = await db()
        .from("responses")
        .insert({ trip_id: id, participant_name: b.name, edit_token_hash: hashToken(token), ...row });
      if (error) {
        if (error.code === "23505") {
          return fail(409, `${b.name} has already answered from another phone. Only they can change it, from the phone they used.`);
        }
        throw error;
      }
      await saveToken(id, token);
    }
  } catch (e) {
    console.error(e);
    return fail(500, needsMigration(e) ? MIGRATION_MSG : "Couldn't save your answers. Please try again.");
  }

  const subs = await getSubmissions(id);
  return NextResponse.json({ count: subs.length, total: trip.participants.length });
}
