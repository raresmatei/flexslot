-- CreateEnum
CREATE TYPE "SlotStatus" AS ENUM ('AVAILABLE', 'HELD', 'RESERVED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "HoldStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CONVERTED', 'CANCELED');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Slot" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "SlotStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Slot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hold" (
    "id" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "userId" TEXT,
    "status" "HoldStatus" NOT NULL DEFAULT 'ACTIVE',
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "userId" TEXT,
    "resourceId" TEXT NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'CONFIRMED',
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Slot_startsAt_idx" ON "Slot"("startsAt");

-- CreateIndex
CREATE INDEX "Slot_endsAt_idx" ON "Slot"("endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_resource_time_window" ON "Slot"("resourceId", "startsAt", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "Hold_token_key" ON "Hold"("token");

-- CreateIndex
CREATE INDEX "Hold_expiresAt_idx" ON "Hold"("expiresAt");

-- CreateIndex
CREATE INDEX "Reservation_resourceId_idx" ON "Reservation"("resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_slot_reservation" ON "Reservation"("slotId");

-- AddForeignKey
ALTER TABLE "Slot" ADD CONSTRAINT "Slot_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hold" ADD CONSTRAINT "Hold_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "Slot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hold" ADD CONSTRAINT "Hold_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "Slot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
