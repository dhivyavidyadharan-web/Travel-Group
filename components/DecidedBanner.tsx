import { fmtRange } from "@/lib/dates";

export default function DecidedBanner({ option }: { option?: { destination: string; state?: string; startDate: string; endDate: string } }) {
  if (!option) return null;
  return (
    <div className="rounded-3xl bg-accent p-5 text-white shadow-lg">
      <p className="font-display text-2xl font-extrabold">✅ Decided: {option.destination}</p>
      <p className="text-lg opacity-90">
        {option.state ? `${option.state} · ` : ""}
        {fmtRange(option.startDate, option.endDate)}
      </p>
    </div>
  );
}
