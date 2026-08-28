import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { auth } from "@/auth";
import { generateItinerary, TravelPlannerError } from "@/lib/ai/travel-planner";
import { prisma } from "@/lib/prisma";
import { tripRequestSchema } from "@/lib/trip-schema";
import { getWeatherDataForTrip, geocodeDestination, type NormalizedWeatherData } from "@/lib/weather";
import { getDailyNearbyPlaces } from "@/lib/places";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required to generate itineraries. Please sign in." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Please send valid trip details and try again." }, { status: 400 });
  }

  const parsedInput = tripRequestSchema.safeParse(body);
  if (!parsedInput.success) {
    return NextResponse.json({ error: "Please review your trip details and try again.", fieldErrors: parsedInput.error.flatten().fieldErrors }, { status: 400 });
  }

  // 1. Server-side Weather Lookup via Open-Meteo
  let weatherData: NormalizedWeatherData | null = null;
  try {
    weatherData = await getWeatherDataForTrip({
      destination: parsedInput.data.destination,
      startDate: parsedInput.data.startDate,
      duration: parsedInput.data.duration,
      currency: parsedInput.data.currency,
    });
    console.log(
      `[Roamly Weather] Destination: ${parsedInput.data.destination} | Mode: ${weatherData.mode} | Days: ${weatherData.days.length} | Confidence: ${weatherData.confidence}`
    );
  } catch (weatherErr) {
    console.warn("[Roamly Weather] Weather unavailable — generating itinerary without weather context:", weatherErr);
  }

  // 2. AI Itinerary Generation with Weather Context
  let itinerary;
  try {
    itinerary = await generateItinerary(parsedInput.data, weatherData);
  } catch (error) {
    if (error instanceof TravelPlannerError) {
      console.error(`[Roamly AI Service Error] Code: ${error.code} | Message: ${error.message}`);
      const status =
        error.code === "PROVIDER_NOT_CONFIGURED"
          ? 503
          : error.code === "RATE_LIMITED"
          ? 429
          : error.code === "TIMEOUT_ERROR"
          ? 504
          : 502;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    console.error("[Roamly AI Service Unexpected Error]:", error);
    return NextResponse.json({ error: "Something went wrong while creating your itinerary. Please try again." }, { status: 500 });
  }

  // 3. Attach Normalized Weather to Daily Itineraries
  if (weatherData && weatherData.mode !== "unavailable" && Array.isArray(weatherData.days)) {
    itinerary.dailyItinerary = itinerary.dailyItinerary.map((day, idx) => {
      const wDay = weatherData.days[idx];
      if (wDay) {
        return {
          ...day,
          weather: {
            date: wDay.date,
            condition: wDay.condition,
            weatherCode: wDay.weatherCode ?? null,
            temperatureMin: wDay.temperatureMin,
            temperatureMax: wDay.temperatureMax,
            precipitationProbability: wDay.precipitationProbability ?? null,
            precipitationMm: wDay.precipitationMm ?? null,
            sunrise: wDay.sunrise ?? null,
            sunset: wDay.sunset ?? null,
            mode: weatherData.mode as "forecast" | "climate_outlook",
            confidence: weatherData.confidence,
          },
        };
      }
      return day;
    });
  }

  // 4. Attach Geoapify POI Nearby Places to Daily Itineraries
  if (process.env.GEOAPIFY_API_KEY) {
    console.log("[Roamly Places Debug] Geoapify is configured. Processing POI recommendations...");
    let destCoords =
      weatherData?.latitude != null && weatherData?.longitude != null
        ? { lat: weatherData.latitude, lon: weatherData.longitude }
        : null;

    if (!destCoords) {
      console.log(`[Roamly Places Debug] Weather coordinates unavailable. Resolving geocoding for "${parsedInput.data.destination}"...`);
      const geocoded = await geocodeDestination(parsedInput.data.destination);
      if (geocoded) {
        destCoords = { lat: geocoded.latitude, lon: geocoded.longitude };
      }
    }

    if (destCoords) {
      const usedPlaceNames = new Set<string>();
      console.log(`[Roamly Places Debug] Fetching POIs around coordinates lat=${destCoords.lat}, lon=${destCoords.lon} for ${itinerary.dailyItinerary.length} days...`);
      try {
        itinerary.dailyItinerary = await Promise.all(
          itinerary.dailyItinerary.map(async (day) => {
            const places = await getDailyNearbyPlaces(day, destCoords, usedPlaceNames);
            console.log(`[Roamly Places Debug] Day ${day.day} ("${day.title}"): Attached ${places.length} nearby recommendations.`);
            return {
              ...day,
              nearbyPlaces: places.length > 0 ? places : undefined,
            };
          })
        );
      } catch (placesErr) {
        console.warn("[Roamly Places Debug] Geoapify POI lookup failed — preserving itinerary without POIs:", placesErr);
      }
    } else {
      console.warn(`[Roamly Places Debug] Could not resolve coordinates for "${parsedInput.data.destination}". Skipping POI lookup.`);
    }
  } else {
    console.log("[Roamly Places Debug] GEOAPIFY_API_KEY is not configured in environment. Skipping POI lookup.");
  }

  // 5. Save Trip & Itinerary to PostgreSQL
  try {
    const savedTrip = await prisma.trip.create({
      data: {
        userId: session?.user?.id ?? null,
        destination: parsedInput.data.destination,
        budget: parsedInput.data.budget,
        currency: parsedInput.data.currency,
        duration: parsedInput.data.duration,
        travelers: parsedInput.data.travelers,
        style: parsedInput.data.style,
        accommodation: parsedInput.data.accommodation,
        food: parsedInput.data.food,
        requestPayload: JSON.parse(JSON.stringify(parsedInput.data)) as Prisma.InputJsonValue,
        itinerary: JSON.parse(JSON.stringify(itinerary)) as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      tripId: savedTrip.id,
      itinerary,
      request: parsedInput.data,
    });
  } catch (dbError) {
    console.error("[Roamly DB Error] Failed to persist generated trip to database:", dbError);
    return NextResponse.json({ error: "Your itinerary was generated but could not be saved to our database. Please try again." }, { status: 500 });
  }
}
