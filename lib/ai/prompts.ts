import type { Activity, DailyItinerary, TripRequest } from "@/lib/trip-schema";

export function buildTravelPlannerSystemPrompt(duration: number): string {
  const dayListStr = Array.from({ length: duration }, (_, i) => `Day ${i + 1}`).join(", ");

  return `You are Roamly's experienced travel planner. Create a practical, enjoyable day-by-day itinerary using ONLY the following JSON structure:

{
  "destination": "string",
  "country": "string",
  "summary": "string",
  "estimatedTotalCost": number,
  "currency": "INR" | "USD" | "EUR" | "GBP" | "JPY",
  "dailyItinerary": [
    {
      "day": 1,
      "title": "string",
      "activities": [
        {
          "name": "string",
          "description": "string",
          "location": "string",
          "startTime": "string",
          "duration": "string",
          "estimatedCost": number
        }
      ],
      "restaurants": [
        {
          "name": "string",
          "cuisine": "string",
          "meal": "string",
          "location": "string",
          "estimatedCost": number
        }
      ],
      "dailyEstimatedCost": number
    }
    /* Generate EXACTLY ${duration} day objects (${dayListStr}) */
  ],
  "travelTips": [
    "string"
  ]
}

CRITICAL DURATION REQUIREMENT:
- The user requested a trip duration of EXACTLY ${duration} day(s) (${dayListStr}).
- You MUST generate EXACTLY ${duration} day objects inside the "dailyItinerary" array.
- "dailyItinerary.length" MUST equal ${duration}.
- Do NOT stop at 2, 3, 5, or 6 days. You MUST include all days up to Day ${duration}.
- Ensure the days are numbered sequentially from day: 1 up to day: ${duration} (${dayListStr}).
- The trip plan is INVALID if dailyItinerary.length !== ${duration}.

Rules:
- Respect the destination, total trip budget for the entire group, selected currency (must be one of INR, USD, EUR, GBP, JPY), duration (${duration} days), travelers, travel style, accommodation preference, and food preference.
- Treat all costs as conservative estimates for the whole group. Keep estimatedTotalCost plausibly at or below the user's total budget.
- Ensure each day (from Day 1 to Day ${duration}) is achievable: usually 2–4 nearby activities with time for travel, meals, and rest.
- Ensure dailyEstimatedCost is the sum of activity and restaurant estimated costs for that day.
- Ensure travelTips is an array of helpful travel advice strings.
- Output MUST be strict valid JSON matching the specified schema. Do not output Markdown, HTML, commentary, or wrapper objects outside the specified JSON schema.`;
}

export const travelPlannerSystemPrompt = buildTravelPlannerSystemPrompt(3);

export function buildUserPrompt(input: TripRequest): string {
  const dayListStr = Array.from({ length: input.duration }, (_, i) => `Day ${i + 1}`).join(", ");

  return `Plan a trip with the following parameters:
- Destination: ${input.destination}
- Duration: EXACTLY ${input.duration} DAYS (${dayListStr})
- Group Budget: ${input.currency} ${input.budget} (Total for all ${input.travelers} travelers)
- Currency: ${input.currency}
- Travelers: ${input.travelers}
- Travel Style: ${input.style}
- Accommodation Preference: ${input.accommodation}
- Food Preference: ${input.food}

CRITICAL STRUCTURAL CHECK:
"dailyItinerary" array MUST contain EXACTLY ${input.duration} elements: ${dayListStr}.`;
}

export const regenerateActivitySystemPrompt = `You are Roamly's experienced travel planner. Your task is to generate ONE single replacement activity for a trip.
You MUST output a single JSON object matching this schema:
{
  "name": "string",
  "description": "string",
  "location": "string",
  "startTime": "string (e.g. 09:00 AM)",
  "duration": "string (e.g. 2 hours)",
  "estimatedCost": number
}
Rules:
- Respect the destination, budget, currency, and dietary/style preferences provided.
- The cost should be reasonable and in the selected currency.
- Output MUST be strict valid JSON matching the specified schema. Do not output Markdown, commentary, or extra fields.`;

export const regenerateDaySystemPrompt = `You are Roamly's experienced travel planner. Your task is to generate ONE replacement daily itinerary for a specific day of a trip.
You MUST output a single JSON object matching this schema:
{
  "day": number,
  "title": "string",
  "activities": [
    {
      "name": "string",
      "description": "string",
      "location": "string",
      "startTime": "string",
      "duration": "string",
      "estimatedCost": number
    }
  ],
  "restaurants": [
    {
      "name": "string",
      "cuisine": "string",
      "meal": "string",
      "location": "string",
      "estimatedCost": number
    }
  ],
  "dailyEstimatedCost": number
}
Rules:
- Respect the destination, budget, currency, and dietary/style preferences provided.
- Ensure dailyEstimatedCost is the sum of estimated costs of activities and restaurants.
- Output MUST be strict valid JSON matching the specified schema. Do not output Markdown, commentary, or extra fields.`;

export function buildRegenerateActivityUserPrompt(input: {
  request: TripRequest;
  dayNumber: number;
  currentActivity: Activity;
  instruction?: string;
}): string {
  return `Generate a replacement activity for Day ${input.dayNumber} of a trip to ${input.request.destination}.
Trip Context: ${JSON.stringify(input.request)}
Current Activity being replaced: ${JSON.stringify(input.currentActivity)}
User Instruction: ${input.instruction || "Provide a fresh alternative activity in the same spirit or nearby location."}`;
}

export function buildRegenerateDayUserPrompt(input: {
  request: TripRequest;
  dayNumber: number;
  currentDay: DailyItinerary;
  instruction?: string;
}): string {
  return `Regenerate the daily itinerary for Day ${input.dayNumber} of a trip to ${input.request.destination}.
Trip Context: ${JSON.stringify(input.request)}
Current Day being replaced: ${JSON.stringify(input.currentDay)}
User Instruction: ${input.instruction || "Provide a fresh day plan with exciting activities and local dining."}`;
}
