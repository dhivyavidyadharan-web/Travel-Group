import { NextResponse } from "next/server";
import { seedDemo } from "@/lib/demo";
import { fail } from "@/lib/http";

export async function POST() {
  try {
    return NextResponse.json(await seedDemo());
  } catch (e) {
    console.error(e);
    return fail(500, "Couldn't create the demo trip. Is Supabase set up?");
  }
}
