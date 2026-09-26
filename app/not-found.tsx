import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card mt-8 text-center">
      <p className="text-4xl">🧭</p>
      <h1 className="mt-2 text-xl font-bold">Trip not found</h1>
      <p className="hint mt-1">The link may be incomplete. Check you copied the whole thing from WhatsApp.</p>
      <Link href="/" className="btn-primary mt-5">Plan a new trip</Link>
    </div>
  );
}
