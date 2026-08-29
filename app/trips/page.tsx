import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/formatters";
import { itinerarySchema, tripRequestSchema } from "@/lib/trip-schema";
import { Button } from "@/components/ui/button";
import { NavigationHeader } from "@/components/navigation-header";
import { Calendar, MapPin, Tag, Users, ArrowRight, Compass, Sparkles } from "@/components/icons";

export const metadata = {
  title: "Saved Trips — Roamly",
  description: "Browse, manage, and export your saved travel itineraries.",
};

export const revalidate = 0; // Dynamic server rendering for fresh DB data

export default async function SavedTripsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/trips");
  }

  let dbTrips: Array<{
    id: string;
    destination: string;
    budget: number;
    currency: string;
    duration: number;
    travelers: number;
    style: string;
    accommodation: string;
    food: string;
    requestPayload: unknown;
    itinerary: unknown;
    createdAt: Date;
  }> = [];

  let queryError = false;

  try {
    dbTrips = await prisma.trip.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });
  } catch (err) {
    console.error("[Roamly DB Error] Failed to fetch saved trips for user:", err);
    queryError = true;
  }

  // Parse and validate stored JSON safely
  const trips = dbTrips.map((record) => {
    const validItinerary = itinerarySchema.safeParse(record.itinerary);
    const validRequest = tripRequestSchema.safeParse(record.requestPayload);

    return {
      id: record.id,
      destination: record.destination,
      duration: record.duration,
      travelers: record.travelers,
      budget: record.budget,
      currency: record.currency,
      style: record.style,
      accommodation: record.accommodation,
      food: record.food,
      createdAt: record.createdAt,
      summary: validItinerary.success ? validItinerary.data.summary : null,
      country: validItinerary.success ? validItinerary.data.country : "India",
      estimatedTotalCost: validItinerary.success ? validItinerary.data.estimatedTotalCost : record.budget,
      isValid: validItinerary.success && validRequest.success,
    };
  });

  return (
    <main className="min-h-screen bg-[#faf8f5] pb-20 text-[#0f172a] font-sans">
      {/* Navigation Header */}
      <NavigationHeader />

      {/* Main Page Container */}
      <section className="mx-auto max-w-7xl px-4 sm:px-10 pt-6 sm:pt-10">
        {/* Title Header */}
        <div className="flex flex-col justify-between gap-4 border-b border-[#eae4d9] pb-6 sm:pb-8 md:flex-row md:items-end">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#ea580c]">
              <Sparkles className="size-3.5 text-[#f97316]" />
              <span>My Travel Collection</span>
            </div>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-[#0f172a] sm:text-5xl">
              Saved Trips
            </h1>
            <p className="mt-1.5 text-sm sm:text-base text-slate-600">
              Browse, manage, and export your saved travel itineraries.
            </p>
          </div>

          <Button
            asChild
            size="lg"
            className="w-full sm:w-auto bg-gradient-to-r from-[#ea580c] to-[#f97316] hover:from-[#d97706] hover:to-[#ea580c] text-white font-extrabold rounded-2xl shadow-md shadow-orange-500/20 justify-center"
          >
            <Link href="/plan">Plan a New Trip</Link>
          </Button>
        </div>

        {/* Database Query Error State */}
        {queryError && (
          <div role="alert" className="mt-8 rounded-2xl bg-rose-50 p-6 border border-rose-200 text-rose-800">
            <h3 className="font-extrabold text-base">Unable to load saved trips</h3>
            <p className="mt-1 text-sm text-rose-700">
              We encountered a problem connecting to the database. Please ensure your database connection is active and refresh the page.
            </p>
          </div>
        )}

        {/* Empty State */}
        {!queryError && trips.length === 0 && (
          <div className="mt-10 mx-auto max-w-md card-warm p-6 sm:p-8 text-center bg-white">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#ffedd5] text-[#ea580c]">
              <Compass className="size-7" />
            </div>
            <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-[#0f172a]">
              No saved trips yet
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              When you create a travel plan while signed in, it will automatically be saved here for easy access, editing, and PDF export.
            </p>
            <Button
              asChild
              size="lg"
              className="mt-6 w-full sm:w-auto bg-gradient-to-r from-[#ea580c] to-[#f97316] text-white font-extrabold rounded-2xl shadow-md justify-center"
            >
              <Link href="/plan">Plan Your First Trip</Link>
            </Button>
          </div>
        )}

        {/* Trips Grid */}
        {!queryError && trips.length > 0 && (
          <div className="mt-8 sm:mt-10 grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {trips.map((trip) => (
              <article
                key={trip.id}
                className="group card-warm p-5 sm:p-6 bg-white flex flex-col justify-between transition-all duration-200 hover:border-[#ea580c]/50 hover:shadow-lg"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-extrabold text-[#0f172a] tracking-tight group-hover:text-[#ea580c] transition-colors">
                        {trip.destination}
                      </h2>
                      <p className="text-xs font-bold text-[#0d9488] mt-0.5 inline-flex items-center gap-1">
                        <MapPin className="size-3 text-[#0d9488]" />
                        {trip.country}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-xl bg-[#ffedd5] px-3 py-1.5 text-xs font-extrabold text-[#ea580c] border border-[#fed7aa]">
                      {trip.duration} Days
                    </span>
                  </div>

                  {/* Metadata Badges */}
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-700">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-[#f5f2ec] px-2.5 py-1 border border-[#eae4d9]">
                      <Users className="size-3 text-[#ea580c]" />
                      {trip.travelers} {trip.travelers === 1 ? "Traveler" : "Travelers"}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-lg bg-[#f5f2ec] px-2.5 py-1 border border-[#eae4d9]">
                      <Tag className="size-3 text-[#0d9488]" />
                      {trip.style}
                    </span>
                  </div>

                  {/* Summary / Preview */}
                  {trip.summary && (
                    <p className="mt-4 text-xs leading-relaxed text-slate-600 line-clamp-3">
                      {trip.summary}
                    </p>
                  )}
                </div>

                {/* Card Footer */}
                <div className="mt-6 border-t border-[#eae4d9] pt-4">
                  <div className="flex items-baseline justify-between mb-4">
                    <span className="text-xs font-bold text-slate-500">Estimated Total</span>
                    <span className="text-base font-extrabold text-[#0f172a]">
                      {formatCurrency(trip.estimatedTotalCost, trip.currency)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-slate-400 inline-flex items-center gap-1">
                      <Calendar className="size-3" />
                      {new Date(trip.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                    <Button
                      asChild
                      size="default"
                      className="bg-[#0f172a] hover:bg-[#ea580c] text-white text-xs font-bold px-4 rounded-xl transition-colors"
                    >
                      <Link href={`/trips/${trip.id}`}>
                        <span>View Itinerary</span>
                        <ArrowRight className="size-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
