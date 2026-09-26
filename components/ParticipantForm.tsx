"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import DatePicker from "./DatePicker";
import RankPicker from "./RankPicker";
import { post } from "@/lib/api";
import { DEALBREAKERS, DEST_TYPES } from "@/lib/options";
import type { TripResponse } from "@/lib/types";

interface Props {
  tripId: string;
  participants: string[];
  submitted: string[];
  dateStart: string;
  dateEnd: string;
  hasResults: boolean;
}

const EMPTY = {
  homeCity: "",
  budgetMin: 10000,
  budgetMax: 20000,
  availableDates: [] as string[],
  destTypes: [] as string[],
  dealbreakers: [] as string[],
  dealbreakerOther: "",
  note: "",
};

export default function ParticipantForm({ tripId, participants, submitted, dateStart, dateEnd, hasResults }: Props) {
  const [name, setName] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ count: number; total: number } | null>(null);

  const set = <K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) => setForm((f) => ({ ...f, [k]: v }));

  // Remember who this phone belongs to, and prefill their previous answers.
  useEffect(() => {
    const saved = localStorage.getItem(`tripsync:${tripId}:name`);
    if (saved && participants.includes(saved)) setName(saved);
  }, [tripId, participants]);

  useEffect(() => {
    if (!name) return;
    localStorage.setItem(`tripsync:${tripId}:name`, name);
    let cancelled = false;
    setLoading(true);
    fetch(`/api/trips/${tripId}/responses?name=${encodeURIComponent(name)}`)
      .then((r) => r.json())
      .then(({ response }: { response: TripResponse | null }) => {
        if (cancelled) return;
        setIsEdit(!!response);
        setForm(
          response
            ? {
                homeCity: response.home_city,
                budgetMin: response.budget_min,
                budgetMax: response.budget_max,
                availableDates: response.available_dates,
                destTypes: response.dest_types,
                dealbreakers: response.dealbreakers,
                dealbreakerOther: response.dealbreaker_other ?? "",
                note: response.note ?? "",
              }
            : EMPTY,
        );
      })
      .catch(() => !cancelled && setIsEdit(false))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [name, tripId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.availableDates.length) return setError("Pick at least one date you're free.");
    if (!form.destTypes.length) return setError("Rank at least one destination type.");
    setBusy(true);
    try {
      setDone(await post(`/api/trips/${tripId}/responses`, { name, ...form }));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="card text-center">
        <p className="text-5xl">🎉</p>
        <h2 className="mt-2 text-2xl font-bold">Thanks, you&apos;re in!</h2>
        <p className="mt-1 text-lg text-muted">
          {done.count} of {done.total} have responded.
        </p>
        <p className="hint mt-3">Changed your mind? Open this link again and edit. Your old answer gets replaced.</p>
        <div className="mt-5 grid gap-2">
          {hasResults && (
            <Link href={`/t/${tripId}/results`} className="btn-primary">
              See the trip options →
            </Link>
          )}
          <button className="btn-secondary" onClick={() => { setDone(null); setIsEdit(true); }}>
            Edit my answers
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <section className="card">
        <label className="label" htmlFor="who">Who are you?</label>
        <select id="who" className="input" required value={name} onChange={(e) => setName(e.target.value)}>
          <option value="" disabled>Pick your name</option>
          {participants.map((p) => (
            <option key={p} value={p}>
              {p}
              {submitted.includes(p) ? " ✓" : ""}
            </option>
          ))}
        </select>
        {loading && <p className="hint mt-2">Loading your answers…</p>}
        {!loading && isEdit && name && (
          <p className="mt-2 rounded-xl bg-accent-soft p-3 text-sm text-accent-dark">
            Welcome back, {name}. Your previous answers are filled in. Saving replaces them.
          </p>
        )}
      </section>

      {name && !loading && (
        <>
          <section className="card space-y-4">
            <div>
              <label className="label" htmlFor="city">Home city</label>
              <input id="city" className="input" required maxLength={60} placeholder="e.g. Bangalore" value={form.homeCity} onChange={(e) => set("homeCity", e.target.value)} />
            </div>
            <div>
              <span className="label">Budget per person, whole trip incl. travel (₹)</span>
              <div className="flex items-center gap-3">
                <input type="number" inputMode="numeric" aria-label="Minimum budget" className="input" min={0} step={500} value={form.budgetMin} onChange={(e) => set("budgetMin", Number(e.target.value))} />
                <span className="text-muted">to</span>
                <input type="number" inputMode="numeric" aria-label="Maximum budget" className="input" min={form.budgetMin} step={500} value={form.budgetMax} onChange={(e) => set("budgetMax", Number(e.target.value))} />
              </div>
              <p className="hint mt-1">The trip is planned around the lowest max in the group, so be honest.</p>
            </div>
          </section>

          <section className="card">
            <span className="label">When are you free?</span>
            <DatePicker start={dateStart} end={dateEnd} value={form.availableDates} onChange={(v) => set("availableDates", v)} />
          </section>

          <section className="card">
            <span className="label">What kind of trip? Tap your top 3 in order</span>
            <RankPicker options={DEST_TYPES} value={form.destTypes} onChange={(v) => set("destTypes", v)} />
          </section>

          <section className="card space-y-3">
            <span className="label">Won&apos;t do (dealbreakers)</span>
            <div className="flex flex-wrap gap-2">
              {DEALBREAKERS.map((d) => {
                const on = form.dealbreakers.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={on}
                    className={`chip ${on ? "border-red-300 bg-red-50 text-red-700" : ""}`}
                    onClick={() => set("dealbreakers", on ? form.dealbreakers.filter((x) => x !== d) : [...form.dealbreakers, d])}
                  >
                    {on && "🚫"} {d}
                  </button>
                );
              })}
            </div>
            <input className="input" maxLength={200} placeholder="Anything else? (optional)" value={form.dealbreakerOther} onChange={(e) => set("dealbreakerOther", e.target.value)} />
          </section>

          <section className="card">
            <label className="label" htmlFor="note">Anything else? (optional)</label>
            <textarea id="note" className="input min-h-20 py-3" maxLength={300} placeholder={`"I'd love to see snow" or "must be back Monday morning"`} value={form.note} onChange={(e) => set("note", e.target.value)} />
          </section>

          {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button className="btn-primary sticky bottom-4 w-full shadow-lg" disabled={busy}>
            {busy ? "Saving…" : isEdit ? "Update my answers" : "Submit"}
          </button>
        </>
      )}
    </form>
  );
}
