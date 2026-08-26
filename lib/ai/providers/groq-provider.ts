import { activitySchema, dailyItinerarySchema, itinerarySchema, type Activity, type DailyItinerary, type Itinerary, type TripRequest } from "@/lib/trip-schema";
import { MockProvider } from "../mock-provider";
import {
  buildRegenerateActivityUserPrompt,
  buildRegenerateDayUserPrompt,
  buildUserPrompt,
  regenerateActivitySystemPrompt,
  regenerateDaySystemPrompt,
  travelPlannerSystemPrompt,
} from "../prompts";
import { TravelPlannerError, type AIProvider } from "../types";

export class GroqProvider implements AIProvider {
  readonly name = "groq";

  private async callGroqAPI(messages: Array<{ role: string; content: string }>): Promise<{ content: string; modelUsed: string }> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error("[Roamly AI Error] GROQ_API_KEY environment variable is not configured.");
      throw new TravelPlannerError("PROVIDER_NOT_CONFIGURED", "AI planner configuration is missing GROQ_API_KEY.");
    }

    const model = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
    const endpoint = "https://api.groq.com/openai/v1/chat/completions";

    const payload = {
      model,
      messages,
      response_format: { type: "json_object" },
      temperature: 0.3,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (netErr) {
      clearTimeout(timeoutId);
      console.error(`[Roamly Groq Debug] Model '${model}' network/timeout failure:`, netErr);
      throw new TravelPlannerError(
        "TIMEOUT_ERROR",
        "The Groq planning service took too long to respond. Please check your connection and try again.",
        netErr
      );
    }

    if (!response.ok) {
      const rawErrorText = await response.text().catch(() => "");
      let extractedMessage = "";
      let errorCode = "";

      try {
        const parsed = JSON.parse(rawErrorText);
        if (parsed.error && typeof parsed.error === "string") {
          extractedMessage = parsed.error;
        } else if (parsed.error && typeof parsed.error === "object") {
          extractedMessage = parsed.error.message || parsed.error.detail || JSON.stringify(parsed.error);
        } else if (parsed.message) {
          extractedMessage = typeof parsed.message === "string" ? parsed.message : JSON.stringify(parsed.message);
        }
        errorCode = parsed.code || parsed.error?.code || "";
      } catch {
        extractedMessage = rawErrorText.slice(0, 300);
      }

      console.error(
        `[Roamly Groq Debug] Model '${model}' HTTP ${response.status}${errorCode ? ` [${errorCode}]` : ""}: ${
          extractedMessage || "No details"
        }`
      );

      if (response.status === 401 || response.status === 403) {
        throw new TravelPlannerError(
          "PROVIDER_ERROR",
          `Groq API authentication failed (${response.status}): ${extractedMessage || "Invalid GROQ_API_KEY or access denied."}`
        );
      }

      if (response.status === 429) {
        throw new TravelPlannerError(
          "RATE_LIMITED",
          "The Groq AI planner is busy right now. Please wait a moment and try again."
        );
      }

      throw new TravelPlannerError(
        "PROVIDER_ERROR",
        `Groq API error (${response.status}): ${extractedMessage || "Provider request failed."}`
      );
    }

    const data = await response.json().catch(() => ({}));
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.error(`[Roamly Groq Debug] Model '${model}' returned HTTP 200 but content was empty.`);
      throw new TravelPlannerError("INVALID_AI_RESPONSE", "The Groq AI service returned an empty response.");
    }

    return { content, modelUsed: model };
  }

  async generateItinerary(input: TripRequest): Promise<Itinerary> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey && (process.env.ALLOW_MOCK_FALLBACK === "true" || process.env.USE_MOCK_ITINERARY === "true")) {
      return new MockProvider().generateItinerary(input);
    }

    try {
      const { content, modelUsed } = await this.callGroqAPI([
        { role: "system", content: travelPlannerSystemPrompt },
        { role: "user", content: buildUserPrompt(input) },
      ]);

      let parsedRaw: unknown;
      try {
        parsedRaw = JSON.parse(content);
        console.log(`[Roamly Groq Debug] Model: ${modelUsed} | Raw JSON parse: SUCCESS`);
      } catch (parseErr) {
        console.error(`[Roamly Groq Debug] Model: ${modelUsed} | Raw JSON parse: FAILED`, parseErr);
        throw new TravelPlannerError("INVALID_AI_RESPONSE", "Failed to parse JSON response from Groq.");
      }

      const normalized = normalizeItineraryJSON(parsedRaw, input);
      const validation = itinerarySchema.safeParse(normalized);

      if (!validation.success) {
        console.error(
          `[Roamly Groq Debug] Model: ${modelUsed} | Schema Validation: FAILED`,
          JSON.stringify(validation.error.flatten().fieldErrors, null, 2)
        );
        throw new TravelPlannerError("INVALID_AI_RESPONSE", "Groq returned an invalid itinerary structure.");
      }

      console.log(`[Roamly Groq Debug] Model: ${modelUsed} | Schema Validation: SUCCESS (Destination: ${validation.data.destination})`);

      if (validation.data.currency !== input.currency || validation.data.dailyItinerary.length !== input.duration) {
        console.error(
          `[Roamly Groq Debug] Response mismatch - Currency (expected: ${input.currency}, got: ${validation.data.currency}), Duration (expected: ${input.duration}, got: ${validation.data.dailyItinerary.length})`
        );
        throw new TravelPlannerError("INVALID_AI_RESPONSE", "Groq returned an itinerary with mismatched duration or currency.");
      }

      return validation.data;
    } catch (err) {
      if (process.env.ALLOW_MOCK_FALLBACK === "true" || process.env.USE_MOCK_ITINERARY === "true") {
        console.warn("[Roamly AI Warning] Falling back to MockProvider for generateItinerary:", err);
        return new MockProvider().generateItinerary(input);
      }
      throw err;
    }
  }

  async regenerateActivity(input: {
    request: TripRequest;
    dayNumber: number;
    currentActivity: Activity;
    instruction?: string;
  }): Promise<Activity> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey && (process.env.ALLOW_MOCK_FALLBACK === "true" || process.env.USE_MOCK_ITINERARY === "true")) {
      return new MockProvider().regenerateActivity(input);
    }

    try {
      const { content, modelUsed } = await this.callGroqAPI([
        { role: "system", content: regenerateActivitySystemPrompt },
        { role: "user", content: buildRegenerateActivityUserPrompt(input) },
      ]);

      let parsedRaw: unknown;
      try {
        parsedRaw = JSON.parse(content);
        console.log(`[Roamly Groq Debug] Activity Regenerate | Model: ${modelUsed} | Raw JSON parse: SUCCESS`);
      } catch (parseErr) {
        console.error(`[Roamly Groq Debug] Activity Regenerate | Model: ${modelUsed} | Raw JSON parse: FAILED`, parseErr);
        throw new TravelPlannerError("INVALID_AI_RESPONSE", "Failed to parse JSON response from Groq.");
      }

      const normalized = normalizeActivityJSON(parsedRaw, input.currentActivity);
      const validation = activitySchema.safeParse(normalized);

      if (!validation.success) {
        console.error(
          `[Roamly Groq Debug] Activity Regenerate | Model: ${modelUsed} | Schema Validation: FAILED`,
          JSON.stringify(validation.error.flatten().fieldErrors, null, 2)
        );
        throw new TravelPlannerError("INVALID_AI_RESPONSE", "Activity schema validation failed.");
      }

      console.log(`[Roamly Groq Debug] Activity Regenerate | Model: ${modelUsed} | Schema Validation: SUCCESS`);

      return validation.data;
    } catch (err) {
      if (process.env.ALLOW_MOCK_FALLBACK === "true" || process.env.USE_MOCK_ITINERARY === "true") {
        console.warn("[Roamly AI Warning] Falling back to MockProvider for regenerateActivity:", err);
        return new MockProvider().regenerateActivity(input);
      }
      throw err;
    }
  }

  async regenerateDay(input: {
    request: TripRequest;
    dayNumber: number;
    currentDay: DailyItinerary;
    instruction?: string;
  }): Promise<DailyItinerary> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey && (process.env.ALLOW_MOCK_FALLBACK === "true" || process.env.USE_MOCK_ITINERARY === "true")) {
      return new MockProvider().regenerateDay(input);
    }

    try {
      const { content, modelUsed } = await this.callGroqAPI([
        { role: "system", content: regenerateDaySystemPrompt },
        { role: "user", content: buildRegenerateDayUserPrompt(input) },
      ]);

      let parsedRaw: unknown;
      try {
        parsedRaw = JSON.parse(content);
        console.log(`[Roamly Groq Debug] Day Regenerate | Model: ${modelUsed} | Raw JSON parse: SUCCESS`);
      } catch (parseErr) {
        console.error(`[Roamly Groq Debug] Day Regenerate | Model: ${modelUsed} | Raw JSON parse: FAILED`, parseErr);
        throw new TravelPlannerError("INVALID_AI_RESPONSE", "Failed to parse JSON response from Groq.");
      }

      const normalized = normalizeDayJSON(parsedRaw, input.dayNumber, input.request);
      const validation = dailyItinerarySchema.safeParse(normalized);

      if (!validation.success) {
        console.error(
          `[Roamly Groq Debug] Day Regenerate | Model: ${modelUsed} | Schema Validation: FAILED`,
          JSON.stringify(validation.error.flatten().fieldErrors, null, 2)
        );
        throw new TravelPlannerError("INVALID_AI_RESPONSE", "Day schema validation failed.");
      }

      console.log(`[Roamly Groq Debug] Day Regenerate | Model: ${modelUsed} | Schema Validation: SUCCESS`);

      return validation.data;
    } catch (err) {
      if (process.env.ALLOW_MOCK_FALLBACK === "true" || process.env.USE_MOCK_ITINERARY === "true") {
        console.warn("[Roamly AI Warning] Falling back to MockProvider for regenerateDay:", err);
        return new MockProvider().regenerateDay(input);
      }
      throw err;
    }
  }
}

/* Helper normalization functions for robust parsing */

function normalizeItineraryJSON(raw: any, input: TripRequest): any {
  let obj = raw;
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    if (obj.itinerary && typeof obj.itinerary === "object") obj = obj.itinerary;
    else if (obj.trip && typeof obj.trip === "object") obj = obj.trip;
    else if (obj.data && typeof obj.data === "object") obj = obj.data;
  }

  if (!obj || typeof obj !== "object") return obj;

  if (!obj.destination || typeof obj.destination !== "string") obj.destination = input.destination;
  if (!obj.currency || typeof obj.currency !== "string") obj.currency = input.currency;
  if (!obj.country || typeof obj.country !== "string") obj.country = "Destination Country";
  if (!obj.summary || typeof obj.summary !== "string") obj.summary = `A customized ${input.duration}-day trip to ${input.destination}.`;

  if (typeof obj.travelTips === "string") {
    obj.travelTips = obj.travelTips
      .split("\n")
      .map((s: string) => s.replace(/^[-*\d.\s]+/, "").trim())
      .filter((s: string) => s.length > 0);
  } else if (!Array.isArray(obj.travelTips)) {
    obj.travelTips = ["Check local transport and opening hours prior to visiting."];
  } else {
    obj.travelTips = obj.travelTips.map((tip: any) => String(tip).trim()).filter((tip: string) => tip.length > 0);
  }

  if (Array.isArray(obj.dailyItinerary)) {
    obj.dailyItinerary = obj.dailyItinerary.map((dayObj: any, dayIdx: number) => {
      if (typeof dayObj === "string") {
        try { dayObj = JSON.parse(dayObj); } catch { dayObj = {}; }
      }
      const dayNum = Number(dayObj?.day) || (dayIdx + 1);
      const title = String(dayObj?.title || `Day ${dayNum}: Exploring ${input.destination}`);

      let activities = Array.isArray(dayObj?.activities) ? dayObj.activities : [];
      activities = activities.map((act: any) => {
        if (typeof act === "string") {
          try { act = JSON.parse(act); } catch { act = { name: act }; }
        }
        return {
          name: String(act?.name || "Sightseeing"),
          description: String(act?.description || "Explore local attractions and scenic spots."),
          location: String(act?.location || input.destination),
          startTime: String(act?.startTime || "10:00 AM"),
          duration: String(act?.duration || "2 hours"),
          estimatedCost: Number(act?.estimatedCost) >= 0 ? Number(act.estimatedCost) : 0,
        };
      });

      let restaurants = Array.isArray(dayObj?.restaurants) ? dayObj.restaurants : [];
      restaurants = restaurants.map((rest: any) => {
        if (typeof rest === "string") {
          try { rest = JSON.parse(rest); } catch { rest = { name: rest }; }
        }
        return {
          name: String(rest?.name || "Local Restaurant"),
          cuisine: String(rest?.cuisine || "Regional Cuisine"),
          meal: String(rest?.meal || "Lunch / Dinner"),
          location: String(rest?.location || input.destination),
          estimatedCost: Number(rest?.estimatedCost) >= 0 ? Number(rest.estimatedCost) : 0,
        };
      });

      const actsCost = activities.reduce((sum: number, a: any) => sum + a.estimatedCost, 0);
      const restsCost = restaurants.reduce((sum: number, r: any) => sum + r.estimatedCost, 0);
      const dailyEstimatedCost = Number(dayObj?.dailyEstimatedCost) >= 0 ? Number(dayObj.dailyEstimatedCost) : (actsCost + restsCost);

      return {
        day: dayNum,
        title,
        activities,
        restaurants,
        dailyEstimatedCost,
      };
    });
  }

  if (Array.isArray(obj.dailyItinerary)) {
    const totalFromDays = obj.dailyItinerary.reduce((sum: number, d: any) => sum + (d.dailyEstimatedCost || 0), 0);
    obj.estimatedTotalCost = Number(obj.estimatedTotalCost) >= 0 ? Number(obj.estimatedTotalCost) : totalFromDays;
  } else {
    obj.estimatedTotalCost = Number(obj.estimatedTotalCost) || 0;
  }

  return obj;
}

function normalizeActivityJSON(raw: any, fallbackActivity: Activity): any {
  let obj = raw;
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    if (obj.activity && typeof obj.activity === "object") obj = obj.activity;
  }
  if (!obj || typeof obj !== "object") return fallbackActivity;

  return {
    name: String(obj.name || fallbackActivity.name),
    description: String(obj.description || fallbackActivity.description),
    location: String(obj.location || fallbackActivity.location),
    startTime: String(obj.startTime || fallbackActivity.startTime),
    duration: String(obj.duration || fallbackActivity.duration),
    estimatedCost: Number(obj.estimatedCost) >= 0 ? Number(obj.estimatedCost) : fallbackActivity.estimatedCost,
  };
}

function normalizeDayJSON(raw: any, dayNumber: number, input: TripRequest): any {
  let obj = raw;
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    if (obj.dayItinerary && typeof obj.dayItinerary === "object") obj = obj.dayItinerary;
    else if (obj.day && typeof obj.day === "object") obj = obj.day;
  }
  if (!obj || typeof obj !== "object") obj = {};

  const title = String(obj.title || `Day ${dayNumber}: Highlights in ${input.destination}`);

  let activities = Array.isArray(obj.activities) ? obj.activities : [];
  activities = activities.map((act: any) => {
    if (typeof act === "string") {
      try { act = JSON.parse(act); } catch { act = { name: act }; }
    }
    return {
      name: String(act?.name || "Sightseeing Spot"),
      description: String(act?.description || "Enjoy local culture and scenery."),
      location: String(act?.location || input.destination),
      startTime: String(act?.startTime || "09:30 AM"),
      duration: String(act?.duration || "2 hours"),
      estimatedCost: Number(act?.estimatedCost) >= 0 ? Number(act.estimatedCost) : 0,
    };
  });

  let restaurants = Array.isArray(obj.restaurants) ? obj.restaurants : [];
  restaurants = restaurants.map((rest: any) => {
    if (typeof rest === "string") {
      try { rest = JSON.parse(rest); } catch { rest = { name: rest }; }
    }
    return {
      name: String(rest?.name || "Local Bistro"),
      cuisine: String(rest?.cuisine || "Regional Cuisine"),
      meal: String(rest?.meal || "Lunch"),
      location: String(rest?.location || input.destination),
      estimatedCost: Number(rest?.estimatedCost) >= 0 ? Number(rest.estimatedCost) : 0,
    };
  });

  const actsCost = activities.reduce((sum: number, a: any) => sum + a.estimatedCost, 0);
  const restsCost = restaurants.reduce((sum: number, r: any) => sum + r.estimatedCost, 0);
  const dailyEstimatedCost = Number(obj.dailyEstimatedCost) >= 0 ? Number(obj.dailyEstimatedCost) : (actsCost + restsCost);

  return {
    day: dayNumber,
    title,
    activities,
    restaurants,
    dailyEstimatedCost,
  };
}
