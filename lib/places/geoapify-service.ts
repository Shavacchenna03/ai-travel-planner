import type { FetchNearbyPlacesOptions, GeoapifyPlacesResponse, NearbyPlace } from "./types";

const DEFAULT_CATEGORIES = [
  "tourism",
  "tourism.attraction",
  "tourism.sights",
  "entertainment",
  "leisure",
  "heritage",
  "natural",
];

export async function fetchNearbyPlacesFromGeoapify(
  options: FetchNearbyPlacesOptions
): Promise<NearbyPlace[]> {
  const apiKey = process.env.GEOAPIFY_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    console.log("[Roamly Places] GEOAPIFY_API_KEY is not configured in environment. Skipping Geoapify lookup.");
    return [];
  }

  const { latitude, longitude, radiusMeters = 5000, categories = DEFAULT_CATEGORIES, limit = 20 } = options;

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
      const primaryCategory = p.category || rawCatList[0] || "tourism.attraction";

      // Format category label
      let formattedCategory = primaryCategory
        .split(".")
        .pop()
        ?.replace(/_/g, " ") || "attraction";
      formattedCategory = formattedCategory.charAt(0).toUpperCase() + formattedCategory.slice(1);

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
