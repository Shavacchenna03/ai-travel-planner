"use client";

import { Car, Compass, Home, Utensils } from "@/components/icons";
import { formatCurrency } from "@/lib/formatters";
import { calculateBudgetBreakdown } from "@/lib/itinerary-utils";
import type { Itinerary } from "@/lib/trip-schema";

type BudgetBreakdownCardProps = {
  itinerary: Itinerary;
  currency?: string;
  travelers?: number;
};

export function BudgetBreakdownCard({ itinerary, currency, travelers = 1 }: BudgetBreakdownCardProps) {
  const breakdown = calculateBudgetBreakdown(itinerary);
  const activeCurrency = currency || itinerary?.currency || "INR";

  return (
    <div className="w-full card-warm p-6 sm:p-8 bg-white shadow-lg border border-[#eae4d9]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#eae4d9] pb-4">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-wider text-[#ea580c]">
            Dynamic Budget Breakdown
          </span>
          <h2 className="text-xl font-black text-[#0f172a] sm:text-2xl mt-0.5">
            Total Estimated Cost
          </h2>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black tracking-tight text-[#ea580c] sm:text-3xl">
            {formatCurrency(breakdown.total, activeCurrency)}
          </p>
          <p className="text-xs font-semibold text-slate-500">
            For all {travelers} traveler{travelers === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {/* Multi-segment Progress Distribution Bar */}
      <div className="mt-5">
        <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-slate-100 p-0.5 border border-slate-200">
          <div
            style={{ width: `${breakdown.activitiesPercent}%` }}
            className="h-full bg-gradient-to-r from-[#ea580c] to-[#f97316] rounded-l-full transition-all duration-500"
            title={`Activities: ${breakdown.activitiesPercent}%`}
          />
          <div
            style={{ width: `${breakdown.foodPercent}%` }}
            className="h-full bg-gradient-to-r from-[#d97706] to-[#f59e0b] transition-all duration-500"
            title={`Food & Dining: ${breakdown.foodPercent}%`}
          />
          <div
            style={{ width: `${breakdown.accommodationPercent}%` }}
            className="h-full bg-gradient-to-r from-[#0d9488] to-[#14b8a6] transition-all duration-500"
            title={`Accommodation: ${breakdown.accommodationPercent}%`}
          />
          <div
            style={{ width: `${breakdown.transportPercent}%` }}
            className="h-full bg-gradient-to-r from-slate-600 to-slate-500 rounded-r-full transition-all duration-500"
            title={`Transport: ${breakdown.transportPercent}%`}
          />
        </div>
      </div>

      {/* Category Cost Cards Grid */}
      <div className="mt-5 sm:mt-6 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Category: Activities */}
        <div className="rounded-2xl bg-[#fff7ed] p-4 border border-[#ffedd5] transition-all hover:bg-white hover:shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex size-9 items-center justify-center rounded-xl bg-[#ffedd5] text-[#ea580c]">
              <Compass className="size-5" />
            </div>
            <span className="text-xs font-extrabold text-[#ea580c] bg-white px-2 py-0.5 rounded-lg border border-[#fed7aa]">
              {breakdown.activitiesPercent}%
            </span>
          </div>
          <p className="mt-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
            Activities & Sights
          </p>
          <p className="mt-0.5 text-lg font-black text-[#0f172a]">
            {formatCurrency(breakdown.activities, activeCurrency)}
          </p>
        </div>

        {/* Category: Food & Dining */}
        <div className="rounded-2xl bg-[#fffbeb] p-4 border border-[#fef3c7] transition-all hover:bg-white hover:shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex size-9 items-center justify-center rounded-xl bg-[#fef3c7] text-[#d97706]">
              <Utensils className="size-5" />
            </div>
            <span className="text-xs font-extrabold text-[#d97706] bg-white px-2 py-0.5 rounded-lg border border-[#fde68a]">
              {breakdown.foodPercent}%
            </span>
          </div>
          <p className="mt-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
            Dining & Flavors
          </p>
          <p className="mt-0.5 text-lg font-black text-[#0f172a]">
            {formatCurrency(breakdown.food, activeCurrency)}
          </p>
        </div>

        {/* Category: Accommodation */}
        <div className="rounded-2xl bg-[#f0fdf4] p-4 border border-[#dcfce7] transition-all hover:bg-white hover:shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex size-9 items-center justify-center rounded-xl bg-[#dcfce7] text-[#0d9488]">
              <Home className="size-5" />
            </div>
            <span className="text-xs font-extrabold text-[#0d9488] bg-white px-2 py-0.5 rounded-lg border border-[#99f6e4]">
              {breakdown.accommodationPercent}%
            </span>
          </div>
          <p className="mt-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
            Accommodation
          </p>
          <p className="mt-0.5 text-lg font-black text-[#0f172a]">
            {formatCurrency(breakdown.accommodation, activeCurrency)}
          </p>
        </div>

        {/* Category: Transport */}
        <div className="rounded-2xl bg-[#f8fafc] p-4 border border-[#e2e8f0] transition-all hover:bg-white hover:shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex size-9 items-center justify-center rounded-xl bg-[#e2e8f0] text-slate-700">
              <Car className="size-5" />
            </div>
            <span className="text-xs font-extrabold text-slate-700 bg-white px-2 py-0.5 rounded-lg border border-slate-300">
              {breakdown.transportPercent}%
            </span>
          </div>
          <p className="mt-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
            Transport & Transit
          </p>
          <p className="mt-0.5 text-lg font-black text-[#0f172a]">
            {formatCurrency(breakdown.transport, activeCurrency)}
          </p>
        </div>
      </div>
    </div>
  );
}
