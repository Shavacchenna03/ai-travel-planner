import type { Itinerary, TripRequest } from "@/lib/trip-schema";
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
}
