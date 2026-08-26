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

export class GrokProvider implements AIProvider {
  readonly name = "grok";

  private async callGrokAPI(messages: Array<{ role: string; content: string }>): Promise<string> {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      console.error("[Roamly AI Error] XAI_API_KEY environment variable is not configured.");
      throw new TravelPlannerError("PROVIDER_NOT_CONFIGURED", "AI planner configuration is missing API key.");
    }

    const model = process.env.XAI_MODEL || "grok-2-latest";
    const endpoint = "https://api.x.ai/v1/chat/completions";

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
      console.error("[Roamly AI Error] Network/timeout failure reaching xAI API:", netErr);
      throw new TravelPlannerError(
        "TIMEOUT_ERROR",
        "The AI planning service took too long to respond. Please check your connection and try again.",
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

      // Log the exact error safely without exposing API keys or secrets
      console.error(
        `[Roamly AI Error] xAI API call failed (HTTP ${response.status}${errorCode ? ` - ${errorCode}` : ""}): ${
          extractedMessage || "No error details provided by API."
        }`
      );

      if (response.status === 401 || response.status === 403) {
        throw new TravelPlannerError(
          "PROVIDER_ERROR",
          `AI provider authentication failed (${response.status}): ${extractedMessage || "Invalid key or insufficient API credits."}`
        );
      }

      if (response.status === 429) {
        throw new TravelPlannerError(
          "RATE_LIMITED",
          "The AI planner is busy right now. Please wait a moment and try again."
        );
      }

      throw new TravelPlannerError(
        "PROVIDER_ERROR",
        `Grok API error (${response.status}): ${extractedMessage || "Provider request failed."}`
      );
    }

    const data = await response.json().catch(() => ({}));
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.error("[Roamly AI Error] xAI API returned a 200 response but content was empty.");
      throw new TravelPlannerError("INVALID_AI_RESPONSE", "The AI service returned an empty response.");
    }

    return content;
  }

  async generateItinerary(input: TripRequest): Promise<Itinerary> {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey && (process.env.ALLOW_MOCK_FALLBACK === "true" || process.env.USE_MOCK_ITINERARY === "true")) {
      return new MockProvider().generateItinerary(input);
    }

    try {
      const content = await this.callGrokAPI([
        { role: "system", content: travelPlannerSystemPrompt },
        { role: "user", content: buildUserPrompt(input) },
      ]);

      const generated = JSON.parse(content);
      const validation = itinerarySchema.safeParse(generated);
      if (!validation.success) {
        console.error("[Roamly AI Error] Itinerary Zod validation failed:", validation.error.flatten());
        throw new TravelPlannerError("INVALID_AI_RESPONSE", "The AI returned an invalid itinerary structure.");
      }

      if (validation.data.currency !== input.currency || validation.data.dailyItinerary.length !== input.duration) {
        console.error(
          `[Roamly AI Error] Response mismatch - Currency (expected: ${input.currency}, got: ${validation.data.currency}), Duration (expected: ${input.duration}, got: ${validation.data.dailyItinerary.length})`
        );
        throw new TravelPlannerError("INVALID_AI_RESPONSE", "The AI returned an itinerary with mismatched duration or currency.");
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
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey && (process.env.ALLOW_MOCK_FALLBACK === "true" || process.env.USE_MOCK_ITINERARY === "true")) {
      return new MockProvider().regenerateActivity(input);
    }

    try {
      const content = await this.callGrokAPI([
        { role: "system", content: regenerateActivitySystemPrompt },
        { role: "user", content: buildRegenerateActivityUserPrompt(input) },
      ]);

      const generated = JSON.parse(content);
      const validation = activitySchema.safeParse(generated);
      if (!validation.success) {
        console.error("[Roamly AI Error] Activity Zod validation failed:", validation.error.flatten());
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
    instruction?: string;
  }): Promise<DailyItinerary> {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey && (process.env.ALLOW_MOCK_FALLBACK === "true" || process.env.USE_MOCK_ITINERARY === "true")) {
      return new MockProvider().regenerateDay(input);
    }

    try {
      const content = await this.callGrokAPI([
        { role: "system", content: regenerateDaySystemPrompt },
        { role: "user", content: buildRegenerateDayUserPrompt(input) },
      ]);

      const generated = JSON.parse(content);
      const validation = dailyItinerarySchema.safeParse(generated);
      if (!validation.success) {
        console.error("[Roamly AI Error] Day Zod validation failed:", validation.error.flatten());
        throw new TravelPlannerError("INVALID_AI_RESPONSE", "Day schema validation failed.");
      }

      // Ensure correct day number is preserved
      validation.data.day = input.dayNumber;

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
