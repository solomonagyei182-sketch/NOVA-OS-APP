-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Sale" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transactionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "resellerId" TEXT,
    "counterUserId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" REAL,
    "price" REAL NOT NULL,
    "commission" REAL NOT NULL,
    "dayId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Sale_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Sale_resellerId_fkey" FOREIGN KEY ("resellerId") REFERENCES "Reseller" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Sale_counterUserId_fkey" FOREIGN KEY ("counterUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Sale_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "BusinessDay" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Sale" ("id", "transactionId", "productId", "resellerId", "counterUserId", "quantity", "unitPrice", "price", "commission", "dayId", "createdAt")
SELECT "id", "transactionId", "productId", "resellerId", "counterUserId", "quantity", "unitPrice", "price", "commission", "dayId", "createdAt" FROM "Sale";
DROP TABLE "Sale";
ALTER TABLE "new_Sale" RENAME TO "Sale";
CREATE UNIQUE INDEX "Sale_transactionId_key" ON "Sale"("transactionId");
CREATE INDEX "Sale_productId_idx" ON "Sale"("productId");
CREATE INDEX "Sale_resellerId_idx" ON "Sale"("resellerId");
CREATE INDEX "Sale_counterUserId_idx" ON "Sale"("counterUserId");
CREATE INDEX "Sale_dayId_idx" ON "Sale"("dayId");
CREATE INDEX "Sale_createdAt_idx" ON "Sale"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
