"use client";

import { WeatherIcon } from "@/components/weather-icon";
import type { DailyItinerary } from "@/lib/trip-schema";
import { getTripWeatherSummary } from "@/lib/weather";

type TripWeatherOutlookProps = {
  dailyItinerary: DailyItinerary[];
};

export function TripWeatherOutlook({ dailyItinerary }: TripWeatherOutlookProps) {
  const summary = getTripWeatherSummary(dailyItinerary);

  if (summary.mode === "unavailable") {
    return (
      <div className="card-warm p-5 sm:p-6 bg-white border border-[#eae4d9]">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
          <span>Trip Weather Outlook</span>
        </div>
        <p className="mt-2 text-sm text-slate-600 font-medium">
          Weather information isn&apos;t currently available. Your itinerary was generated without weather constraints.
        </p>
      </div>
    );
  }

  const isForecast = summary.mode === "forecast";

  return (
    <div className="card-warm p-6 sm:p-8 bg-gradient-to-br from-white via-[#fffdfa] to-[#faf8f5] border border-[#eae4d9] shadow-sm">
      {/* Top Header & Status Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eae4d9] pb-4">
        <div className="flex items-center gap-2">
          <WeatherIcon condition={summary.conditionSummary} className="size-5 text-[#ea580c]" />
          <h2 className="text-base font-extrabold tracking-tight text-[#0f172a]">
            {summary.title}
          </h2>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold border ${
            isForecast
              ? "bg-emerald-100 text-emerald-800 border-emerald-300"
              : "bg-amber-100 text-amber-800 border-amber-300"
          }`}
        >
          <span className={`size-2 rounded-full ${isForecast ? "bg-emerald-500" : "bg-amber-500"}`} />
          {isForecast ? "Forecast" : "Typical Conditions"}
        </span>
      </div>

      {/* Main Metrics Grid */}
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {/* Dominant Condition */}
        <div className="rounded-2xl bg-[#faf8f5] p-4 border border-[#eae4d9]">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
            Overall Condition
          </span>
          <p className="mt-1 text-base font-extrabold text-[#0f172a]">
            {summary.conditionSummary}
          </p>
        </div>

        {/* Temperature Range */}
        <div className="rounded-2xl bg-[#faf8f5] p-4 border border-[#eae4d9]">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
            Temperature Horizon
          </span>
          <p className="mt-1 text-base font-extrabold text-[#0f172a]">
            {summary.tempMin !== null && summary.tempMax !== null
              ? `${summary.tempMin}°C – ${summary.tempMax}°C`
              : "Variable"}
          </p>
        </div>

        {/* Rain Likelihood */}
        <div className="rounded-2xl bg-[#faf8f5] p-4 border border-[#eae4d9]">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
            Rain Likelihood
          </span>
          <p className="mt-1 text-base font-extrabold text-[#0f172a]">
            {summary.rainLikelihoodText}
          </p>
        </div>
      </div>

      {/* Weather Recommendation Box */}
      <div className="mt-5 rounded-2xl bg-[#f0fdf4] p-4 border border-[#bbf7d0]">
        <p className="text-xs font-bold text-[#166534] flex items-center gap-1.5">
          <span>Weather Recommendation:</span>
        </p>
        <p className="mt-1 text-xs text-[#15803d] leading-relaxed font-semibold">
          {summary.recommendation}
        </p>
      </div>

      {/* Disclosure Footer */}
      <p className="mt-4 text-[11px] font-medium text-slate-500">
        {summary.disclosure}
      </p>
    </div>
  );
}
