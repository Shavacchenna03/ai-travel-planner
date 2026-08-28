import type { DailyItinerary, NearbyPlace, WeatherData } from "@/lib/trip-schema";
import { fetchNearbyPlacesFromGeoapify } from "./geoapify-service";

/**
 * Calculate geographic straight-line distance in kilometers between two coordinates
 * using the Haversine formula.
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (lat1 === lat2 && lon1 === lon2) return 0;

  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

/**
 * Check if a place name matches an activity name/location (case-insensitive substring check)
 */
export function isEquivalentPlace(placeName: string, targetName: string): boolean {
  const normP = placeName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const normT = targetName.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (!normP || !normT) return false;
  return normP.includes(normT) || normT.includes(normP);
}

/**
 * Pure deterministic ranking function for POI candidates based on:
 * 1. Category relevance (Bazaars / Markets / Cafés / Food Streets > Generic Attractions)
 * 2. Weather context (Indoor cafés/shopping on rain/hot days)
 * 3. Distance from search anchor
 * 4. Deduplication against planned activities & previous days
 */
export function rankNearbyPlaces(
  places: NearbyPlace[],
  anchorCoords: { lat: number; lon: number },
  existingActivityTexts: string[],
  usedPlaceNames: Set<string>,
  weather?: WeatherData | null
): NearbyPlace[] {
  const uniquePlaces: NearbyPlace[] = [];
  const seenLocalNames = new Set<string>();

  for (const place of places) {
    const normName = place.name.trim().toLowerCase();

    // 1. Skip if already recommended in an earlier day
    if (usedPlaceNames.has(normName)) continue;

    // 2. Skip if already in seenLocalNames
    if (seenLocalNames.has(normName)) continue;

    // 3. Skip if matches an activity planned for today
    const isActivityDuplicate = existingActivityTexts.some((actText) =>
      isEquivalentPlace(place.name, actText)
    );
    if (isActivityDuplicate) continue;

    // Calculate exact Haversine distance from anchor if needed
    const distanceKm =
      place.distanceKm > 0
        ? place.distanceKm
        : calculateHaversineDistanceKm(anchorCoords.lat, anchorCoords.lon, place.latitude, place.longitude);

    uniquePlaces.push({
      ...place,
      distanceKm,
    });
    seenLocalNames.add(normName);
  }

  // Rank places by category relevance, weather weight, and distance
  uniquePlaces.sort((a, b) => {
    const catWeightA = getCategoryWeight(a, weather);
    const catWeightB = getCategoryWeight(b, weather);

    if (catWeightA !== catWeightB) {
      return catWeightB - catWeightA; // Higher weight first
    }

    return a.distanceKm - b.distanceKm; // Closer distance first
  });

  return uniquePlaces;
}

/**
 * Calculates priority weight for POI categories with weather adjustments.
 */
export function getCategoryWeight(place: NearbyPlace, weather?: WeatherData | null): number {
  const catStr = [...(place.categories || []), place.category].join(" ").toLowerCase();
  const nameStr = place.name.toLowerCase();

  let weight = 1;

  // HIGH PRIORITY (Weight 5): Traditional markets, bazaars, local food streets, handicraft centers
  if (
    catStr.includes("marketplace") ||
    catStr.includes("bazaar") ||
    nameStr.includes("bazaar") ||
    nameStr.includes("market") ||
    nameStr.includes("food street") ||
    catStr.includes("gift_and_souvenir")
  ) {
    weight = 5;
  }
  // MEDIUM-HIGH PRIORITY (Weight 4): Cafés, bakeries, local food & dining, shopping malls
  else if (
    catStr.includes("cafe") ||
    catStr.includes("bakery") ||
    catStr.includes("restaurant") ||
    catStr.includes("food_and_drink") ||
    catStr.includes("shopping_mall")
  ) {
    weight = 4;
  }
  // MEDIUM PRIORITY (Weight 3): Local cultural experiences, entertainment, parks
  else if (
    catStr.includes("entertainment") ||
    catStr.includes("culture") ||
    catStr.includes("leisure.park") ||
    catStr.includes("nightclub") ||
    catStr.includes("bar")
  ) {
    weight = 3;
  }
  // LOW PRIORITY (Weight 2): Standard tourist attractions (so they don't dominate)
  else if (catStr.includes("tourism.attraction") || catStr.includes("tourism.sights")) {
    weight = 2;
  }

  // Weather awareness adjustment
  if (weather) {
    const cond = (weather.condition || "").toLowerCase();
    const isRainy =
      (weather.precipitationProbability != null && weather.precipitationProbability >= 40) ||
      (weather.precipitationMm != null && weather.precipitationMm >= 2.0) ||
      cond.includes("rain") ||
      cond.includes("drizzle") ||
      cond.includes("thunderstorm");
    const isHot = weather.temperatureMax != null && weather.temperatureMax >= 32;

    // Rainy or Hot Days: Boost indoor cafés, restaurants, bakeries, shopping malls, covered markets
    if (isRainy || isHot) {
      if (
        catStr.includes("cafe") ||
        catStr.includes("bakery") ||
        catStr.includes("restaurant") ||
        catStr.includes("shopping_mall")
      ) {
        weight += 2;
      }
    }
  }

  return weight;
}

/**
 * Fetch and attach day-specific POI recommendations for an itinerary day
 */
export async function getDailyNearbyPlaces(
  day: DailyItinerary,
  destinationCoords: { lat: number; lon: number } | null,
  usedPlaceNames: Set<string>
): Promise<NearbyPlace[]> {
  if (!destinationCoords || destinationCoords.lat == null || destinationCoords.lon == null) {
    return [];
  }

  const activities = day.activities || [];
  const existingActivityTexts = activities.flatMap((a) => [a.name, a.location]);

  // Fetch POIs around destination coordinates
  const rawCandidates = await fetchNearbyPlacesFromGeoapify({
    latitude: destinationCoords.lat,
    longitude: destinationCoords.lon,
    radiusMeters: 5000,
    limit: 30,
  });

  if (!rawCandidates || rawCandidates.length === 0) {
    return [];
  }

  const ranked = rankNearbyPlaces(
    rawCandidates,
    destinationCoords,
    existingActivityTexts,
    usedPlaceNames,
    day.weather
  );

  // Return top 3-4 places per day
  const selected = ranked.slice(0, 4);

  // Record selected place names to prevent duplicates in subsequent days
  for (const place of selected) {
    usedPlaceNames.add(place.name.trim().toLowerCase());
  }

  return selected;
}
