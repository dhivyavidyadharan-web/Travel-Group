"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { post } from "@/lib/api";

export default function GenerateButton({
  tripId,
  adminKey,
  responded,
  total,
  needed,
  hasResult,
}: {
  tripId: string;
  adminKey: string;
  responded: number;
  total: number;
  needed: number;
  hasResult: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");
  const pending = total - responded;
  const ready = responded >= needed;

  async function run() {
    setAsking(false);
    setBusy(true);
    setError("");
    try {
      await post(`/api/trips/${tripId}/generate`, { key: adminKey });
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {!ready && <p className="hint">Unlocks once {needed} people have answered ({responded} so far).</p>}
      {ready && pending > 0 && !busy && (
        <p className="rounded-2xl bg-amber-400/15 p-3 text-sm text-amber-100">
          {pending === 1 ? "1 person hasn't" : `${pending} people haven't`} answered. Their preferences won&apos;t be counted.
        </p>
      )}
      {asking ? (
        <div className="space-y-2 rounded-2xl border border-accent/40 bg-accent-soft p-3">
          <p className="text-sm">Replace the current options? Votes and any locked decision will be cleared.</p>
          <div className="flex gap-2">
            <button className="btn-primary min-h-10 px-4 text-sm" onClick={run}>Replace options</button>
            <button className="btn-secondary min-h-10 px-4 text-sm" onClick={() => setAsking(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <button
          className={hasResult ? "btn-secondary w-full" : "btn-primary w-full"}
          disabled={!ready || busy}
          onClick={() => (hasResult ? setAsking(true) : run())}
        >
          {busy ? (
            <>
              <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Finding options that work for all {responded} of you…
            </>
          ) : hasResult ? (
            "Regenerate options"
          ) : (
            "✨ Generate options"
          )}
        </button>
      )}
      {error && <p className="rounded-2xl bg-red-500/15 p-3 text-sm text-red-200">{error}</p>}
    </div>
  );
}
