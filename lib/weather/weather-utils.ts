import type { Activity, DailyItinerary, WeatherData } from "@/lib/trip-schema";

export type TripWeatherSummary = {
  mode: "forecast" | "climate_outlook" | "unavailable";
  title: string;
  conditionSummary: string;
  tempMin: number | null;
  tempMax: number | null;
  rainyDaysCount: number;
  totalDaysCount: number;
  rainLikelihoodText: string;
  recommendation: string;
  disclosure: string;
};

export type WeatherWarning = {
  id: string;
  label: string;
  icon: string;
  severity: "low" | "medium" | "high";
};

// Threshold constants
export const WEATHER_THRESHOLDS = {
  HIGH_HEAT_TEMP: 32,
  COLD_TEMP: 5,
  RAIN_HIGH_PROB: 50,
  RAIN_HIGH_MM: 3.0,
  RAIN_MODERATE_PROB: 30,
  RAIN_MODERATE_MM: 1.0,
};

/**
 * Computes whole-trip weather summary metrics from a trip's daily itinerary array.
 */
export function getTripWeatherSummary(dailyItinerary: DailyItinerary[]): TripWeatherSummary {
  const daysWithWeather = dailyItinerary
    .map((d) => d.weather)
    .filter((w): w is WeatherData => Boolean(w));

  if (!daysWithWeather || daysWithWeather.length === 0) {
    return {
      mode: "unavailable",
      title: "Weather Outlook",
      conditionSummary: "Weather details unavailable",
      tempMin: null,
      tempMax: null,
      rainyDaysCount: 0,
      totalDaysCount: dailyItinerary.length,
      rainLikelihoodText: "No rain data available",
      recommendation: "Your itinerary was generated without weather constraints.",
      disclosure: "Live weather data for this location could not be fetched. Enjoy your trip!",
    };
  }

  const mode = daysWithWeather[0].mode || "forecast";

  // Temperatures
  const mins = daysWithWeather.map((w) => w.temperatureMin).filter((t): t is number => t !== null && t !== undefined);
  const maxs = daysWithWeather.map((w) => w.temperatureMax).filter((t): t is number => t !== null && t !== undefined);

  const overallMin = mins.length > 0 ? Math.min(...mins) : null;
  const overallMax = maxs.length > 0 ? Math.max(...maxs) : null;

  // Rainy days count
  const rainyDays = daysWithWeather.filter(
    (w) =>
      (w.precipitationProbability != null && w.precipitationProbability >= WEATHER_THRESHOLDS.RAIN_MODERATE_PROB) ||
      (w.precipitationMm != null && w.precipitationMm >= WEATHER_THRESHOLDS.RAIN_MODERATE_MM) ||
      (w.condition || "").toLowerCase().includes("rain") ||
      (w.condition || "").toLowerCase().includes("drizzle")
  );

  const rainyDaysCount = rainyDays.length;
  const totalDaysCount = daysWithWeather.length;

  let rainLikelihoodText = "Low chance of rain across trip";
  if (rainyDaysCount === totalDaysCount && totalDaysCount > 0) {
    rainLikelihoodText = `Rain expected on all ${totalDaysCount} days`;
  } else if (rainyDaysCount > 0) {
    rainLikelihoodText = `Rain likely on ${rainyDaysCount} of ${totalDaysCount} days`;
  }

  // Dominant condition
  const conditionsCount: Record<string, number> = {};
  daysWithWeather.forEach((w) => {
    const c = w.condition || "Clear";
    conditionsCount[c] = (conditionsCount[c] || 0) + 1;
  });

  const dominantCondition = Object.keys(conditionsCount).reduce((a, b) =>
    conditionsCount[a] > conditionsCount[b] ? a : b
  , "Clear");

  let conditionSummary = dominantCondition;
  if (dominantCondition.toLowerCase().includes("clear") || dominantCondition.toLowerCase().includes("sunny")) {
    conditionSummary = "🌤 Mostly Sunny & Clear";
  } else if (dominantCondition.toLowerCase().includes("cloud")) {
    conditionSummary = "⛅ Partly Cloudy";
  } else if (dominantCondition.toLowerCase().includes("rain") || dominantCondition.toLowerCase().includes("drizzle")) {
    conditionSummary = "🌧 Rainy & Showery";
  }

  // Recommendations
  let recommendation = "Pack comfortably for outdoor exploration and check local day forecasts.";
  if (overallMax !== null && overallMax >= WEATHER_THRESHOLDS.HIGH_HEAT_TEMP) {
    recommendation = "High heat expected. Carry water, wear sun protection, and plan afternoon breaks.";
  } else if (rainyDaysCount >= Math.ceil(totalDaysCount / 2)) {
    recommendation = "Frequent rain expected. Carry an umbrella or waterproof jacket and prioritize indoor activities.";
  } else if (overallMin !== null && overallMin <= WEATHER_THRESHOLDS.COLD_TEMP) {
    recommendation = "Chilly conditions expected. Pack warm layers and jackets for morning and evening outings.";
  } else if (rainyDaysCount > 0) {
    recommendation = "Passing showers expected on select days. Keep a light raincoat or umbrella handy.";
  }

  const disclosure =
    mode === "forecast"
      ? "Forecast — based on current weather predictions."
      : "Typical Conditions — based on historical weather patterns for similar dates. Actual weather may differ.";

  return {
    mode,
    title: mode === "forecast" ? "Trip Weather Forecast" : "Typical Climate Outlook",
    conditionSummary,
    tempMin: overallMin,
    tempMax: overallMax,
    rainyDaysCount,
    totalDaysCount,
    rainLikelihoodText,
    recommendation,
    disclosure,
  };
}

/**
 * Returns a short deterministic insight sentence for a specific day based on its weather.
 */
export function getWeatherDayInsight(weather?: WeatherData | null): string {
  if (!weather) return "Standard conditions — enjoy your day's activities.";

  const cond = (weather.condition || "").toLowerCase();
  const code = weather.weatherCode ?? -1;

  if (code >= 95 || cond.includes("thunderstorm")) {
    return "Thunderstorms possible — keep outdoor plans flexible.";
  }

  if (
    (weather.precipitationProbability != null && weather.precipitationProbability >= WEATHER_THRESHOLDS.RAIN_HIGH_PROB) ||
    (weather.precipitationMm != null && weather.precipitationMm >= WEATHER_THRESHOLDS.RAIN_HIGH_MM) ||
    cond.includes("heavy rain")
  ) {
    return "Rain is likely — indoor activities are prioritized.";
  }

  if (
    (weather.precipitationProbability != null && weather.precipitationProbability >= WEATHER_THRESHOLDS.RAIN_MODERATE_PROB) ||
    (weather.precipitationMm != null && weather.precipitationMm >= WEATHER_THRESHOLDS.RAIN_MODERATE_MM) ||
    cond.includes("drizzle") ||
    cond.includes("shower")
  ) {
    return "Passing showers expected — carry an umbrella.";
  }

  if (weather.temperatureMax != null && weather.temperatureMax >= WEATHER_THRESHOLDS.HIGH_HEAT_TEMP) {
    return "Hot afternoon expected — consider doing outdoor activities in the morning.";
  }

  if (weather.temperatureMin != null && weather.temperatureMin <= WEATHER_THRESHOLDS.COLD_TEMP) {
    return "Cool temperatures expected — wear warm layers.";
  }

  if ((weather.weatherCode != null && weather.weatherCode <= 2) || cond.includes("clear") || cond.includes("sunny") || cond.includes("partly cloudy")) {
    return "Good conditions for outdoor sightseeing.";
  }

  return "Pleasant weather — ideal for exploring local attractions.";
}

/**
 * Returns deterministic warning badges for disruptive weather on a specific day.
 */
export function getWeatherWarnings(weather?: WeatherData | null): WeatherWarning[] {
  if (!weather) return [];

  const warnings: WeatherWarning[] = [];
  const cond = (weather.condition || "").toLowerCase();
  const code = weather.weatherCode ?? -1;

  // Thunderstorm
  if (code >= 95 || cond.includes("thunderstorm")) {
    warnings.push({
      id: "thunderstorm",
      label: "Thunderstorm risk",
      icon: "⛈",
      severity: "high",
    });
  }

  // Heavy Rain
  if (
    (weather.precipitationProbability != null && weather.precipitationProbability >= WEATHER_THRESHOLDS.RAIN_HIGH_PROB) ||
    (weather.precipitationMm != null && weather.precipitationMm >= WEATHER_THRESHOLDS.RAIN_HIGH_MM) ||
    cond.includes("rain")
  ) {
    warnings.push({
      id: "rain",
      label: "Rain likely",
      icon: "🌧",
      severity: "medium",
    });
  }

  // Extreme Heat
  if (weather.temperatureMax != null && weather.temperatureMax >= WEATHER_THRESHOLDS.HIGH_HEAT_TEMP) {
    warnings.push({
      id: "heat",
      label: "High heat",
      icon: "🔥",
      severity: "medium",
    });
  }

  // Cold
  if (weather.temperatureMin != null && weather.temperatureMin <= WEATHER_THRESHOLDS.COLD_TEMP) {
    warnings.push({
      id: "cold",
      label: "Cold conditions",
      icon: "❄",
      severity: "low",
    });
  }

  return warnings;
}

/**
 * Returns a small contextual attribution tag for an activity based on day weather + activity attributes.
 * Returns null if no reliable attribution can be established.
 */
export function getWeatherActivityContext(activity: Activity, weather?: WeatherData | null): string | null {
  if (!weather) return null;

  const actName = (activity.name || "").toLowerCase();
  const actDesc = (activity.description || "").toLowerCase();
  const time = (activity.startTime || "").toLowerCase();
  const cond = (weather.condition || "").toLowerCase();

  const isIndoor =
    actName.includes("museum") ||
    actName.includes("gallery") ||
    actName.includes("cafe") ||
    actName.includes("bistro") ||
    actName.includes("mall") ||
    actName.includes("indoor") ||
    actName.includes("center") ||
    actDesc.includes("museum") ||
    actDesc.includes("indoor") ||
    actDesc.includes("gallery") ||
    actDesc.includes("dining");

  const isOutdoor =
    actName.includes("beach") ||
    actName.includes("park") ||
    actName.includes("garden") ||
    actName.includes("walk") ||
    actName.includes("tour") ||
    actName.includes("view") ||
    actName.includes("promenade") ||
    actName.includes("fort") ||
    actName.includes("boat") ||
    actDesc.includes("scenic") ||
    actDesc.includes("outdoor") ||
    actDesc.includes("beach");

  const isMorning = time.includes("am") || time.includes("08:") || time.includes("09:") || time.includes("10:") || time.includes("11:");
  const isAfternoon = time.includes("pm") && (time.includes("12:") || time.includes("01:") || time.includes("02:") || time.includes("03:") || time.includes("04:"));

  // 1. High Heat -> Morning outdoor activity
  const isHot = weather.temperatureMax != null && weather.temperatureMax >= WEATHER_THRESHOLDS.HIGH_HEAT_TEMP;
  if (isHot && isMorning && isOutdoor) {
    return "🌡 Scheduled in the morning due to afternoon heat";
  }

  // 2. High Heat -> Afternoon indoor activity
  if (isHot && isAfternoon && isIndoor) {
    return "❄ Air-conditioned spot during peak heat";
  }

  // 3. Rain -> Indoor activity
  const isRainy =
    (weather.precipitationProbability != null && weather.precipitationProbability >= WEATHER_THRESHOLDS.RAIN_MODERATE_PROB) ||
    (weather.precipitationMm != null && weather.precipitationMm >= WEATHER_THRESHOLDS.RAIN_MODERATE_MM) ||
    cond.includes("rain") ||
    cond.includes("drizzle");

  if (isRainy && isIndoor) {
    return "🌧 Indoor activity — rain expected";
  }

  // 4. Clear skies -> Outdoor activity
  const isClear = (weather.weatherCode != null && weather.weatherCode <= 2) || cond.includes("clear") || cond.includes("sunny");
  if (isClear && isOutdoor) {
    return "☀️ Scheduled during clearer weather";
  }

  return null;
}

/**
 * Returns overall weather severity rank for quick styling.
 */
export function getWeatherSeverity(weather?: WeatherData | null): "clear" | "mild" | "warning" | "severe" {
  if (!weather) return "clear";
  const warnings = getWeatherWarnings(weather);
  if (warnings.some((w) => w.severity === "high")) return "severe";
  if (warnings.some((w) => w.severity === "medium")) return "warning";
  if (warnings.length > 0) return "mild";
  return "clear";
}
