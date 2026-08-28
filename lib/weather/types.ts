export type WeatherMode = "forecast" | "climate_outlook" | "unavailable";

export type WeatherConfidence = "high" | "medium" | "low";

export type DailyWeatherData = {
  date: string;
  condition: string;
  weatherCode: number | null;
  temperatureMin: number | null;
  temperatureMax: number | null;
  precipitationProbability: number | null;
  precipitationMm: number | null;
  sunrise: string | null;
  sunset: string | null;
};

export type NormalizedWeatherData = {
  mode: WeatherMode;
  destination: string;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  fetchedAt: string;
  confidence: WeatherConfidence;
  days: DailyWeatherData[];
  summary?: string;
};

export type GetWeatherParams = {
  destination: string;
  startDate?: string | Date;
  duration: number;
  currency?: string;
};
