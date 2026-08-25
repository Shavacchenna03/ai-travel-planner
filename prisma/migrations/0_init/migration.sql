-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "budget" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "travelers" INTEGER NOT NULL,
    "style" TEXT NOT NULL,
    "accommodation" TEXT NOT NULL,
    "food" TEXT NOT NULL,
    "requestPayload" JSONB NOT NULL,
    "itinerary" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);
