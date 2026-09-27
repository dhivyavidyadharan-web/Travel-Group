import { fmtRange } from "@/lib/dates";
import { photoFor } from "@/lib/scenery";

export default function DecidedBanner({ option }: { option?: { destination: string; state?: string; startDate: string; endDate: string; pitch?: string } }) {
  if (!option) return null;
  return (
    <div
      className="scenery relative overflow-hidden rounded-[1.75rem] border border-white/20 p-6 pt-24 shadow-2xl"
      style={{ "--photo": photoFor(`${option.destination} ${option.pitch ?? ""}`) } as React.CSSProperties}
    >
      <span className="eyebrow">✅ Decided</span>
      <p className="mt-2 font-display text-3xl font-extrabold">{option.destination}</p>
      <p className="text-lg text-white/85">
        {option.state ? `${option.state} · ` : ""}
        {fmtRange(option.startDate, option.endDate)}
      </p>
    </div>
  );
}
