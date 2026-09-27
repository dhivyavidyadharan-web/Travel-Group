"use client";

import { useMemo, useState } from "react";
import { dateRange, weekday } from "@/lib/dates";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["M", "T", "W", "T", "F", "S", "S"];

/**
 * Tap-to-select calendar limited to the trip window.
 * "Days" mode toggles single days; "Range" mode: tap a start, then an end.
 */
export default function DatePicker({
  start,
  end,
  value,
  onChange,
}: {
  start: string;
  end: string;
  value: string[];
  onChange: (dates: string[]) => void;
}) {
  const [mode, setMode] = useState<"range" | "days">("range");
  const [anchor, setAnchor] = useState<string | null>(null);
  const selected = useMemo(() => new Set(value), [value]);
  const all = useMemo(() => dateRange(start, end), [start, end]);

  const months = useMemo(() => {
    const groups = new Map<string, string[]>();
    for (const d of all) {
      const k = d.slice(0, 7);
      groups.set(k, [...(groups.get(k) ?? []), d]);
    }
    return [...groups.entries()];
  }, [all]);

  function tap(d: string) {
    if (mode === "days") {
      const next = new Set(selected);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      onChange([...next].sort());
      return;
    }
    if (!anchor) {
      setAnchor(d);
      return;
    }
    const [a, b] = anchor < d ? [anchor, d] : [d, anchor];
    const range = dateRange(a, b);
    // If the whole range is already selected, the second tap removes it.
    const removing = range.every((x) => selected.has(x));
    const next = new Set(selected);
    range.forEach((x) => (removing ? next.delete(x) : next.add(x)));
    onChange([...next].sort());
    setAnchor(null);
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {(["range", "days"] as const).map((m) => (
          <button
            key={m}
            type="button"
            className={`chip ${mode === m ? "chip-on" : ""}`}
            onClick={() => {
              setMode(m);
              setAnchor(null);
            }}
          >
            {m === "range" ? "Select ranges" : "Tap single days"}
          </button>
        ))}
        <span className="flex-1" />
        <button type="button" className="text-sm font-semibold text-accent" onClick={() => onChange(all)}>
          All
        </button>
        <button type="button" className="text-sm font-semibold text-muted" onClick={() => onChange([])}>
          Clear
        </button>
      </div>
      <p className="hint mb-3" aria-live="polite">
        {mode === "range"
          ? anchor
            ? "Now tap the last day you're free."
            : "Tap the first day you're free, then the last. Tap a selected range again to remove it."
          : "Tap each day you're free."}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {months.map(([key, days]) => {
          const [y, m] = key.split("-").map(Number);
          const lead = (weekday(`${key}-01`) + 6) % 7; // Monday-first
          const firstDay = Number(days[0].slice(8));
          const lastDay = Number(days[days.length - 1].slice(8));
          const inMonth = dateRange(`${key}-01`, days[days.length - 1]).length;
          return (
            <div key={key}>
              <p className="mb-1 text-sm font-bold">
                {MONTHS[m - 1]} {y}
              </p>
              <div className="grid grid-cols-7 gap-1 text-center">
                {DOW.map((d, i) => (
                  <span key={i} className="text-xs text-muted">{d}</span>
                ))}
                {Array.from({ length: lead }).map((_, i) => <span key={`l${i}`} />)}
                {Array.from({ length: inMonth }).map((_, i) => {
                  const day = i + 1;
                  const d = `${key}-${String(day).padStart(2, "0")}`;
                  const enabled = day >= firstDay && day <= lastDay;
                  const on = selected.has(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      disabled={!enabled}
                      aria-pressed={on}
                      aria-label={d}
                      onClick={() => tap(d)}
                      className={`aspect-square min-h-10 rounded-lg text-sm font-medium transition ${
                        !enabled
                          ? "text-line"
                          : anchor === d
                            ? "bg-white text-[#0b241e] ring-2 ring-accent"
                            : on
                              ? "bg-accent text-emerald-950"
                              : "bg-page hover:bg-accent-soft"
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <p className="hint mt-3">{value.length} {value.length === 1 ? "day" : "days"} selected</p>
    </div>
  );
}
