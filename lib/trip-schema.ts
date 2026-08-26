import { z } from "zod";

import { accommodationPreferences, currencies, foodPreferences, travelStyles } from "@/lib/planner-options";

export const weatherDataSchema = z.object({
  date: z.string(),
  condition: z.string(),
  weatherCode: z.number().nullable().optional(),
  temperatureMin: z.number().nullable(),
  temperatureMax: z.number().nullable(),
  precipitationProbability: z.number().nullable().optional(),
  precipitationMm: z.number().nullable().optional(),
  sunrise: z.string().nullable().optional(),
  sunset: z.string().nullable().optional(),
  mode: z.enum(["forecast", "climate_outlook"]),
  confidence: z.enum(["high", "medium", "low"]),
});

export const tripRequestSchema = z.object({
  destination: z.string().trim().min(2, "Please enter a destination.").max(120),
  startDate: z.string().optional(),
  budget: z.coerce.number().positive("Enter a budget greater than zero.").finite(),
  currency: z.enum(currencies),
  duration: z.coerce.number().int().min(1).max(30),
  travelers: z.coerce.number().int().min(1).max(12),
  style: z.enum(travelStyles),
  accommodation: z.enum(accommodationPreferences),
  food: z.enum(foodPreferences),
});

export const activitySchema = z.object({
  name: z.string().min(1, "Activity name is required."),
  description: z.string().min(1, "Description is required."),
  location: z.string().min(1, "Location is required."),
  startTime: z.string().min(1, "Start time is required."),
  duration: z.string().min(1, "Duration is required."),
  estimatedCost: z.coerce.number().nonnegative("Estimated cost must be 0 or greater."),
});

export const restaurantSchema = z.object({
  name: z.string().min(1),
  cuisine: z.string().min(1),
  meal: z.string().min(1),
  location: z.string().min(1),
  estimatedCost: z.number().nonnegative(),
});

export const dailyItinerarySchema = z.object({
  day: z.number().int().min(1),
  title: z.string().min(1),
  activities: z.array(activitySchema),
  restaurants: z.array(restaurantSchema),
  dailyEstimatedCost: z.number().nonnegative(),
  weather: weatherDataSchema.optional(),
});

export const itinerarySchema = z.object({
  destination: z.string().min(1),
  country: z.string().min(1),
  summary: z.string().min(1),
  estimatedTotalCost: z.number().nonnegative(),
  currency: z.enum(currencies),
  dailyItinerary: z.array(dailyItinerarySchema),
  travelTips: z.array(z.string().min(1)),
});

export type WeatherData = z.infer<typeof weatherDataSchema>;
export type TripRequest = z.infer<typeof tripRequestSchema>;
export type Activity = z.infer<typeof activitySchema>;
export type Restaurant = z.infer<typeof restaurantSchema>;
export type DailyItinerary = z.infer<typeof dailyItinerarySchema>;
export type Itinerary = z.infer<typeof itinerarySchema>;
