"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { post } from "@/lib/api";

/** Lock (or unlock) the final option, with an inline confirm step. */
export function LockButton({
  tripId,
  adminKey,
  optionId,
  label,
  locked,
}: {
  tripId: string;
  adminKey: string;
  optionId: string;
  label: string;
  locked: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setBusy(true);
    setError("");
    try {
      await post(`/api/trips/${tripId}/decide`, { key: adminKey, optionId: locked ? null : optionId });
      setAsking(false);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (asking) {
    return (
      <div className="flex w-full flex-wrap items-center gap-2 pt-2">
        <span className="text-sm">{locked ? "Unlock and reopen voting?" : `Lock ${label} for everyone?`}</span>
        <button className="btn-primary min-h-10 px-4 text-sm" disabled={busy} onClick={run}>
          {busy ? "Saving…" : locked ? "Yes, unlock" : "Yes, lock it"}
        </button>
        <button className="btn-secondary min-h-10 px-4 text-sm" onClick={() => setAsking(false)}>
          Cancel
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    );
  }
  return (
    <button className={locked ? "btn-secondary shrink-0" : "btn-primary shrink-0"} onClick={() => setAsking(true)}>
      {locked ? "Unlock" : "Lock this"}
    </button>
  );
}
