import React from "react";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ItineraryPdfDocument } from "@/lib/pdf/itinerary-pdf-document";
import { itinerarySchema, tripRequestSchema } from "@/lib/trip-schema";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let itineraryData;
  let requestData;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required to download PDFs." }, { status: 401 });
    }

    const body = await request.json();
    const { itinerary, request: tripRequest, tripId } = body ?? {};

    if (tripId) {
      const existingTrip = await prisma.trip.findUnique({
        where: { id: tripId },
        select: { userId: true },
      });

      if (existingTrip && existingTrip.userId && existingTrip.userId !== session?.user?.id) {
        return NextResponse.json({ error: "You do not have permission to download this PDF." }, { status: 403 });
      }
    }

    if (!itinerary || !tripRequest) {
      return NextResponse.json({ error: "Missing itinerary or trip request data." }, { status: 400 });
    }

    const validItinerary = itinerarySchema.safeParse(itinerary);
    const validRequest = tripRequestSchema.safeParse(tripRequest);

    if (!validItinerary.success || !validRequest.success) {
      return NextResponse.json({ error: "Invalid itinerary data provided for PDF generation." }, { status: 400 });
    }

    itineraryData = validItinerary.data;
    requestData = validRequest.data;
  } catch {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfElement = React.createElement(ItineraryPdfDocument, { itinerary: itineraryData, request: requestData }) as any;
    const pdfBuffer = await renderToBuffer(pdfElement);
    const pdfBytes = new Uint8Array(pdfBuffer);

    // Format destination slug for filename
    const destinationSlug = itineraryData.destination
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "trip";

    const filename = `roamly-${destinationSlug}-itinerary.pdf`;

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("[Roamly PDF Error] Failed to generate PDF:", error);
    return NextResponse.json({ error: "Failed to generate PDF document. Please try again." }, { status: 500 });
  }
}
