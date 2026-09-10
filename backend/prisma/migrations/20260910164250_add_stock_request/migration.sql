-- CreateEnum
CREATE TYPE "StockRequestStatus" AS ENUM ('PENDING', 'FULFILLED', 'CANCELLED');

-- CreateTable
CREATE TABLE "StockRequest" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "note" TEXT,
    "status" "StockRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fulfilledById" TEXT,
    "fulfilledAt" TIMESTAMP(3),
    "fulfilledTransferId" TEXT,

    CONSTRAINT "StockRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StockRequest_requestId_key" ON "StockRequest"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "StockRequest_fulfilledTransferId_key" ON "StockRequest"("fulfilledTransferId");

-- CreateIndex
CREATE INDEX "StockRequest_requestedById_status_idx" ON "StockRequest"("requestedById", "status");

-- CreateIndex
CREATE INDEX "StockRequest_status_idx" ON "StockRequest"("status");

-- AddForeignKey
ALTER TABLE "StockRequest" ADD CONSTRAINT "StockRequest_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockRequest" ADD CONSTRAINT "StockRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockRequest" ADD CONSTRAINT "StockRequest_fulfilledById_fkey" FOREIGN KEY ("fulfilledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockRequest" ADD CONSTRAINT "StockRequest_fulfilledTransferId_fkey" FOREIGN KEY ("fulfilledTransferId") REFERENCES "StockTransfer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
