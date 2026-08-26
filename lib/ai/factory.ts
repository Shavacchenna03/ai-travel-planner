import { MockProvider } from "./mock-provider";
import { GrokProvider } from "./providers/grok-provider";
import { GroqProvider } from "./providers/groq-provider";
import type { AIProvider } from "./types";

export function getAIProvider(): AIProvider {
  if (process.env.USE_MOCK_ITINERARY === "true") {
    return new MockProvider();
  }

  const providerName = (process.env.AI_PROVIDER || "groq").toLowerCase();

  switch (providerName) {
    case "groq":
      return new GroqProvider();
    case "grok":
    case "xai":
      return new GrokProvider();
    case "mock":
      return new MockProvider();
    default:
      console.warn(`[Roamly AI Warning] Unknown AI_PROVIDER "${providerName}". Defaulting to GroqProvider.`);
      return new GroqProvider();
  }
}
