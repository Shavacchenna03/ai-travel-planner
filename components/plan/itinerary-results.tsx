"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";

import { ActivityEditorModal } from "@/components/plan/activity-editor-modal";
import { AIRegenerateModal } from "@/components/plan/ai-regenerate-modal";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Compass, Download, Loader, MapPin, Plus, Sparkles, Tag, Trash2, Users, Utensils } from "@/components/icons";
import { NavigationHeader } from "@/components/navigation-header";
import { formatCurrency } from "@/lib/formatters";
import type { Activity, DailyItinerary, Itinerary, TripRequest } from "@/lib/trip-schema";

type StoredTrip = { tripId?: string; itinerary: Itinerary; request: TripRequest; createdAt?: string | Date };

type ItineraryResultsProps = {
  initialTrip?: StoredTrip;
  showDelete?: boolean;
};

export function ItineraryResults({ initialTrip, showDelete }: ItineraryResultsProps) {
  const router = useRouter();
  const clientStoredTrip = useSyncExternalStore(subscribe, readStoredTrip, getServerSnapshot);
  const trip = initialTrip ?? clientStoredTrip;

  const [activeItinerary, setActiveItinerary] = useState<Itinerary | null>(null);

  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Editor modal state
  const [editorState, setEditorState] = useState<{
    isOpen: boolean;
    dayNumber: number;
    activityIndex?: number;
    initialActivity?: Activity | null;
  }>({ isOpen: false, dayNumber: 1 });

  // AI Regenerate modal state
  const [aiModalState, setAiModalState] = useState<{
    isOpen: boolean;
    target: "activity" | "day";
    dayNumber: number;
    activityIndex?: number;
    targetTitle: string;
    currentActivity?: Activity;
    currentDay?: DailyItinerary;
  }>({ isOpen: false, target: "activity", dayNumber: 1, targetTitle: "" });

  if (!trip || (!trip.itinerary && !activeItinerary)) return <EmptyResults />;

  const itinerary: Itinerary = activeItinerary || trip.itinerary;
  const { request, tripId } = trip;
  const currency = itinerary.currency || request.currency || "INR";
  const canDelete = showDelete || Boolean(tripId);

  // Re-calculate daily and total costs accurately
  function recalculateItineraryCosts(currentItinerary: Itinerary): Itinerary {
    const updatedDays = currentItinerary.dailyItinerary.map((day) => {
      const activitiesTotal = day.activities.reduce((sum, act) => sum + (act.estimatedCost || 0), 0);
      const restaurantsTotal = (day.restaurants || []).reduce((sum, rest) => sum + (rest.estimatedCost || 0), 0);
      return {
        ...day,
        dailyEstimatedCost: activitiesTotal + restaurantsTotal,
      };
    });

    const totalCost = updatedDays.reduce((sum, day) => sum + day.dailyEstimatedCost, 0);

    return {
      ...currentItinerary,
      dailyItinerary: updatedDays,
      estimatedTotalCost: totalCost,
    };
  }

  // Persist updated itinerary to React state, sessionStorage, and PostgreSQL DB if saved
  async function saveUpdatedItinerary(nextItinerary: Itinerary, feedbackMsg = "Changes saved") {
    const recalculated = recalculateItineraryCosts(nextItinerary);
    setActiveItinerary(recalculated);
    setIsSaving(true);

    const updatedStoredTrip: StoredTrip = {
      ...trip!,
      itinerary: recalculated,
    };

    // Update browser storage
    try {
      sessionStorage.setItem("roamly-current-itinerary", JSON.stringify(updatedStoredTrip));
      localStorage.setItem("roamly-current-itinerary", JSON.stringify(updatedStoredTrip));
      window.dispatchEvent(new Event("roamly-storage-update"));
    } catch (e) {
      console.warn("Could not save to browser storage:", e);
    }

    // Persist to PostgreSQL if saved trip
    if (tripId) {
      try {
        const res = await fetch(`/api/trips/${tripId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itinerary: recalculated }),
        });

        if (!res.ok) {
          throw new Error("Failed to save to database");
        }
      } catch (err) {
        console.error("Failed to persist itinerary update to DB:", err);
      }
    }

    setIsSaving(false);
    setToastMessage(`✓ ${feedbackMsg}`);
    setTimeout(() => setToastMessage(""), 3500);
  }

  // --- Handlers for Activity Operations --- //

  function handleOpenAddActivity(dayNumber: number) {
    setEditorState({
      isOpen: true,
      dayNumber,
      initialActivity: null,
    });
  }

  function handleOpenEditActivity(dayNumber: number, activityIndex: number, act: Activity) {
    setEditorState({
      isOpen: true,
      dayNumber,
      activityIndex,
      initialActivity: act,
    });
  }

  function handleSaveActivityFromModal(savedActivity: Activity) {
    const { dayNumber, activityIndex } = editorState;

    const nextDailyItinerary = itinerary.dailyItinerary.map((day) => {
      if (day.day !== dayNumber) return day;

      const nextActivities = [...day.activities];
      if (activityIndex !== undefined && activityIndex >= 0) {
        // Edit existing activity
        nextActivities[activityIndex] = savedActivity;
      } else {
        // Add new activity
        nextActivities.push(savedActivity);
      }

      return {
        ...day,
        activities: nextActivities,
      };
    });

    const isEdit = activityIndex !== undefined && activityIndex >= 0;
    saveUpdatedItinerary(
      { ...itinerary, dailyItinerary: nextDailyItinerary },
      isEdit ? "Activity updated" : "Activity added"
    );
  }

  function handleDeleteActivity(dayNumber: number, activityIndex: number) {
    const nextDailyItinerary = itinerary.dailyItinerary.map((day) => {
      if (day.day !== dayNumber) return day;
      return {
        ...day,
        activities: day.activities.filter((_, idx) => idx !== activityIndex),
      };
    });

    saveUpdatedItinerary(
      { ...itinerary, dailyItinerary: nextDailyItinerary },
      "Activity removed"
    );
  }

  // --- Handlers for AI Regeneration Operations --- //

  function handleOpenRegenerateActivity(dayNumber: number, activityIndex: number, act: Activity) {
    setAiModalState({
      isOpen: true,
      target: "activity",
      dayNumber,
      activityIndex,
      targetTitle: act.name,
      currentActivity: act,
    });
  }

  function handleOpenRegenerateDay(dayNumber: number, day: DailyItinerary) {
    setAiModalState({
      isOpen: true,
      target: "day",
      dayNumber,
      targetTitle: `Day ${dayNumber}: ${day.title}`,
      currentDay: day,
    });
  }

  async function handleConfirmAIRegenerate(instruction?: string) {
    const { target, dayNumber, activityIndex, currentActivity, currentDay } = aiModalState;

    const response = await fetch("/api/trips/regenerate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target,
        request,
        dayNumber,
        currentActivity,
        currentDay,
        instruction,
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Failed to regenerate content.");
    }

    if (target === "activity" && payload.activity) {
      const newActivity = payload.activity as Activity;
      const nextDailyItinerary = itinerary.dailyItinerary.map((day) => {
        if (day.day !== dayNumber) return day;
        const nextActivities = [...day.activities];
        if (activityIndex !== undefined && activityIndex >= 0) {
          nextActivities[activityIndex] = newActivity;
        }
        return { ...day, activities: nextActivities };
      });

      await saveUpdatedItinerary(
        { ...itinerary, dailyItinerary: nextDailyItinerary },
        "Activity regenerated by AI"
      );
    } else if (target === "day" && payload.day) {
      const newDay = payload.day as DailyItinerary;
      const nextDailyItinerary = itinerary.dailyItinerary.map((day) => {
        if (day.day !== dayNumber) return day;
        return newDay;
      });

      await saveUpdatedItinerary(
        { ...itinerary, dailyItinerary: nextDailyItinerary },
        `Day ${dayNumber} regenerated by AI`
      );
    }
  }

  async function handleDownloadPdf() {
    if (!trip) return;
    setIsDownloading(true);
    setDownloadError("");
    try {
      const pdfPayload: StoredTrip = {
        ...trip,
        itinerary,
      };

      const response = await fetch("/api/trips/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pdfPayload),
      });

      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const destSlug = itinerary.destination.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "trip";
      a.download = `roamly-${destSlug}-itinerary.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF download failed:", err);
      setDownloadError("Could not generate PDF. Please try again.");
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
        const data = await res.json();
        throw new Error(data.error || "Failed to delete trip");
      }

      sessionStorage.removeItem("roamly-current-itinerary");
      localStorage.removeItem("roamly-current-itinerary");
      window.dispatchEvent(new Event("roamly-storage-update"));

      router.push("/trips");
      router.refresh();
    } catch (err: unknown) {
      console.error("Delete trip failed:", err);
      setDeleteError(err instanceof Error ? err.message : "Failed to delete trip.");
      setIsDeleting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#faf8f5] pb-20 text-[#0f172a] font-sans relative">
      {/* Toast Feedback Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-2xl bg-[#0f172a] px-5 py-3 text-xs font-bold text-white shadow-2xl transition-all animate-bounce">
          <Sparkles className="size-4 text-[#f97316]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Activity Editor Modal */}
      <ActivityEditorModal
        isOpen={editorState.isOpen}
        onClose={() => setEditorState((prev) => ({ ...prev, isOpen: false }))}
        onSave={handleSaveActivityFromModal}
        initialActivity={editorState.initialActivity}
        dayNumber={editorState.dayNumber}
        currency={currency}
      />

      {/* AI Partial Regeneration Modal */}
      <AIRegenerateModal
        isOpen={aiModalState.isOpen}
        onClose={() => setAiModalState((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmAIRegenerate}
        target={aiModalState.target}
        targetTitle={aiModalState.targetTitle}
        dayNumber={aiModalState.dayNumber}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md card-warm p-6 sm:p-8 bg-white shadow-2xl">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
              <Trash2 className="size-6" />
            </div>
            <h3 className="mt-4 text-xl font-bold text-[#0f172a]">Delete this trip?</h3>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to delete your trip to <strong className="text-[#0f172a]">{itinerary.destination}</strong>? This action cannot be undone.
            </p>

            {deleteError && (
              <div role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 border border-rose-200">
                {deleteError}
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteError("");
                }}
                disabled={isDeleting}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteTrip}
                disabled={isDeleting}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl"
              >
                {isDeleting ? (
                  <>
                    <Loader className="size-4 animate-spin" />
                    <span>Deleting…</span>
                  </>
                ) : (
                  "Delete Trip"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Header */}
      <NavigationHeader />

      {/* Main Content Container */}
      <section className="mx-auto max-w-6xl px-6 pt-8 sm:px-10">
        {downloadError && (
          <div role="alert" className="mb-6 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700 border border-rose-200 flex items-center justify-between">
            <span>{downloadError}</span>
            <button onClick={() => setDownloadError("")} className="font-bold underline text-xs">Dismiss</button>
          </div>
        )}

        {/* Action Toolbar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/trips"
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 transition-colors hover:text-[#ea580c]"
          >
            ← Back to Saved Trips
          </Link>
          <div className="flex items-center gap-3">
            {canDelete && (
              <Button
                onClick={() => setShowDeleteModal(true)}
                className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl"
              >
                <Trash2 className="size-4" />
                <span>Delete Trip</span>
              </Button>
            )}
            <Button
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="bg-gradient-to-r from-[#ea580c] to-[#f97316] hover:from-[#d97706] hover:to-[#ea580c] text-white shadow-md shadow-orange-500/20 text-xs font-extrabold rounded-xl"
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

        {/* Hero Banner / Trip Info */}
        <div className="card-warm p-6 sm:p-10 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ffedd5] px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#ea580c] border border-[#fed7aa]">
              <Sparkles className="size-3.5" />
              {trip.createdAt
                ? `Saved Trip · ${new Date(trip.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                : "Your Editable Itinerary"}
            </span>
            {isSaving && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <Loader className="size-3.5 animate-spin text-[#ea580c]" />
                <span>Saving changes…</span>
              </span>
            )}
          </div>

          <div className="mt-4 flex flex-col justify-between gap-6 border-b border-[#eae4d9] pb-8 md:flex-row md:items-end">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-[#0f172a] sm:text-5xl">
                {itinerary.destination}
              </h1>
              <p className="mt-1 text-base text-[#0d9488] font-bold">{itinerary.country}</p>

              {/* Trip Parameters Badges */}
              <div className="mt-4 flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm font-semibold text-slate-700">
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#f5f2ec] px-3 py-1.5 text-slate-700 border border-[#eae4d9]">
                  <Calendar className="size-4 text-[#ea580c]" />
                  {request.duration} Days
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#f5f2ec] px-3 py-1.5 text-slate-700 border border-[#eae4d9]">
                  <Users className="size-4 text-[#0d9488]" />
                  {request.travelers} {request.travelers === 1 ? "Traveler" : "Travelers"}
                </span>
                {request.style && (
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#f5f2ec] px-3 py-1.5 text-slate-700 border border-[#eae4d9]">
                    <Tag className="size-4 text-[#f59e0b]" />
                    {request.style}
                  </span>
                )}
              </div>
            </div>

            {/* Estimated Total Cost Card */}
            <div className="w-full md:w-auto shrink-0 rounded-2xl bg-gradient-to-br from-[#ea580c] via-[#f97316] to-[#d97706] p-6 text-white shadow-lg shadow-orange-500/20">
              <p className="text-xs font-extrabold uppercase tracking-wider text-orange-100">
                Estimated Total Cost
              </p>
              <p className="mt-1 text-3xl font-black tracking-tight text-white">
                {formatCurrency(itinerary.estimatedTotalCost, currency)}
              </p>
              <p className="mt-1 text-xs text-orange-100">For all {request.travelers} traveler(s)</p>
            </div>
          </div>

          {/* Trip Summary */}
          {itinerary.summary && (
            <p className="pt-6 text-base sm:text-lg leading-relaxed text-slate-600">
              {itinerary.summary}
            </p>
          )}
        </div>

        {/* Main Grid: Days vs Sidebar */}
        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_20rem]">
          {/* Day Cards Stack */}
          <div className="space-y-8">
            {itinerary.dailyItinerary.map((day) => (
              <article key={day.day} className="card-warm p-6 sm:p-8 bg-white">
                {/* Day Header & Actions */}
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#eae4d9] pb-5">
                  <div>
                    <span className="text-xs font-extrabold tracking-widest text-[#ea580c] uppercase">
                      DAY {day.day}
                    </span>
                    <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#0f172a]">
                      {day.title}
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="shrink-0 rounded-xl bg-[#ffedd5] px-3.5 py-1.5 text-xs font-extrabold text-[#ea580c] border border-[#fed7aa]">
                      {formatCurrency(day.dailyEstimatedCost, currency)}
                    </span>
                    
                    {/* Day Action Buttons */}
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
                  </div>
                </div>

                {/* Explore / Activities Section */}
                <div className="mt-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Compass className="size-4 text-[#ea580c]" />
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                        Explore Activities ({day.activities.length})
                      </h3>
                    </div>
                  </div>

                  {day.activities.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[#eae4d9] bg-[#faf8f5] p-6 text-center">
                      <p className="text-xs font-semibold text-slate-500">No activities planned for this day.</p>
                      <Button
                        onClick={() => handleOpenAddActivity(day.day)}
                        size="sm"
                        className="mt-3 bg-gradient-to-r from-[#ea580c] to-[#f97316] text-white text-xs font-bold rounded-xl"
                      >
                        <Plus className="size-3.5" />
                        <span>Add Activity</span>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {day.activities.map((activity, idx) => (
                        <div
                          key={`${day.day}-${activity.name}-${idx}`}
                          className="group relative rounded-2xl border-l-4 border-[#ea580c] bg-[#faf8f5] p-4 sm:p-5 border border-[#eae4d9] transition-all hover:bg-white hover:shadow-md"
                        >
                          {/* Card Header & Controls */}
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <h4 className="text-base font-bold text-[#0f172a]">
                              {activity.name}
                            </h4>
                            
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-extrabold text-[#ea580c] mr-2">
                                {formatCurrency(activity.estimatedCost, currency)}
                              </span>

                              {/* Activity Actions: Edit, Regenerate, Delete */}
                              <button
                                type="button"
                                onClick={() => handleOpenEditActivity(day.day, idx, activity)}
                                title="Edit Activity"
                                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-colors text-xs font-bold"
                              >
                                Edit
                              </button>
                              
                              <button
                                type="button"
                                onClick={() => handleOpenRegenerateActivity(day.day, idx, activity)}
                                title="Regenerate with AI"
                                className="rounded-lg p-1.5 text-[#ea580c] hover:bg-[#ffedd5] transition-colors"
                              >
                                <Sparkles className="size-3.5" />
                              </button>

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

                          {/* Meta Info */}
                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-slate-500">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="size-3.5 text-slate-400" />
                              {activity.startTime} ({activity.duration})
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="size-3.5 text-slate-400" />
                              {activity.location}
                            </span>
                          </div>

                          <p className="mt-3 text-sm leading-relaxed text-slate-600">
                            {activity.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Eat Well / Dining Section */}
                {day.restaurants && day.restaurants.length > 0 && (
                  <div className="mt-8 rounded-2xl border border-[#fef3c7] bg-[#fffbeb] p-5 sm:p-6">
                    <div className="flex items-center gap-2">
                      <Utensils className="size-4 text-[#d97706]" />
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#d97706]">
                        Dining & Local Flavors
                      </h3>
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      {day.restaurants.map((restaurant, idx) => (
                        <div
                          key={`${day.day}-${restaurant.name}-${idx}`}
                          className="rounded-xl bg-white p-4 border border-[#fde68a] shadow-xs"
                        >
                          <div className="flex items-baseline justify-between gap-2">
                            <h4 className="font-bold text-[#0f172a] text-sm">
                              {restaurant.name}
                            </h4>
                            <span className="shrink-0 text-xs font-bold text-[#d97706]">
                              {formatCurrency(restaurant.estimatedCost, currency)}
                            </span>
                          </div>
                          <p className="mt-1 text-xs font-semibold text-slate-600">
                            {restaurant.meal} · {restaurant.cuisine}
                          </p>
                          <p className="mt-1 text-xs text-slate-500 inline-flex items-center gap-1">
                            <MapPin className="size-3 text-slate-400" />
                            {restaurant.location}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            <div className="rounded-3xl border border-[#ccfbf1] bg-[#f0fdf4] p-6 sm:p-8 lg:sticky lg:top-24">
              <h2 className="text-lg font-bold text-[#0f172a] flex items-center gap-2">
                <Sparkles className="size-5 text-[#0d9488]" />
                Useful travel tips
              </h2>

              <ul className="mt-5 space-y-4">
                {itinerary.travelTips.map((tip, idx) => (
                  <li key={idx} className="flex gap-3 text-sm leading-relaxed text-slate-700">
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-[#0d9488]" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 space-y-3 border-t border-[#99f6e4] pt-5">
                <Button
                  onClick={handleDownloadPdf}
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
                      <span>Download PDF Document</span>
                    </>
                  )}
                </Button>

                {canDelete && (
                  <Button
                    onClick={() => setShowDeleteModal(true)}
                    className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 py-3 text-xs font-bold rounded-xl"
                  >
                    <Trash2 className="size-4" />
                    <span>Delete Trip</span>
                  </Button>
                )}
              </div>

              <p className="mt-4 text-xs leading-normal text-slate-500">
                All prices are conservative estimates. Availability, opening hours, and reservations are subject to local providers.
              </p>
            </div>
          </aside>
        </div>

        {/* Footer Actions */}
        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-[#eae4d9] pt-8">
          <Button asChild size="lg" className="bg-[#0d9488] hover:bg-[#0f766e] text-white font-bold rounded-2xl">
            <Link href="/plan">Plan another trip</Link>
          </Button>

          <div className="flex items-center gap-3">
            {canDelete && (
              <Button
                onClick={() => setShowDeleteModal(true)}
                size="lg"
                className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-2xl"
              >
                <Trash2 className="size-4" />
                <span>Delete Trip</span>
              </Button>
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
      </section>
    </main>
  );
}

let cachedRawTrip: string | null = null;
let cachedParsedTrip: StoredTrip | null = null;

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener("roamly-storage-update", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("roamly-storage-update", callback);
  };
}

function readStoredTrip(): StoredTrip | null {
  if (typeof window === "undefined") return null;

  try {
    const rawTrip =
      sessionStorage.getItem("roamly-current-itinerary") ??
      localStorage.getItem("roamly-current-itinerary");

    if (!rawTrip) {
      cachedRawTrip = null;
      cachedParsedTrip = null;
      return null;
    }

    if (rawTrip === cachedRawTrip) {
      return cachedParsedTrip;
    }

    cachedRawTrip = rawTrip;
    cachedParsedTrip = JSON.parse(rawTrip) as StoredTrip;
    return cachedParsedTrip;
  } catch {
    sessionStorage.removeItem("roamly-current-itinerary");
    localStorage.removeItem("roamly-current-itinerary");
    cachedRawTrip = null;
    cachedParsedTrip = null;
    return null;
  }
}

function getServerSnapshot(): StoredTrip | null {
  return null;
}

function EmptyResults() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#faf8f5] px-6">
      <div className="max-w-md rounded-3xl border border-[#eae4d9] bg-white p-8 text-center shadow-lg">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#ffedd5] text-[#ea580c]">
          <Compass className="size-7" />
        </div>
        <p className="mt-4 text-xs font-bold uppercase tracking-widest text-[#ea580c]">
          No itinerary found
        </p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-[#0f172a]">
          Start planning your trip.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Create a personalized itinerary first, then you’ll see the full travel plan here.
        </p>
        <Button asChild size="lg" className="mt-6 bg-gradient-to-r from-[#ea580c] to-[#f97316] text-white font-extrabold rounded-2xl shadow-md">
          <Link href="/plan">Plan a trip</Link>
        </Button>
      </div>
    </main>
  );
}
