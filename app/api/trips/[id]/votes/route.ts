import { NextResponse } from "next/server";
import { z } from "zod";
import { getLatestResult, getTrip } from "@/lib/data";
import { fail, readBody, type RouteCtx } from "@/lib/http";
import { devicePerson } from "@/lib/identity";
import { db } from "@/lib/supabase";

/** One vote per person, cast from the browser they answered on; voting again moves it. */
export async function POST(req: Request, { params }: RouteCtx) {
  const { id } = await params;
  const b = await readBody(req, z.object({ optionId: z.string() }));
  if (b instanceof NextResponse) return b;

  const [trip, result] = await Promise.all([getTrip(id), getLatestResult(id)]);
  if (!trip || !result || trip.status === "draft") return fail(404, "No options to vote on yet.");
  if (trip.status === "decided") return fail(409, "Voting is closed. The trip is decided.");
  const me = await devicePerson(id);
  if (!me) return fail(403, "Fill in your answers first. Then you can vote from this phone.");
  if (!result.options.some((o) => o.id === b.optionId)) return fail(400, "That option no longer exists. Refresh.");

  const { error } = await db()
    .from("votes")
    .upsert(
      { trip_id: id, participant_name: me, option_id: b.optionId, updated_at: new Date().toISOString() },
      { onConflict: "trip_id,participant_name" },
    );
  if (error) {
    console.error(error);
    return fail(500, "Couldn't save your vote.");
  }
  return NextResponse.json({ ok: true });
}
