import { itinerarySchema, type Itinerary, type TripRequest } from "@/lib/trip-schema";
import { MockProvider } from "../mock-provider";
import { buildUserPrompt, travelPlannerSystemPrompt } from "../prompts";
import { TravelPlannerError, type AIProvider } from "../types";

export class GrokProvider implements AIProvider {
  readonly name = "grok";

  async generateItinerary(input: TripRequest): Promise<Itinerary> {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      console.error("[Roamly AI Error] XAI_API_KEY environment variable is not configured.");
      if (process.env.ALLOW_MOCK_FALLBACK === "true" || process.env.USE_MOCK_ITINERARY === "true") {
        console.warn("[Roamly AI Warning] Falling back to MockProvider because XAI_API_KEY is missing.");
        return new MockProvider().generateItinerary(input);
      }
      throw new TravelPlannerError(
        "PROVIDER_NOT_CONFIGURED",
        "Itinerary generation is temporarily unavailable. Please try again later."
      );
    }

    const model = process.env.XAI_MODEL || "grok-2-latest";
    const endpoint = "https://api.x.ai/v1/chat/completions";

    const payload = {
      model,
      messages: [
        { role: "system", content: travelPlannerSystemPrompt },
        { role: "user", content: buildUserPrompt(input) },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    };

    let response: Response;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

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
      console.error("[Roamly AI Error] Failed to connect to xAI / Grok API:", netErr);
      if (process.env.ALLOW_MOCK_FALLBACK === "true" || process.env.USE_MOCK_ITINERARY === "true") {
        console.warn("[Roamly AI Warning] Falling back to MockProvider due to network error.");
        return new MockProvider().generateItinerary(input);
      }
      throw new TravelPlannerError(
        "TIMEOUT_ERROR",
        "The planning service took too long to respond. Please check your connection and try again."
      );
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error(`[Roamly AI Error] xAI API error (${response.status}): ${errorText}`);

      if (response.status === 429) {
        if (process.env.ALLOW_MOCK_FALLBACK === "true" || process.env.USE_MOCK_ITINERARY === "true") {
          console.warn("[Roamly AI Warning] Falling back to MockProvider due to rate limit (429).");
          return new MockProvider().generateItinerary(input);
        }
        throw new TravelPlannerError(
          "RATE_LIMITED",
          "The planner is busy right now. Please wait a moment and try again."
        );
      }

      if (process.env.ALLOW_MOCK_FALLBACK === "true" || process.env.USE_MOCK_ITINERARY === "true") {
        console.warn(`[Roamly AI Warning] Falling back to MockProvider due to API error ${response.status}.`);
        return new MockProvider().generateItinerary(input);
      }

      throw new TravelPlannerError(
        "PROVIDER_ERROR",
        `Grok API error (${response.status}). Please try again.`
      );
    }

    let data: { choices?: Array<{ message?: { content?: string } }> };
    try {
      data = await response.json();
    } catch (parseErr) {
      console.error("[Roamly AI Error] Failed to parse xAI response as JSON:", parseErr);
      throw new TravelPlannerError(
        "INVALID_AI_RESPONSE",
        "We could not parse the response returned by the planning service. Please try again."
      );
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.error("[Roamly AI Error] Grok returned an empty response content.");
      throw new TravelPlannerError(
        "INVALID_AI_RESPONSE",
        "We could not validate the itinerary returned by the planning service. Please try again."
      );
    }

    let generated: unknown;
    try {
      generated = JSON.parse(content);
    } catch (parseError) {
      console.error("[Roamly AI Error] Failed to parse Grok message content as JSON:", parseError);
      throw new TravelPlannerError(
        "INVALID_AI_RESPONSE",
        "We could not validate the itinerary returned by the planning service. Please try again."
      );
    }

    const validation = itinerarySchema.safeParse(generated);
    if (!validation.success) {
      console.error("[Roamly AI Error] Zod validation failed on Grok response:", validation.error.flatten());
      throw new TravelPlannerError(
        "INVALID_AI_RESPONSE",
        "We could not validate the itinerary returned by the planning service. Please try again."
      );
    }

    if (validation.data.currency !== input.currency || validation.data.dailyItinerary.length !== input.duration) {
      console.error(
        `[Roamly AI Error] Response mismatch - Currency (expected: ${input.currency}, got: ${validation.data.currency}), Duration (expected: ${input.duration}, got: ${validation.data.dailyItinerary.length})`
      );
      throw new TravelPlannerError(
        "INVALID_AI_RESPONSE",
        "We could not validate the itinerary returned by the planning service. Please try again."
      );
    }

    return validation.data;
  }
}
