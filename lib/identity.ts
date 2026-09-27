import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { db } from "./supabase";

// One browser = one person per trip. The first submit hands the browser a
// random token in an httpOnly cookie; only its hash is stored with the answer.
// Later edits and votes must present the same token.

const cookieName = (tripId: string) => `ts_${tripId.replace(/-/g, "").slice(0, 16)}`;

export const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

export function newToken(): string {
  return randomBytes(24).toString("base64url");
}

export async function readToken(tripId: string): Promise<string | null> {
  return (await cookies()).get(cookieName(tripId))?.value ?? null;
}

export async function saveToken(tripId: string, token: string) {
  // HTTPS-only everywhere except plain-http local development.
  const h = await headers();
  const secure = (h.get("x-forwarded-proto") ?? "http") === "https" || !/^localhost(:\d+)?$/.test(h.get("host") ?? "");
  (await cookies()).set(cookieName(tripId), token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

/** The participant this browser answered as, or null if it hasn't answered yet. */
export async function devicePerson(tripId: string): Promise<string | null> {
  const token = await readToken(tripId);
  if (!token) return null;
  const { data } = await db()
    .from("responses")
    .select("participant_name")
    .eq("trip_id", tripId)
    .eq("edit_token_hash", hashToken(token))
    .maybeSingle();
  return (data?.participant_name as string | undefined) ?? null;
}
