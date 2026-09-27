import { NextResponse } from "next/server";
import type { z } from "zod";

export const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

export async function readBody<T extends z.ZodTypeAny>(req: Request, schema: T): Promise<z.infer<T> | NextResponse> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return fail(400, "Invalid request body.");
  }
  const r = schema.safeParse(raw);
  if (!r.success) return fail(400, r.error.issues[0]?.message ?? "Invalid input.");
  return r.data;
}

/** A database error caused by the update SQL (002) not having been run yet. */
export function needsMigration(e: unknown): boolean {
  const msg = JSON.stringify(e ?? "");
  return /trips_status_check|edit_token_hash/.test(msg);
}

export const MIGRATION_MSG =
  "The database needs a one-time update: run supabase/migrations/002_draft_and_device_lock.sql in the Supabase SQL editor.";

export type RouteCtx = { params: Promise<{ id: string }> };
