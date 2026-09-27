"use client";

import Link from "next/link";
import { useState } from "react";
import DatePicker from "./DatePicker";
import RankPicker from "./RankPicker";
import { post } from "@/lib/api";
import { DEALBREAKERS, DEST_TYPES } from "@/lib/options";
import type { TripResponse } from "@/lib/types";

interface Props {
  tripId: string;
  participants: string[];
  answered: string[];
  /** the person this browser already answered as, if any */
  me: string | null;
  /** only ever this browser's own previous answers */
  mine: TripResponse | null;
  dateStart: string;
  dateEnd: string;
  hasResults: boolean;
}

type Form = {
  homeCity: string;
  budgetMin: string;
  budgetMax: string;
  availableDates: string[];
  destTypes: string[];
  dealbreakers: string[];
  dealbreakerOther: string;
  note: string;
};

const EMPTY: Form = {
  homeCity: "",
  budgetMin: "",
  budgetMax: "",
  availableDates: [],
  destTypes: [],
  dealbreakers: [],
  dealbreakerOther: "",
  note: "",
};

function fromResponse(r: TripResponse): Form {
  return {
    homeCity: r.home_city,
    budgetMin: String(r.budget_min),
    budgetMax: String(r.budget_max),
    availableDates: r.available_dates,
    destTypes: r.dest_types,
    dealbreakers: r.dealbreakers,
    dealbreakerOther: r.dealbreaker_other ?? "",
    note: r.note ?? "",
  };
}

function Step({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="card space-y-4">
      <div className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft font-bold text-accent-dark">{n}</span>
        <div>
          <h2 className="text-lg leading-tight font-extrabold">{title}</h2>
          {hint && <p className="hint mt-0.5">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

export default function ParticipantForm({ tripId, participants, answered, me, mine, dateStart, dateEnd, hasResults }: Props) {
  const [name, setName] = useState(me ?? "");
  const [form, setForm] = useState<Form>(mine ? fromResponse(mine) : EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ count: number; total: number } | null>(null);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const isEdit = !!me;

  const checks = [
    !!name,
    !!form.homeCity.trim() && form.budgetMin !== "" && form.budgetMax !== "",
    form.availableDates.length > 0,
    form.destTypes.length > 0,
  ];
  const doneCount = checks.filter(Boolean).length;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name) return setError("Pick your name first.");
    if (!form.homeCity.trim()) return setError("Add your home city.");
    if (form.budgetMin === "" || form.budgetMax === "") return setError("Add your budget range.");
    if (!form.availableDates.length) return setError("Pick at least one date you're free.");
    if (!form.destTypes.length) return setError("Rank at least one kind of trip.");
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
      <div className="card space-y-4 text-center">
        <p className="text-5xl">🎉</p>
        <div>
          <h2 className="text-2xl font-extrabold">{isEdit ? "Updated!" : "Thanks, you're in!"}</h2>
          <p className="mt-1 text-lg text-muted">
            {done.count} of {done.total} have answered.
          </p>
        </div>
        <p className="hint">Changed your mind? Open this link again on this phone and edit. Your answer gets replaced, never duplicated.</p>
        <div className="grid gap-2">
          {hasResults && (
            <Link href={`/t/${tripId}/results`} className="btn-primary">
              See the trip options →
            </Link>
          )}
          <button className="btn-secondary" onClick={() => window.location.reload()}>
            Edit my answers
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Step n={1} title="Who are you?">
        {me ? (
          <p className="rounded-2xl bg-accent-soft p-3 text-sm text-accent-dark">
            You&apos;re answering as <b>{me}</b> on this phone. Your earlier answers are below, and saving replaces them.
          </p>
        ) : (
          <>
            <select id="who" aria-label="Your name" className="input" required value={name} onChange={(e) => setName(e.target.value)}>
              <option value="" disabled>
                Pick your name
              </option>
              {participants.map((p) => (
                <option key={p} value={p} disabled={answered.includes(p)}>
                  {p}
                  {answered.includes(p) ? " (already answered)" : ""}
                </option>
              ))}
            </select>
            <p className="hint">This phone will answer for this person only.</p>
          </>
        )}
      </Step>

      <Step n={2} title="Where from, and what budget?" hint="Budget per person for the whole trip, including travel.">
        <div>
          <label className="label" htmlFor="city">Home city</label>
          <input id="city" className="input" maxLength={60} placeholder="e.g. Bangalore" value={form.homeCity} onChange={(e) => set("homeCity", e.target.value)} />
        </div>
        <div>
          <span className="label">Budget (₹)</span>
          <div className="flex items-center gap-3">
            <input type="number" inputMode="numeric" aria-label="Minimum budget" placeholder="Min" className="input" min={0} step={500} value={form.budgetMin} onChange={(e) => set("budgetMin", e.target.value)} />
            <span className="text-muted">to</span>
            <input type="number" inputMode="numeric" aria-label="Maximum budget" placeholder="Max" className="input" min={0} step={500} value={form.budgetMax} onChange={(e) => set("budgetMax", e.target.value)} />
          </div>
          <p className="hint mt-1.5">The group&apos;s plan has to fit the lowest max, so be honest.</p>
        </div>
      </Step>

      <Step n={3} title="When are you free?">
        <DatePicker start={dateStart} end={dateEnd} value={form.availableDates} onChange={(v) => set("availableDates", v)} />
      </Step>

      <Step n={4} title="What kind of trip?" hint="Tap up to 3, in order of preference.">
        <RankPicker options={DEST_TYPES} value={form.destTypes} onChange={(v) => set("destTypes", v)} />
      </Step>

      <Step n={5} title="Won't do" hint="Optional. Options that break any of these are never suggested.">
        <div className="flex flex-wrap gap-2">
          {DEALBREAKERS.map((d) => {
            const on = form.dealbreakers.includes(d);
            return (
              <button
                key={d}
                type="button"
                aria-pressed={on}
                className={`chip ${on ? "border-coral bg-coral-soft text-coral" : ""}`}
                onClick={() => set("dealbreakers", on ? form.dealbreakers.filter((x) => x !== d) : [...form.dealbreakers, d])}
              >
                {on && "🚫"} {d}
              </button>
            );
          })}
        </div>
        <input className="input" aria-label="Other dealbreaker" maxLength={200} placeholder="Anything else you won't do?" value={form.dealbreakerOther} onChange={(e) => set("dealbreakerOther", e.target.value)} />
      </Step>

      <Step n={6} title="Anything else?" hint="Optional.">
        <textarea id="note" aria-label="Note" className="input min-h-24 py-3" maxLength={300} placeholder={`"I'd love to see snow" or "must be back Monday morning"`} value={form.note} onChange={(e) => set("note", e.target.value)} />
      </Step>

      {error && <p className="rounded-2xl bg-red-500/15 p-3 text-sm text-red-200">{error}</p>}
      <div className="sticky bottom-3 z-10 rounded-3xl border border-line bg-[#0b241e]/75 p-3 shadow-2xl backdrop-blur-2xl">
        <div className="mb-2 flex items-center justify-between px-1 text-xs font-semibold text-muted">
          <span>{doneCount} of 4 required steps done</span>
          <span className="flex gap-1">
            {checks.map((c, i) => (
              <span key={i} className={`h-1.5 w-6 rounded-full ${c ? "bg-accent" : "bg-line"}`} />
            ))}
          </span>
        </div>
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? "Saving…" : isEdit ? "Update my answers" : "Submit my answers"}
        </button>
      </div>
    </form>
  );
}
