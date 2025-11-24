-- DropForeignKey
ALTER TABLE "ResourceIntegration" DROP CONSTRAINT "ResourceIntegration_resourceId_fkey";

-- AlterTable
ALTER TABLE "Resource" ADD COLUMN     "timezone" TEXT;

-- CreateTable
CREATE TABLE "Idempotency" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'succeeded',
    "response" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Idempotency_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Idempotency_createdAt_idx" ON "Idempotency"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_key_route" ON "Idempotency"("key", "route");
