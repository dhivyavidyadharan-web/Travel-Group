import Link from "next/link";
import { notFound } from "next/navigation";
import DecidedBanner from "@/components/DecidedBanner";
import ParticipantForm from "@/components/ParticipantForm";
import { deadlinePassed, getLatestResult, getSubmissions, getTrip } from "@/lib/data";
import { fmtRange } from "@/lib/dates";
import { fmtDeadline } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function TripFormPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const trip = await getTrip(tripId);
  if (!trip) notFound();
  const [subs, result] = await Promise.all([getSubmissions(tripId), getLatestResult(tripId)]);
  const closed = trip.status === "decided" || deadlinePassed(trip);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{trip.name}</h1>
        <p className="hint">
          Somewhere between {fmtRange(trip.date_start, trip.date_end)} · {trip.min_days}–{trip.max_days} days ·{" "}
          {subs.length} of {trip.participants.length} responded
        </p>
        {trip.deadline && !closed && <p className="hint">Fill in by {fmtDeadline(trip.deadline)}. You can edit until then.</p>}
      </div>

      {result && (
        <Link href={`/t/${tripId}/results`} className="card flex items-center justify-between font-semibold text-accent">
          Trip options are ready <span>→</span>
        </Link>
      )}

      {trip.status === "decided" && result ? (
        <DecidedBanner option={result.options.find((o) => o.id === trip.decided_option_id)} />
      ) : closed ? (
        <div className="card text-center">
          <p className="text-4xl">⏰</p>
          <h2 className="mt-2 text-lg font-bold">The response deadline has passed</h2>
          <p className="hint mt-1">Answers are locked. Ask the coordinator if you still need to change something.</p>
        </div>
      ) : (
        <ParticipantForm
          tripId={tripId}
          participants={trip.participants}
          submitted={subs.map((s) => s.participant_name)}
          dateStart={trip.date_start}
          dateEnd={trip.date_end}
          hasResults={!!result}
        />
      )}
    </div>
  );
}
