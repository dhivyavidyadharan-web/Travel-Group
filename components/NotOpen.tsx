/** Shown on every public page while the coordinator hasn't created the link yet. */
export default function NotOpen() {
  return (
    <div className="card mt-6 space-y-2 text-center">
      <p className="text-4xl">🗺️</p>
      <h1 className="text-2xl font-extrabold">This trip isn&apos;t open yet</h1>
      <p className="hint">The organiser is still setting it up. Check back when they share the link in the group.</p>
    </div>
  );
}
