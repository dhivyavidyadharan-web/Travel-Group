"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card mt-8 text-center">
      <p className="text-4xl">😕</p>
      <h1 className="mt-2 text-xl font-bold">Something went wrong</h1>
      <p className="hint mt-1">{error.message.includes("Supabase") ? error.message : "Please try again in a moment."}</p>
      <button onClick={reset} className="btn-primary mt-5">Try again</button>
    </div>
  );
}
