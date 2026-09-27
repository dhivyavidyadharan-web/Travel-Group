import type { TripStatus } from "@/lib/types";

const STEPS: { key: TripStatus; label: string }[] = [
  { key: "draft", label: "Draft" },
  { key: "collecting", label: "Answering" },
  { key: "generated", label: "Options" },
  { key: "decided", label: "Decided" },
];

/** Where the trip is in its lifecycle. */
export default function StatusSteps({ status }: { status: TripStatus }) {
  const at = STEPS.findIndex((s) => s.key === status);
  return (
    <ol className="flex items-center gap-1.5 text-xs font-semibold" aria-label="Trip progress">
      {STEPS.map((s, i) => (
        <li key={s.key} className="flex min-w-0 flex-1 flex-col gap-1.5" aria-current={i === at ? "step" : undefined}>
          <span className={`h-1.5 rounded-full ${i <= at ? "bg-accent" : "bg-line"}`} />
          <span className={`truncate ${i === at ? "text-accent-dark" : i < at ? "text-ink/70" : "text-muted/70"}`}>{s.label}</span>
        </li>
      ))}
    </ol>
  );
}
