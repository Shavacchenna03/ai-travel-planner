"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

import { formatCurrency } from "@/lib/formatters";
import type { Itinerary, TripRequest } from "@/lib/trip-schema";
import { Button } from "@/components/ui/button";

type StoredTrip = { itinerary: Itinerary; request: TripRequest };

export function ItineraryResults() {
  const trip = useSyncExternalStore(subscribe, readStoredTrip, getServerSnapshot);

  if (!trip) return <EmptyResults />;
  const { itinerary, request } = trip;
  return <main className="min-h-screen bg-[#f7f5f1] pb-16"><header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-7 sm:px-10"><Link href="/" className="text-lg font-semibold text-[#16324f]">Roamly</Link><Link href="/plan" className="text-sm font-medium text-slate-600 hover:text-[#16324f]">Plan another trip</Link></header><section className="mx-auto max-w-6xl px-6 pt-10 sm:px-10"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#187764]">Your considered itinerary</p><div className="mt-4 flex flex-col justify-between gap-6 border-b border-[#e4dfd6] pb-10 md:flex-row md:items-end"><div><h1 className="text-4xl font-semibold tracking-[-0.045em] text-[#16324f] sm:text-5xl">{itinerary.destination}</h1><p className="mt-2 text-lg text-slate-600">{itinerary.country} · {request.duration} days · {request.travelers} {request.travelers === 1 ? "traveler" : "travelers"}</p></div><div className="rounded-2xl bg-[#16324f] px-5 py-4 text-white"><p className="text-xs font-medium uppercase tracking-wider text-slate-300">Estimated total</p><p className="mt-1 text-2xl font-semibold">{formatCurrency(itinerary.estimatedTotalCost, itinerary.currency)}</p><p className="mt-1 text-xs text-slate-300">for the whole group</p></div></div><p className="max-w-3xl py-9 text-lg leading-8 text-slate-600">{itinerary.summary}</p><div className="grid gap-8 lg:grid-cols-[1fr_19rem]"><div className="space-y-6">{itinerary.dailyItinerary.map((day) => <article key={day.day} className="rounded-3xl border border-[#e8e3db] bg-white p-6 shadow-[0_18px_55px_-38px_rgba(22,50,79,0.35)] sm:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold text-[#187764]">DAY {day.day}</p><h2 className="mt-1 text-2xl font-semibold tracking-tight text-[#16324f]">{day.title}</h2></div><p className="rounded-lg bg-[#e7f2ef] px-3 py-2 text-sm font-semibold text-[#187764]">{formatCurrency(day.dailyEstimatedCost, itinerary.currency)}</p></div><div className="mt-7 space-y-5"><h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Explore</h3>{day.activities.map((activity) => <div key={`${day.day}-${activity.name}`} className="border-l-2 border-[#b6dfd5] pl-4"><div className="flex flex-wrap items-baseline justify-between gap-2"><h4 className="font-semibold text-[#16324f]">{activity.name}</h4><span className="text-sm font-semibold text-[#187764]">{formatCurrency(activity.estimatedCost, itinerary.currency)}</span></div><p className="mt-1 text-sm font-medium text-slate-500">{activity.startTime} · {activity.duration} · {activity.location}</p><p className="mt-2 text-sm leading-6 text-slate-600">{activity.description}</p></div>)}</div>{day.restaurants.length > 0 && <div className="mt-8 rounded-2xl bg-[#fff8e9] p-5"><h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#a85c1d]">Eat well</h3><div className="mt-4 grid gap-4 sm:grid-cols-2">{day.restaurants.map((restaurant) => <div key={`${day.day}-${restaurant.name}`}><div className="flex items-baseline justify-between gap-2"><h4 className="font-semibold text-[#16324f]">{restaurant.name}</h4><span className="shrink-0 text-sm font-semibold text-[#a85c1d]">{formatCurrency(restaurant.estimatedCost, itinerary.currency)}</span></div><p className="mt-1 text-sm text-slate-600">{restaurant.meal} · {restaurant.cuisine}</p><p className="mt-1 text-xs text-slate-500">{restaurant.location}</p></div>)}</div></div>}</article>)}</div><aside className="h-fit rounded-3xl bg-[#e7f2ef] p-6 lg:sticky lg:top-6"><h2 className="text-xl font-semibold text-[#16324f]">Useful travel tips</h2><ul className="mt-5 space-y-4">{itinerary.travelTips.map((tip) => <li key={tip} className="flex gap-3 text-sm leading-6 text-slate-600"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#187764]" />{tip}</li>)}</ul><p className="mt-6 border-t border-[#cae2dc] pt-5 text-xs leading-5 text-slate-500">All prices are estimates. Availability, opening hours, and reservations are not guaranteed.</p></aside></div><div className="mt-10"><Button asChild size="lg"><Link href="/plan">Plan another trip</Link></Button></div></section></main>;
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

function EmptyResults() { return <main className="grid min-h-screen place-items-center bg-[#f7f5f1] px-6"><div className="max-w-md rounded-3xl border border-[#e8e3db] bg-white p-8 text-center shadow-sm"><p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#187764]">No itinerary yet</p><h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#16324f]">Start with your trip details.</h1><p className="mt-3 leading-7 text-slate-600">Create an itinerary first, then you’ll see the complete plan here.</p><Button asChild size="lg" className="mt-7"><Link href="/plan">Plan a trip</Link></Button></div></main>; }
