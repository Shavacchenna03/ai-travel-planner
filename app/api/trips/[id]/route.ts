import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { itinerarySchema } from "@/lib/trip-schema";

export const runtime = "nodejs";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required to delete trips." }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Trip ID is required." }, { status: 400 });
    }

    // Check if trip exists and verify ownership
    const existing = await prisma.trip.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Trip not found." }, { status: 404 });
    }

    if (existing.userId && existing.userId !== session.user.id) {
      return NextResponse.json({ error: "You do not have permission to delete this trip." }, { status: 403 });
    }

    // Delete trip record
    await prisma.trip.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Trip deleted successfully." });
  } catch (error) {
    console.error("[Roamly DB Error] Failed to delete trip:", error);
    return NextResponse.json(
      { error: "Failed to delete trip from database. Please try again." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required to update trips." }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Trip ID is required." }, { status: 400 });
    }

    const body = await request.json();
    const validation = itinerarySchema.safeParse(body.itinerary);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid itinerary payload.", fieldErrors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updatedItinerary = validation.data;

    // Check if trip exists and verify ownership
    const existing = await prisma.trip.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Trip not found." }, { status: 404 });
    }

    if (existing.userId && existing.userId !== session.user.id) {
      return NextResponse.json({ error: "You do not have permission to update this trip." }, { status: 403 });
    }

    // Update trip in database
    const updatedTrip = await prisma.trip.update({
      where: { id },
      data: {
        itinerary: JSON.parse(JSON.stringify(updatedItinerary)),
        destination: updatedItinerary.destination,
        currency: updatedItinerary.currency,
      },
    });

    return NextResponse.json({
      success: true,
      tripId: updatedTrip.id,
      itinerary: updatedItinerary,
    });
  } catch (error) {
    console.error("[Roamly DB Error] Failed to update trip itinerary:", error);
    return NextResponse.json(
      { error: "Failed to save itinerary changes to database. Please try again." },
      { status: 500 }
    );
  }
}
