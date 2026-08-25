import "server-only";

import type { Itinerary, TripRequest } from "@/lib/trip-schema";
import { getAIProvider } from "./factory";
import { TravelPlannerError, type TravelPlannerErrorCode } from "./types";

export { TravelPlannerError, type TravelPlannerErrorCode };

export async function generateItinerary(input: TripRequest): Promise<Itinerary> {
  const provider = getAIProvider();
  return provider.generateItinerary(input);
}
