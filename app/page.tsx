import CreateTripForm from "@/components/CreateTripForm";

const HOW = [
  { t: "Set up the trip", d: "Dates, trip length and who's coming. It stays private until you're ready." },
  { t: "Share one link", d: "Everyone fills in a 2-minute form on their own phone. No login." },
  { t: "Decide once", d: "3 options that fit everyone's dates, budget and dealbreakers. You lock the final call." },
];

export default function Home() {
  return (
    <div className="space-y-8">
      <section className="space-y-4 pt-2">
        <p className="eyebrow">Group trip planner</p>
        <h1 className="text-4xl leading-[1.05] font-extrabold sm:text-5xl">
          1,200 messages. Zero plans.
          <br />
          <span className="text-accent">Send one link instead.</span>
        </h1>
        <p className="max-w-xl text-lg text-muted">
          Everyone submits their dates, budget and dealbreakers once. You get three trip options that work for the whole
          group, and see where each person stands on each one.
        </p>
      </section>

      <ol className="grid gap-3 sm:grid-cols-3">
        {HOW.map((s, i) => (
          <li key={s.t} className="rounded-2xl border border-line/80 bg-white/70 p-4 backdrop-blur">
            <span className="flex size-7 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent-dark">
              {i + 1}
            </span>
            <p className="mt-2 font-semibold">{s.t}</p>
            <p className="hint mt-0.5">{s.d}</p>
          </li>
        ))}
      </ol>

      <CreateTripForm />
    </div>
  );
}
