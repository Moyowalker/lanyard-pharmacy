-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WorkflowEventStatus" ADD VALUE 'retrying';
ALTER TYPE "WorkflowEventStatus" ADD VALUE 'dead_lettered';

-- DropIndex
DROP INDEX "workflow_events_status_createdAt_idx";

-- AlterTable
ALTER TABLE "workflow_events" ADD COLUMN     "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deadLetteredAt" TIMESTAMP(3),
ADD COLUMN     "lastAttemptedAt" TIMESTAMP(3),
ADD COLUMN     "maxAttempts" INTEGER NOT NULL DEFAULT 3;

-- CreateIndex
CREATE INDEX "workflow_events_status_availableAt_createdAt_idx" ON "workflow_events"("status", "availableAt", "createdAt");
