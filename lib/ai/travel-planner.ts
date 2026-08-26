import "server-only";

import type { Activity, DailyItinerary, Itinerary, TripRequest, WeatherData } from "@/lib/trip-schema";
import type { NormalizedWeatherData } from "@/lib/weather";
import { getAIProvider } from "./factory";
import { TravelPlannerError, type TravelPlannerErrorCode } from "./types";

export { TravelPlannerError, type TravelPlannerErrorCode };

export async function generateItinerary(input: TripRequest, weatherData?: NormalizedWeatherData | null): Promise<Itinerary> {
  const provider = getAIProvider();
  return provider.generateItinerary(input, weatherData);
}

export async function regenerateActivity(input: {
  request: TripRequest;
  dayNumber: number;
  currentActivity: Activity;
  dayWeather?: WeatherData | null;
  instruction?: string;
}): Promise<Activity> {
  const provider = getAIProvider();
  return provider.regenerateActivity(input);
}

export async function regenerateDay(input: {
  request: TripRequest;
  dayNumber: number;
  currentDay: DailyItinerary;
  dayWeather?: WeatherData | null;
  instruction?: string;
}): Promise<DailyItinerary> {
  const provider = getAIProvider();
  return provider.regenerateDay(input);
}
