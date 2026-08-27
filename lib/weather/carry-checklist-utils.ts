import type { DailyItinerary, WeatherData } from "@/lib/trip-schema";
import { WEATHER_THRESHOLDS } from "./weather-utils";

export type CarryChecklistItem = {
  id: string;
  label: string;
  reason?: string;
  priority: "high" | "medium" | "low";
  category: "weather" | "comfort" | "activity" | "culture" | "electronics" | "safety";
  icon: string;
};

/**
 * Pure deterministic function to generate a day-specific "What to Carry" checklist
 * based on a day's weather conditions and activity characteristics.
 */
export function getDailyCarryChecklist(
  day: DailyItinerary,
  weather?: WeatherData | null
): CarryChecklistItem[] {
  const itemsMap = new Map<string, CarryChecklistItem>();

  function addItem(item: CarryChecklistItem) {
    if (!itemsMap.has(item.id)) {
      itemsMap.set(item.id, item);
    } else {
      const existing = itemsMap.get(item.id)!;
      if (
        (item.priority === "high" && existing.priority !== "high") ||
        (item.priority === "medium" && existing.priority === "low")
      ) {
        itemsMap.set(item.id, { ...existing, priority: item.priority, reason: item.reason || existing.reason });
      }
    }
  }

  const activities = day.activities || [];

  const combinedText = activities
    .map((a) => `${a.name || ""} ${a.description || ""}`)
    .join(" ")
    .toLowerCase();

  const isOutdoor =
    combinedText.includes("beach") ||
    combinedText.includes("park") ||
    combinedText.includes("garden") ||
    combinedText.includes("walk") ||
    combinedText.includes("tour") ||
    combinedText.includes("fort") ||
    combinedText.includes("hike") ||
    combinedText.includes("trek") ||
    combinedText.includes("sightseeing") ||
    combinedText.includes("outdoor") ||
    combinedText.includes("view") ||
    combinedText.includes("promenade") ||
    combinedText.includes("boat");

  const hasWalking =
    combinedText.includes("walk") ||
    combinedText.includes("tour") ||
    combinedText.includes("fort") ||
    combinedText.includes("old city") ||
    combinedText.includes("heritage") ||
    combinedText.includes("market") ||
    combinedText.includes("bazaar") ||
    combinedText.includes("sightseeing") ||
    combinedText.includes("explore") ||
    combinedText.includes("hike") ||
    combinedText.includes("trek");

  const hasBeachCoastal =
    combinedText.includes("beach") ||
    combinedText.includes("coast") ||
    combinedText.includes("seaside") ||
    combinedText.includes("snorkeling") ||
    combinedText.includes("diving") ||
    combinedText.includes("surfing");

  const hasHiking =
    combinedText.includes("hike") ||
    combinedText.includes("hiking") ||
    combinedText.includes("trek") ||
    combinedText.includes("trail") ||
    combinedText.includes("mountain") ||
    combinedText.includes("nature walk");

  const hasSwimming =
    combinedText.includes("swim") ||
    combinedText.includes("pool") ||
    combinedText.includes("snorkeling") ||
    combinedText.includes("diving") ||
    combinedText.includes("beach swim");

  const hasPhotography =
    combinedText.includes("photo") ||
    combinedText.includes("photography") ||
    combinedText.includes("viewpoint") ||
    combinedText.includes("scenic") ||
    combinedText.includes("sunset") ||
    combinedText.includes("sunrise") ||
    combinedText.includes("fort") ||
    combinedText.includes("monument");

  const hasReligiousCultural =
    combinedText.includes("temple") ||
    combinedText.includes("mosque") ||
    combinedText.includes("church") ||
    combinedText.includes("shrine") ||
    combinedText.includes("monastery") ||
    combinedText.includes("cathedral") ||
    combinedText.includes("religious");

  const hasEveningActivity = activities.some((a) => {
    const t = (a.startTime || "").toLowerCase();
    return t.includes("pm") && (t.includes("06:") || t.includes("07:") || t.includes("08:") || t.includes("09:") || t.includes("10:"));
  });

  // --- 1. WEATHER-BASED RULES --- //
  if (weather) {
    const cond = (weather.condition || "").toLowerCase();
    const code = weather.weatherCode ?? -1;

    const isThunderstorm = code >= 95 || cond.includes("thunderstorm");
    const isHeavyRain =
      (weather.precipitationProbability != null && weather.precipitationProbability >= WEATHER_THRESHOLDS.RAIN_HIGH_PROB) ||
      (weather.precipitationMm != null && weather.precipitationMm >= WEATHER_THRESHOLDS.RAIN_HIGH_MM) ||
      cond.includes("heavy rain");
    const isModerateRain =
      (weather.precipitationProbability != null && weather.precipitationProbability >= WEATHER_THRESHOLDS.RAIN_MODERATE_PROB) ||
      (weather.precipitationMm != null && weather.precipitationMm >= WEATHER_THRESHOLDS.RAIN_MODERATE_MM) ||
      cond.includes("rain") ||
      cond.includes("drizzle") ||
      cond.includes("shower");

    const isHot = weather.temperatureMax != null && weather.temperatureMax >= WEATHER_THRESHOLDS.HIGH_HEAT_TEMP;
    const isCold = weather.temperatureMin != null && weather.temperatureMin <= WEATHER_THRESHOLDS.COLD_TEMP;

    // Rain protection
    if (isThunderstorm) {
      addItem({
        id: "umbrella_raincoat",
        label: "Compact Umbrella / Rain Jacket",
        reason: "Thunderstorms & heavy rain likely today",
        priority: "high",
        category: "weather",
        icon: "☔",
      });
      addItem({
        id: "waterproof_pouch",
        label: "Waterproof Phone Pouch",
        reason: "Protect electronics during stormy weather",
        priority: "medium",
        category: "safety",
        icon: "📱",
      });
    } else if (isHeavyRain || isModerateRain) {
      addItem({
        id: "umbrella_raincoat",
        label: "Umbrella or Rain Coat",
        reason: "Rain expected during today's activities",
        priority: isHeavyRain ? "high" : "medium",
        category: "weather",
        icon: "☂️",
      });
    }

    // Heat & Sun protection
    if (isHot) {
      addItem({
        id: "water_bottle",
        label: "Reusable Water Bottle",
        reason: "Stay hydrated in high heat conditions",
        priority: "high",
        category: "comfort",
        icon: "💧",
      });
      addItem({
        id: "sunscreen",
        label: "Sunscreen (SPF 30+)",
        reason: "Protect skin during warm temperatures",
        priority: "high",
        category: "weather",
        icon: "🧴",
      });
      addItem({
        id: "sunglasses",
        label: "UV Sunglasses",
        reason: "Bright sun and high heat expected",
        priority: "medium",
        category: "weather",
        icon: "🕶️",
      });
      if (isOutdoor) {
        addItem({
          id: "sun_hat",
          label: "Sun Hat / Cap",
          reason: "Sun protection during outdoor activities",
          priority: "medium",
          category: "weather",
          icon: "🧢",
        });
      }
    }

    // Cold protection
    if (isCold) {
      addItem({
        id: "warm_jacket",
        label: "Warm Jacket or Layers",
        reason: "Cool temperatures expected today",
        priority: "high",
        category: "weather",
        icon: "🧥",
      });
      if (hasEveningActivity) {
        addItem({
          id: "extra_layer",
          label: "Evening Warm Layer / Scarf",
          reason: "Temperatures drop sharply after dark",
          priority: "medium",
          category: "weather",
          icon: "🧣",
        });
      }
    }
  }

  // --- 2. ACTIVITY-BASED RULES --- //

  // Religious / Cultural Sites
  if (hasReligiousCultural) {
    addItem({
      id: "modest_clothing",
      label: "Modest Outfit / Cover-up Shawl",
      reason: "Respectful dress code for religious & cultural sites",
      priority: "high",
      category: "culture",
      icon: "🥻",
    });
  }

  // Hiking / Nature (High priority outdoor activity)
  if (hasHiking) {
    addItem({
      id: "sturdy_footwear",
      label: "Sturdy Hiking Shoes / Trail Footwear",
      reason: "Nature trail or hiking planned",
      priority: "high",
      category: "activity",
      icon: "🥾",
    });
    addItem({
      id: "backpack",
      label: "Daypack / Small Backpack",
      reason: "Carry essentials during nature trek",
      priority: "medium",
      category: "comfort",
      icon: "🎒",
    });
    addItem({
      id: "water_bottle",
      label: "Reusable Water Bottle",
      reason: "Essential hydration on trails",
      priority: "high",
      category: "comfort",
      icon: "💧",
    });
  } else if (hasWalking) {
    addItem({
      id: "walking_shoes",
      label: "Comfortable Walking Shoes",
      reason: "Walking-heavy exploration planned for today",
      priority: "high",
      category: "comfort",
      icon: "👟",
    });
    if (!itemsMap.has("water_bottle")) {
      addItem({
        id: "water_bottle",
        label: "Water Bottle",
        reason: "Stay hydrated during walking tours",
        priority: "medium",
        category: "comfort",
        icon: "💧",
      });
    }
  }

  // Beach / Coastal / Swimming
  if (hasBeachCoastal || hasSwimming) {
    addItem({
      id: "swimwear",
      label: "Swimwear & Change of Clothes",
      reason: "Beach or water activities scheduled",
      priority: "high",
      category: "activity",
      icon: "🩱",
    });
    addItem({
      id: "towel",
      label: "Quick-Dry Travel Towel",
      reason: "For coastal or swimming activities",
      priority: "high",
      category: "activity",
      icon: "🧺",
    });
    if (!itemsMap.has("sunscreen")) {
      addItem({
        id: "sunscreen",
        label: "Sunscreen (SPF 30+)",
        reason: "Essential for beach/coastal exposure",
        priority: "medium",
        category: "weather",
        icon: "🧴",
      });
    }
    if (!itemsMap.has("sunglasses")) {
      addItem({
        id: "sunglasses",
        label: "Sunglasses",
        reason: "Shield eyes from coastal glare",
        priority: "medium",
        category: "weather",
        icon: "🕶️",
      });
    }
  }

  // Photography / Viewpoints
  if (hasPhotography) {
    addItem({
      id: "camera_phone",
      label: "Fully Charged Phone / Camera",
      reason: "Scenic spots & photography highlights today",
      priority: "medium",
      category: "electronics",
      icon: "📷",
    });
    addItem({
      id: "power_bank",
      label: "Portable Power Bank",
      reason: "Keep devices charged while taking photos",
      priority: "low",
      category: "electronics",
      icon: "🔋",
    });
  }

  // Fallback defaults for empty/light days
  if (itemsMap.size === 0) {
    addItem({
      id: "comfort_shoes",
      label: "Comfortable Footwear",
      reason: "General city sightseeing",
      priority: "low",
      category: "comfort",
      icon: "👟",
    });
    addItem({
      id: "phone_wallet",
      label: "Phone & Local Currency",
      reason: "Daily travel essentials",
      priority: "low",
      category: "electronics",
      icon: "👛",
    });
  }

  // Convert map to array
  const items = Array.from(itemsMap.values());

  // Priority sorting helper
  const priorityOrder = { high: 1, medium: 2, low: 3 };

  items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return items.slice(0, 7);
}
