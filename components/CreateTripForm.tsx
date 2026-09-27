"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { post } from "@/lib/api";

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Today and the last allowed date (3 months out), in the organiser's local time. */
function planningWindow() {
  const today = new Date();
  const limit = new Date(today.getFullYear(), today.getMonth() + 3, today.getDate());
  // This month and the next two/three, each clipped to [today, limit].
  const months: { label: string; start: string; end: string }[] = [];
  for (let i = 0; i < 4; i++) {
    const first = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const last = new Date(today.getFullYear(), today.getMonth() + i + 1, 0);
    const start = first < today ? today : first;
    const end = last > limit ? limit : last;
    if (start <= end) months.push({ label: MONTHS[first.getMonth()], start: iso(start), end: iso(end) });
  }
  return { today: iso(today), limit: iso(limit), months };
}

export default function CreateTripForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [win, setWin] = useState<ReturnType<typeof planningWindow>>({ today: "", limit: "", months: [] });
  // Uses the phone's own "today"; computed after mount so server and client HTML match.
  useEffect(() => setWin(planningWindow()), []);
  const [picked, setPicked] = useState<number[]>([]);

  // Month chips select a continuous range of months.
  function toggleMonth(i: number) {
    const next = picked.includes(i) ? picked.filter((x) => x !== i) : [...picked, i];
    const lo = Math.min(...next), hi = Math.max(...next);
    const range = next.length ? Array.from({ length: hi - lo + 1 }, (_, k) => lo + k) : [];
    setPicked(range);
    setDateStart(range.length ? win.months[lo].start : "");
    setDateEnd(range.length ? win.months[hi].end : "");
  }
  const [minDays, setMinDays] = useState("");
  const [maxDays, setMaxDays] = useState("");
  const [people, setPeople] = useState<string[]>(["", "", ""]);
  const [deadline, setDeadline] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const setPerson = (i: number, v: string) => setPeople((p) => p.map((x, k) => (k === i ? v : x)));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { id, adminKey } = await post<{ id: string; adminKey: string }>("/api/trips", {
        name,
        dateStart,
        dateEnd,
        minDays,
        maxDays: maxDays || minDays,
        participants: people,
        // datetime-local is the coordinator's local time; send it with the offset.
        deadline: deadline ? new Date(deadline).toISOString() : null,
      });
      router.push(`/t/${id}/admin?key=${adminKey}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold">Start a trip</h2>
        <p className="hint mt-1">Only you can see this until you create the share link.</p>
      </div>

      <div>
        <label className="label" htmlFor="name">Trip name</label>
        <input id="name" className="input" required maxLength={80} placeholder="e.g. College gang reunion" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <fieldset>
        <legend className="label">When could the trip happen?</legend>
        <p className="hint -mt-0.5 mb-2">Pick months, or set exact dates. Anything in the next 3 months.</p>
        <div className="mb-3 flex flex-wrap gap-2">
          {win.months.map((m, i) => (
            <button key={m.label} type="button" aria-pressed={picked.includes(i)} className={`chip ${picked.includes(i) ? "chip-on" : ""}`} onClick={() => toggleMonth(i)}>
              {m.label}
            </button>
          ))}
          <button
            type="button"
            className={`chip ${dateStart === win.today && dateEnd === win.limit ? "chip-on" : ""}`}
            onClick={() => {
              setPicked(win.months.map((_, i) => i));
              setDateStart(win.today);
              setDateEnd(win.limit);
            }}
          >
            Next 3 months
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="hint">Earliest start</span>
            <input type="date" className="input mt-1" required min={win.today || undefined} max={win.limit || undefined} value={dateStart} onChange={(e) => { setPicked([]); setDateStart(e.target.value); }} />
          </label>
          <label className="block">
            <span className="hint">Latest end</span>
            <input type="date" className="input mt-1" required min={dateStart || win.today || undefined} max={win.limit || undefined} value={dateEnd} onChange={(e) => { setPicked([]); setDateEnd(e.target.value); }} />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend className="label">How many days?</legend>
        <div className="flex items-center gap-3">
          <input type="number" inputMode="numeric" aria-label="Minimum days" placeholder="Min" className="input w-24" required min={1} max={30} value={minDays} onChange={(e) => setMinDays(e.target.value)} />
          <span className="text-muted">to</span>
          <input type="number" inputMode="numeric" aria-label="Maximum days" placeholder="Max" className="input w-24" min={Number(minDays) || 1} max={30} value={maxDays} onChange={(e) => setMaxDays(e.target.value)} />
          <span className="text-muted">days</span>
        </div>
      </fieldset>

      <fieldset>
        <legend className="label">Who&apos;s coming? Include yourself</legend>
        <div className="space-y-2">
          {people.map((p, i) => (
            <div key={i} className="flex gap-2">
              <input className="input" placeholder={i === 0 ? "Your name" : `Friend ${i}`} maxLength={40} value={p} onChange={(e) => setPerson(i, e.target.value)} />
              {people.length > 2 && (
                <button type="button" aria-label={`Remove row ${i + 1}`} className="btn-secondary px-4" onClick={() => setPeople((l) => l.filter((_, k) => k !== i))}>
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        <button type="button" className="mt-2 text-sm font-semibold text-accent" onClick={() => setPeople((l) => [...l, ""])}>
          + Add someone
        </button>
      </fieldset>

      <div>
        <label className="label" htmlFor="deadline">Reply by (optional)</label>
        <input id="deadline" type="datetime-local" className="input" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        <p className="hint mt-1">People can change their answers until then.</p>
      </div>

      {error && <p className="rounded-2xl bg-red-500/15 p-3 text-sm text-red-200">{error}</p>}
      <button className="btn-primary w-full" disabled={busy}>
        {busy ? "Saving…" : "Save trip"}
      </button>
    </form>
  );
}
