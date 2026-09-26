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

export type RouteCtx = { params: Promise<{ id: string }> };
