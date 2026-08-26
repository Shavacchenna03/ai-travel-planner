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
      console.warn(`[Roamly Weather Debug] No geocoding coordinates found for destination: "${cleanDestination}"`);
      return {
        mode: "unavailable",
        destination: cleanDestination,
        latitude: null,
        longitude: null,
        timezone: null,
        fetchedAt,
        confidence: "low",
        days: [],
        summary: `Could not resolve weather coordinates for ${cleanDestination}.`,
      };
    }

    const { latitude, longitude, timezone: resolvedTz, name: resolvedName, country } = locationResult;
    const timezone = resolvedTz || "auto";
    const displayName = country ? `${resolvedName}, ${country}` : resolvedName;

    console.log(`[Roamly Weather Debug] Resolved "${cleanDestination}" to Lat: ${latitude}, Lon: ${longitude}, Timezone: ${timezone}`);

    // 2. Determine Forecast vs Climate Outlook Mode
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffDaysFromToday = Math.ceil((endDateObj.getTime() - today.getTime()) / 86400000);
    const isWithinForecastHorizon = startDateObj >= new Date(today.getTime() - 86400000) && diffDaysFromToday <= 16;

    if (isWithinForecastHorizon) {
      // MODE: FORECAST
      const startStr = formatDateYYYYMMDD(startDateObj);
      const endStr = formatDateYYYYMMDD(endDateObj);

      const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,sunrise,sunset&timezone=${encodeURIComponent(timezone)}&start_date=${startStr}&end_date=${endStr}`;
      console.log(`[Roamly Weather Debug] Fetching FORECAST data for range ${startStr} to ${endStr}`);

      const fController = new AbortController();
      const fTimeout = setTimeout(() => fController.abort(), 6000);

      const fRes = await fetch(forecastUrl, { signal: fController.signal });
      clearTimeout(fTimeout);

      if (!fRes.ok) {
        throw new Error(`Forecast API returned status ${fRes.status}`);
      }

      const fData = await fRes.json();
      const daily = fData.daily;

      if (!daily || !Array.isArray(daily.time)) {
        throw new Error("Invalid forecast daily payload structure");
      }

      const days: DailyWeatherData[] = daily.time.map((dateStr: string, idx: number) => {
        const code = daily.weather_code?.[idx] ?? null;
        return {
          date: dateStr,
          condition: getWeatherConditionFromCode(code),
          weatherCode: code,
          temperatureMin: daily.temperature_2m_min?.[idx] !== undefined ? Math.round(daily.temperature_2m_min[idx]) : null,
          temperatureMax: daily.temperature_2m_max?.[idx] !== undefined ? Math.round(daily.temperature_2m_max[idx]) : null,
          precipitationProbability: daily.precipitation_probability_max?.[idx] ?? null,
          precipitationMm: daily.precipitation_sum?.[idx] !== undefined ? Math.round(daily.precipitation_sum[idx] * 10) / 10 : null,
          sunrise: parseTimeOnlyISO(daily.sunrise?.[idx]),
          sunset: parseTimeOnlyISO(daily.sunset?.[idx]),
        };
      });

      const avgTempMax = days.reduce((sum, d) => sum + (d.temperatureMax || 0), 0) / (days.length || 1);
      const avgTempMin = days.reduce((sum, d) => sum + (d.temperatureMin || 0), 0) / (days.length || 1);

      return {
        mode: "forecast",
        destination: displayName,
        latitude,
        longitude,
        timezone,
        fetchedAt,
        confidence: "high",
        days,
        summary: `Live forecast for ${displayName}: expected temperatures from ${Math.round(avgTempMin)}°C to ${Math.round(avgTempMax)}°C.`,
      };
    } else {
      // MODE: CLIMATE_OUTLOOK (historical averages from previous year for same calendar days)
      const lastYearStart = new Date(startDateObj);
      lastYearStart.setFullYear(lastYearStart.getFullYear() - 1);
      const lastYearEnd = new Date(endDateObj);
      lastYearEnd.setFullYear(lastYearEnd.getFullYear() - 1);

      const lastYearStartStr = formatDateYYYYMMDD(lastYearStart);
      const lastYearEndStr = formatDateYYYYMMDD(lastYearEnd);

      const archiveUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,sunrise,sunset&timezone=${encodeURIComponent(timezone)}&start_date=${lastYearStartStr}&end_date=${lastYearEndStr}`;
      console.log(`[Roamly Weather Debug] Fetching CLIMATE_OUTLOOK historical data for range ${lastYearStartStr} to ${lastYearEndStr}`);

      const aController = new AbortController();
      const aTimeout = setTimeout(() => aController.abort(), 6000);

      const aRes = await fetch(archiveUrl, { signal: aController.signal });
      clearTimeout(aTimeout);

      if (!aRes.ok) {
        throw new Error(`Archive API returned status ${aRes.status}`);
      }

      const aData = await aRes.json();
      const daily = aData.daily;

      if (!daily || !Array.isArray(daily.time)) {
        throw new Error("Invalid archive daily payload structure");
      }

      const days: DailyWeatherData[] = daily.time.map((histDateStr: string, idx: number) => {
        // Map historical date back to target trip date
        const targetDateObj = new Date(startDateObj.getTime() + idx * 86400000);
        const targetDateStr = formatDateYYYYMMDD(targetDateObj);
        const code = daily.weather_code?.[idx] ?? null;

        return {
          date: targetDateStr,
          condition: getWeatherConditionFromCode(code),
          weatherCode: code,
          temperatureMin: daily.temperature_2m_min?.[idx] !== undefined ? Math.round(daily.temperature_2m_min[idx]) : null,
          temperatureMax: daily.temperature_2m_max?.[idx] !== undefined ? Math.round(daily.temperature_2m_max[idx]) : null,
          precipitationProbability: null,
          precipitationMm: daily.precipitation_sum?.[idx] !== undefined ? Math.round(daily.precipitation_sum[idx] * 10) / 10 : null,
          sunrise: parseTimeOnlyISO(daily.sunrise?.[idx]),
          sunset: parseTimeOnlyISO(daily.sunset?.[idx]),
        };
      });

      const avgTempMax = days.reduce((sum, d) => sum + (d.temperatureMax || 0), 0) / (days.length || 1);
      const avgTempMin = days.reduce((sum, d) => sum + (d.temperatureMin || 0), 0) / (days.length || 1);

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
