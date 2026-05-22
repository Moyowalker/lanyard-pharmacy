-- CreateEnum
CREATE TYPE "WorkflowEventStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('email', 'sms');

-- CreateEnum
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('queued', 'sent', 'failed');

-- CreateTable
CREATE TABLE "workflow_events" (
    "id" VARCHAR(64) NOT NULL,
    "eventType" VARCHAR(128) NOT NULL,
    "entityType" VARCHAR(64) NOT NULL,
    "entityId" VARCHAR(128) NOT NULL,
    "status" "WorkflowEventStatus" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "payload" JSONB NOT NULL,
    "errorMessage" VARCHAR(512),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "workflow_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_delivery_attempts" (
    "id" VARCHAR(64) NOT NULL,
    "workflowEventId" VARCHAR(64) NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "recipient" VARCHAR(255) NOT NULL,
    "template" VARCHAR(128) NOT NULL,
    "provider" VARCHAR(64) NOT NULL,
    "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'queued',
    "payload" JSONB NOT NULL,
    "errorMessage" VARCHAR(512),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "notification_delivery_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workflow_events_status_createdAt_idx" ON "workflow_events"("status", "createdAt");

-- CreateIndex
CREATE INDEX "workflow_events_entityType_entityId_idx" ON "workflow_events"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "notification_delivery_attempts_workflowEventId_idx" ON "notification_delivery_attempts"("workflowEventId");

-- CreateIndex
CREATE INDEX "notification_delivery_attempts_status_createdAt_idx" ON "notification_delivery_attempts"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "notification_delivery_attempts" ADD CONSTRAINT "notification_delivery_attempts_workflowEventId_fkey" FOREIGN KEY ("workflowEventId") REFERENCES "workflow_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
