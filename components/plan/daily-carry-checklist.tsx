"use client";

import { useState } from "react";
import type { DailyItinerary, WeatherData } from "@/lib/trip-schema";
import { getDailyCarryChecklist, type CarryChecklistItem } from "@/lib/weather";

type DailyCarryChecklistProps = {
  day: DailyItinerary;
  weather?: WeatherData | null;
};

export function DailyCarryChecklist({ day, weather }: DailyCarryChecklistProps) {
  const items: CarryChecklistItem[] = getDailyCarryChecklist(day, weather);
  const [checkedState, setCheckedState] = useState<Record<string, boolean>>({});

  if (!items || items.length === 0) return null;

  function toggleItem(id: string) {
    setCheckedState((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  return (
    <div className="mt-4 rounded-2xl bg-gradient-to-r from-[#fffbf5] via-white to-[#fefce8] p-4 sm:p-5 border border-[#fef08a] shadow-xs">
      <div className="flex items-center justify-between gap-2 border-b border-[#fef08a] pb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">🎒</span>
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#b45309]">
            What to Carry Today
          </h3>
        </div>
        <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
          {Object.values(checkedState).filter(Boolean).length}/{items.length} Ready
        </span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {items.map((item) => {
          const isChecked = Boolean(checkedState[item.id]);

          return (
            <label
              key={item.id}
              onClick={() => toggleItem(item.id)}
              className={`flex items-start gap-2.5 rounded-xl p-2.5 cursor-pointer transition-all border ${
                isChecked
                  ? "bg-amber-50/60 border-amber-200 opacity-60"
                  : item.priority === "high"
                  ? "bg-white border-amber-300 shadow-xs"
                  : "bg-white/80 border-[#eae4d9]"
              }`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => {}} // Controlled by label click
                className="mt-0.5 size-4 accent-[#ea580c] rounded-md cursor-pointer"
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm shrink-0">{item.icon}</span>
                  <span
                    className={`text-xs font-extrabold text-[#0f172a] truncate ${
                      isChecked ? "line-through text-slate-400" : ""
                    }`}
                  >
                    {item.label}
                  </span>
                </div>

                {item.reason && (
                  <p
                    className={`mt-0.5 text-[11px] font-medium leading-tight text-slate-500 pl-5 ${
                      isChecked ? "line-through text-slate-400" : ""
                    }`}
                  >
                    {item.reason}
                  </p>
                )}
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
