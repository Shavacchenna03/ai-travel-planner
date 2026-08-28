import type { FetchNearbyPlacesOptions, GeoapifyPlacesResponse, NearbyPlace } from "./types";

const DEFAULT_RECOMMENDATION_CATEGORIES = [
  "catering.restaurant",
  "catering.cafe",
  "commercial.food_and_drink.bakery",
  "commercial.marketplace",
  "commercial.shopping_mall",
  "commercial.gift_and_souvenir",
  "commercial.food_and_drink",
  "entertainment.culture",
  "leisure.park",
  "tourism.attraction",
];

/**
 * Centralized mapping function converting raw Geoapify category identifiers
 * into friendly human-readable category labels for UI and PDF display.
 */
export function getFriendlyCategoryLabel(categories: string[] = [], rawCategory?: string): string {
  const catStr = [...categories, rawCategory || ""].join(" ").toLowerCase();

  if (catStr.includes("marketplace") || catStr.includes("bazaar")) {
    return "Traditional Market";
  }
  if (catStr.includes("gift_and_souvenir") || catStr.includes("handicraft") || catStr.includes("art_craft")) {
    return "Handicrafts";
  }
  if (catStr.includes("cafe") || catStr.includes("coffee")) {
    return "Café";
  }
  if (catStr.includes("bakery") || catStr.includes("pastry")) {
    return "Bakery";
  }
  if (catStr.includes("restaurant") || catStr.includes("food_and_drink") || catStr.includes("catering.fast_food")) {
    return "Food & Dining";
  }
  if (catStr.includes("shopping_mall") || catStr.includes("commercial.clothing") || catStr.includes("department_store")) {
    return "Shopping";
  }
  if (catStr.includes("nightclub") || catStr.includes("bar") || catStr.includes("pub")) {
    return "Nightlife";
  }
  if (catStr.includes("entertainment") || catStr.includes("culture") || catStr.includes("cinema")) {
    return "Local Experience";
  }
  if (catStr.includes("leisure.park") || catStr.includes("natural") || catStr.includes("viewpoint")) {
    return "Scenic Spot";
  }
  if (catStr.includes("tourism.attraction") || catStr.includes("tourism.sights")) {
    return "Local Attraction";
  }

  return "Local Spot";
}

export async function fetchNearbyPlacesFromGeoapify(
  options: FetchNearbyPlacesOptions
): Promise<NearbyPlace[]> {
  const apiKey = process.env.GEOAPIFY_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    console.log("[Roamly Places] GEOAPIFY_API_KEY is not configured in environment. Skipping Geoapify lookup.");
    return [];
  }

  const { latitude, longitude, radiusMeters = 5000, categories = DEFAULT_RECOMMENDATION_CATEGORIES, limit = 30 } = options;

  if (latitude == null || longitude == null || isNaN(latitude) || isNaN(longitude)) {
    console.warn("[Roamly Places] Invalid coordinates provided for Geoapify lookup.");
    return [];
  }

  const categoryStr = categories.join(",");
  const filterStr = `circle:${longitude},${latitude},${radiusMeters}`;
  const biasStr = `proximity:${longitude},${latitude}`;

  const url = `https://api.geoapify.com/v2/places?categories=${encodeURIComponent(categoryStr)}&filter=${encodeURIComponent(filterStr)}&bias=${encodeURIComponent(biasStr)}&limit=${limit}&apiKey=${apiKey}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(`[Roamly Places Error] Geoapify HTTP ${res.status}: ${errText.slice(0, 200)}`);
      return [];
    }

    const data: GeoapifyPlacesResponse = await res.json();
    if (!data.features || !Array.isArray(data.features)) {
      return [];
    }

    const places: NearbyPlace[] = [];

    for (const feat of data.features) {
      const p = feat.properties;
      if (!p || !p.name || typeof p.name !== "string" || p.name.trim().length === 0) {
        continue;
      }

      const placeLat = p.lat ?? feat.geometry?.coordinates[1] ?? latitude;
      const placeLon = p.lon ?? feat.geometry?.coordinates[0] ?? longitude;
      const distMeters = p.distance ?? 0;
      const distanceKm = Number((distMeters / 1000).toFixed(1));

      const rawCatList = p.categories || [];
      const formattedCategory = getFriendlyCategoryLabel(rawCatList, p.category);

      places.push({
        id: p.place_id || `${p.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${placeLat}-${placeLon}`,
        name: p.name.trim(),
        latitude: placeLat,
        longitude: placeLon,
        distanceKm,
        category: formattedCategory,
        categories: rawCatList,
        address: p.formatted || p.address_line2 || p.address_line1 || undefined,
        city: p.city || undefined,
        country: p.country || undefined,
        website: p.website || undefined,
        openingHours: p.opening_hours || undefined,
      });
    }

    return places;
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    console.error("[Roamly Places Error] Geoapify Places API call failed:", err instanceof Error ? err.message : err);
    return [];
  }
}
