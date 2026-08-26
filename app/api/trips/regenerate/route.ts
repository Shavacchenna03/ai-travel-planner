import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { regenerateActivity, regenerateDay, TravelPlannerError } from "@/lib/ai/travel-planner";
import { activitySchema, dailyItinerarySchema, tripRequestSchema } from "@/lib/trip-schema";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required to regenerate itinerary items." }, { status: 401 });
    }

    const body = await request.json();
    const { target, request: tripReq, dayNumber, instruction } = body;

    const requestValidation = tripRequestSchema.safeParse(tripReq);
    if (!requestValidation.success) {
      return NextResponse.json({ error: "Invalid trip request context." }, { status: 400 });
    }

    if (target === "activity") {
      const activityValidation = activitySchema.safeParse(body.currentActivity);
      if (!activityValidation.success) {
        return NextResponse.json({ error: "Invalid current activity context." }, { status: 400 });
      }

      const newActivity = await regenerateActivity({
        request: requestValidation.data,
        dayNumber: Number(dayNumber),
        currentActivity: activityValidation.data,
        instruction: typeof instruction === "string" ? instruction.trim() : undefined,
      });

      return NextResponse.json({ success: true, activity: newActivity });
    }

    if (target === "day") {
      const dayValidation = dailyItinerarySchema.safeParse(body.currentDay);
      if (!dayValidation.success) {
        return NextResponse.json({ error: "Invalid current day context." }, { status: 400 });
      }

      const newDay = await regenerateDay({
        request: requestValidation.data,
        dayNumber: Number(dayNumber),
        currentDay: dayValidation.data,
        instruction: typeof instruction === "string" ? instruction.trim() : undefined,
      });

      return NextResponse.json({ success: true, day: newDay });
    }

    return NextResponse.json({ error: "Invalid regeneration target. Must be 'activity' or 'day'." }, { status: 400 });
  } catch (error) {
    console.error("[Roamly AI Error] Partial regeneration failed:", error);
    if (error instanceof TravelPlannerError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
    }
    return NextResponse.json({ error: "Failed to regenerate content. Please try again." }, { status: 500 });
  }
}
