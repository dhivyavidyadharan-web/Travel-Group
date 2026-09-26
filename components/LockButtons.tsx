"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { post } from "@/lib/api";

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
  return (
    <button
      className={locked ? "btn-secondary shrink-0" : "btn-primary shrink-0"}
      disabled={busy}
      onClick={async () => {
        const msg = locked
          ? "Unlock the decision? People will be able to vote and edit again."
          : `Lock ${label} as the final decision? Everyone will see it on the results page.`;
        if (!confirm(msg)) return;
        setBusy(true);
        try {
          await post(`/api/trips/${tripId}/decide`, { key: adminKey, optionId: locked ? null : optionId });
          router.refresh();
        } catch (e) {
          alert((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "Saving…" : locked ? "Unlock" : "Lock this"}
    </button>
  );
}
