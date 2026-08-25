import { NextResponse } from "next/server";

import { generateItinerary, TravelPlannerError } from "@/lib/ai/travel-planner";
import { tripRequestSchema } from "@/lib/trip-schema";

export const runtime = "nodejs";

export async function POST(request: Request) {
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

  try {
    const itinerary = await generateItinerary(parsedInput.data);
    return NextResponse.json({ itinerary });
  } catch (error) {
    if (error instanceof TravelPlannerError) {
      const status = error.code === "GEMINI_NOT_CONFIGURED" ? 503 : error.code === "RATE_LIMITED" ? 429 : 502;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: "Something went wrong while creating your itinerary. Please try again." }, { status: 500 });
  }
}
