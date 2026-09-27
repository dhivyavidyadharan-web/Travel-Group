import Link from "next/link";
import { notFound } from "next/navigation";
import DecidedBanner from "@/components/DecidedBanner";
import NotOpen from "@/components/NotOpen";
import ParticipantForm from "@/components/ParticipantForm";
import StatusSteps from "@/components/StatusSteps";
import { deadlinePassed, getLatestResult, getResponse, getSubmissions, getTrip } from "@/lib/data";
import { fmtRange } from "@/lib/dates";
import { fmtDeadline } from "@/lib/format";
import { devicePerson } from "@/lib/identity";

export const dynamic = "force-dynamic";

export default async function TripFormPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const trip = await getTrip(tripId);
  if (!trip) notFound();
  if (trip.status === "draft") return <NotOpen />;

  const [subs, result, me] = await Promise.all([getSubmissions(tripId), getLatestResult(tripId), devicePerson(tripId)]);
  const mine = me ? await getResponse(tripId, me) : null;
  const closed = trip.status === "decided" || deadlinePassed(trip);

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <p className="eyebrow">You&apos;re invited</p>
        <h1 className="text-3xl font-extrabold">{trip.name}</h1>
        <p className="hint">
          Somewhere between {fmtRange(trip.date_start, trip.date_end)} · {trip.min_days === trip.max_days ? trip.min_days : `${trip.min_days}–${trip.max_days}`} days ·{" "}
          {subs.length} of {trip.participants.length} answered
          {trip.deadline && !closed && <> · fill in by {fmtDeadline(trip.deadline)}</>}
        </p>
        <StatusSteps status={trip.status} />
      </div>

      {result && (
        <Link href={`/t/${tripId}/results`} className="card flex items-center justify-between font-semibold text-accent">
          Trip options are ready <span aria-hidden>→</span>
        </Link>
      )}

      {trip.status === "decided" && result ? (
        <DecidedBanner option={result.options.find((o) => o.id === trip.decided_option_id)} />
      ) : closed ? (
        <div className="card text-center">
          <p className="text-4xl">⏰</p>
          <h2 className="mt-2 text-xl font-extrabold">The reply deadline has passed</h2>
          <p className="hint mt-1">Answers are locked. Ask the organiser if you still need to change something.</p>
        </div>
      ) : (
        <ParticipantForm
          tripId={tripId}
          participants={trip.participants}
          answered={subs.map((s) => s.participant_name)}
          me={me}
          mine={mine}
          dateStart={trip.date_start}
          dateEnd={trip.date_end}
          hasResults={!!result}
        />
      )}
    </div>
  );
}
