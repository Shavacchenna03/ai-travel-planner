import { getWeatherConditionFromCode } from "./wmo-codes";
import type { GetWeatherParams, NormalizedWeatherData, DailyWeatherData } from "./types";

function formatDateYYYYMMDD(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseTimeOnlyISO(isoString: string | null | undefined): string | null {
  if (!isoString) return null;
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  } catch {
    return null;
  }
}

export async function geocodeDestination(destination: string): Promise<{ latitude: number; longitude: number } | null> {
  if (!destination || typeof destination !== "string" || destination.trim().length < 2) {
    return null;
  }
  try {
    const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destination.trim())}&count=1&language=en&format=json`;
    const res = await fetch(geocodeUrl);
    if (!res.ok) return null;
    const data = await res.json();
    const loc = data.results?.[0];
    if (loc && typeof loc.latitude === "number" && typeof loc.longitude === "number") {
      return { latitude: loc.latitude, longitude: loc.longitude };
    }
    return null;
  } catch {
    return null;
  }
}

export async function getWeatherDataForTrip(params: GetWeatherParams): Promise<NormalizedWeatherData> {
  const { destination, startDate, duration } = params;
  const fetchedAt = new Date().toISOString();

  if (!destination || typeof destination !== "string" || destination.trim().length < 2) {
    console.warn("[Roamly Weather Debug] Invalid destination provided for weather query.");
    return {
      mode: "unavailable",
      destination: destination || "Unknown",
      latitude: null,
      longitude: null,
      timezone: null,
      fetchedAt,
      confidence: "low",
      days: [],
      summary: "Destination unavailable for weather resolution.",
    };
  }

  const cleanDestination = destination.trim();
  const validDuration = Math.max(1, Math.min(30, Number(duration) || 3));

  // Parse start date or default to 7 days from today
  let startDateObj: Date;
  if (startDate) {
    const parsed = new Date(startDate);
    startDateObj = isNaN(parsed.getTime()) ? new Date(Date.now() + 7 * 86400000) : parsed;
  } else {
    startDateObj = new Date(Date.now() + 7 * 86400000);
  }

  const endDateObj = new Date(startDateObj.getTime() + (validDuration - 1) * 86400000);

  try {
    // 1. Resolve Destination to Coordinates via Open-Meteo Geocoding API
    const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleanDestination)}&count=1&language=en&format=json`;
    console.log(`[Roamly Weather Debug] Geocoding destination: "${cleanDestination}"`);

    const geoController = new AbortController();
    const geoTimeout = setTimeout(() => geoController.abort(), 5000);

    const geoRes = await fetch(geocodeUrl, { signal: geoController.signal }).catch((err) => {
      clearTimeout(geoTimeout);
      throw err;
    });
    clearTimeout(geoTimeout);

    if (!geoRes.ok) {
      console.warn(`[Roamly Weather Debug] Geocoding API returned status ${geoRes.status}`);
      throw new Error(`Geocoding HTTP error ${geoRes.status}`);
    }

    const geoData = await geoRes.json();
    const locationResult = geoData.results?.[0];

    if (!locationResult || typeof locationResult.latitude !== "number" || typeof locationResult.longitude !== "number") {
      console.warn(`[Roamly Weather Debug] Destination "${cleanDestination}" not found via Geocoding API.`);
      return {
        mode: "unavailable",
        destination: cleanDestination,
        latitude: null,
        longitude: null,
        timezone: null,
        fetchedAt,
        confidence: "low",
        days: [],
        summary: `Weather data unavailable: Destination "${cleanDestination}" could not be mapped to coordinates.`,
      };
    }

    const latitude: number = locationResult.latitude;
    const longitude: number = locationResult.longitude;
    const timezone: string = locationResult.timezone || "auto";
    const displayName: string = locationResult.name
      ? `${locationResult.name}${locationResult.country ? `, ${locationResult.country}` : ""}`
      : cleanDestination;

    console.log(`[Roamly Weather Debug] Resolved "${cleanDestination}" to Lat: ${latitude}, Lon: ${longitude}, Timezone: ${timezone}`);

    // Calculate start date offset from today (in days)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetStart = new Date(startDateObj);
    targetStart.setHours(0, 0, 0, 0);

    const diffDaysFromToday = Math.ceil((targetStart.getTime() - today.getTime()) / 86400000);

    // 2. Determine Mode: Forecast (0-16 days out) vs Historical Climate Outlook (>16 days out)
    const isWithinForecastRange = diffDaysFromToday >= 0 && diffDaysFromToday <= 16;

    if (isWithinForecastRange) {
      // Forecast Mode using Open-Meteo Forecast API
      const startDateStr = formatDateYYYYMMDD(startDateObj);
      const endDateStr = formatDateYYYYMMDD(endDateObj);

      console.log(`[Roamly Weather Debug] Fetching FORECAST data for range ${startDateStr} to ${endDateStr}`);

      const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,sunrise,sunset&timezone=${encodeURIComponent(timezone)}&start_date=${startDateStr}&end_date=${endDateStr}`;

      const forecastRes = await fetch(forecastUrl);
      if (!forecastRes.ok) {
        throw new Error(`Forecast HTTP error ${forecastRes.status}`);
      }

      const forecastData = await forecastRes.json();
      const dailyData = forecastData.daily || {};

      const days: DailyWeatherData[] = [];
      const timeArray: string[] = dailyData.time || [];

      for (let i = 0; i < timeArray.length; i++) {
        const date = timeArray[i];
        const wCode = dailyData.weathercode?.[i] ?? 0;
        const tempMax = dailyData.temperature_2m_max?.[i] != null ? Math.round(dailyData.temperature_2m_max[i]) : null;
        const tempMin = dailyData.temperature_2m_min?.[i] != null ? Math.round(dailyData.temperature_2m_min[i]) : null;
        const precipMm = dailyData.precipitation_sum?.[i] != null ? Number(dailyData.precipitation_sum[i].toFixed(1)) : null;
        const precipProb = dailyData.precipitation_probability_max?.[i] != null ? Math.round(dailyData.precipitation_probability_max[i]) : null;
        const sunriseStr = parseTimeOnlyISO(dailyData.sunrise?.[i]);
        const sunsetStr = parseTimeOnlyISO(dailyData.sunset?.[i]);

        const condition = getWeatherConditionFromCode(wCode);

        days.push({
          date,
          condition,
          weatherCode: wCode,
          temperatureMin: tempMin,
          temperatureMax: tempMax,
          precipitationProbability: precipProb,
          precipitationMm: precipMm,
          sunrise: sunriseStr,
          sunset: sunsetStr,
        });
      }

      return {
        mode: "forecast",
        destination: displayName,
        latitude,
        longitude,
        timezone,
        fetchedAt,
        confidence: "high",
        days,
        summary: `Live forecast for ${displayName}: ${days.length} days projected.`,
      };
    } else {
      // Historical Climate Outlook Mode using Open-Meteo Archive API
      console.log(`[Roamly Weather Debug] Start date is outside 16-day forecast range (${diffDaysFromToday} days out). Fetching HISTORICAL CLIMATE DATA.`);

      const histStartYear = 2024;
      const histStartDate = `${histStartYear}-${formatDateYYYYMMDD(startDateObj).slice(5)}`;
      const histEndDate = `${histStartYear}-${formatDateYYYYMMDD(endDateObj).slice(5)}`;

      const archiveUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&start_date=${histStartDate}&end_date=${histEndDate}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=${encodeURIComponent(timezone)}`;

      const archiveRes = await fetch(archiveUrl);
      if (!archiveRes.ok) {
        throw new Error(`Archive HTTP error ${archiveRes.status}`);
      }

      const archiveData = await archiveRes.json();
      const dailyData = archiveData.daily || {};
      const timeArray: string[] = dailyData.time || [];

      const days: DailyWeatherData[] = [];
      let tempMaxSum = 0;
      let tempMinSum = 0;
      let validDaysCount = 0;

      for (let i = 0; i < timeArray.length; i++) {
        const targetDateObj = new Date(startDateObj.getTime() + i * 86400000);
        const targetDateStr = formatDateYYYYMMDD(targetDateObj);

        const wCode = dailyData.weathercode?.[i] ?? 0;
        const tempMax = dailyData.temperature_2m_max?.[i] != null ? Math.round(dailyData.temperature_2m_max[i]) : null;
        const tempMin = dailyData.temperature_2m_min?.[i] != null ? Math.round(dailyData.temperature_2m_min[i]) : null;
        const precipMm = dailyData.precipitation_sum?.[i] != null ? Number(dailyData.precipitation_sum[i].toFixed(1)) : null;

        if (tempMax != null && tempMin != null) {
          tempMaxSum += tempMax;
          tempMinSum += tempMin;
          validDaysCount++;
        }

        const condition = getWeatherConditionFromCode(wCode);

        days.push({
          date: targetDateStr,
          condition: `Typical (${condition})`,
          weatherCode: wCode,
          temperatureMin: tempMin,
          temperatureMax: tempMax,
          precipitationProbability: precipMm != null && precipMm > 1 ? 40 : 10,
          precipitationMm: precipMm,
          sunrise: null,
          sunset: null,
        });
      }

      const avgTempMax = validDaysCount > 0 ? tempMaxSum / validDaysCount : 25;
      const avgTempMin = validDaysCount > 0 ? tempMinSum / validDaysCount : 15;

      return {
        mode: "climate_outlook",
        destination: displayName,
        latitude,
        longitude,
        timezone,
        fetchedAt,
        confidence: "medium",
        days,
        summary: `Historical climate outlook for ${displayName}: typical temperatures range from ${Math.round(avgTempMin)}°C to ${Math.round(avgTempMax)}°C based on past trends.`,
      };
    }
  } catch (err) {
    console.error(`[Roamly Weather Debug] Weather resolution failed for "${cleanDestination}":`, err);
    return {
      mode: "unavailable",
      destination: cleanDestination,
      latitude: null,
      longitude: null,
      timezone: null,
      fetchedAt,
      confidence: "low",
      days: [],
      summary: `Weather data temporarily unavailable for ${cleanDestination}.`,
    };
  }
}
