import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ItineraryResults } from "@/components/plan/itinerary-results";

export const metadata = { title: "Your itinerary — Roamly" };

export default async function ResultsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/plan/results");
  }

  return <ItineraryResults />;
}
