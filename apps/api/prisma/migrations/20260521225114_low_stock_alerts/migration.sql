-- AlterTable
ALTER TABLE "branch_products" ADD COLUMN     "lowStockThreshold" INTEGER NOT NULL DEFAULT 5;

-- CreateTable
CREATE TABLE "low_stock_alerts" (
    "id" VARCHAR(64) NOT NULL,
    "branchId" VARCHAR(64) NOT NULL,
    "productId" VARCHAR(64) NOT NULL,
    "threshold" INTEGER NOT NULL,
    "availableQuantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "low_stock_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "low_stock_alerts_branchId_idx" ON "low_stock_alerts"("branchId");

-- CreateIndex
CREATE INDEX "low_stock_alerts_productId_idx" ON "low_stock_alerts"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "low_stock_alerts_branchId_productId_key" ON "low_stock_alerts"("branchId", "productId");

-- AddForeignKey
ALTER TABLE "low_stock_alerts" ADD CONSTRAINT "low_stock_alerts_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "low_stock_alerts" ADD CONSTRAINT "low_stock_alerts_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
