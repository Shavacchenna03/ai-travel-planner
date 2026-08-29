import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { NavigationHeader } from "@/components/navigation-header";
import { TripPlanningForm } from "@/components/plan/trip-planning-form";
import { Compass, Sparkles, Shield, Heart } from "@/components/icons";

export const metadata = { title: "Plan a trip — Roamly" };

export default async function PlanPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/plan");
  }

  return (
    <main className="min-h-screen bg-[#faf8f5] text-[#0f172a] font-sans pb-20">
      <NavigationHeader />

      <section className="mx-auto max-w-7xl px-4 sm:px-10 pt-6 sm:pt-10 lg:pt-16">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16 lg:items-start">
          
          {/* Left Column Intro */}
          <div className="lg:pt-4 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#f97316]/20 bg-[#ffedd5]/80 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[#ea580c]">
              <Sparkles className="size-3.5 text-[#f97316]" />
              <span>Personalized Trip Studio</span>
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight text-[#0f172a] sm:text-5xl leading-[1.1]">
              Create Your Custom Travel Plan
            </h1>

            <p className="text-base text-slate-600 sm:text-lg leading-relaxed">
              Specify your destination, dates, budget, and preferences. We’ll build a balanced day-by-day itinerary tailored to your style.
            </p>

            {/* Feature Cards */}
            <div className="space-y-4 pt-4">
              <div className="card-warm p-5 flex items-start gap-4">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#ffedd5] text-[#ea580c]">
                  <Compass className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0f172a]">Structured Daily Schedules</h3>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                    Activities arranged logically by geographic proximity, optimal timing, and travel pace.
                  </p>
                </div>
              </div>

              <div className="card-warm p-5 flex items-start gap-4">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#ccfbf1] text-[#0d9488]">
                  <Shield className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0f172a]">Budget & Cost Estimates</h3>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                    Estimated activity & dining costs structured cleanly around your group budget limit.
                  </p>
                </div>
              </div>

              <div className="card-warm p-5 flex items-start gap-4">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#fef3c7] text-[#d97706]">
                  <Heart className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0f172a]">Saved & Exportable Guides</h3>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                    Access your itineraries anytime, edit activities interactively, and export print-ready PDFs.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column Form */}
          <TripPlanningForm />

        </div>
      </section>
    </main>
  );
}
