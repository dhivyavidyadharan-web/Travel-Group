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
        className="scenery relative flex min-h-[560px] flex-col justify-end overflow-hidden rounded-[2rem] border border-white/15 p-6 shadow-2xl sm:p-8"
        style={{ "--photo": HERO } as React.CSSProperties}
      >
        <span className="eyebrow self-start">Group trips, sorted</span>
        <h1 className="mt-3 text-[2.6rem] leading-[1.02] font-extrabold sm:text-6xl">
          1,200 messages.
          <br />
          Zero plans.
          <br />
          <span className="text-accent">One link fixes it.</span>
        </h1>
        <p className="mt-3 max-w-md text-base text-white/80">
          Everyone shares their dates, budget and dealbreakers once. You get three trips that work for the whole group.
        </p>
        <a
          href="#start"
          className="glass group mt-6 flex min-h-14 items-center gap-3 rounded-full p-1.5 pr-5 font-semibold transition hover:bg-white/15"
        >
          <span className="flex size-11 items-center justify-center rounded-full bg-white text-[#0b241e]">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="12" cy="12" r="9" />
              <path d="M15.5 8.5l-2 5-5 2 2-5z" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="flex-1 text-center">Start planning</span>
          <span className="tracking-[-0.2em] text-white/60 transition group-hover:translate-x-1" aria-hidden>
            ›››
          </span>
        </a>
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
