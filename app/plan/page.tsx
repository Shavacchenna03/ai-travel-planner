import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { NavigationHeader } from "@/components/navigation-header";
import { TripPlanningForm } from "@/components/plan/trip-planning-form";

export const metadata = { title: "Plan a trip — Roamly" };

export default async function PlanPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/plan");
  }

  return (
    <main className="min-h-screen bg-[#f7f5f1]">
      <NavigationHeader />
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-10 sm:px-10 sm:pt-16">
        <div className="grid gap-12 lg:grid-cols-[0.78fr_1.22fr] lg:gap-20">
          <div className="lg:pt-7">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#187764]">Start planning</p>
            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.045em] text-[#16324f] sm:text-5xl">
              Where would you like to go?
            </h1>
            <p className="mt-5 max-w-md text-lg leading-8 text-slate-600">
              Give us the shape of your trip. We’ll use these details to build a considered itinerary in the next phase.
            </p>
            <div className="mt-10 hidden rounded-2xl bg-[#e7f2ef] p-6 lg:block">
              <p className="text-sm font-semibold text-[#187764]">A helpful plan starts here</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Budget, pace, places to stay, and food preferences help make each day feel achievable.
              </p>
            </div>
          </div>
          <TripPlanningForm />
        </div>
      </section>
    </main>
  );
}
