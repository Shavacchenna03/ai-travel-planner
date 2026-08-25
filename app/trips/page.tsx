import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/formatters";
import { itinerarySchema, tripRequestSchema } from "@/lib/trip-schema";
import { Button } from "@/components/ui/button";
import { NavigationHeader } from "@/components/navigation-header";
import { Calendar, Compass, MapPin, Tag, Users, ArrowRight } from "@/components/icons";

export const metadata = {
  title: "Saved Trips — Roamly",
  description: "View and manage your saved travel itineraries.",
};

export const revalidate = 0; // Dynamic server rendering for fresh DB data

export default async function SavedTripsPage() {
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
      orderBy: { createdAt: "desc" },
    });
  } catch (err) {
    console.error("[Roamly DB Error] Failed to fetch saved trips:", err);
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
    <main className="min-h-screen bg-[#f7f5f1] pb-20 text-slate-800">
      {/* Top Header */}
      <NavigationHeader />

      {/* Main Page Container */}
      <section className="mx-auto max-w-6xl px-6 pt-10 sm:px-10">
        {/* Title Header */}
        <div className="flex flex-col justify-between gap-4 border-b border-[#e4dfd6] pb-8 md:flex-row md:items-end">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#187764]">
              Dashboard
            </span>
            <h1 className="mt-1 text-4xl font-bold tracking-tight text-[#16324f] sm:text-5xl">
              Saved Trips
            </h1>
            <p className="mt-2 text-base text-slate-600">
              Browse and manage your custom travel itineraries.
            </p>
          </div>

          <Button asChild size="lg" className="bg-[#187764] hover:bg-[#126653] shadow-xs">
            <Link href="/plan">Plan a new trip</Link>
          </Button>
        </div>

        {/* Database Query Error State */}
        {queryError && (
          <div role="alert" className="mt-8 rounded-2xl bg-red-50 p-6 border border-red-200 text-red-800">
            <h3 className="font-bold text-base">Unable to load saved trips</h3>
            <p className="mt-1 text-sm text-red-700">
              We encountered a problem connecting to the database. Please ensure your PostgreSQL container is running and try refreshing the page.
            </p>
          </div>
        )}

        {/* Empty State */}
        {!queryError && trips.length === 0 && (
          <div className="mt-12 mx-auto max-w-md rounded-3xl border border-[#e8e3db] bg-white p-8 text-center shadow-md">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#e7f2ef] text-[#187764]">
              <Compass className="size-7" />
            </div>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-[#16324f]">
              No saved trips yet
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              When you generate a trip itinerary, it will automatically be saved here for easy access and PDF export.
            </p>
            <Button asChild size="lg" className="mt-6 bg-[#187764] hover:bg-[#126653]">
              <Link href="/plan">Plan your first trip</Link>
            </Button>
          </div>
        )}

        {/* Trips Grid */}
        {!queryError && trips.length > 0 && (
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {trips.map((trip) => (
              <article
                key={trip.id}
                className="flex flex-col justify-between rounded-3xl border border-[#e8e3db] bg-white p-6 shadow-[0_12px_35px_-25px_rgba(22,50,79,0.25)] transition-all hover:shadow-[0_18px_45px_-25px_rgba(22,50,79,0.35)] hover:border-[#187764]/40"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-bold text-[#16324f] tracking-tight">
                        {trip.destination}
                      </h2>
                      <p className="text-xs font-semibold text-slate-500 mt-0.5 inline-flex items-center gap-1">
                        <MapPin className="size-3 text-slate-400" />
                        {trip.country}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-xl bg-[#e7f2ef] px-3 py-1.5 text-xs font-bold text-[#187764] border border-[#cae2dc]">
                      {trip.duration} Days
                    </span>
                  </div>

                  {/* Metadata Badges */}
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1">
                      <Users className="size-3 text-[#187764]" />
                      {trip.travelers} {trip.travelers === 1 ? "Traveler" : "Travelers"}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1">
                      <Tag className="size-3 text-[#187764]" />
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
                <div className="mt-6 border-t border-slate-100 pt-4">
                  <div className="flex items-baseline justify-between mb-4">
                    <span className="text-xs font-semibold text-slate-500">Estimated Total</span>
                    <span className="text-base font-bold text-[#16324f]">
                      {formatCurrency(trip.estimatedTotalCost, trip.currency)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium text-slate-400 inline-flex items-center gap-1">
                      <Calendar className="size-3" />
                      {new Date(trip.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                    <Button asChild size="default" className="bg-[#16324f] hover:bg-[#234a70] text-xs font-bold px-3.5">
                      <Link href={`/trips/${trip.id}`}>
                        <span>View Trip</span>
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
