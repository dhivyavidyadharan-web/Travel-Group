import Link from "next/link";
import { notFound } from "next/navigation";
import CopyShare from "@/components/CopyShare";
import DecidedBanner from "@/components/DecidedBanner";
import GenerateButton from "@/components/GenerateButton";
import { LockButton } from "@/components/LockButtons";
import { deadlinePassed, getLatestResult, getSubmissions, getTrip, getVotes, isAdmin } from "@/lib/data";
import { fmtRange } from "@/lib/dates";
import { ago, fmtDeadline, inrRange } from "@/lib/format";
import { minResponses } from "@/lib/options";
import { origin, whatsapp } from "@/lib/url";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ key?: string }>;
}) {
  const { tripId } = await params;
  const { key = "" } = await searchParams;
  const trip = await getTrip(tripId);
  if (!trip) notFound();
  if (!(await isAdmin(tripId, key))) {
    return (
      <div className="card mt-8 text-center">
        <p className="text-4xl">🔒</p>
        <h1 className="mt-2 text-xl font-bold">This admin link isn&apos;t valid</h1>
        <p className="hint mt-1">Only the coordinator&apos;s private link opens the dashboard.</p>
        <Link href={`/t/${tripId}`} className="btn-primary mt-5">Go to the trip form</Link>
      </div>
    );
  }

  const [subs, result, votes, base] = await Promise.all([
    getSubmissions(tripId),
    getLatestResult(tripId),
    getVotes(tripId),
    origin(),
  ]);
  const shareUrl = `${base}/t/${tripId}`;
  const submitted = new Map(subs.map((s) => [s.participant_name, s.updated_at]));
  const responded = trip.participants.filter((p) => submitted.has(p)).length;
  const pending = trip.participants.filter((p) => !submitted.has(p));
  const changedSince = result
    ? trip.participants.filter((p) => {
        const at = submitted.get(p);
        return at && new Date(at) > new Date(result.created_at);
      })
    : [];
  const newSinceResult = result ? changedSince.filter((p) => !result.constraints.respondents.includes(p)) : [];
  const nudgeText = (who?: string) =>
    `${who ? `Hey ${who}! ` : ""}We're finally planning "${trip.name}" 🎒 Takes 2 minutes, no login: ${shareUrl}` +
    (trip.deadline ? ` (please fill in by ${fmtDeadline(trip.deadline)})` : "");

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold tracking-wide text-accent uppercase">Coordinator dashboard</p>
        <h1 className="text-2xl font-bold">{trip.name}</h1>
        <p className="hint">
          {fmtRange(trip.date_start, trip.date_end)} · {trip.min_days}–{trip.max_days} days
          {trip.deadline && <> · replies due {fmtDeadline(trip.deadline)}{deadlinePassed(trip) && " (passed)"}</>}
        </p>
        <p className="mt-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          🔑 Bookmark this page. It&apos;s your private admin link, so don&apos;t share it.
        </p>
      </div>

      {trip.status === "decided" && result && (
        <DecidedBanner option={result.options.find((o) => o.id === trip.decided_option_id)} />
      )}

      <section className="card space-y-3">
        <h2 className="font-bold">1. Share this link in the group</h2>
        <CopyShare url={shareUrl} whatsappUrl={whatsapp(nudgeText())} />
      </section>

      <section className="card">
        <div className="flex items-baseline justify-between">
          <h2 className="font-bold">2. Who&apos;s responded</h2>
          <span className="text-sm font-semibold text-muted">
            {responded} of {trip.participants.length}
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-page">
          <div className="h-full bg-accent transition-all" style={{ width: `${(responded / trip.participants.length) * 100}%` }} />
        </div>
        <ul className="mt-3 divide-y divide-line">
          {trip.participants.map((p) => {
            const at = submitted.get(p);
            return (
              <li key={p} className="flex min-h-12 items-center justify-between gap-3 py-2">
                <span className="font-medium">
                  {at ? "✅" : "⏳"} {p}
                </span>
                {at ? (
                  <span className="hint">updated {ago(at)}</span>
                ) : (
                  <a className="text-sm font-semibold text-accent" href={whatsapp(nudgeText(p))} target="_blank" rel="noreferrer">
                    Nudge on WhatsApp →
                  </a>
                )}
              </li>
            );
          })}
        </ul>
        {pending.length > 1 && (
          <a className="btn-secondary mt-3 w-full" href={whatsapp(nudgeText(pending.join(", ")))} target="_blank" rel="noreferrer">
            Nudge all {pending.length} pending
          </a>
        )}
        <p className="hint mt-3">Answers stay private here. Everyone sees the combined result.</p>
      </section>

      <section className="card space-y-3">
        <h2 className="font-bold">3. Get trip options</h2>
        {result && changedSince.length > 0 && (
          <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
            {newSinceResult.length > 0 ? `${newSinceResult.join(", ")} responded` : `${changedSince.join(", ")} changed their answers`}{" "}
            after the options were generated. Regenerate to include them.
          </p>
        )}
        <GenerateButton
          tripId={tripId}
          adminKey={key}
          responded={responded}
          total={trip.participants.length}
          needed={minResponses(trip.participants.length)}
          hasResult={!!result}
        />
      </section>

      {result && (
        <section className="card space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-bold">4. Make the final call</h2>
            <Link href={`/t/${tripId}/results`} className="text-sm font-semibold text-accent">
              Open results →
            </Link>
          </div>
          <p className="hint">
            Only you can lock the decision. Check the votes, then lock the option the group is going with.
          </p>
          <ul className="space-y-2">
            {result.options.map((o) => {
              const n = votes.filter((v) => v.option_id === o.id).length;
              const locked = trip.decided_option_id === o.id;
              return (
                <li key={o.id} className={`flex items-center gap-3 rounded-xl border p-3 ${locked ? "border-accent bg-accent-soft" : "border-line"}`}>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {o.id}. {o.destination}
                      {result.recommended_option_id === o.id && <span className="ml-2 text-xs text-accent">★ recommended</span>}
                    </p>
                    <p className="hint">
                      {fmtRange(o.startDate, o.endDate)} · {inrRange(o.costPerPersonMin, o.costPerPersonMax)} · fit {o.groupFit}/10 ·{" "}
                      {n} {n === 1 ? "vote" : "votes"}
                    </p>
                  </div>
                  {(trip.status !== "decided" || locked) && (
                    <LockButton tripId={tripId} adminKey={key} optionId={o.id} label={`${o.id}. ${o.destination}`} locked={locked} />
                  )}
                </li>
              );
            })}
          </ul>
          <p className="hint">
            {votes.length} of {trip.participants.length} have voted.
          </p>
        </section>
      )}
    </div>
  );
}
