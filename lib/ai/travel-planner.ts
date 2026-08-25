import "server-only";

import { ApiError, GoogleGenAI } from "@google/genai";
import { toJSONSchema } from "zod";

import { itinerarySchema, type Itinerary, type TripRequest } from "@/lib/trip-schema";

const travelPlannerInstructions = `You are Roamly's experienced travel planner. Create a practical, enjoyable day-by-day itinerary using only the requested JSON structure.

Rules:
- Respect the destination, total trip budget for the entire group, selected currency, duration, travelers, travel style, accommodation preference, and food preference.
- Treat all costs as conservative estimates for the whole group unless a field explicitly says otherwise. Keep estimatedTotalCost plausibly at or below the user's total budget, leaving a small buffer when practical.
- Create exactly one dailyItinerary entry per requested day. Keep each day achievable: usually 2–4 nearby activities with time for travel, meals, and rest. Avoid inventing real-time availability, confirmed prices, opening hours, reservations, or guaranteed access.
- Use geographically sensible sequencing and practical local transport. Include travel times in activity descriptions when useful.
- Include restaurants appropriate to the selected dietary preference and local cuisine. Do not present a restaurant as a guaranteed option.
- Explain that prices and availability are estimates in travelTips.
- For destinations in India, use India-appropriate costs when INR is selected and consider trains, buses, domestic flights, metro systems where available, cabs, and auto-rickshaws. Account for Indian dietary needs including vegetarian, Jain, vegan, and eggetarian preferences; regional food; seasonal conditions; family needs where relevant; and cultural or religious etiquette. Do not default to luxury or Western food.
- For international destinations, adapt transport, food, etiquette, and costs to that destination. INR can still be the user's planning currency.
- Do not output Markdown, HTML, commentary, or fields outside the specified JSON schema.`;

export async function generateItinerary(input: TripRequest): Promise<Itinerary> {
  if (process.env.USE_MOCK_ITINERARY === "true") {
    return getMockItinerary(input);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[Roamly AI Error] GEMINI_API_KEY environment variable is not configured.");
    throw new TravelPlannerError("GEMINI_NOT_CONFIGURED", "Itinerary generation is temporarily unavailable. Please try again later.");
  }

  const gemini = new GoogleGenAI({ apiKey });
  try {
    const response = await gemini.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Plan this trip: ${JSON.stringify({ ...input, budgetScope: "This is the total budget for the entire group, not per traveler or per day." })}`,
      config: {
        systemInstruction: travelPlannerInstructions,
        responseMimeType: "application/json",
        responseJsonSchema: toJSONSchema(itinerarySchema),
        maxOutputTokens: 8192,
      },
    });
    const output = response.text;
    if (!output) {
      console.error("[Roamly AI Error] Gemini returned an empty response.");
      throw new TravelPlannerError("INVALID_AI_RESPONSE", "We could not validate the itinerary returned by the planning service. Please try again.");
    }

    let generated: unknown;
    try {
      generated = JSON.parse(output);
    } catch (parseError) {
      console.error("[Roamly AI Error] Failed to parse Gemini response as JSON:", parseError);
      throw new TravelPlannerError("INVALID_AI_RESPONSE", "We could not validate the itinerary returned by the planning service. Please try again.");
    }

    const validation = itinerarySchema.safeParse(generated);
    if (!validation.success) {
      console.error("[Roamly AI Error] Zod validation failed on Gemini response:", validation.error.flatten());
      throw new TravelPlannerError("INVALID_AI_RESPONSE", "We could not validate the itinerary returned by the planning service. Please try again.");
    }

    if (validation.data.currency !== input.currency || validation.data.dailyItinerary.length !== input.duration) {
      console.error(
        `[Roamly AI Error] Response mismatch - Currency (expected: ${input.currency}, got: ${validation.data.currency}), Duration (expected: ${input.duration}, got: ${validation.data.dailyItinerary.length})`
      );
      throw new TravelPlannerError("INVALID_AI_RESPONSE", "We could not validate the itinerary returned by the planning service. Please try again.");
    }

    return validation.data;
  } catch (error) {
    if (error instanceof TravelPlannerError) throw error;
    if (error instanceof ApiError) {
      console.error(`[Roamly AI Error] Gemini API error (status ${error.status}):`, error.message);
      if (error.status === 429) {
        if (process.env.ALLOW_MOCK_FALLBACK === "true" || process.env.USE_MOCK_ITINERARY === "true") {
          return getMockItinerary(input);
        }
        throw new TravelPlannerError("RATE_LIMITED", "The planner is busy right now. Please wait a moment and try again.");
      }
      throw new TravelPlannerError("GEMINI_ERROR", `Gemini API error (${error.status}): ${error.message}`);
    }
    console.error("[Roamly AI Error] Unexpected error during Gemini generation:", error);
    throw new TravelPlannerError("GEMINI_ERROR", "Something went wrong while creating your itinerary. Please try again.");
  }
}

function getMockItinerary(input: TripRequest): Itinerary {
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

export class TravelPlannerError extends Error {
  constructor(public readonly code: "GEMINI_NOT_CONFIGURED" | "INVALID_AI_RESPONSE" | "RATE_LIMITED" | "GEMINI_ERROR", message: string) {
    super(message);
  }
}
