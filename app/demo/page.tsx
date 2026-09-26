import DemoButton from "@/components/DemoButton";

export default function DemoPage() {
  return (
    <div className="card mt-6 space-y-3 text-center">
      <p className="text-4xl">🧪</p>
      <h1 className="text-xl font-bold">Demo trip</h1>
      <p className="hint">
        Creates a trip for Riya, Siddharth, Karan, Aisha and Preethi, with all 5 responses filled in (overlapping but
        imperfect dates, different budgets and dealbreakers). You land on the coordinator dashboard, ready to generate.
      </p>
      <DemoButton label="Create demo trip" />
    </div>
  );
}
