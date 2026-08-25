import { z } from "zod";

import { accommodationPreferences, currencies, foodPreferences, travelStyles } from "@/lib/planner-options";

export const tripRequestSchema = z.object({
  destination: z.string().trim().min(2, "Please enter a destination.").max(120),
  budget: z.coerce.number().positive("Enter a budget greater than zero.").finite(),
  currency: z.enum(currencies),
  duration: z.coerce.number().int().min(1).max(30),
  travelers: z.coerce.number().int().min(1).max(12),
  style: z.enum(travelStyles),
  accommodation: z.enum(accommodationPreferences),
  food: z.enum(foodPreferences),
});

const activitySchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  location: z.string().min(1),
  startTime: z.string().min(1),
  duration: z.string().min(1),
  estimatedCost: z.number().nonnegative(),
});

const restaurantSchema = z.object({
  name: z.string().min(1),
  cuisine: z.string().min(1),
  meal: z.string().min(1),
  location: z.string().min(1),
  estimatedCost: z.number().nonnegative(),
});

export const itinerarySchema = z.object({
  destination: z.string().min(1),
  country: z.string().min(1),
  summary: z.string().min(1),
  estimatedTotalCost: z.number().nonnegative(),
  currency: z.enum(currencies),
  dailyItinerary: z.array(z.object({
    day: z.number().int().min(1),
    title: z.string().min(1),
    activities: z.array(activitySchema),
    restaurants: z.array(restaurantSchema),
    dailyEstimatedCost: z.number().nonnegative(),
  })),
  travelTips: z.array(z.string().min(1)),
});

export type TripRequest = z.infer<typeof tripRequestSchema>;
export type Itinerary = z.infer<typeof itinerarySchema>;
