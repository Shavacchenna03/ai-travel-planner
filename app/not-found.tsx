import Link from "next/link";
import { Compass, ArrowRight } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { NavigationHeader } from "@/components/navigation-header";
import { Footer } from "@/components/footer";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#0f172a] font-sans flex flex-col justify-between">
      <NavigationHeader />

      <main className="mx-auto max-w-md px-6 py-16 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-[#ffedd5] text-[#ea580c] shadow-sm">
          <Compass className="size-8" />
        </div>

        <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-[#0f172a] sm:text-4xl">
          Page Not Found
        </h1>

        <p className="mt-3 text-sm text-slate-600 leading-relaxed">
          The page or itinerary you are looking for couldn’t be found or may have been moved.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            asChild
            size="lg"
            className="w-full sm:w-auto bg-gradient-to-r from-[#ea580c] to-[#f97316] text-white font-extrabold rounded-2xl shadow-md"
          >
            <Link href="/plan">
              <span>Plan a New Trip</span>
              <ArrowRight className="size-4 ml-1" />
            </Link>
          </Button>

          <Button
            asChild
            size="lg"
            className="w-full sm:w-auto border border-[#eae4d9] bg-white text-slate-700 font-bold rounded-2xl hover:bg-[#f5f2ec]"
          >
            <Link href="/trips">View Saved Trips</Link>
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
