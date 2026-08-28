"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, type DragEvent } from "react";

import { ActivityEditorModal } from "@/components/plan/activity-editor-modal";
import { AIRegenerateModal } from "@/components/plan/ai-regenerate-modal";
import { BudgetBreakdownCard } from "@/components/plan/budget-breakdown-card";
import { DayChecklistSidebar } from "@/components/plan/day-checklist-sidebar";
import { MoveActivityModal } from "@/components/plan/move-activity-modal";
import { NearbyPlaces } from "@/components/plan/nearby-places";
import { TripWeatherOutlook } from "@/components/plan/trip-weather-outlook";
import { WeatherIcon } from "@/components/weather-icon";
import { Button } from "@/components/ui/button";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  Download,
  GripVertical,
  Loader,
  MapPin,
  Plus,
  Sparkles,
  Trash2,
  Utensils,
} from "@/components/icons";
import { NavigationHeader } from "@/components/navigation-header";
import { formatCurrency } from "@/lib/formatters";
import {
  moveActivityBetweenDays,
  moveActivityDown,
  moveActivityUp,
  recalculateItineraryCosts,
  reorderActivityInDay,
} from "@/lib/itinerary-utils";
import type { Activity, DailyItinerary, Itinerary, Restaurant, TripRequest } from "@/lib/trip-schema";
import {
  getWeatherActivityContext,
  getWeatherDayInsight,
  getWeatherWarnings,
} from "@/lib/weather";

type StoredTrip = { tripId?: string; itinerary: Itinerary; request: TripRequest; createdAt?: string | Date };

type ItineraryResultsProps = {
  initialTrip?: StoredTrip;
  showDelete?: boolean;
};

export type TimelineItem =
  | {
      id: string;
      isMeal: false;
      activity: Activity;
      activityIndex: number;
    }
  | {
      id: string;
      isMeal: true;
      meal: Restaurant;
      mealIndex: number;
    };

function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 700;
  const match = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (!match) return 700;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (/pm/i.test(timeStr) && hours < 12) hours += 12;
  if (/am/i.test(timeStr) && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function getMealDefaultMinutes(mealType: string): number {
  const m = (mealType || "").toLowerCase();
  if (m.includes("breakfast")) return 510; // 08:30 AM
  if (m.includes("lunch")) return 780; // 01:00 PM
  if (m.includes("dinner")) return 1200; // 08:00 PM
  return 840;
}

function buildDayTimeline(day: DailyItinerary): TimelineItem[] {
  const items: Array<TimelineItem & { sortMinutes: number }> = [];

  (day.activities || []).forEach((activity, idx) => {
    items.push({
      id: `act-${idx}`,
      isMeal: false,
      activity,
      activityIndex: idx,
      sortMinutes: parseTimeToMinutes(activity.startTime),
    });
  });

  (day.restaurants || []).forEach((restaurant, idx) => {
    items.push({
      id: `meal-${idx}`,
      isMeal: true,
      meal: restaurant,
      mealIndex: idx,
      sortMinutes: getMealDefaultMinutes(restaurant.meal),
    });
  });

  return items.sort((a, b) => a.sortMinutes - b.sortMinutes);
}

export function ItineraryResults({ initialTrip, showDelete }: ItineraryResultsProps) {
  const router = useRouter();
  const clientStoredTrip = useSyncExternalStore(subscribe, readStoredTrip, getServerSnapshot);
  const trip = initialTrip ?? clientStoredTrip;

  const [activeItinerary, setActiveItinerary] = useState<Itinerary | null>(null);
  const [activeDayNumber, setActiveDayNumber] = useState<number>(1);

  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState("");

  // Editor modal state
  const [editorState, setEditorState] = useState<{
    isOpen: boolean;
    dayNumber: number;
    activityIndex?: number;
    initialActivity?: Activity | null;
  }>({ isOpen: false, dayNumber: 1 });

  // Move activity modal state
  const [moveModalState, setMoveModalState] = useState<{
    isOpen: boolean;
    dayNumber: number;
    activityIndex: number;
    activity: Activity;
  } | null>(null);

  // AI Regenerate modal state
  const [aiModalState, setAiModalState] = useState<{
    isOpen: boolean;
    target: "activity" | "day";
    dayNumber: number;
    activityIndex?: number;
    targetTitle: string;
    initialInstruction?: string;
  }>({ isOpen: false, target: "activity", dayNumber: 1, targetTitle: "" });

  // Drag and Drop state
  const [draggedItem, setDraggedItem] = useState<{ dayNumber: number; activityIndex: number } | null>(null);
  const [dropTarget, setDropTarget] = useState<{ dayNumber: number; activityIndex: number } | null>(null);

  if (!trip || (!trip.itinerary && !activeItinerary)) return <EmptyResults />;

  const itinerary: Itinerary = activeItinerary || trip.itinerary;
  const { request, tripId } = trip;
  const currency = itinerary.currency || request.currency || "INR";
  const canDelete = Boolean(showDelete || (tripId && initialTrip));

  function handleSelectDay(dayNum: number) {
    setActiveDayNumber(dayNum);
    const el = document.getElementById(`day-${dayNum}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage("");
    }, 4000);
  }

  async function updateAndSaveItinerary(newItinerary: Itinerary, toastNotice = "Itinerary updated") {
    const updated = recalculateItineraryCosts(newItinerary);
    setActiveItinerary(updated);
    showToast(toastNotice);

    if (tripId) {
      try {
        const res = await fetch(`/api/trips/${tripId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itinerary: updated }),
        });

        if (!res.ok) {
          console.error("[Roamly Save Error] Failed to persist itinerary changes to database.");
        }
      } catch (err) {
        console.error("[Roamly Save Error] Network error persisting itinerary:", err);
      }
    } else {
      try {
        const raw = localStorage.getItem("roamly_trip");
        if (raw) {
          const parsed = JSON.parse(raw);
          parsed.itinerary = updated;
          localStorage.setItem("roamly_trip", JSON.stringify(parsed));
        }
      } catch {
        // Ignore localStorage error
      }
    }
  }

  // --- Handlers: Activity Editing & Creation ---
  function handleOpenAddActivity(dayNumber: number) {
    setEditorState({
      isOpen: true,
      dayNumber,
      activityIndex: undefined,
      initialActivity: null,
    });
  }

  function handleOpenEditActivity(dayNumber: number, activityIndex: number, activity: Activity) {
    setEditorState({
      isOpen: true,
      dayNumber,
      activityIndex,
      initialActivity: activity,
    });
  }

  function handleSaveActivity(savedActivity: Activity) {
    const { dayNumber, activityIndex } = editorState;
    const days = [...itinerary.dailyItinerary];
    const targetDayIndex = days.findIndex((d) => d.day === dayNumber);
    if (targetDayIndex === -1) return;

    const targetDay = { ...days[targetDayIndex] };
    const activities = [...targetDay.activities];

    if (typeof activityIndex === "number" && activityIndex >= 0) {
      activities[activityIndex] = savedActivity;
    } else {
      activities.push(savedActivity);
    }

    targetDay.activities = activities;
    days[targetDayIndex] = targetDay;

    updateAndSaveItinerary(
      { ...itinerary, dailyItinerary: days },
      typeof activityIndex === "number" ? "Activity updated" : "Activity added"
    );
  }

  function handleDeleteActivity(dayNumber: number, activityIndex: number) {
    const days = [...itinerary.dailyItinerary];
    const targetDayIndex = days.findIndex((d) => d.day === dayNumber);
    if (targetDayIndex === -1) return;

    const targetDay = { ...days[targetDayIndex] };
    const activities = targetDay.activities.filter((_, idx) => idx !== activityIndex);

    targetDay.activities = activities;
    days[targetDayIndex] = targetDay;

    updateAndSaveItinerary({ ...itinerary, dailyItinerary: days }, "Activity removed");
  }

  // --- Handlers: Reordering & Moving Activities ---
  function handleMoveUp(dayNumber: number, activityIndex: number) {
    const updated = moveActivityUp(itinerary, dayNumber, activityIndex);
    updateAndSaveItinerary(updated, "Activity moved up");
  }

  function handleMoveDown(dayNumber: number, activityIndex: number) {
    const updated = moveActivityDown(itinerary, dayNumber, activityIndex);
    updateAndSaveItinerary(updated, "Activity moved down");
  }

  function handleOpenMoveModal(dayNumber: number, activityIndex: number, activity: Activity) {
    setMoveModalState({
      isOpen: true,
      dayNumber,
      activityIndex,
      activity,
    });
  }

  function handleConfirmMoveActivity(targetDayNumber: number) {
    if (!moveModalState) return;
    const { dayNumber, activityIndex } = moveModalState;

    const updated = moveActivityBetweenDays(
      itinerary,
      dayNumber,
      activityIndex,
      targetDayNumber
    );

    updateAndSaveItinerary(updated, `Activity moved to Day ${targetDayNumber}`);
    setMoveModalState(null);
  }

  // Drag and Drop Handlers
  function handleDragStart(e: DragEvent<HTMLDivElement>, dayNumber: number, activityIndex: number) {
    setDraggedItem({ dayNumber, activityIndex });
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>, dayNumber: number, activityIndex: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (!dropTarget || dropTarget.dayNumber !== dayNumber || dropTarget.activityIndex !== activityIndex) {
      setDropTarget({ dayNumber, activityIndex });
    }
  }

  function handleDragLeave() {
    setDropTarget(null);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>, targetDayNumber: number, targetActivityIndex: number) {
    e.preventDefault();
    if (!draggedItem) return;

    const { dayNumber: sourceDay, activityIndex: sourceIdx } = draggedItem;

    if (sourceDay === targetDayNumber) {
      if (sourceIdx !== targetActivityIndex) {
        const updated = reorderActivityInDay(itinerary, sourceDay, sourceIdx, targetActivityIndex);
        updateAndSaveItinerary(updated, "Activity reordered");
      }
    } else {
      const updated = moveActivityBetweenDays(
        itinerary,
        sourceDay,
        sourceIdx,
        targetDayNumber
      );
      updateAndSaveItinerary(updated, `Activity moved to Day ${targetDayNumber}`);
    }

    setDraggedItem(null);
    setDropTarget(null);
  }

  // --- Handlers: AI Partial Regeneration ---
  function handleOpenRegenerateActivity(dayNumber: number, activityIndex: number, activity: Activity) {
    setAiModalState({
      isOpen: true,
      target: "activity",
      dayNumber,
      activityIndex,
      targetTitle: activity.name,
      initialInstruction: "",
    });
  }

  function handleOpenRegenerateActivityForWeather(dayNumber: number, activityIndex: number, activity: Activity) {
    setAiModalState({
      isOpen: true,
      target: "activity",
      dayNumber,
      activityIndex,
      targetTitle: `${activity.name} (Weather Alternative)`,
      initialInstruction: "Suggest an indoor/weather-safe alternative for this outdoor activity.",
    });
  }

  function handleOpenRegenerateDay(dayNumber: number, day: DailyItinerary) {
    setAiModalState({
      isOpen: true,
      target: "day",
      dayNumber,
      targetTitle: `Day ${dayNumber}: ${day.title}`,
      initialInstruction: "",
    });
  }

  function handleOpenRegenerateDayForWeather(dayNumber: number) {
    setAiModalState({
      isOpen: true,
      target: "day",
      dayNumber,
      targetTitle: `Day ${dayNumber} (Weather Optimization)`,
      initialInstruction: "Optimize this day's schedule for rainy/inclement weather.",
    });
  }

  async function handleConfirmAIRegenerate(instruction?: string) {
    const { target, dayNumber, activityIndex } = aiModalState;
    const res = await fetch("/api/trips/regenerate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tripId,
        target,
        dayNumber,
        activityIndex,
        instruction,
        itinerary,
        request,
      }),
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      throw new Error(payload.error || "Regeneration failed.");
    }

    const data = await res.json();
    if (data.itinerary) {
      updateAndSaveItinerary(data.itinerary, `${target === "activity" ? "Activity" : "Day"} regenerated`);
    }
  }

  // --- Handlers: PDF & Deletion ---
  async function handleDownloadPdf() {
    setIsDownloading(true);
    setDownloadError("");

    try {
      const res = await fetch("/api/trips/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itinerary, request, tripId }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || "PDF generation failed on server.");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      const destinationSlug = itinerary.destination
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "trip";

      link.download = `roamly-${destinationSlug}-itinerary.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[Roamly PDF Error] Download failed:", err);
      setDownloadError(err instanceof Error ? err.message : "Failed to download PDF document.");
    } finally {
      setIsDownloading(false);
    }
  }

  async function handleDeleteTrip() {
    if (!tripId) return;
    setIsDeleting(true);
    setDeleteError("");

    try {
      const res = await fetch(`/api/trips/${tripId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || "Failed to delete trip.");
      }

      router.push("/trips");
      router.refresh();
    } catch (err) {
      console.error("[Roamly DB Error] Delete trip failed:", err);
      setDeleteError(err instanceof Error ? err.message : "Failed to delete trip.");
      setIsDeleting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#faf8f5] pb-24 text-[#0f172a] font-sans">
      <NavigationHeader />

      {/* Toast Notice Banner */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 rounded-2xl bg-[#0f172a] px-5 py-3 text-xs font-bold text-white shadow-xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-top-4">
          <Sparkles className="size-4 text-[#ea580c]" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-6 pt-10 sm:px-10">
        {/* Top Header & Actions Bar */}
        <div className="flex flex-col gap-4 border-b border-[#eae4d9] pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-[#ea580c]">
              <Compass className="size-4 text-[#f97316]" />
              <span>Your Custom Itinerary</span>
            </div>
            <h1 className="mt-1 text-4xl font-black tracking-tight text-[#0f172a] sm:text-5xl">
              {itinerary.destination}
            </h1>
            <p className="mt-2 text-sm sm:text-base font-semibold text-slate-600">
              {request.duration} Days · {request.travelers} {request.travelers === 1 ? "Traveler" : "Travelers"} · {request.style} Style
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {tripId && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1.5 text-xs font-extrabold text-emerald-800 border border-emerald-200">
                <span className="size-2 rounded-full bg-emerald-500" />
                <span>Saved Trip</span>
              </span>
            )}

            <Button
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              size="lg"
              className="bg-gradient-to-r from-[#ea580c] to-[#f97316] hover:from-[#d97706] hover:to-[#ea580c] text-white font-extrabold rounded-2xl shadow-md shadow-orange-500/20"
            >
              {isDownloading ? (
                <>
                  <Loader className="size-4 animate-spin" />
                  <span>Generating PDF…</span>
                </>
              ) : (
                <>
                  <Download className="size-4" />
                  <span>Download PDF</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {downloadError && (
          <div role="alert" className="mt-4 rounded-2xl bg-rose-50 p-4 text-xs font-bold text-rose-700 border border-rose-200">
            {downloadError}
          </div>
        )}

        {/* Budget Breakdown Summary */}
        <div className="mt-8">
          <BudgetBreakdownCard itinerary={itinerary} currency={currency} travelers={request.travelers} />
          {itinerary.summary && (
            <p className="pt-6 text-base sm:text-lg leading-relaxed text-slate-600">
              {itinerary.summary}
            </p>
          )}
        </div>

        {/* Trip Weather Outlook Hero Card */}
        <div className="mt-8">
          <TripWeatherOutlook dailyItinerary={itinerary.dailyItinerary} />
        </div>

        {/* Main Grid: Day Cards (Left) vs Day Checklist & Navigation Sidebar (Right) */}
        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_22rem]">
          {/* Left Column: Day Cards Stack */}
          <div className="space-y-10">
            {itinerary.dailyItinerary.map((day) => {
              const dayInsight = getWeatherDayInsight(day.weather);
              const warnings = getWeatherWarnings(day.weather);
              const timelineItems = buildDayTimeline(day);

              return (
                <article
                  key={day.day}
                  id={`day-${day.day}`}
                  className="card-warm p-6 sm:p-8 bg-white scroll-mt-28"
                >
                  {/* Day Header & Action Toolbar */}
                  <div className="border-b border-[#eae4d9] pb-5 space-y-3">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <span className="text-xs font-extrabold tracking-widest text-[#ea580c] uppercase">
                          DAY {day.day}
                        </span>
                        <h2 className="mt-0.5 text-2xl font-extrabold tracking-tight text-[#0f172a]">
                          {day.title}
                        </h2>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="shrink-0 rounded-xl bg-[#ffedd5] px-3.5 py-1.5 text-xs font-extrabold text-[#ea580c] border border-[#fed7aa]">
                          {formatCurrency(day.dailyEstimatedCost, currency)}
                        </span>

                        <Button
                          onClick={() => handleOpenAddActivity(day.day)}
                          size="sm"
                          className="bg-[#f5f2ec] hover:bg-[#eae4d9] text-slate-700 text-xs font-bold rounded-xl border border-[#eae4d9]"
                        >
                          <Plus className="size-3.5 text-[#0d9488]" />
                          <span>Add Activity</span>
                        </Button>

                        <Button
                          onClick={() => handleOpenRegenerateDay(day.day, day)}
                          size="sm"
                          className="bg-[#ffedd5] hover:bg-[#fed7aa] text-[#ea580c] text-xs font-bold rounded-xl border border-[#fed7aa]"
                        >
                          <Sparkles className="size-3.5 text-[#ea580c]" />
                          <span>Regenerate Day</span>
                        </Button>

                        {day.weather && (
                          <Button
                            onClick={() => handleOpenRegenerateDayForWeather(day.day)}
                            size="sm"
                            className="bg-teal-50 hover:bg-teal-100 text-[#0d9488] text-xs font-bold rounded-xl border border-teal-200"
                            title="Regenerate this day optimized for weather"
                          >
                            <WeatherIcon weatherCode={day.weather.weatherCode} condition={day.weather.condition} className="size-3.5 text-[#0d9488]" />
                            <span>Regenerate for Weather</span>
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Weather Insights & Warnings Box */}
                    {day.weather && (
                      <div className="pt-1 space-y-2">
                        <div className="inline-flex flex-wrap items-center gap-2 rounded-2xl bg-[#faf8f5] px-3.5 py-2 border border-[#eae4d9] shadow-xs">
                          <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#0f172a]">
                            <WeatherIcon
                              weatherCode={day.weather.weatherCode}
                              condition={day.weather.condition}
                              className="size-4 text-[#ea580c]"
                            />
                            <span>{day.weather.condition}</span>
                          </div>

                          {day.weather.temperatureMin != null && day.weather.temperatureMax != null && (
                            <span className="rounded-lg bg-white px-2 py-0.5 text-xs font-black text-[#0f172a] border border-[#eae4d9]">
                              {day.weather.temperatureMin}° – {day.weather.temperatureMax}°C
                            </span>
                          )}

                          {day.weather.precipitationProbability != null && day.weather.precipitationProbability > 0 && (
                            <span className="rounded-lg bg-blue-50 px-2 py-0.5 text-xs font-extrabold text-blue-700 border border-blue-200">
                              {day.weather.precipitationProbability}% rain
                            </span>
                          )}

                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                              day.weather.mode === "forecast"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : "bg-amber-100 text-amber-800 border border-amber-300"
                            }`}
                          >
                            {day.weather.mode === "forecast" ? "Forecast" : "Typical Conditions"}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
                          <span className="text-[#0d9488] font-bold">💡 {dayInsight}</span>
                          {warnings.map((w) => (
                            <span
                              key={w.id}
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold border ${
                                w.severity === "high"
                                  ? "bg-rose-100 text-rose-800 border-rose-300"
                                  : w.severity === "medium"
                                  ? "bg-amber-100 text-amber-800 border-amber-300"
                                  : "bg-blue-100 text-blue-800 border-blue-300"
                              }`}
                            >
                              <span>{w.icon}</span>
                              <span>{w.label}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Interleaved Chronological Timeline Section */}
                  <div className="mt-6 space-y-4">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                      Day Schedule & Timeline
                    </h3>

                    {timelineItems.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-[#eae4d9] p-6 text-center text-slate-500 text-sm">
                        No activities scheduled for this day yet. Click &quot;Add Activity&quot; above to add one.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {timelineItems.map((item) => {
                          if (item.isMeal) {
                            const restaurant = item.meal;
                            return (
                              <div
                                key={`${day.day}-meal-${item.mealIndex}`}
                                className="rounded-2xl border border-[#fde68a] bg-[#fffbeb] p-4 sm:p-5 shadow-xs transition-all hover:bg-amber-50/70"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                    <div className="grid size-9 place-items-center rounded-xl bg-amber-100 text-[#d97706] shrink-0 border border-amber-200">
                                      <Utensils className="size-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#d97706] bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                                          {restaurant.meal || "Meal"}
                                        </span>
                                        <h4 className="text-base font-extrabold text-[#0f172a] truncate">
                                          {restaurant.name}
                                        </h4>
                                      </div>
                                      <p className="mt-0.5 text-xs font-semibold text-slate-600">
                                        {restaurant.cuisine} Cuisine
                                      </p>
                                    </div>
                                  </div>

                                  <span className="text-sm font-extrabold text-[#d97706] shrink-0">
                                    {formatCurrency(restaurant.estimatedCost, currency)}
                                  </span>
                                </div>

                                <div className="mt-2.5 flex items-center gap-1 text-xs text-slate-500 font-semibold pl-11">
                                  <MapPin className="size-3.5 text-slate-400" />
                                  <span>{restaurant.location}</span>
                                </div>
                              </div>
                            );
                          }

                          // Activity timeline item
                          const { activity, activityIndex: idx } = item;
                          const isDropTarget = dropTarget?.dayNumber === day.day && dropTarget?.activityIndex === idx;
                          const isBeingDragged = draggedItem?.dayNumber === day.day && draggedItem?.activityIndex === idx;
                          const activityWeatherContext = getWeatherActivityContext(activity, day.weather);

                          return (
                            <div
                              key={`${day.day}-act-${idx}`}
                              draggable
                              onDragStart={(e) => handleDragStart(e, day.day, idx)}
                              onDragOver={(e) => handleDragOver(e, day.day, idx)}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) => handleDrop(e, day.day, idx)}
                              className={`group relative rounded-2xl border-l-4 border-[#ea580c] bg-[#faf8f5] p-4 sm:p-5 border border-[#eae4d9] transition-all duration-200 ${
                                isBeingDragged ? "opacity-40 border-dashed scale-98" : "hover:bg-white hover:shadow-md"
                              } ${isDropTarget ? "border-t-4 border-t-[#ea580c] ring-2 ring-[#ffedd5] bg-[#fff7ed]" : ""}`}
                            >
                              {/* Drag Handle & Controls */}
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div className="flex items-center gap-2 flex-1">
                                  <div
                                    className="cursor-grab active:cursor-grabbing p-1 rounded-lg text-slate-400 hover:text-[#ea580c] hover:bg-slate-200 transition-colors"
                                    title="Drag to reorder or move to another day"
                                  >
                                    <GripVertical className="size-4" />
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-base font-bold text-[#0f172a] break-words">{activity.name}</h4>

                                    {activityWeatherContext && (
                                      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#f0fdf4] px-2.5 py-0.5 text-[11px] font-extrabold text-[#166534] border border-[#bbf7d0]">
                                        {activityWeatherContext}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 flex-wrap">
                                  <span className="text-sm font-extrabold text-[#ea580c] mr-2">
                                    {formatCurrency(activity.estimatedCost, currency)}
                                  </span>

                                  <button
                                    type="button"
                                    disabled={idx === 0}
                                    onClick={() => handleMoveUp(day.day, idx)}
                                    title="Move Up"
                                    className="rounded-lg p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-900 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                  >
                                    <ChevronUp className="size-3.5" />
                                  </button>

                                  <button
                                    type="button"
                                    disabled={idx === day.activities.length - 1}
                                    onClick={() => handleMoveDown(day.day, idx)}
                                    title="Move Down"
                                    className="rounded-lg p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-900 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                  >
                                    <ChevronDown className="size-3.5" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleOpenMoveModal(day.day, idx, activity)}
                                    title="Move to another day"
                                    className="rounded-lg p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-colors"
                                  >
                                    <ArrowUpDown className="size-3.5" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditActivity(day.day, idx, activity)}
                                    title="Edit Activity"
                                    className="rounded-lg px-2 py-1 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors text-xs font-bold"
                                  >
                                    Edit
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleOpenRegenerateActivity(day.day, idx, activity)}
                                    title="Regenerate Activity"
                                    aria-label="Regenerate Activity"
                                    className="rounded-lg p-1.5 text-[#ea580c] hover:bg-[#ffedd5] transition-colors"
                                  >
                                    <Sparkles className="size-3.5" />
                                  </button>

                                  {day.weather && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenRegenerateActivityForWeather(day.day, idx, activity)}
                                      title="Optimize activity for weather"
                                      aria-label="Optimize activity for weather"
                                      className="rounded-lg px-2 py-1 bg-teal-50 text-[#0d9488] hover:bg-teal-100 transition-colors text-xs font-bold border border-teal-200"
                                    >
                                      Weather Alt
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteActivity(day.day, idx)}
                                    title="Delete Activity"
                                    className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-100 transition-colors"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </button>
                                </div>
                              </div>

                              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-slate-500 pl-6">
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="size-3.5 text-slate-400" />
                                  {activity.startTime} ({activity.duration})
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <MapPin className="size-3.5 text-slate-400" />
                                  {activity.location}
                                </span>
                              </div>

                              <p className="mt-3 text-sm leading-relaxed text-slate-600 pl-6">
                                {activity.description}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Useful Nearby Recommendations — Positioned AFTER the complete day's timeline */}
                  <div className="mt-8 pt-6 border-t border-[#eae4d9]">
                    <NearbyPlaces places={day.nearbyPlaces} />
                  </div>
                </article>
              );
            })}
          </div>

          {/* Right Column: Day Navigation & Day-Specific Checklist Sidebar */}
          <DayChecklistSidebar
            dailyItinerary={itinerary.dailyItinerary}
            activeDayNumber={activeDayNumber}
            onSelectDay={handleSelectDay}
            onDownloadPdf={handleDownloadPdf}
            isDownloading={isDownloading}
            canDelete={canDelete}
            onDeleteTrip={canDelete ? handleDeleteTrip : undefined}
          />
        </div>
      </div>

      {/* Editor Modal */}
      <ActivityEditorModal
        isOpen={editorState.isOpen}
        onClose={() => setEditorState({ isOpen: false, dayNumber: 1 })}
        onSave={handleSaveActivity}
        dayNumber={editorState.dayNumber}
        initialActivity={editorState.initialActivity}
        currency={currency}
      />

      {/* Move Activity Modal */}
      {moveModalState && (
        <MoveActivityModal
          isOpen={moveModalState.isOpen}
          onClose={() => setMoveModalState(null)}
          onConfirm={handleConfirmMoveActivity}
          activity={moveModalState.activity}
          currentDayNumber={moveModalState.dayNumber}
          dailyItinerary={itinerary.dailyItinerary}
        />
      )}

      {/* AI Partial Regeneration Modal */}
      <AIRegenerateModal
        isOpen={aiModalState.isOpen}
        onClose={() => setAiModalState((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmAIRegenerate}
        target={aiModalState.target}
        dayNumber={aiModalState.dayNumber}
        targetTitle={aiModalState.targetTitle}
        initialInstruction={aiModalState.initialInstruction}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md card-warm p-6 sm:p-8 bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
              <Trash2 className="size-6" />
            </div>
            <h3 className="mt-4 text-xl font-bold text-[#0f172a]">Delete this trip?</h3>
            <p className="mt-2 text-sm text-slate-[#0f172a]">
              Are you sure you want to delete your trip to <strong className="text-[#0f172a]">{itinerary.destination}</strong>? This action cannot be undone.
            </p>

            {deleteError && (
              <div role="alert" className="mt-3 text-xs font-semibold text-rose-600">
                {deleteError}
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-[#eae4d9] pt-4">
              <Button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleDeleteTrip}
                disabled={isDeleting}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl shadow-md"
              >
                {isDeleting ? "Deleting…" : "Delete Trip"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function EmptyResults() {
  return (
    <div className="min-h-screen bg-[#faf8f5] pb-20 text-[#0f172a] font-sans flex flex-col justify-between">
      <NavigationHeader />
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#ffedd5] text-[#ea580c]">
          <Compass className="size-7" />
        </div>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-[#0f172a]">No itinerary found</h1>
        <p className="mt-2 text-sm text-slate-600">
          You haven&apos;t generated a travel plan yet or your session expired.
        </p>
        <Button
          asChild
          size="lg"
          className="mt-6 bg-gradient-to-r from-[#ea580c] to-[#f97316] text-white font-extrabold rounded-2xl shadow-md"
        >
          <Link href="/plan">Plan a trip</Link>
        </Button>
      </div>
    </div>
  );
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("roamly-storage-update", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("roamly-storage-update", callback);
  };
}

function readStoredTrip(): StoredTrip | null {
  try {
    const raw = localStorage.getItem("roamly_trip");
    return raw ? (JSON.parse(raw) as StoredTrip) : null;
  } catch {
    return null;
  }
}

function getServerSnapshot(): StoredTrip | null {
  return null;
}
