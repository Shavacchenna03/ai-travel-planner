import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { itinerarySchema, tripRequestSchema, type Itinerary, type TripRequest } from "@/lib/trip-schema";
import { ItineraryResults } from "@/components/plan/itinerary-results";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const record = await prisma.trip.findUnique({
      where: { id },
      select: { destination: true },
    });
    if (record) {
      return { title: `${record.destination} Trip Itinerary — Roamly` };
    }
  } catch {
    // ignore
  }
  return { title: "Trip Itinerary — Roamly" };
}

export default async function TripDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let record;
  try {
    record = await prisma.trip.findUnique({
      where: { id },
    });
  } catch (err) {
    console.error("[Roamly DB Error] Failed to fetch trip details:", err);
  }

  if (!record) {
    notFound();
  }

  const validItinerary = itinerarySchema.safeParse(record.itinerary);
  const validRequest = tripRequestSchema.safeParse(record.requestPayload);

  const fallbackRequest: TripRequest = {
    destination: record.destination,
    budget: record.budget,
    currency: (record.currency as TripRequest["currency"]) || "INR",
    duration: record.duration,
    travelers: record.travelers,
    style: record.style as TripRequest["style"],
    accommodation: record.accommodation as TripRequest["accommodation"],
    food: record.food as TripRequest["food"],
  };

  const itineraryData: Itinerary = validItinerary.success
    ? validItinerary.data
    : {
        destination: record.destination,
        country: "India",
        summary: `Custom itinerary for ${record.destination}`,
        estimatedTotalCost: record.budget,
        currency: (record.currency as TripRequest["currency"]) || "INR",
        dailyItinerary: [],
        travelTips: [],
      };

  const requestData: TripRequest = validRequest.success ? validRequest.data : fallbackRequest;

  return (
    <ItineraryResults
      initialTrip={{
        tripId: record.id,
        itinerary: itineraryData,
        request: requestData,
        createdAt: record.createdAt,
      }}
      showDelete={true}
    />
  );
}
