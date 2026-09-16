-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('ACTIVE', 'DELETED');

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedById" TEXT,
ADD COLUMN     "status" "SaleStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "transactionDate" TIMESTAMP(3);

-- Backfill: every existing sale's transaction date is its creation date —
-- true today, since historical (transactionDate != createdAt) entries don't
-- exist until this feature ships.
UPDATE "Sale" SET "transactionDate" = "createdAt" WHERE "transactionDate" IS NULL;

-- Now that every row has a value, enforce NOT NULL going forward.
ALTER TABLE "Sale" ALTER COLUMN "transactionDate" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Sale_transactionDate_idx" ON "Sale"("transactionDate");

-- CreateIndex
CREATE INDEX "Sale_status_idx" ON "Sale"("status");

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
