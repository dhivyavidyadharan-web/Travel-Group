import { NextResponse } from "next/server";
import { z } from "zod";
import { computeConstraints } from "@/lib/constraints";
import { getResponses, getTrip, isAdmin } from "@/lib/data";
import { GenerateError, generateOptions } from "@/lib/gemini";
import { tagLongWeekends } from "@/lib/holidays";
import { fail, readBody, type RouteCtx } from "@/lib/http";
import { minResponses } from "@/lib/options";
import { db } from "@/lib/supabase";
import type { StoredConstraints } from "@/lib/types";

export const maxDuration = 60;

export async function POST(req: Request, { params }: RouteCtx) {
  const { id } = await params;
  const body = await readBody(req, z.object({ key: z.string() }));
  if (body instanceof NextResponse) return body;
  if (!(await isAdmin(id, body.key))) return fail(403, "Only the coordinator can generate options.");

  const trip = await getTrip(id);
  if (!trip) return fail(404, "Trip not found.");
  const responses = (await getResponses(id)).filter((r) => trip.participants.includes(r.participant_name));
  if (responses.length < minResponses(trip.participants.length)) {
    return fail(409, `Wait for at least ${minResponses(trip.participants.length)} responses first.`);
  }

  const c = computeConstraints(trip, responses);
  if (!c.commonDates.windows.length) {
    return fail(422, `No ${trip.min_days}-day stretch works for anyone yet. Ask people to add more dates, or shorten the trip.`);
  }
  c.commonDates.windows = await tagLongWeekends(c.commonDates.windows);

  let result;
  try {
    result = await generateOptions(c, responses);
  } catch (e) {
    if (e instanceof GenerateError) return fail(502, e.message);
    console.error(e);
    return fail(502, "We couldn't get options from the planner right now. Please try again in a minute.");
  }

  const constraints: StoredConstraints = { ...c, dropped: result.dropped };
  const { error } = await db().from("results").insert({
    trip_id: id,
    constraints,
    options: result.options,
    recommended_option_id: result.recommendedOptionId,
    recommendation_reason: result.recommendationReason,
    model: result.model,
  });
  if (error) {
    console.error(error);
    return fail(500, "Generated options but couldn't save them. Please try again.");
  }
  // New options mean old votes and any lock no longer apply.
  await db().from("votes").delete().eq("trip_id", id);
  await db().from("trips").update({ status: "generated", decided_option_id: null }).eq("id", id);

  return NextResponse.json({ ok: true, options: result.options.length });
}
