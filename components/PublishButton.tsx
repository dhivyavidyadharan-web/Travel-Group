"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { post } from "@/lib/api";

export default function PublishButton({ tripId, adminKey }: { tripId: string; adminKey: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="space-y-2">
      <button
        className="btn-primary w-full text-lg"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await post(`/api/trips/${tripId}/publish`, { key: adminKey });
            router.refresh();
          } catch (e) {
            setError((e as Error).message);
            setBusy(false);
          }
        }}
      >
        {busy ? "Creating link…" : "🔗 Create trip link"}
      </button>
      {error && <p className="rounded-2xl bg-red-500/15 p-3 text-sm text-red-200">{error}</p>}
    </div>
  );
}
