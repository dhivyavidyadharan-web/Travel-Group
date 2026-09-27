import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/** Setup check: is each env var present, and can the server reach every table? Never returns secret values. */
export async function GET() {
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    GEMINI_API_KEY: !!process.env.GEMINI_API_KEY || process.env.GEMINI_MOCK === "1",
  };

  const tables: Record<string, string> = {};
  let supabase = "not configured";
  if (env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    for (const t of ["trips", "responses", "results", "votes"]) {
      try {
        const { error } = await db().from(t).select("*", { count: "exact", head: true });
        tables[t] = error ? `error: ${error.message || error.code || "unknown"}` : "ok";
      } catch (e) {
        tables[t] = `error: ${(e as Error).message}`;
      }
    }
    if (tables.responses === "ok") {
      const { error } = await db().from("responses").select("edit_token_hash", { head: true }).limit(1);
      tables.update_002 = error ? "missing: run supabase/migrations/002_draft_and_device_lock.sql" : "ok";
    }
    const values = Object.values(tables);
    supabase = values.every((v) => v === "ok")
      ? "connected"
      : tables.update_002?.startsWith("missing")
        ? "connected, but the database update is missing: run supabase/migrations/002_draft_and_device_lock.sql"
        : values.some((v) => /does not exist|schema cache|PGRST205|42P01/i.test(v))
          ? "connected, but tables are missing: run supabase/schema.sql in the SQL editor"
        : "can't connect: check the URL and service_role key";
  }

  const ok = supabase === "connected" && Object.values(env).every(Boolean);
  return NextResponse.json({ ok, supabase, tables, env }, { status: ok ? 200 : 503 });
}
