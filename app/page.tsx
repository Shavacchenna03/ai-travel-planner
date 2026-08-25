import Link from "next/link";

import { ArrowRight, Compass, MapPin, Sparkles } from "@/components/icons";
import { Button } from "@/components/ui/button";

const steps = [
  ["01", "Tell us where", "Share your destination, dates, budget, and travel pace."],
  ["02", "Shape the details", "Choose stays and food that feel like your kind of trip."],
  ["03", "Travel with a plan", "Get a balanced day-by-day itinerary built around you."],
];

export default function Home() {
  return (
    <main className="overflow-hidden">
      <section className="relative isolate min-h-[760px] overflow-hidden bg-[#102a43] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_22%,rgba(83,185,172,0.34),transparent_24%),radial-gradient(circle_at_16%_91%,rgba(240,158,92,0.28),transparent_28%)]" />
        <div className="absolute -right-32 top-28 h-[32rem] w-[32rem] rounded-full border border-white/15" />
        <div className="absolute -right-6 top-40 h-[23rem] w-[23rem] rounded-full border border-white/10" />
        <div className="relative mx-auto flex min-h-[760px] max-w-7xl flex-col px-6 sm:px-10 lg:px-16">
          <header className="flex items-center justify-between py-7">
            <Link href="/" className="flex items-center gap-2.5 text-lg font-semibold tracking-tight" aria-label="Roamly home">
              <span className="grid size-9 place-items-center rounded-xl bg-[#f3b76f] text-[#102a43]"><Compass className="size-5" /></span>
              Roamly
            </Link>
            <nav className="flex items-center gap-5 text-sm font-semibold text-white/80">
              <Link href="/plan" className="transition hover:text-white">Plan a trip</Link>
              <Link href="/trips" className="transition hover:text-white">Saved Trips</Link>
            </nav>
          </header>

          <div className="grid flex-1 items-center gap-14 py-16 lg:grid-cols-[1.08fr_0.92fr] lg:py-20">
            <div className="max-w-2xl">
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm text-white/90 backdrop-blur">
                <Sparkles className="size-4 text-[#f3b76f]" />
                Thoughtful travel, made personal
              </div>
              <h1 className="text-balance text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
                A trip that feels like it was made for you.
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-slate-200 sm:text-xl">
                Turn a few preferences into a clear, considered travel plan—without spending your evening in twenty browser tabs.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="bg-[#f3b76f] text-[#102a43] hover:bg-[#f7c88d]">
                  <Link href="/plan">Create your trip <ArrowRight className="size-4" /></Link>
                </Button>
                <a href="#how-it-works" className="inline-flex h-12 items-center justify-center rounded-lg px-5 text-sm font-semibold text-white transition hover:bg-white/10">See how it works</a>
              </div>
              <p className="mt-6 text-sm text-slate-300">No account needed to start planning.</p>
            </div>

            <div className="relative mx-auto w-full max-w-md lg:max-w-none">
              <div className="relative rotate-[-3deg] rounded-[2rem] border border-white/15 bg-[#f7f1e8] p-4 text-[#16324f] shadow-2xl shadow-black/30 sm:p-5">
                <div className="rounded-[1.35rem] bg-white p-5 sm:p-7">
                  <div className="flex items-start justify-between">
                    <div><p className="text-sm font-medium text-slate-500">Your next escape</p><h2 className="mt-1 text-3xl font-semibold tracking-tight">Kyoto, Japan</h2></div>
                    <span className="rounded-full bg-[#e1f1ec] px-3 py-1 text-xs font-semibold text-[#187764]">6 days</span>
                  </div>
                  <div className="mt-7 space-y-3">
                    {["Morning tea in Gion", "Philosopher’s Path at golden hour", "Seasonal kaiseki dinner"].map((item, index) => <div key={item} className="flex items-center gap-3 rounded-xl bg-[#f7f8f7] p-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#dceee9] text-xs font-bold text-[#187764]">0{index + 1}</span><span className="text-sm font-medium">{item}</span></div>)}
                  </div>
                  <div className="mt-6 flex items-center gap-2 rounded-xl bg-[#fff2d8] px-4 py-3 text-sm"><MapPin className="size-4 text-[#c26925]" /><span>Balanced pace · Food-forward</span></div>
                </div>
              </div>
              <div className="absolute -bottom-8 -left-6 -z-10 rounded-2xl bg-[#e5a960] px-5 py-4 text-sm font-semibold text-[#102a43] shadow-xl">Built around your budget</div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-[#f7f5f1] px-6 py-24 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#187764]">A simpler way to plan</p>
          <div className="mt-4 flex flex-col justify-between gap-6 md:flex-row md:items-end"><h2 className="max-w-2xl text-4xl font-semibold tracking-[-0.04em] text-[#16324f] sm:text-5xl">From blank page to a better trip.</h2><p className="max-w-sm leading-7 text-slate-600">Roamly brings the important choices together, so your itinerary has room to breathe.</p></div>
          <div className="mt-14 grid gap-5 md:grid-cols-3">{steps.map(([number, title, body]) => <article key={number} className="rounded-2xl border border-[#e6e1d9] bg-white p-7"><span className="text-sm font-semibold text-[#c26925]">{number}</span><h3 className="mt-10 text-xl font-semibold text-[#16324f]">{title}</h3><p className="mt-3 leading-7 text-slate-600">{body}</p></article>)}</div>
        </div>
      </section>
    </main>
  );
}
