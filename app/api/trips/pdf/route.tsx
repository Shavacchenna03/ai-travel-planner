import React from "react";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { ItineraryPdfDocument } from "@/lib/pdf/itinerary-pdf-document";
import { itinerarySchema, tripRequestSchema } from "@/lib/trip-schema";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let itineraryData;
  let requestData;

  try {
    const body = await request.json();
    const { itinerary, request: tripRequest } = body ?? {};

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
