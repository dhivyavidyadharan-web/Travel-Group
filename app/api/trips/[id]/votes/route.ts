import { NextResponse } from "next/server";
import { z } from "zod";
import { getLatestResult, getTrip, getVotes } from "@/lib/data";
import { fail, readBody, type RouteCtx } from "@/lib/http";
import { db } from "@/lib/supabase";

export async function GET(_req: Request, { params }: RouteCtx) {
  const { id } = await params;
  return NextResponse.json({ votes: await getVotes(id) });
}

/** One vote per person; voting again moves it. */
export async function POST(req: Request, { params }: RouteCtx) {
  const { id } = await params;
  const b = await readBody(req, z.object({ name: z.string(), optionId: z.string() }));
  if (b instanceof NextResponse) return b;

  const [trip, result] = await Promise.all([getTrip(id), getLatestResult(id)]);
  if (!trip || !result) return fail(404, "No options to vote on yet.");
  if (trip.status === "decided") return fail(409, "Voting is closed. The trip is decided.");
  if (!trip.participants.includes(b.name)) return fail(400, "Pick your name first.");
  if (!result.options.some((o) => o.id === b.optionId)) return fail(400, "That option no longer exists. Refresh.");

  const { error } = await db()
    .from("votes")
    .upsert(
      { trip_id: id, participant_name: b.name, option_id: b.optionId, updated_at: new Date().toISOString() },
      { onConflict: "trip_id,participant_name" },
    );
  if (error) {
    console.error(error);
    return fail(500, "Couldn't save your vote.");
  }
  return NextResponse.json({ votes: await getVotes(id) });
}
