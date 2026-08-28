import { activitySchema, dailyItinerarySchema, itinerarySchema, type Activity, type DailyItinerary, type Itinerary, type TripRequest, type WeatherData } from "@/lib/trip-schema";
import type { NormalizedWeatherData } from "@/lib/weather";
import { MockProvider } from "../mock-provider";
import {
  buildRegenerateActivityUserPrompt,
  buildRegenerateDayUserPrompt,
  buildTravelPlannerSystemPrompt,
  buildUserPrompt,
  regenerateActivitySystemPrompt,
  regenerateDaySystemPrompt,
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
      temperature: 0.2,
      max_tokens: 4096,
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
      console.error(`[Roamly Groq Telemetry] Model '${model}' network/timeout failure:`, netErr);
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
        `[Roamly Groq Telemetry] Model '${model}' HTTP ${response.status}${errorCode ? ` [${errorCode}]` : ""}: ${extractedMessage || "No details"
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
      console.error(`[Roamly Groq Telemetry] Model '${model}' returned HTTP 200 but content was empty.`);
      throw new TravelPlannerError("INVALID_AI_RESPONSE", "The Groq AI service returned an empty response.");
    }

    return { content, modelUsed: model };
  }

  private parseAndValidateItinerary(content: string, input: TripRequest, modelUsed: string): Itinerary {
    let parsedRaw: unknown;
    try {
      parsedRaw = JSON.parse(content);
    } catch (parseErr) {
      console.error(`[Roamly Groq Telemetry] Model: ${modelUsed} | Raw JSON parse: FAILED`, parseErr);
      throw new TravelPlannerError("INVALID_AI_RESPONSE", "Failed to parse JSON response from Groq.");
    }

    const normalized = normalizeItineraryJSON(parsedRaw, input);
    const validation = itinerarySchema.safeParse(normalized);

    if (!validation.success) {
      console.error(
        `[Roamly Groq Telemetry] Model: ${modelUsed} | Schema Validation: FAILED`,
        JSON.stringify(validation.error.flatten().fieldErrors, null, 2)
      );
      throw new TravelPlannerError("INVALID_AI_RESPONSE", "Groq returned an invalid itinerary structure.");
    }

    return validation.data;
  }

  async generateItinerary(input: TripRequest, weatherData?: NormalizedWeatherData | null): Promise<Itinerary> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey && (process.env.ALLOW_MOCK_FALLBACK === "true" || process.env.USE_MOCK_ITINERARY === "true")) {
      return new MockProvider().generateItinerary(input, weatherData);
    }

    const hasWeather = weatherData && weatherData.mode !== "unavailable";
    console.log(`[Roamly Groq Telemetry] Request: Destination="${input.destination}" | Duration=${input.duration} days | Currency=${input.currency} | Budget=${input.budget}`);
    console.log(`[Roamly Groq Telemetry] Weather Context: ${hasWeather ? `YES (${weatherData.mode})` : "NO"}`);

    const systemPrompt = buildTravelPlannerSystemPrompt(input.duration, weatherData);
    const userPrompt = buildUserPrompt(input, weatherData);

    let totalAttempts = 0;

    try {
      totalAttempts++;
      const initialCall = await this.callGroqAPI([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ]);

      const validated = this.parseAndValidateItinerary(initialCall.content, input, initialCall.modelUsed);
      const initialReturnedDuration = validated.dailyItinerary.length;

      // Direct Match Success Case
      if (validated.currency === input.currency && initialReturnedDuration === input.duration) {
        console.log(
          `[Roamly Groq Telemetry] Model: ${initialCall.modelUsed} | Requested Duration: ${input.duration} | Returned Duration: ${initialReturnedDuration} | Currency: ${validated.currency} | Total AI Attempts: ${totalAttempts} | SUCCESS`
        );
        return validated;
      }

      console.warn(
        `[Roamly Groq Telemetry] Initial AI Call Duration Mismatch — Requested: ${input.duration} days, Returned: ${initialReturnedDuration} days, Currency: ${validated.currency}. Initiating AI Day-Recovery Strategy...`
      );

      // Strategy B: Dedicated AI Generation for Missing Days
      const existingDayMap = new Map<number, DailyItinerary>();
      for (const day of validated.dailyItinerary) {
        existingDayMap.set(day.day, day);
      }

      const recoveredDays: DailyItinerary[] = [];

      for (let d = 1; d <= input.duration; d++) {
        if (existingDayMap.has(d)) {
          recoveredDays.push(existingDayMap.get(d)!);
        } else {
          totalAttempts++;
          console.log(`[Roamly Groq Telemetry] AI Generating Missing Day ${d}/${input.duration} for ${input.destination}...`);

          const dummyCurrentDay: DailyItinerary = {
            day: d,
            title: `Day ${d}: Exploring ${input.destination}`,
            activities: [],
            restaurants: [],
            dailyEstimatedCost: Math.round(input.budget / input.duration),
          };

          const dayWeatherInfo = weatherData?.days?.[d - 1]
            ? {
              date: weatherData.days[d - 1].date,
              condition: weatherData.days[d - 1].condition,
              weatherCode: weatherData.days[d - 1].weatherCode,
              temperatureMin: weatherData.days[d - 1].temperatureMin,
              temperatureMax: weatherData.days[d - 1].temperatureMax,
              precipitationProbability: weatherData.days[d - 1].precipitationProbability,
              precipitationMm: weatherData.days[d - 1].precipitationMm,
              sunrise: weatherData.days[d - 1].sunrise,
              sunset: weatherData.days[d - 1].sunset,
              mode: (weatherData.mode === "forecast" ? "forecast" : "climate_outlook") as "forecast" | "climate_outlook",
              confidence: weatherData.confidence,
            }
            : null;

          const generatedDay = await this.regenerateDay({
            request: input,
            dayNumber: d,
            currentDay: dummyCurrentDay,
            dayWeather: dayWeatherInfo,
            instruction: `Generate a rich, detailed daily itinerary for Day ${d} of a ${input.duration}-day trip to ${input.destination}. Include 2-3 activities and local dining.`,
          });

          generatedDay.day = d;
          recoveredDays.push(generatedDay);
        }
      }

      // Reconstruct complete itinerary object
      recoveredDays.sort((a, b) => a.day - b.day);
      const totalCostFromDays = recoveredDays.reduce((sum, day) => sum + (day.dailyEstimatedCost || 0), 0);

      const completeItinerary: Itinerary = {
        destination: input.destination,
        country: validated.country || input.destination,
        summary: validated.summary || `A comprehensive ${input.duration}-day travel plan to ${input.destination}.`,
        estimatedTotalCost: totalCostFromDays > 0 ? totalCostFromDays : input.budget,
        currency: input.currency,
        dailyItinerary: recoveredDays,
        travelTips: validated.travelTips && validated.travelTips.length > 0 ? validated.travelTips : ["Check local transport and opening hours prior to visiting."],
      };

      const finalValidation = itinerarySchema.safeParse(completeItinerary);
      if (!finalValidation.success) {
        console.error(
          `[Roamly Groq Telemetry] Recovered Itinerary Schema Validation Failed:`,
          JSON.stringify(finalValidation.error.flatten().fieldErrors, null, 2)
        );
        throw new TravelPlannerError("INVALID_AI_RESPONSE", "Recovered itinerary failed schema validation.");
      }

      console.log(
        `[Roamly Groq Telemetry] Model: ${initialCall.modelUsed} | Requested Duration: ${input.duration} | Initial Returned Duration: ${initialReturnedDuration} | Final Duration: ${completeItinerary.dailyItinerary.length} | Currency: ${completeItinerary.currency} | Total AI Attempts: ${totalAttempts} | RECOVERY SUCCESS`
      );

      return finalValidation.data;
    } catch (err) {
      if (process.env.ALLOW_MOCK_FALLBACK === "true" || process.env.USE_MOCK_ITINERARY === "true") {
        console.warn("[Roamly AI Warning] Falling back to MockProvider for generateItinerary:", err);
        return new MockProvider().generateItinerary(input, weatherData);
      }
      throw err;
    }
  }

  async regenerateActivity(input: {
    request: TripRequest;
    dayNumber: number;
    currentActivity: Activity;
    dayWeather?: WeatherData | null;
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
        console.log(`[Roamly Groq Telemetry] Activity Regenerate | Model: ${modelUsed} | Raw JSON parse: SUCCESS`);
      } catch (parseErr) {
        console.error(`[Roamly Groq Telemetry] Activity Regenerate | Model: ${modelUsed} | Raw JSON parse: FAILED`, parseErr);
        throw new TravelPlannerError("INVALID_AI_RESPONSE", "Failed to parse JSON response from Groq.");
      }

      const normalized = normalizeActivityJSON(parsedRaw, input.currentActivity);
      const validation = activitySchema.safeParse(normalized);

      if (!validation.success) {
        console.error(
          `[Roamly Groq Telemetry] Activity Regenerate | Model: ${modelUsed} | Schema Validation: FAILED`,
          JSON.stringify(validation.error.flatten().fieldErrors, null, 2)
        );
        throw new TravelPlannerError("INVALID_AI_RESPONSE", "Activity schema validation failed.");
      }

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
    dayWeather?: WeatherData | null;
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
        console.log(`[Roamly Groq Telemetry] Day Regenerate | Model: ${modelUsed} | Raw JSON parse: SUCCESS`);
      } catch (parseErr) {
        console.error(`[Roamly Groq Telemetry] Day Regenerate | Model: ${modelUsed} | Raw JSON parse: FAILED`, parseErr);
        throw new TravelPlannerError("INVALID_AI_RESPONSE", "Failed to parse JSON response from Groq.");
      }

      const normalized = normalizeDayJSON(parsedRaw, input.dayNumber, input.request);
      const validation = dailyItinerarySchema.safeParse(normalized);

      if (!validation.success) {
        console.error(
          `[Roamly Groq Telemetry] Day Regenerate | Model: ${modelUsed} | Schema Validation: FAILED`,
          JSON.stringify(validation.error.flatten().fieldErrors, null, 2)
        );
        throw new TravelPlannerError("INVALID_AI_RESPONSE", "Day schema validation failed.");
      }

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

/* Helper normalization functions for robust parsing without `any` */

function normalizeItineraryJSON(raw: unknown, input: TripRequest): Record<string, unknown> {
  let obj = raw as Record<string, unknown> | null;
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    if (obj.itinerary && typeof obj.itinerary === "object") obj = obj.itinerary as Record<string, unknown>;
    else if (obj.trip && typeof obj.trip === "object") obj = obj.trip as Record<string, unknown>;
    else if (obj.data && typeof obj.data === "object") obj = obj.data as Record<string, unknown>;
  }

  if (!obj || typeof obj !== "object") return {};

  const normalized: Record<string, unknown> = { ...obj };

  if (!normalized.destination || typeof normalized.destination !== "string") normalized.destination = input.destination;
  if (!normalized.currency || typeof normalized.currency !== "string") normalized.currency = input.currency;
  if (!normalized.country || typeof normalized.country !== "string") normalized.country = input.destination;
  if (!normalized.summary || typeof normalized.summary !== "string") normalized.summary = `A customized ${input.duration}-day trip to ${input.destination}.`;

  if (typeof normalized.travelTips === "string") {
    normalized.travelTips = normalized.travelTips
      .split("\n")
      .map((s: string) => s.replace(/^[-*\d.\s]+/, "").trim())
      .filter((s: string) => s.length > 0);
  } else if (!Array.isArray(normalized.travelTips)) {
    normalized.travelTips = ["Check local transport and opening hours prior to visiting."];
  } else {
    normalized.travelTips = (normalized.travelTips as unknown[]).map((tip) => String(tip).trim()).filter((tip: string) => tip.length > 0);
  }

  if (Array.isArray(normalized.dailyItinerary)) {
    normalized.dailyItinerary = (normalized.dailyItinerary as unknown[]).map((dayRaw, dayIdx: number) => {
      let dayObj = dayRaw as Record<string, unknown> | string;
      if (typeof dayObj === "string") {
        try { dayObj = JSON.parse(dayObj) as Record<string, unknown>; } catch { dayObj = {}; }
      }
      const dayRec = (dayObj && typeof dayObj === "object" ? dayObj : {}) as Record<string, unknown>;
      const dayNum = Number(dayRec.day) || (dayIdx + 1);
      const title = String(dayRec.title || `Day ${dayNum}: Exploring ${input.destination}`);

      let activities = Array.isArray(dayRec.activities) ? dayRec.activities : [];
      activities = (activities as unknown[]).map((actRaw) => {
        let act = actRaw as Record<string, unknown> | string;
        if (typeof act === "string") {
          try { act = JSON.parse(act) as Record<string, unknown>; } catch { act = { name: act }; }
        }
        const actRec = (act && typeof act === "object" ? act : {}) as Record<string, unknown>;
        return {
          name: String(actRec.name || "Sightseeing"),
          description: String(actRec.description || "Explore local attractions and scenic spots."),
          location: String(actRec.location || input.destination),
          startTime: String(actRec.startTime || "10:00 AM"),
          duration: String(actRec.duration || "2 hours"),
          estimatedCost: Number(actRec.estimatedCost) >= 0 ? Number(actRec.estimatedCost) : 0,
        };
      });

      let restaurants = Array.isArray(dayRec.restaurants) ? dayRec.restaurants : [];
      restaurants = (restaurants as unknown[]).map((restRaw) => {
        let rest = restRaw as Record<string, unknown> | string;
        if (typeof rest === "string") {
          try { rest = JSON.parse(rest) as Record<string, unknown>; } catch { rest = { name: rest }; }
        }
        const restRec = (rest && typeof rest === "object" ? rest : {}) as Record<string, unknown>;
        return {
          name: String(restRec.name || "Local Restaurant"),
          cuisine: String(restRec.cuisine || "Regional Cuisine"),
          meal: String(restRec.meal || "Lunch / Dinner"),
          location: String(restRec.location || input.destination),
          estimatedCost: Number(restRec.estimatedCost) >= 0 ? Number(restRec.estimatedCost) : 0,
        };
      });

      const actsCost = (activities as Array<{ estimatedCost: number }>).reduce((sum, a) => sum + a.estimatedCost, 0);
      const restsCost = (restaurants as Array<{ estimatedCost: number }>).reduce((sum, r) => sum + r.estimatedCost, 0);
      const dailyEstimatedCost = Number(dayRec.dailyEstimatedCost) >= 0 ? Number(dayRec.dailyEstimatedCost) : (actsCost + restsCost);

      return {
        day: dayNum,
        title,
        activities,
        restaurants,
        dailyEstimatedCost,
      };
    });
  }

  if (Array.isArray(normalized.dailyItinerary)) {
    const totalFromDays = (normalized.dailyItinerary as Array<{ dailyEstimatedCost: number }>).reduce((sum, d) => sum + (d.dailyEstimatedCost || 0), 0);
    normalized.estimatedTotalCost = Number(normalized.estimatedTotalCost) >= 0 ? Number(normalized.estimatedTotalCost) : totalFromDays;
  } else {
    normalized.estimatedTotalCost = Number(normalized.estimatedTotalCost) || 0;
  }

  return normalized;
}

function normalizeActivityJSON(raw: unknown, fallbackActivity: Activity): Record<string, unknown> {
  let obj = raw as Record<string, unknown> | null;
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    if (obj.activity && typeof obj.activity === "object") obj = obj.activity as Record<string, unknown>;
  }
  if (!obj || typeof obj !== "object") return fallbackActivity as unknown as Record<string, unknown>;

  return {
    name: String(obj.name || fallbackActivity.name),
    description: String(obj.description || fallbackActivity.description),
    location: String(obj.location || fallbackActivity.location),
    startTime: String(obj.startTime || fallbackActivity.startTime),
    duration: String(obj.duration || fallbackActivity.duration),
    estimatedCost: Number(obj.estimatedCost) >= 0 ? Number(obj.estimatedCost) : fallbackActivity.estimatedCost,
  };
}

function normalizeDayJSON(raw: unknown, dayNumber: number, input: TripRequest): Record<string, unknown> {
  let obj = raw as Record<string, unknown> | null;
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    if (obj.dayItinerary && typeof obj.dayItinerary === "object") obj = obj.dayItinerary as Record<string, unknown>;
    else if (obj.day && typeof obj.day === "object") obj = obj.day as Record<string, unknown>;
  }
  if (!obj || typeof obj !== "object") obj = {};

  const title = String(obj.title || `Day ${dayNumber}: Highlights in ${input.destination}`);

  let activities = Array.isArray(obj.activities) ? obj.activities : [];
  activities = (activities as unknown[]).map((actRaw) => {
    let act = actRaw as Record<string, unknown> | string;
    if (typeof act === "string") {
      try { act = JSON.parse(act) as Record<string, unknown>; } catch { act = { name: act }; }
    }
    const actRec = (act && typeof act === "object" ? act : {}) as Record<string, unknown>;
    return {
      name: String(actRec.name || "Sightseeing Spot"),
      description: String(actRec.description || "Enjoy local culture and scenery."),
      location: String(actRec.location || input.destination),
      startTime: String(actRec.startTime || "09:30 AM"),
      duration: String(actRec.duration || "2 hours"),
      estimatedCost: Number(actRec.estimatedCost) >= 0 ? Number(actRec.estimatedCost) : 0,
    };
  });

  let restaurants = Array.isArray(obj.restaurants) ? obj.restaurants : [];
  restaurants = (restaurants as unknown[]).map((restRaw) => {
    let rest = restRaw as Record<string, unknown> | string;
    if (typeof rest === "string") {
      try { rest = JSON.parse(rest) as Record<string, unknown>; } catch { rest = { name: rest }; }
    }
    const restRec = (rest && typeof rest === "object" ? rest : {}) as Record<string, unknown>;
    return {
      name: String(restRec.name || "Local Bistro"),
      cuisine: String(restRec.cuisine || "Regional Cuisine"),
      meal: String(restRec.meal || "Lunch"),
      location: String(restRec.location || input.destination),
      estimatedCost: Number(restRec.estimatedCost) >= 0 ? Number(restRec.estimatedCost) : 0,
    };
  });

  const actsCost = (activities as Array<{ estimatedCost: number }>).reduce((sum, a) => sum + a.estimatedCost, 0);
  const restsCost = (restaurants as Array<{ estimatedCost: number }>).reduce((sum, r) => sum + r.estimatedCost, 0);
  const dailyEstimatedCost = Number(obj.dailyEstimatedCost) >= 0 ? Number(obj.dailyEstimatedCost) : (actsCost + restsCost);

  return {
    day: dayNumber,
    title,
    activities,
    restaurants,
    dailyEstimatedCost,
  };
}
