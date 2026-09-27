import { NextResponse } from "next/server";
import { CreateTrip, createTrip } from "@/lib/trips";
import { fail, MIGRATION_MSG, needsMigration, readBody } from "@/lib/http";

export async function POST(req: Request) {
  const body = await readBody(req, CreateTrip);
  if (body instanceof NextResponse) return body;
  try {
    return NextResponse.json(await createTrip(body));
  } catch (e) {
    console.error(e);
    return fail(500, needsMigration(e) ? MIGRATION_MSG : "Couldn't create the trip. Please try again.");
  }
}
