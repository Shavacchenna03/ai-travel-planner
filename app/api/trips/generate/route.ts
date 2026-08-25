import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { auth } from "@/auth";
import { generateItinerary, TravelPlannerError } from "@/lib/ai/travel-planner";
import { prisma } from "@/lib/prisma";
import { tripRequestSchema } from "@/lib/trip-schema";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required to generate itineraries. Please sign in." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Please send valid trip details and try again." }, { status: 400 });
  }

  const parsedInput = tripRequestSchema.safeParse(body);
  if (!parsedInput.success) {
    return NextResponse.json({ error: "Please review your trip details and try again.", fieldErrors: parsedInput.error.flatten().fieldErrors }, { status: 400 });
  }

  let itinerary;
  try {
    itinerary = await generateItinerary(parsedInput.data);
  } catch (error) {
    if (error instanceof TravelPlannerError) {
      const status = error.code === "PROVIDER_NOT_CONFIGURED" ? 503 : error.code === "RATE_LIMITED" ? 429 : 502;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: "Something went wrong while creating your itinerary. Please try again." }, { status: 500 });
  }

  try {
    const savedTrip = await prisma.trip.create({
      data: {
        userId: session?.user?.id ?? null,
        destination: parsedInput.data.destination,
        budget: parsedInput.data.budget,
        currency: parsedInput.data.currency,
        duration: parsedInput.data.duration,
        travelers: parsedInput.data.travelers,
        style: parsedInput.data.style,
        accommodation: parsedInput.data.accommodation,
        food: parsedInput.data.food,
        requestPayload: JSON.parse(JSON.stringify(parsedInput.data)) as Prisma.InputJsonValue,
        itinerary: JSON.parse(JSON.stringify(itinerary)) as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      tripId: savedTrip.id,
      itinerary,
      request: parsedInput.data,
    });
  } catch (dbError) {
    console.error("[Roamly DB Error] Failed to persist generated trip to database:", dbError);
    return NextResponse.json({ error: "Your itinerary was generated but could not be saved to our database. Please try again." }, { status: 500 });
  }
}
