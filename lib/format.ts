export const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export const inrRange = (a: number, b: number) =>
  a === b ? inr(a) : `₹${Math.round(a / 1000)}k–${Math.round(b / 1000)}k`;

export function ago(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

export function fmtDeadline(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

/** Score colour: green 7–10, amber 4–6, red 0–3. */
export function scoreTone(score: number): string {
  if (score >= 7) return "bg-emerald-100 text-emerald-800";
  if (score >= 4) return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-700";
}
