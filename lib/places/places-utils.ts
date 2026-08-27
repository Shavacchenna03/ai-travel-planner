import type { DailyItinerary, NearbyPlace } from "@/lib/trip-schema";
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
 * 1. Category relevance (tourism/heritage/natural > leisure)
 * 2. Distance from search anchor
 * 3. Name length / quality
 */
export function rankNearbyPlaces(
  places: NearbyPlace[],
  anchorCoords: { lat: number; lon: number },
  existingActivityTexts: string[],
  usedPlaceNames: Set<string>
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

  // Rank places by distance and category weight
  uniquePlaces.sort((a, b) => {
    const catWeightA = getCategoryWeight(a.categories || []);
    const catWeightB = getCategoryWeight(b.categories || []);

    if (catWeightA !== catWeightB) {
      return catWeightB - catWeightA; // Higher weight first
    }

    return a.distanceKm - b.distanceKm; // Closer distance first
  });

  return uniquePlaces;
}

function getCategoryWeight(categories: string[]): number {
  const catStr = categories.join(" ").toLowerCase();
  if (catStr.includes("tourism.attraction") || catStr.includes("tourism.sights")) return 5;
  if (catStr.includes("heritage") || catStr.includes("historic")) return 4;
  if (catStr.includes("natural") || catStr.includes("park")) return 3;
  if (catStr.includes("entertainment") || catStr.includes("leisure")) return 2;
  return 1;
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
    limit: 25,
  });

  if (!rawCandidates || rawCandidates.length === 0) {
    return [];
  }

  const ranked = rankNearbyPlaces(rawCandidates, destinationCoords, existingActivityTexts, usedPlaceNames);

  // Return top 3-5 places
  const selected = ranked.slice(0, 4);

  // Record selected place names to prevent duplicates in subsequent days
  for (const place of selected) {
    usedPlaceNames.add(place.name.trim().toLowerCase());
  }

  return selected;
}
