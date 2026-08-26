"use client";

import { useState } from "react";
import { ArrowUpDown } from "@/components/icons";
import { Button } from "@/components/ui/button";
import type { Activity, DailyItinerary } from "@/lib/trip-schema";

type MoveActivityModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (targetDayNumber: number, targetPosition: "beginning" | "end") => void;
  activity: Activity;
  currentDayNumber: number;
  dailyItinerary: DailyItinerary[];
};

export function MoveActivityModal({
  isOpen,
  onClose,
  onConfirm,
  activity,
  currentDayNumber,
  dailyItinerary,
}: MoveActivityModalProps) {
  const [selectedDay, setSelectedDay] = useState<number>(currentDayNumber);
  const [position, setPosition] = useState<"beginning" | "end">("end");

  if (!isOpen) return null;

  function handleSubmit() {
    onConfirm(selectedDay, position);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md card-warm p-6 sm:p-8 bg-white shadow-2xl">
        <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#ea580c]">
          <ArrowUpDown className="size-4 text-[#ea580c]" />
          <span>Move Activity</span>
        </div>

        <h3 className="mt-2 text-xl font-extrabold tracking-tight text-[#0f172a]">
          Move &quot;{activity.name}&quot;
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Currently on <span className="font-bold text-[#0f172a]">Day {currentDayNumber}</span>. Select a destination day below:
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <label htmlFor="target-day" className="block text-xs font-bold text-[#0f172a] mb-1.5">
              Select Destination Day
            </label>
            <select
              id="target-day"
              value={selectedDay}
              onChange={(e) => setSelectedDay(Number(e.target.value))}
              className="w-full rounded-2xl border border-[#eae4d9] bg-white p-3 text-sm text-[#0f172a] shadow-xs outline-none transition-all focus:border-[#ea580c] focus:ring-4 focus:ring-[#ffedd5] font-semibold"
            >
              {dailyItinerary.map((d) => (
                <option key={d.day} value={d.day}>
                  Day {d.day}: {d.title} ({d.activities.length} activities)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="target-position" className="block text-xs font-bold text-[#0f172a] mb-1.5">
              Position in Schedule
            </label>
            <select
              id="target-position"
              value={position}
              onChange={(e) => setPosition(e.target.value as "beginning" | "end")}
              className="w-full rounded-2xl border border-[#eae4d9] bg-white p-3 text-sm text-[#0f172a] shadow-xs outline-none transition-all focus:border-[#ea580c] focus:ring-4 focus:ring-[#ffedd5] font-semibold"
            >
              <option value="beginning">Beginning of Day (Start of Morning)</option>
              <option value="end">End of Day (After existing activities)</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-[#eae4d9] pt-4">
          <Button
            type="button"
            onClick={onClose}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            className="bg-gradient-to-r from-[#ea580c] to-[#f97316] hover:from-[#d97706] hover:to-[#ea580c] text-white text-xs font-extrabold rounded-xl shadow-md"
          >
            Move Activity
          </Button>
        </div>
      </div>
    </div>
  );
}
