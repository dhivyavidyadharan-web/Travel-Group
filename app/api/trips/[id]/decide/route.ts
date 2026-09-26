import { NextResponse } from "next/server";
import { z } from "zod";
import { getLatestResult, isAdmin } from "@/lib/data";
import { fail, readBody, type RouteCtx } from "@/lib/http";
import { db } from "@/lib/supabase";

/** Coordinator-only: lock the final option (or unlock with optionId: null). */
export async function POST(req: Request, { params }: RouteCtx) {
  const { id } = await params;
  const b = await readBody(req, z.object({ key: z.string(), optionId: z.string().nullable() }));
  if (b instanceof NextResponse) return b;
  if (!(await isAdmin(id, b.key))) return fail(403, "Only the coordinator can lock the decision.");

  const result = await getLatestResult(id);
  if (!result) return fail(409, "Generate options first.");
  if (b.optionId && !result.options.some((o) => o.id === b.optionId)) return fail(400, "Unknown option.");

  const { error } = await db()
    .from("trips")
    .update(b.optionId ? { status: "decided", decided_option_id: b.optionId } : { status: "generated", decided_option_id: null })
    .eq("id", id);
  if (error) return fail(500, "Couldn't save the decision.");
  return NextResponse.json({ ok: true });
}
