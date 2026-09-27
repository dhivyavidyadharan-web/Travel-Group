import Link from "next/link";
import { notFound } from "next/navigation";
import DecidedBanner from "@/components/DecidedBanner";
import LiveRefresh from "@/components/LiveRefresh";
import NotOpen from "@/components/NotOpen";
import VotePanel from "@/components/VotePanel";
import { getLatestResult, getSubmissions, getTrip, getVotes } from "@/lib/data";
import { devicePerson } from "@/lib/identity";
import { fmtDate, fmtRange } from "@/lib/dates";
import { inr, inrRange, scoreTone } from "@/lib/format";
import { photoFor } from "@/lib/scenery";
import type { StoredConstraints, TripOption } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ResultsPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const trip = await getTrip(tripId);
  if (!trip) notFound();
  if (trip.status === "draft") return <NotOpen />;
  const [result, votes, subs, me] = await Promise.all([
    getLatestResult(tripId),
    getVotes(tripId),
    getSubmissions(tripId),
    devicePerson(tripId),
  ]);

  if (!result || !result.options.length) {
    return (
      <div className="card mt-6 text-center">
        <p className="text-4xl">⏳</p>
        <h1 className="mt-2 text-2xl font-extrabold">Options aren&apos;t ready yet</h1>
        <p className="hint mt-1">
          {subs.length} of {trip.participants.length} have responded. The organiser generates options once enough people are in.
        </p>
        <Link href={`/t/${tripId}`} className="btn-primary mt-5">Add or edit my answers</Link>
        <LiveRefresh seconds={30} />
      </div>
    );
  }

  const c = result.constraints;
  const decided = trip.status === "decided" ? result.options.find((o) => o.id === trip.decided_option_id) : undefined;
  const rec = result.options.find((o) => o.id === result.recommended_option_id);

  return (
    <div className="space-y-5">
      <LiveRefresh />
      <div>
        <h1 className="text-3xl font-extrabold">{trip.name}</h1>
        <p className="hint">
          Based on {c.respondents.length} of {trip.participants.length} responses
          {c.missing.length > 0 && <> ({c.missing.join(", ")} didn&apos;t respond)</>}
        </p>
      </div>

      {decided ? (
        <DecidedBanner option={decided} />
      ) : (
        rec && (
          <div className="card border-accent/40 bg-accent-soft">
            <span className="eyebrow">★ Recommended</span>
            <p className="mt-1 font-display text-2xl font-extrabold">
              Option {rec.id}: {rec.destination}
            </p>
            <p className="mt-1 text-white/85">{result.recommendation_reason}</p>
            <p className="hint mt-3">⏳ Waiting for the organiser to lock the final decision.</p>
          </div>
        )
      )}

      <Snapshot c={c} />

      <div className="space-y-4">
        {result.options.map((o) => (
          <OptionCard
            key={o.id}
            o={o}
            recommended={o.id === result.recommended_option_id}
            decided={o.id === decided?.id}
            votes={votes.filter((v) => v.option_id === o.id).length}
          />
        ))}
      </div>

      <FitMatrix options={result.options} people={c.respondents} />

      <VotePanel
        tripId={tripId}
        total={trip.participants.length}
        me={me}
        options={result.options.map((o) => ({ id: o.id, destination: o.destination }))}
        votes={votes}
        closed={!!decided}
      />

      {c.dropped.length > 0 && (
        <details className="card text-sm">
          <summary className="cursor-pointer font-semibold">
            {c.dropped.length} suggestion{c.dropped.length > 1 ? "s were" : " was"} removed for breaking the group&apos;s rules
          </summary>
          <ul className="mt-2 space-y-1 text-muted">
            {c.dropped.map((d) => (
              <li key={d.id + d.destination}>
                <b className="text-ink">{d.destination}</b>: {d.reasons.join("; ")}
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="hint text-center">
        Costs and travel times are rough estimates. Check live prices before booking.{" "}
        <Link href={`/t/${tripId}`} className="font-semibold text-accent">Edit my answers</Link>
      </p>
    </div>
  );
}

function Snapshot({ c }: { c: StoredConstraints }) {
  const topTypes = c.typeScores.filter((t) => t.total > 0).slice(0, 3);
  return (
    <section className="card space-y-4">
      <h2 className="text-xl font-extrabold">Group snapshot</h2>
      <p className="hint -mt-3">The rules every option was built on.</p>

      <div>
        <p className="text-sm font-semibold">📅 {c.commonDates.fullOverlap ? "Dates everyone can make" : "Best dates (no full overlap)"}</p>
        <ul className="mt-1 space-y-1">
          {c.commonDates.windows.map((w) => (
            <li key={w.start} className="text-sm">
              <b>{fmtRange(w.start, w.end)}</b> <span className="text-muted">({w.days} days)</span>
              {w.missing.length > 0 && <span className="text-amber-200"> · {w.missing.join(", ")} can&apos;t make it</span>}
              {w.longWeekends?.map((h) => (
                <span key={h.date} className="ml-2 inline-block rounded-full bg-sky-400/20 px-2 text-xs font-medium text-sky-100">
                  Long weekend: {h.name}, {fmtDate(h.date)}
                </span>
              ))}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="text-sm font-semibold">💰 Budget ceiling</p>
        <p className="text-sm">
          <b>{inr(c.budgetCeiling)}</b> per person <span className="text-muted">(the lowest max, so it&apos;s affordable for everyone)</span>
        </p>
        {c.budgetConflict && (
          <p className="mt-1 text-sm text-amber-200">
            Heads up: {c.budgetConflict.floorBy}&apos;s minimum ({inr(c.budgetFloor)}) is above {c.budgetConflict.ceilingBy}&apos;s max. We
            planned for the lower one.
          </p>
        )}
      </div>

      {c.dealbreakers.length > 0 && (
        <div>
          <p className="text-sm font-semibold">🚫 Dealbreakers</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {c.dealbreakers.map((d) => (
              <span key={d.label} className="rounded-full bg-coral-soft px-3 py-1 text-xs font-medium text-coral">
                {d.label} <span className="opacity-70">· {d.setBy.join(", ")}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {topTypes.length > 0 && (
        <div>
          <p className="text-sm font-semibold">❤️ Most wanted</p>
          <p className="text-sm">{topTypes.map((t) => `${t.type} (${t.total} pts)`).join(" · ")}</p>
        </div>
      )}
    </section>
  );
}

function OptionCard({ o, recommended, decided, votes }: { o: TripOption; recommended: boolean; decided: boolean; votes: number }) {
  return (
    <article className={`card overflow-hidden p-0 sm:p-0 ${decided ? "ring-2 ring-accent" : recommended ? "ring-1 ring-accent/50" : ""}`}>
      <div
        className="scenery relative flex min-h-56 flex-col justify-between p-4"
        style={{ "--photo": photoFor(`${o.destination} ${o.state} ${o.pitch}`) } as React.CSSProperties}
      >
        <div className="flex items-start justify-between gap-3">
          <span className="glass flex size-10 items-center justify-center rounded-2xl text-lg font-bold">{o.id}</span>
          <div className="glass rounded-2xl px-3 py-1.5 text-right">
            <p className="font-display text-xl leading-none font-extrabold">{o.groupFit}</p>
            <p className="mt-0.5 text-[10px] tracking-wide text-white/70 uppercase">group fit</p>
          </div>
        </div>
        <div>
          <h3 className="text-3xl leading-tight font-extrabold drop-shadow">{o.destination}</h3>
          <p className="text-sm text-white/85">📍 {o.state}</p>
        </div>
      </div>

      <div className="p-5 sm:p-6">
      <div className="flex flex-wrap gap-1.5 text-xs font-medium">
        {decided && <span className="rounded-full bg-accent px-2.5 py-1 text-emerald-950">✅ Decided</span>}
        {recommended && !decided && <span className="rounded-full bg-white px-2.5 py-1 text-[#0b241e]">★ Recommended</span>}
        {o.longWeekend && <span className="rounded-full bg-sky-400/20 px-2.5 py-1 text-sky-100">{o.longWeekend}</span>}
        <span className="rounded-full bg-page px-2.5 py-1">{votes} {votes === 1 ? "vote" : "votes"}</span>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
        <div className="rounded-xl bg-page p-2.5">
          <dt className="text-[11px] text-muted uppercase">Dates</dt>
          <dd className="font-semibold">{fmtRange(o.startDate, o.endDate)}</dd>
        </div>
        <div className="rounded-xl bg-page p-2.5">
          <dt className="text-[11px] text-muted uppercase">Length</dt>
          <dd className="font-semibold">{o.days} days</dd>
        </div>
        <div className="rounded-xl bg-page p-2.5">
          <dt className="text-[11px] text-muted uppercase">Per person*</dt>
          <dd className="font-semibold">{inrRange(o.costPerPersonMin, o.costPerPersonMax)}</dd>
        </div>
      </dl>

      {o.pitch && <p className="mt-4">{o.pitch}</p>}

      {o.tradeoffs.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-semibold">Trade-offs</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-muted">
            {o.tradeoffs.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4">
        <p className="text-sm font-semibold">Getting there</p>
        <ul className="mt-1 divide-y divide-line text-sm">
          {o.travel.map((t) => (
            <li key={t.participant} className="flex justify-between gap-3 py-1.5">
              <span>
                <b>{t.participant}</b> <span className="text-muted">from {t.from}</span>
              </span>
              <span className="text-right text-muted">
                {t.mode}
                {t.approxHours > 0 && ` · ~${t.approxHours}h`}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-3 text-[11px] text-muted">*Rough estimate incl. travel and stay. Lowest individual fit: {o.minFit}/10.</p>
      </div>
    </article>
  );
}

function FitMatrix({ options, people }: { options: TripOption[]; people: string[] }) {
  return (
    <section className="card px-0 pb-3">
      <div className="px-5">
        <h2 className="text-xl font-extrabold">Where everyone stands</h2>
        <p className="hint">How well each option fits each person (0–10).</p>
        <div className="mt-2 flex gap-3 text-xs">
          <span className="flex items-center gap-1"><i className="size-3 rounded bg-emerald-400/60" /> 7–10 great</span>
          <span className="flex items-center gap-1"><i className="size-3 rounded bg-amber-300/60" /> 4–6 okay</span>
          <span className="flex items-center gap-1"><i className="size-3 rounded bg-red-400/60" /> 0–3 poor</span>
        </div>
      </div>
      {/* Phone: one block per person, options stacked. */}
      <ul className="mt-3 divide-y divide-line sm:hidden">
        {people.map((p) => (
          <li key={p} className="px-5 py-3">
            <p className="font-semibold">{p}</p>
            <ul className="mt-1.5 space-y-1.5">
              {options.map((o) => {
                const f = o.fit.find((x) => x.participant === p);
                return (
                  <li key={o.id} className="flex items-start gap-2.5">
                    <span className={`flex h-8 min-w-8 shrink-0 items-center justify-center rounded-lg font-bold ${f ? scoreTone(f.score) : "bg-page"}`}>
                      {f ? f.score : "—"}
                    </span>
                    <span className="text-sm leading-snug">
                      <b>{o.id}. {o.destination}</b> <span className="text-muted">{f?.reason}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
        <li className="px-5 pt-3 text-sm">
          {options.map((o) => (
            <p key={o.id}>
              <b>{o.id}. {o.destination}</b>: avg {o.groupFit}, lowest {o.minFit}
            </p>
          ))}
        </li>
      </ul>
      <div className="mt-3 hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[520px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-[#143a31] px-3 py-2 text-left font-semibold">Person</th>
              {options.map((o) => (
                <th key={o.id} className="px-2 py-2 text-left font-semibold">
                  {o.id}. {o.destination}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {people.map((p) => (
              <tr key={p}>
                <th className="sticky left-0 z-10 border-t border-line bg-[#143a31] px-3 py-2 text-left align-top font-semibold">{p}</th>
                {options.map((o) => {
                  const f = o.fit.find((x) => x.participant === p);
                  return (
                    <td key={o.id} className="border-t border-line px-2 py-2 align-top">
                      {f ? (
                        <div className="flex gap-2">
                          <span className={`flex h-8 min-w-8 shrink-0 items-center justify-center rounded-lg font-bold ${scoreTone(f.score)}`}>
                            {f.score}
                          </span>
                          <span className="text-xs leading-snug text-muted">{f.reason}</span>
                        </div>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr>
              <th className="sticky left-0 z-10 border-t-2 border-line bg-[#143a31] px-3 py-2 text-left">Group</th>
              {options.map((o) => (
                <td key={o.id} className="border-t-2 border-line px-2 py-2 text-xs">
                  avg <b className="text-sm">{o.groupFit}</b> · lowest <b className="text-sm">{o.minFit}</b>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
