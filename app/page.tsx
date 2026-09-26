import CreateTripForm from "@/components/CreateTripForm";
import DemoButton from "@/components/DemoButton";

export default function Home() {
  return (
    <div className="space-y-6">
      <section className="pt-4">
        <h1 className="text-3xl leading-tight font-bold tracking-tight sm:text-4xl">
          1,200 messages, zero plans?
          <br />
          <span className="text-accent">Send one link instead.</span>
        </h1>
        <p className="mt-3 text-lg text-muted">
          Everyone fills in a 2-minute form. You get 3 trip options that fit the whole group&apos;s dates, budget and
          dealbreakers, and see where each person stands on each one.
        </p>
      </section>
      <CreateTripForm />
      <div className="text-center">
        <p className="hint mb-2">Just looking?</p>
        <DemoButton />
      </div>
    </div>
  );
}
