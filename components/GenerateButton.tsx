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
  const [error, setError] = useState("");
  const pending = total - responded;
  const ready = responded >= needed;

  async function run() {
    if (hasResult && !confirm("Replace the current options? Votes and any locked decision will be cleared.")) return;
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
      {!ready && (
        <p className="hint">
          Unlocks once {needed} people have responded ({responded} so far).
        </p>
      )}
      {ready && pending > 0 && !busy && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          {pending === 1 ? "1 person hasn't" : `${pending} people haven't`} responded. Their preferences won&apos;t be counted.
        </p>
      )}
      <button className={hasResult ? "btn-secondary w-full" : "btn-primary w-full"} disabled={!ready || busy} onClick={run}>
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
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    </div>
  );
}
