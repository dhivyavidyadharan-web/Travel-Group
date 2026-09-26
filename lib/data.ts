import "server-only";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { db } from "./supabase";
import type { Trip, TripResponse, TripResult, Vote } from "./types";

const TRIP_COLUMNS =
  "id,name,date_start,date_end,min_days,max_days,participants,deadline,status,decided_option_id,created_at";
const RESPONSE_COLUMNS =
  "participant_name,home_city,budget_min,budget_max,available_dates,dest_types,dealbreakers,dealbreaker_other,note,updated_at";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function newAdminKey(): string {
  return randomBytes(24).toString("base64url"); // 32 chars
}

export async function getTrip(id: string): Promise<Trip | null> {
  if (!UUID.test(id)) return null;
  const { data, error } = await db().from("trips").select(TRIP_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Trip | null;
}

/** Constant-time admin key check. */
export async function isAdmin(tripId: string, key: string | null | undefined): Promise<boolean> {
  if (!key || !UUID.test(tripId)) return false;
  const { data, error } = await db().from("trips").select("admin_key").eq("id", tripId).maybeSingle();
  if (error || !data) return false;
  const a = Buffer.from(data.admin_key as string);
  const b = Buffer.from(key);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function getResponses(tripId: string): Promise<TripResponse[]> {
  const { data, error } = await db()
    .from("responses")
    .select(RESPONSE_COLUMNS)
    .eq("trip_id", tripId)
    .order("updated_at");
  if (error) throw error;
  return (data ?? []) as TripResponse[];
}

/** Who has submitted and when — no answers. */
export async function getSubmissions(tripId: string): Promise<{ participant_name: string; updated_at: string }[]> {
  const { data, error } = await db()
    .from("responses")
    .select("participant_name,updated_at")
    .eq("trip_id", tripId);
  if (error) throw error;
  return data ?? [];
}

export async function getResponse(tripId: string, name: string): Promise<TripResponse | null> {
  const { data, error } = await db()
    .from("responses")
    .select(RESPONSE_COLUMNS)
    .eq("trip_id", tripId)
    .eq("participant_name", name)
    .maybeSingle();
  if (error) throw error;
  return data as TripResponse | null;
}

export async function getLatestResult(tripId: string): Promise<TripResult | null> {
  const { data, error } = await db()
    .from("results")
    .select("id,constraints,options,recommended_option_id,recommendation_reason,model,created_at")
    .eq("trip_id", tripId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as TripResult | null;
}

export async function getVotes(tripId: string): Promise<Vote[]> {
  const { data, error } = await db()
    .from("votes")
    .select("participant_name,option_id,updated_at")
    .eq("trip_id", tripId);
  if (error) throw error;
  return (data ?? []) as Vote[];
}

export function deadlinePassed(trip: Pick<Trip, "deadline">): boolean {
  return !!trip.deadline && new Date(trip.deadline).getTime() < Date.now();
}
