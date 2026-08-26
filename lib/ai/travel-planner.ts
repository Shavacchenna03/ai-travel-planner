import "server-only";

import type { Activity, DailyItinerary, Itinerary, TripRequest } from "@/lib/trip-schema";
import { getAIProvider } from "./factory";
import { TravelPlannerError, type TravelPlannerErrorCode } from "./types";

export { TravelPlannerError, type TravelPlannerErrorCode };

export async function generateItinerary(input: TripRequest): Promise<Itinerary> {
  const provider = getAIProvider();
  return provider.generateItinerary(input);
}

export async function regenerateActivity(input: {
  request: TripRequest;
  dayNumber: number;
  currentActivity: Activity;
  instruction?: string;
}): Promise<Activity> {
  const provider = getAIProvider();
  return provider.regenerateActivity(input);
}

export async function regenerateDay(input: {
  request: TripRequest;
  dayNumber: number;
  currentDay: DailyItinerary;
  instruction?: string;
}): Promise<DailyItinerary> {
  const provider = getAIProvider();
  return provider.regenerateDay(input);
}
