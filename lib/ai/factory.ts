import { MockProvider } from "./mock-provider";
import { GrokProvider } from "./providers/grok-provider";
import type { AIProvider } from "./types";

export function getAIProvider(): AIProvider {
  if (process.env.USE_MOCK_ITINERARY === "true") {
    return new MockProvider();
  }

  const providerName = (process.env.AI_PROVIDER || "grok").toLowerCase();

  switch (providerName) {
    case "grok":
    case "xai":
      return new GrokProvider();
    case "mock":
      return new MockProvider();
    default:
      console.warn(`[Roamly AI Warning] Unknown AI_PROVIDER "${providerName}". Defaulting to GrokProvider.`);
      return new GrokProvider();
  }
}
