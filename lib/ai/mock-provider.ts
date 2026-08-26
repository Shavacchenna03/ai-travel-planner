import type { Activity, DailyItinerary, Itinerary, TripRequest } from "@/lib/trip-schema";
import type { AIProvider } from "./types";

export class MockProvider implements AIProvider {
  readonly name = "mock";

  async generateItinerary(input: TripRequest): Promise<Itinerary> {
    const duration = input.duration;
    const currency = input.currency;
    const destination = input.destination || "Goa";
    const dailyEstimatedCost = Math.round((input.budget * 0.8) / duration);

    const dailyItinerary = Array.from({ length: duration }, (_, i) => ({
      day: i + 1,
      title: `Day ${i + 1}: Exploring ${destination}`,
      activities: [
        {
          name: `Visit ${destination} Spot ${i + 1}A`,
          description: `Enjoy the scenic views and local culture at spot ${i + 1}A.`,
          location: `${destination} Central`,
          startTime: "09:00 AM",
          duration: "3 hours",
          estimatedCost: Math.round(dailyEstimatedCost * 0.4),
        },
        {
          name: `${destination} Highlights ${i + 1}B`,
          description: `Discover historical and vibrant landmarks in ${destination}.`,
          location: `${destination} Coast`,
          startTime: "02:00 PM",
          duration: "2.5 hours",
          estimatedCost: Math.round(dailyEstimatedCost * 0.3),
        },
      ],
      restaurants: [
        {
          name: `Local Feast Bistro ${i + 1}`,
          cuisine: "Regional & Fresh Seafood",
          meal: "Lunch / Dinner",
          location: `${destination} Food Street`,
          estimatedCost: Math.round(dailyEstimatedCost * 0.3),
        },
      ],
      dailyEstimatedCost,
    }));

    return {
      destination,
      country: "India",
      summary: `A delightful ${duration}-day trip to ${destination} tailored for ${input.travelers} traveler(s) with a ${input.style} style.`,
      estimatedTotalCost: dailyEstimatedCost * duration,
      currency,
      dailyItinerary,
      travelTips: [
        "Keep cash handy for local vendors and taxis.",
        "Check local opening hours before visiting popular spots.",
        "Stay hydrated and try local specialties.",
      ],
    };
  }

  async regenerateActivity(input: {
    request: TripRequest;
    dayNumber: number;
    currentActivity: Activity;
    instruction?: string;
  }): Promise<Activity> {
    const dest = input.request.destination || "Goa";
    const opt = input.instruction ? ` (${input.instruction})` : "";

    return {
      name: `Special ${dest} Experience${opt}`,
      description: `A customized activity in ${dest} matching your preferences: ${input.instruction || "relaxed and enjoyable"}.`,
      location: `${dest} Highlight Zone`,
      startTime: input.currentActivity.startTime || "10:00 AM",
      duration: input.currentActivity.duration || "2 hours",
      estimatedCost: Math.round(input.currentActivity.estimatedCost * 0.9) || 1200,
    };
  }

  async regenerateDay(input: {
    request: TripRequest;
    dayNumber: number;
    currentDay: DailyItinerary;
    instruction?: string;
  }): Promise<DailyItinerary> {
    const dest = input.request.destination || "Goa";
    const dayNum = input.dayNumber;

    return {
      day: dayNum,
      title: `Day ${dayNum}: ${input.instruction ? input.instruction : `Fresh ${dest} Discovery`}`,
      activities: [
        {
          name: `${dest} Morning Highlight`,
          description: `Enjoy a refreshed morning itinerary in ${dest}.`,
          location: `${dest} North`,
          startTime: "09:30 AM",
          duration: "2.5 hours",
          estimatedCost: 1500,
        },
        {
          name: `${dest} Afternoon Culture & Views`,
          description: `Explore local sights and scenic spots in ${dest}.`,
          location: `${dest} Promenade`,
          startTime: "02:30 PM",
          duration: "3 hours",
          estimatedCost: 2000,
        },
      ],
      restaurants: [
        {
          name: `${dest} Special Cafe`,
          cuisine: "Local & Regional",
          meal: "Lunch",
          location: `${dest} Center`,
          estimatedCost: 1200,
        },
      ],
      dailyEstimatedCost: 4700,
    };
  }
}
