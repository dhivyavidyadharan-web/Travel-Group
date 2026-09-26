"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { post } from "@/lib/api";
import type { Vote } from "@/lib/types";

export default function VotePanel({
  tripId,
  participants,
  options,
  votes,
  closed,
}: {
  tripId: string;
  participants: string[];
  options: { id: string; destination: string }[];
  votes: Vote[];
  closed: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const mine = votes.find((v) => v.participant_name === name)?.option_id;

  useEffect(() => {
    const saved = localStorage.getItem(`tripsync:${tripId}:name`);
    if (saved && participants.includes(saved)) setName(saved);
  }, [tripId, participants]);

  async function vote(optionId: string) {
    setBusy(optionId);
    setError("");
    try {
      await post(`/api/trips/${tripId}/votes`, { name, optionId });
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="card space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold">Vote</h2>
        <span className="hint">
          {votes.length} of {participants.length} voted
        </span>
      </div>
      {!closed && (
        <select
          className="input"
          value={name}
          aria-label="Your name"
          onChange={(e) => {
            setName(e.target.value);
            localStorage.setItem(`tripsync:${tripId}:name`, e.target.value);
          }}
        >
          <option value="" disabled>Pick your name to vote</option>
          {participants.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      )}
      <ul className="space-y-2">
        {options.map((o) => {
          const voters = votes.filter((v) => v.option_id === o.id).map((v) => v.participant_name);
          const isMine = mine === o.id;
          return (
            <li key={o.id} className={`rounded-xl border p-3 ${isMine ? "border-accent bg-accent-soft" : "border-line"}`}>
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {o.id}. {o.destination}
                  </p>
                  <p className="hint truncate">{voters.length ? voters.join(", ") : "No votes yet"}</p>
                </div>
                <span className="text-2xl font-bold tabular-nums">{voters.length}</span>
                {!closed && (
                  <button
                    className={isMine ? "btn-secondary shrink-0 px-4" : "btn-primary shrink-0 px-4"}
                    disabled={!name || !!busy || isMine}
                    onClick={() => vote(o.id)}
                  >
                    {busy === o.id ? "…" : isMine ? "✓ You're in" : "I'm in"}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <p className="hint">
        {closed ? "Voting is closed." : "One vote each. Tap another option to change yours. The coordinator makes the final call."}
      </p>
    </section>
  );
}
