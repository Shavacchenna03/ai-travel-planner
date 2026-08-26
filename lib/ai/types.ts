import type { Activity, DailyItinerary, Itinerary, TripRequest } from "@/lib/trip-schema";

export type TravelPlannerErrorCode =
  | "PROVIDER_NOT_CONFIGURED"
  | "INVALID_AI_RESPONSE"
  | "RATE_LIMITED"
  | "PROVIDER_ERROR"
  | "TIMEOUT_ERROR";

export class TravelPlannerError extends Error {
  constructor(
    public readonly code: TravelPlannerErrorCode,
    message: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = "TravelPlannerError";
  }
}

export interface AIProvider {
  readonly name: string;
  generateItinerary(input: TripRequest): Promise<Itinerary>;
  regenerateActivity(input: {
    request: TripRequest;
    dayNumber: number;
    currentActivity: Activity;
    instruction?: string;
  }): Promise<Activity>;
  regenerateDay(input: {
    request: TripRequest;
    dayNumber: number;
    currentDay: DailyItinerary;
    instruction?: string;
  }): Promise<DailyItinerary>;
}
