"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { post } from "@/lib/api";

export default function CreateTripForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
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
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="hint">Earliest start</span>
            <input type="date" className="input mt-1" required value={dateStart} onChange={(e) => setDateStart(e.target.value)} />
          </label>
          <label className="block">
            <span className="hint">Latest end</span>
            <input type="date" className="input mt-1" required min={dateStart || undefined} value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} />
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
