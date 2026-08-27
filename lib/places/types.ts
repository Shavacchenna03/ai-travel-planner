import type { NearbyPlace } from "@/lib/trip-schema";

export type { NearbyPlace };

export type FetchNearbyPlacesOptions = {
  latitude: number;
  longitude: number;
  radiusMeters?: number;
  categories?: string[];
  limit?: number;
};

export type GeoapifyFeatureProperties = {
  place_id?: string;
  name?: string;
  lat?: number;
  lon?: number;
  distance?: number;
  categories?: string[];
  category?: string;
  formatted?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  country?: string;
  website?: string;
  opening_hours?: string;
};

export type GeoapifyPlacesResponse = {
  type: string;
  features?: Array<{
    type: string;
    properties: GeoapifyFeatureProperties;
    geometry?: {
      type: string;
      coordinates: [number, number];
    };
  }>;
};
