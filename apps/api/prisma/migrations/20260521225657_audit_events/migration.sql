-- CreateTable
CREATE TABLE "audit_events" (
    "id" VARCHAR(64) NOT NULL,
    "actorId" VARCHAR(64),
    "actorEmail" VARCHAR(255),
    "entityType" VARCHAR(64) NOT NULL,
    "entityId" VARCHAR(128) NOT NULL,
    "action" VARCHAR(64) NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_events_entityType_entityId_idx" ON "audit_events"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_events_createdAt_idx" ON "audit_events"("createdAt");
