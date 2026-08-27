import type { NearbyPlace } from "@/lib/trip-schema";

type NearbyPlacesProps = {
  places?: NearbyPlace[];
};

export function NearbyPlaces({ places }: NearbyPlacesProps) {
  if (!places || places.length === 0) return null;

  return (
    <div className="mt-4 rounded-2xl bg-gradient-to-r from-[#f0fdf4] via-white to-[#ecfdf5] p-4 sm:p-5 border border-[#bbf7d0] shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#bbf7d0] pb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">📍</span>
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#166534]">
              Nearby Places
            </h3>
            <p className="text-[11px] font-medium text-slate-500">
              Optional attractions around today&apos;s itinerary
            </p>
          </div>
        </div>
        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
          {places.length} Nearby
        </span>
      </div>

      <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
        {places.map((place) => (
          <div
            key={place.id}
            className="flex flex-col justify-between rounded-xl bg-white p-3 border border-[#e2e8f0] shadow-xs transition-all hover:border-[#86efac] hover:shadow-md"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-xs font-extrabold text-[#0f172a] leading-snug">
                  ⭐ {place.name}
                </h4>
                <span className="shrink-0 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-700 border border-emerald-200">
                  {place.distanceKm} km away
                </span>
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-700 font-bold">
                  {place.category}
                </span>
                {place.city && <span>· {place.city}</span>}
              </div>
            </div>

            {place.website && (
              <div className="mt-2.5 border-t border-slate-100 pt-2 flex items-center justify-end">
                <a
                  href={place.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0d9488] hover:underline"
                >
                  <span>Website</span>
                  <span>↗</span>
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
