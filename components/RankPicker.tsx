"use client";

/** Tap in order of preference; up to `max`. Tapping a picked item removes it. */
export default function RankPicker({
  options,
  value,
  onChange,
  max = 3,
}: {
  options: readonly string[];
  value: string[];
  onChange: (v: string[]) => void;
  max?: number;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const rank = value.indexOf(o);
        const on = rank >= 0;
        return (
          <button
            key={o}
            type="button"
            aria-pressed={on}
            disabled={!on && value.length >= max}
            className={`chip ${on ? "chip-on" : ""} disabled:opacity-40`}
            onClick={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])}
          >
            {on && (
              <span className="flex size-5 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
                {rank + 1}
              </span>
            )}
            {o}
          </button>
        );
      })}
    </div>
  );
}
