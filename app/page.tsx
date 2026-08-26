import Link from "next/link";
import Image from "next/image";

import { ArrowRight, Calendar, Check, Compass, Heart, MapPin, Sparkles, Star, Users, Utensils } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { NavigationHeader } from "@/components/navigation-header";

export const metadata = {
  title: "Roamly — AI-Powered Personal Travel Planner",
  description: "Create thoughtful travel plans and personalized itineraries tailored to your budget, style, and pace.",
};

const featuredDestinations = [
  {
    name: "Goa",
    tagline: "Sun, Palms & Coastal Charm",
    image: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?q=80&w=800&auto=format&fit=crop",
    badge: "Trending",
  },
  {
    name: "Manali",
    tagline: "Himalayan Valleys & Snow Peaks",
    image: "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?q=80&w=800&auto=format&fit=crop",
    badge: "Popular",
  },
  {
    name: "Jaipur",
    tagline: "Royal Palaces & Fort Culture",
    image: "https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?q=80&w=800&auto=format&fit=crop",
    badge: "Heritage",
  },
  {
    name: "Kerala",
    tagline: "Backwater Cruises & Greenery",
    image: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?q=80&w=800&auto=format&fit=crop",
    badge: "Serene",
  },
  {
    name: "Kashmir",
    tagline: "Shikaras & Snow-Capped Hills",
    image: "https://images.unsplash.com/photo-1566837945700-30057527ade0?q=80&w=800&auto=format&fit=crop",
    badge: "Scenic",
  },
  {
    name: "Udaipur",
    tagline: "Lakeside Mansions & Romance",
    image: "https://images.unsplash.com/photo-1615836245337-f5b9b2303f10?q=80&w=800&auto=format&fit=crop",
    badge: "Romantic",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#0f172a] font-sans overflow-x-hidden">
      {/* Top Header */}
      <NavigationHeader />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8 pb-12 lg:py-20">
        {/* Soft Background Accents */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-[28rem] w-[90%] max-w-[50rem] -translate-x-1/2 rounded-full bg-gradient-to-tr from-[#ffedd5]/60 via-[#cae2dc]/40 to-transparent blur-3xl" />

        <div className="mx-auto max-w-7xl px-6 sm:px-10 lg:px-12">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
            
            {/* Left Hero Content */}
            <div className="lg:col-span-7 flex flex-col items-start space-y-5 sm:space-y-6">
              {/* Eyebrow Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-[#f97316]/20 bg-[#ffedd5]/80 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-[#ea580c] shadow-xs">
                <Sparkles className="size-3.5 text-[#f97316]" />
                <span>AI-Powered Personal Travel Planner</span>
              </div>

              {/* Main Heading */}
              <h1 className="text-3xl font-extrabold tracking-tight text-[#0f172a] sm:text-5xl lg:text-6xl leading-[1.1]">
                Plan Smarter. <br />
                <span className="bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#0d9488] bg-clip-text text-transparent">
                  Travel Farther.
                </span>
              </h1>

              {/* Tagline */}
              <p className="text-sm sm:text-base text-slate-600 sm:text-lg leading-relaxed max-w-xl font-normal">
                Roamly builds bespoke day-by-day travel plans around your budget, pace, accommodation, and food choices — in seconds.
              </p>

              {/* Benefits Checklist */}
              <div className="grid gap-2.5 pt-1 text-xs sm:text-sm font-semibold text-slate-700 sm:grid-cols-2">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#f97316] text-white">
                    <Check className="size-3" />
                  </span>
                  <span>Bespoke AI Itineraries</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#f97316] text-white">
                    <Check className="size-3" />
                  </span>
                  <span>Budget & Pace Tailored</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#f97316] text-white">
                    <Check className="size-3" />
                  </span>
                  <span>PDF Export & Save</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#f97316] text-white">
                    <Check className="size-3" />
                  </span>
                  <span>Food & Stay Preferences</span>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 pt-2 w-full sm:w-auto">
                <Button
                  asChild
                  size="lg"
                  className="bg-gradient-to-r from-[#ea580c] to-[#f97316] hover:from-[#d97706] hover:to-[#ea580c] text-white font-bold px-8 py-5 sm:py-6 text-base rounded-2xl shadow-lg shadow-orange-500/25 transition-all hover:scale-[1.02] text-center"
                >
                  <Link href="/plan">
                    <span>Plan Your Trip</span>
                    <ArrowRight className="size-5 ml-1" />
                  </Link>
                </Button>

                <Button
                  asChild
                  size="lg"
                  className="border border-[#eae4d9] bg-white hover:bg-[#f5f2ec] text-[#0f172a] font-bold px-7 py-5 sm:py-6 text-base rounded-2xl shadow-xs transition-all text-center"
                >
                  <Link href="/trips">Explore Saved Trips</Link>
                </Button>
              </div>
            </div>

            {/* Right Hero Visual Showcase */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                {/* Hero Destination Card */}
                <div className="relative overflow-hidden rounded-3xl border border-[#eae4d9] bg-white p-3 shadow-2xl shadow-orange-500/10">
                  <div className="relative h-72 sm:h-80 w-full overflow-hidden rounded-2xl">
                    <Image
                      src="https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?q=80&w=1000&auto=format&fit=crop"
                      alt="Goa Beach"
                      fill
                      priority
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 450px"
                      className="object-cover transition-transform duration-700 hover:scale-105"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                    <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-[#0f172a] backdrop-blur-md">
                      <Star className="size-3.5 fill-amber-400 text-amber-400" />
                      <span>Featured Plan</span>
                    </div>
                    <div className="absolute bottom-4 left-4 right-4 text-white">
                      <p className="text-xs font-bold text-orange-300 uppercase tracking-widest">Goa, India</p>
                      <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight">4 Days Beach & Heritage</h3>
                    </div>
                  </div>

                  {/* Card Content Snippet */}
                  <div className="p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3.5 text-[#f97316]" /> 4 Days
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="size-3.5 text-[#0d9488]" /> 2 Travelers
                      </span>
                      <span className="flex items-center gap-1">
                        <Utensils className="size-3.5 text-[#f59e0b]" /> Seafood & Local
                      </span>
                    </div>
                  </div>
                </div>

                {/* Floating Snippet Badge 1 */}
                <div className="absolute -bottom-5 -left-4 z-20 hidden sm:flex items-center gap-3 rounded-2xl border border-[#eae4d9] bg-white p-3.5 shadow-xl">
                  <div className="grid size-10 place-items-center rounded-xl bg-[#ffedd5] text-[#ea580c]">
                    <Compass className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-[#0f172a]">Smart Daily Itineraries</p>
                    <p className="text-[11px] text-slate-500">Optimized for your travel pace</p>
                  </div>
                </div>

                {/* Floating Snippet Badge 2 */}
                <div className="absolute -top-5 -right-4 z-20 hidden sm:flex items-center gap-2.5 rounded-2xl border border-[#eae4d9] bg-white px-4 py-3 shadow-xl">
                  <Heart className="size-4 fill-rose-500 text-rose-500" />
                  <span className="text-xs font-bold text-[#0f172a]">Tailored to Your Budget</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 3-Step How It Works Section */}
      <section className="border-y border-[#eae4d9] bg-[#f5f2ec] py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-6 sm:px-10 lg:px-12">
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-[#ea580c]">Simple & Fast</span>
            <h2 className="mt-2 text-2xl font-extrabold text-[#0f172a] sm:text-4xl tracking-tight">
              How Roamly Works
            </h2>
            <p className="mt-2 text-slate-600 text-sm sm:text-base">
              Create your perfect itinerary in three quick steps.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="card-warm p-6 sm:p-8 text-center flex flex-col items-center bg-white">
              <div className="mb-4 sm:mb-5 grid size-12 sm:size-14 place-items-center rounded-2xl bg-gradient-to-tr from-[#ea580c] to-[#f97316] text-white shadow-md shadow-orange-500/20">
                <span className="text-lg sm:text-xl font-black">01</span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-[#0f172a]">Set Your Preferences</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                Choose your destination, dates, group budget, travel style, accommodation, and food choices.
              </p>
            </div>

            <div className="card-warm p-6 sm:p-8 text-center flex flex-col items-center bg-white">
              <div className="mb-4 sm:mb-5 grid size-12 sm:size-14 place-items-center rounded-2xl bg-gradient-to-tr from-[#0d9488] to-[#14b8a6] text-white shadow-md shadow-teal-500/20">
                <span className="text-lg sm:text-xl font-black">02</span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-[#0f172a]">AI Crafts Your Plan</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                Our AI model balances timings, places to visit, meal spots, and travel tips tailored to your pace.
              </p>
            </div>

            <div className="card-warm p-6 sm:p-8 text-center flex flex-col items-center bg-white">
              <div className="mb-4 sm:mb-5 grid size-12 sm:size-14 place-items-center rounded-2xl bg-gradient-to-tr from-[#f59e0b] to-[#fbbf24] text-white shadow-md shadow-amber-500/20">
                <span className="text-lg sm:text-xl font-black">03</span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-[#0f172a]">Save & Download PDF</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                Access your saved trips anytime, share with travel companions, or export as a clean PDF.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Destinations Grid */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-6 sm:px-10 lg:px-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 sm:mb-12 gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#0d9488]">Inspiration</span>
              <h2 className="mt-2 text-2xl font-extrabold text-[#0f172a] sm:text-4xl tracking-tight">
                Popular Destinations
              </h2>
              <p className="mt-2 text-slate-600 text-sm sm:text-base">
                Discover iconic spots around India to plan your next journey.
              </p>
            </div>
            <Button
              asChild
              size="lg"
              className="bg-[#0d9488] hover:bg-[#0f766e] text-white font-bold rounded-2xl self-start md:self-auto"
            >
              <Link href="/plan">Plan Custom Trip</Link>
            </Button>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredDestinations.map((dest) => (
              <Link
                key={dest.name}
                href="/plan"
                className="group relative overflow-hidden rounded-3xl border border-[#eae4d9] bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="relative h-60 sm:h-64 w-full overflow-hidden">
                  <Image
                    src={dest.image}
                    alt={dest.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
                  <div className="absolute top-4 left-4 rounded-full bg-white/90 px-3 py-1 text-xs font-extrabold text-[#0f172a] shadow-xs">
                    {dest.badge}
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <h3 className="text-2xl font-extrabold tracking-tight">{dest.name}</h3>
                    <p className="mt-0.5 text-xs text-slate-200 font-medium inline-flex items-center gap-1">
                      <MapPin className="size-3 text-[#f97316]" /> {dest.tagline}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Footer Banner */}
      <section className="bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#d97706] py-14 sm:py-16 text-white text-center">
        <div className="mx-auto max-w-4xl px-6 sm:px-10">
          <h2 className="text-2xl font-extrabold sm:text-4xl tracking-tight">
            Ready to plan your next travel adventure?
          </h2>
          <p className="mt-3 text-white/90 text-sm sm:text-lg">
            Create a custom day-by-day itinerary tailored to your budget and travel style in seconds.
          </p>
          <div className="mt-8 flex justify-center">
            <Button
              asChild
              size="lg"
              className="bg-white text-[#ea580c] hover:bg-slate-100 font-extrabold px-8 py-5 sm:py-6 text-base rounded-2xl shadow-xl transition-all hover:scale-105"
            >
              <Link href="/plan">
                <span>Start Planning Now</span>
                <ArrowRight className="size-5 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
