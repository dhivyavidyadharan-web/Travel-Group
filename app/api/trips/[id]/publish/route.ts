import { NextResponse } from "next/server";
import { z } from "zod";
import { getTrip, isAdmin } from "@/lib/data";
import { fail, readBody, type RouteCtx } from "@/lib/http";
import { db } from "@/lib/supabase";

/** Coordinator-only: open a draft trip so the share link starts working. */
export async function POST(req: Request, { params }: RouteCtx) {
  const { id } = await params;
  const b = await readBody(req, z.object({ key: z.string() }));
  if (b instanceof NextResponse) return b;
  if (!(await isAdmin(id, b.key))) return fail(403, "Only the coordinator can open the trip.");
  const trip = await getTrip(id);
  if (!trip) return fail(404, "Trip not found.");
  if (trip.status !== "draft") return NextResponse.json({ ok: true });

  const { error } = await db().from("trips").update({ status: "collecting" }).eq("id", id).eq("status", "draft");
  if (error) return fail(500, "Couldn't open the trip. Please try again.");
  return NextResponse.json({ ok: true });
}
