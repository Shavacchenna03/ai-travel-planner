"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { Calendar, Clock, Compass, Download, Loader, MapPin, Sparkles, Tag, Users, Utensils } from "@/components/icons";
import { formatCurrency } from "@/lib/formatters";
import type { Itinerary, TripRequest } from "@/lib/trip-schema";

type StoredTrip = { tripId?: string; itinerary: Itinerary; request: TripRequest };

export function ItineraryResults() {
  const trip = useSyncExternalStore(subscribe, readStoredTrip, getServerSnapshot);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  if (!trip) return <EmptyResults />;
  const { itinerary, request } = trip;
  const currency = itinerary.currency || request.currency || "INR";

  async function handleDownloadPdf() {
    if (!trip) return;
    setIsDownloading(true);
    setDownloadError("");
    try {
      const response = await fetch("/api/trips/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(trip),
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
      document.body.removeChild(a);
    } catch (err) {
      console.error("PDF download failed:", err);
      setDownloadError("Could not generate PDF document. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f5f1] pb-20 text-slate-800">
      {/* Top Header */}
      <header className="sticky top-0 z-20 border-b border-[#e4dfd6] bg-[#f7f5f1]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 sm:px-10">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold text-[#16324f]">
            <Compass className="size-6 text-[#187764]" />
            <span>Roamly</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/plan"
              className="text-sm font-semibold text-slate-600 transition-colors hover:text-[#16324f]"
            >
              Plan another trip
            </Link>
            <Button
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="bg-[#187764] hover:bg-[#126653] text-white shadow-sm"
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
      </header>

      {/* Main Content Container */}
      <section className="mx-auto max-w-6xl px-6 pt-8 sm:px-10">
        {downloadError && (
          <div role="alert" className="mb-6 rounded-2xl bg-red-50 p-4 text-sm text-red-700 border border-red-200 flex items-center justify-between">
            <span>{downloadError}</span>
            <button onClick={() => setDownloadError("")} className="font-bold underline text-xs">Dismiss</button>
          </div>
        )}

        {/* Hero Banner / Trip Info */}
        <div className="rounded-3xl border border-[#e8e3db] bg-white p-6 sm:p-10 shadow-[0_18px_55px_-35px_rgba(22,50,79,0.25)]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e7f2ef] px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#187764]">
              <Sparkles className="size-3.5" />
              Your Custom Itinerary
            </span>
          </div>

          <div className="mt-4 flex flex-col justify-between gap-6 border-b border-[#e4dfd6] pb-8 md:flex-row md:items-end">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-[#16324f] sm:text-5xl">
                {itinerary.destination}
              </h1>
              <p className="mt-2 text-base text-slate-600 font-medium">{itinerary.country}</p>

              {/* Trip Parameters Badges */}
              <div className="mt-4 flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm font-semibold text-slate-700">
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-slate-700 border border-slate-200">
                  <Calendar className="size-4 text-[#187764]" />
                  {request.duration} Days
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-slate-700 border border-slate-200">
                  <Users className="size-4 text-[#187764]" />
                  {request.travelers} {request.travelers === 1 ? "Traveler" : "Travelers"}
                </span>
                {request.style && (
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-slate-700 border border-slate-200">
                    <Tag className="size-4 text-[#187764]" />
                    {request.style}
                  </span>
                )}
              </div>
            </div>

            {/* Estimated Total Cost Card */}
            <div className="w-full md:w-auto shrink-0 rounded-2xl bg-[#16324f] p-6 text-white shadow-md">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Estimated Total Cost
              </p>
              <p className="mt-1 text-3xl font-bold tracking-tight text-white">
                {formatCurrency(itinerary.estimatedTotalCost, currency)}
              </p>
              <p className="mt-1 text-xs text-slate-300">For all {request.travelers} traveler(s)</p>
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
              <article
                key={day.day}
                className="rounded-3xl border border-[#e8e3db] bg-white p-6 sm:p-8 shadow-[0_18px_55px_-38px_rgba(22,50,79,0.3)] transition-all hover:shadow-[0_22px_60px_-35px_rgba(22,50,79,0.35)]"
              >
                {/* Day Header */}
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#f0ece5] pb-5">
                  <div>
                    <span className="text-xs font-bold tracking-widest text-[#187764] uppercase">
                      DAY {day.day}
                    </span>
                    <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#16324f]">
                      {day.title}
                    </h2>
                  </div>
                  <span className="shrink-0 rounded-xl bg-[#e7f2ef] px-3.5 py-2 text-sm font-bold text-[#187764] border border-[#cae2dc]">
                    {formatCurrency(day.dailyEstimatedCost, currency)}
                  </span>
                </div>

                {/* Explore / Activities Section */}
                <div className="mt-6 space-y-6">
                  <div className="flex items-center gap-2">
                    <Compass className="size-4 text-[#187764]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Explore Activities
                    </h3>
                  </div>

                  <div className="space-y-5">
                    {day.activities.map((activity, idx) => (
                      <div
                        key={`${day.day}-${activity.name}-${idx}`}
                        className="rounded-2xl border-l-4 border-[#187764] bg-[#fbfaf8] p-4 sm:p-5 transition-colors hover:bg-slate-50 border border-slate-100"
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <h4 className="text-base font-bold text-[#16324f]">
                            {activity.name}
                          </h4>
                          <span className="text-sm font-bold text-[#187764]">
                            {formatCurrency(activity.estimatedCost, currency)}
                          </span>
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
                </div>

                {/* Eat Well / Dining Section */}
                {day.restaurants && day.restaurants.length > 0 && (
                  <div className="mt-8 rounded-2xl border border-[#f3e4c7] bg-[#fffdf8] p-5 sm:p-6">
                    <div className="flex items-center gap-2">
                      <Utensils className="size-4 text-[#a85c1d]" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#a85c1d]">
                        Dining & Local Flavors
                      </h3>
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      {day.restaurants.map((restaurant, idx) => (
                        <div
                          key={`${day.day}-${restaurant.name}-${idx}`}
                          className="rounded-xl bg-white p-4 border border-[#faedd5] shadow-2xs"
                        >
                          <div className="flex items-baseline justify-between gap-2">
                            <h4 className="font-bold text-[#16324f] text-sm">
                              {restaurant.name}
                            </h4>
                            <span className="shrink-0 text-xs font-bold text-[#a85c1d]">
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
            <div className="rounded-3xl border border-[#cae2dc] bg-[#e7f2ef] p-6 sm:p-8 lg:sticky lg:top-24">
              <h2 className="text-lg font-bold text-[#16324f] flex items-center gap-2">
                <Sparkles className="size-5 text-[#187764]" />
                Useful travel tips
              </h2>

              <ul className="mt-5 space-y-4">
                {itinerary.travelTips.map((tip, idx) => (
                  <li key={idx} className="flex gap-3 text-sm leading-relaxed text-slate-700">
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-[#187764]" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 border-t border-[#b6dfd5] pt-5">
                <Button
                  onClick={handleDownloadPdf}
                  disabled={isDownloading}
                  className="w-full bg-[#16324f] hover:bg-[#234a70] text-white py-3 shadow-sm"
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
              </div>

              <p className="mt-4 text-xs leading-normal text-slate-500">
                All prices are conservative estimates. Availability, opening hours, and reservations are not guaranteed.
              </p>
            </div>
          </aside>
        </div>

        {/* Footer Actions */}
        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-[#e4dfd6] pt-8">
          <Button asChild size="lg" className="bg-[#187764] hover:bg-[#126653]">
            <Link href="/plan">Plan another trip</Link>
          </Button>

          <Button
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            size="lg"
            className="bg-[#16324f] hover:bg-[#234a70]"
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
    <main className="grid min-h-screen place-items-center bg-[#f7f5f1] px-6">
      <div className="max-w-md rounded-3xl border border-[#e8e3db] bg-white p-8 text-center shadow-md">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[#e7f2ef] text-[#187764]">
          <Compass className="size-6" />
        </div>
        <p className="mt-4 text-xs font-bold uppercase tracking-widest text-[#187764]">
          No itinerary found
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#16324f]">
          Start planning your trip.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Create a personalized itinerary first, then you’ll see the full plan here.
        </p>
        <Button asChild size="lg" className="mt-6 bg-[#187764] hover:bg-[#126653]">
          <Link href="/plan">Plan a trip</Link>
        </Button>
      </div>
    </main>
  );
}
