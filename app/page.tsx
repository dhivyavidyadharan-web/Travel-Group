import CreateTripForm from "@/components/CreateTripForm";
import { HERO } from "@/lib/scenery";

const HOW = [
  { icon: "🗺️", t: "Set up the trip", d: "Dates, trip length and who's coming. Private until you're ready." },
  { icon: "🔗", t: "Share one link", d: "Everyone answers on their own phone in 2 minutes. No login." },
  { icon: "✅", t: "Decide once", d: "3 options that fit everyone. You lock the final call." },
];

export default function Home() {
  return (
    <div className="space-y-6">
      <section
        className="scenery relative flex min-h-[420px] flex-col justify-end overflow-hidden rounded-[2rem] border border-white/15 p-6 shadow-2xl sm:p-8"
        style={{ "--photo": HERO } as React.CSSProperties}
      >
        <h1 className="text-5xl leading-[1.02] font-extrabold sm:text-6xl">Humara Trip Planner</h1>
        <p className="mt-3 max-w-md text-base text-white/85">
          Plan a group trip in one link. Everyone shares their dates, budget and dealbreakers, and you get three trip
          options that work for the whole group.
        </p>
      </section>

      <ol className="grid gap-3 sm:grid-cols-3">
        {HOW.map((s, i) => (
          <li key={s.t} className="card p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-2xl" aria-hidden>{s.icon}</span>
              <span className="text-xs font-bold text-white/40">0{i + 1}</span>
            </div>
            <p className="mt-2 font-semibold">{s.t}</p>
            <p className="hint mt-0.5">{s.d}</p>
          </li>
        ))}
      </ol>

      <div id="start" className="scroll-mt-6">
        <CreateTripForm />
      </div>
    </div>
  );
}
