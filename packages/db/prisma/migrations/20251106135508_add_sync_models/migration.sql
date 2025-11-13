-- CreateTable
CREATE TABLE "ResourceIntegration" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalCalendarId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "timezone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalEventMap" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalCalendarId" TEXT NOT NULL,
    "externalEventId" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "reservationId" TEXT,
    "holdId" TEXT,
    "etag_or_changeKey" TEXT,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalEventMap_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExternalEventMap_provider_externalCalendarId_externalEventI_key" ON "ExternalEventMap"("provider", "externalCalendarId", "externalEventId");

-- AddForeignKey
ALTER TABLE "ResourceIntegration" ADD CONSTRAINT "ResourceIntegration_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
