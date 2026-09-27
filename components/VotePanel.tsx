"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { post } from "@/lib/api";
import type { Vote } from "@/lib/types";

export default function VotePanel({
  tripId,
  total,
  me,
  options,
  votes,
  closed,
}: {
  tripId: string;
  total: number;
  /** who this browser answered as; voting needs it */
  me: string | null;
  options: { id: string; destination: string }[];
  votes: Vote[];
  closed: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const mine = votes.find((v) => v.participant_name === me)?.option_id;

  async function vote(optionId: string) {
    setBusy(optionId);
    setError("");
    try {
      await post(`/api/trips/${tripId}/votes`, { optionId });
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
        <h2 className="text-xl font-extrabold">Vote</h2>
        <span className="hint tabular-nums">
          {votes.length} of {total} voted
        </span>
      </div>
      {!closed &&
        (me ? (
          <p className="hint">
            Voting as <b className="text-ink">{me}</b>. One vote each, and tapping another option moves yours.
          </p>
        ) : (
          <p className="rounded-2xl bg-page p-3 text-sm">
            To vote, first <Link href={`/t/${tripId}`} className="font-semibold text-accent">fill in your answers</Link> on this phone.
          </p>
        ))}
      <ul className="space-y-2">
        {options.map((o) => {
          const voters = votes.filter((v) => v.option_id === o.id).map((v) => v.participant_name);
          const isMine = mine === o.id;
          return (
            <li key={o.id} className={`flex items-center gap-3 rounded-2xl border p-3 ${isMine ? "border-accent bg-accent-soft" : "border-line"}`}>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {o.id}. {o.destination}
                </p>
                <p className="hint truncate">{voters.length ? voters.join(", ") : "No votes yet"}</p>
              </div>
              <span className="font-display text-2xl font-extrabold tabular-nums">{voters.length}</span>
              {!closed && me && (
                <button
                  className={isMine ? "btn-secondary shrink-0 px-4" : "btn-primary shrink-0 px-4"}
                  disabled={!!busy || isMine}
                  onClick={() => vote(o.id)}
                >
                  {busy === o.id ? "…" : isMine ? "✓ You're in" : "I'm in"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <p className="hint">{closed ? "Voting is closed." : "The organiser makes the final call."}</p>
    </section>
  );
}
