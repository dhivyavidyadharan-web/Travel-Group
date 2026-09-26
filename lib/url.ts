import "server-only";
import { headers } from "next/headers";

/** Absolute origin for building share links, e.g. https://tripsync.vercel.app */
export async function origin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export const whatsapp = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;
