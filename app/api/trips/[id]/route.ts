import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Trip ID is required." }, { status: 400 });
    }

    // Check if trip exists
    const existing = await prisma.trip.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Trip not found." }, { status: 404 });
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
