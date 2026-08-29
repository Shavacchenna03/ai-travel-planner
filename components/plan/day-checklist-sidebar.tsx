"use client";

import { useState } from "react";
import type { DailyItinerary } from "@/lib/trip-schema";
import { getDailyCarryChecklist, type CarryChecklistItem } from "@/lib/weather";
import { Button } from "@/components/ui/button";
import { Calendar, Download, Loader, Trash2 } from "@/components/icons";

type DayChecklistSidebarProps = {
  dailyItinerary: DailyItinerary[];
  activeDayNumber: number;
  onSelectDay: (dayNumber: number) => void;
  onDownloadPdf: () => void;
  isDownloading?: boolean;
  canDelete?: boolean;
  onDeleteTrip?: () => void;
};

export function DayChecklistSidebar({
  dailyItinerary,
  activeDayNumber,
  onSelectDay,
  onDownloadPdf,
  isDownloading = false,
  canDelete = false,
  onDeleteTrip,
}: DayChecklistSidebarProps) {
  // Store checked state per day: { [dayNumber]: { [itemId]: boolean } }
  const [checkedStateByDay, setCheckedStateByDay] = useState<Record<number, Record<string, boolean>>>({});

  // Get active day object
  const activeDay = dailyItinerary.find((d) => d.day === activeDayNumber) || dailyItinerary[0];

  // Helper to toggle checkmark for a specific day and item
  function toggleItem(dayNumber: number, itemId: string) {
    setCheckedStateByDay((prev) => {
      const dayState = prev[dayNumber] || {};
      return {
        ...prev,
        [dayNumber]: {
          ...dayState,
          [itemId]: !dayState[itemId],
        },
      };
    });
  }

  return (
    <aside className="space-y-6">
      <div className="rounded-3xl border border-[#eae4d9] bg-white p-4 sm:p-6 shadow-md lg:sticky lg:top-24 max-h-[32rem] lg:max-h-[calc(100vh-7rem)] overflow-y-auto">
        {/* Sidebar Title */}
        <div className="flex items-center justify-between gap-2 border-b border-[#eae4d9] pb-4">
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-[#ea580c]" />
            <h2 className="text-base font-extrabold tracking-tight text-[#0f172a]">
              Itinerary Navigator
            </h2>
          </div>
          <span className="text-xs font-bold text-[#ea580c] bg-[#ffedd5] px-2.5 py-0.5 rounded-full border border-[#fed7aa]">
            {dailyItinerary.length} Days
          </span>
        </div>

        {/* Day Navigation Tabs List */}
        <div className="mt-4 space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Select Day & Checklist
          </p>
          <div className="space-y-1.5">
            {dailyItinerary.map((d) => {
              const isSelected = d.day === activeDayNumber;
              const dayItems: CarryChecklistItem[] = getDailyCarryChecklist(d, d.weather);
              const dayCheckedMap = checkedStateByDay[d.day] || {};
              const readyCount = Object.values(dayCheckedMap).filter(Boolean).length;
              const totalItems = dayItems.length;

              return (
                <button
                  key={d.day}
                  type="button"
                  onClick={() => onSelectDay(d.day)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-left transition-all border ${
                    isSelected
                      ? "bg-gradient-to-r from-[#ea580c] to-[#f97316] text-white border-transparent shadow-sm"
                      : "bg-[#faf8f5] hover:bg-[#f5f2ec] text-slate-700 border-[#eae4d9]"
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <span
                      className={`text-xs font-extrabold block truncate ${
                        isSelected ? "text-white" : "text-[#0f172a]"
                      }`}
                    >
                      DAY {d.day}
                    </span>
                    <span
                      className={`text-[11px] font-semibold block truncate ${
                        isSelected ? "text-orange-100" : "text-slate-500"
                      }`}
                    >
                      {d.title}
                    </span>
                  </div>

                  {totalItems > 0 && (
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                        isSelected
                          ? "bg-white/20 text-white border border-white/30"
                          : readyCount === totalItems && totalItems > 0
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-amber-100 text-amber-800 border border-amber-300"
                      }`}
                    >
                      {readyCount}/{totalItems} Ready
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Checklist Box */}
        {activeDay && (
          <div className="mt-6 pt-5 border-t border-[#eae4d9]">
            {(() => {
              const activeItems: CarryChecklistItem[] = getDailyCarryChecklist(activeDay, activeDay.weather);
              const activeCheckedMap = checkedStateByDay[activeDay.day] || {};
              const readyCount = Object.values(activeCheckedMap).filter(Boolean).length;
              const totalItems = activeItems.length;

              if (totalItems === 0) return null;

              return (
                <div className="rounded-2xl bg-[#fffdf0] p-4 border border-[#fef08a]">
                  <div className="flex items-center justify-between gap-2 border-b border-[#fef08a] pb-2.5">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#b45309] block">
                        DAY {activeDay.day} CHECKLIST
                      </span>
                      <h3 className="text-xs font-extrabold text-[#0f172a] truncate">
                        What to Carry
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200 shrink-0">
                      {readyCount}/{totalItems} Ready
                    </span>
                  </div>

                  <div className="mt-3 space-y-2 max-h-64 overflow-y-auto pr-1">
                    {activeItems.map((item) => {
                      const isChecked = Boolean(activeCheckedMap[item.id]);

                      return (
                        <label
                          key={item.id}
                          onClick={() => toggleItem(activeDay.day, item.id)}
                          className={`flex items-start gap-2.5 rounded-xl p-2 cursor-pointer transition-all border ${
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
                            onChange={() => {}}
                            className="mt-0.5 size-3.5 accent-[#ea580c] rounded-md cursor-pointer shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <span
                              className={`text-xs font-bold block truncate ${
                                isChecked ? "line-through text-slate-400" : "text-[#0f172a]"
                              }`}
                            >
                              {item.label}
                            </span>
                            {item.reason && (
                              <p
                                className={`text-[10px] font-medium leading-tight text-slate-500 ${
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
            })()}
          </div>
        )}

        {/* Bottom Actions: Download PDF & Delete */}
        <div className="mt-6 space-y-2.5 border-t border-[#eae4d9] pt-5">
          <Button
            onClick={onDownloadPdf}
            disabled={isDownloading}
            className="w-full bg-gradient-to-r from-[#ea580c] to-[#f97316] hover:from-[#d97706] hover:to-[#ea580c] text-white py-3 shadow-md shadow-orange-500/20 text-xs font-extrabold rounded-xl"
          >
            {isDownloading ? (
              <>
                <Loader className="size-4 animate-spin" />
                <span>Generating PDF…</span>
              </>
            ) : (
              <>
                <Download className="size-4" />
                <span>Download Itinerary</span>
              </>
            )}
          </Button>

          {canDelete && onDeleteTrip && (
            <Button
              onClick={onDeleteTrip}
              className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 py-2.5 text-xs font-bold rounded-xl"
            >
              <Trash2 className="size-3.5" />
              <span>Delete Trip</span>
            </Button>
          )}

          <p className="mt-2 text-[11px] leading-normal text-slate-400 text-center">
            Conservative cost estimates. Provider hours & availability subject to change.
          </p>
        </div>
      </div>
    </aside>
  );
}
