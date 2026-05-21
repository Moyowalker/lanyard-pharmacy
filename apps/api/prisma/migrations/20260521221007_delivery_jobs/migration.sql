-- CreateEnum
CREATE TYPE "DeliveryDispatchMode" AS ENUM ('manual_dispatch', 'courier_dispatch');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('assigned', 'in_transit', 'delivered', 'cancelled');

-- CreateTable
CREATE TABLE "delivery_jobs" (
    "id" VARCHAR(64) NOT NULL,
    "orderId" VARCHAR(64) NOT NULL,
    "dispatchMode" "DeliveryDispatchMode" NOT NULL,
    "status" "DeliveryStatus" NOT NULL,
    "assignedTo" VARCHAR(128) NOT NULL,
    "assignedBy" VARCHAR(64) NOT NULL,
    "trackingReference" VARCHAR(128),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "delivery_jobs_orderId_key" ON "delivery_jobs"("orderId");

-- AddForeignKey
ALTER TABLE "delivery_jobs" ADD CONSTRAINT "delivery_jobs_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
