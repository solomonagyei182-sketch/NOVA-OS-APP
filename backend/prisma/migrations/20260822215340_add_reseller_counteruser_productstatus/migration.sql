-- AlterTable
ALTER TABLE "User" ADD COLUMN "lastLoginAt" DATETIME;

-- CreateTable
CREATE TABLE "Reseller" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "BusinessSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessName" TEXT,
    "currencySymbol" TEXT NOT NULL DEFAULT '₦',
    "defaultLowStockThreshold" INTEGER NOT NULL DEFAULT 10
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "category" TEXT,
    "costPrice" REAL,
    "sellingPrice" REAL,
    "warehouseQty" INTEGER NOT NULL DEFAULT 0,
    "shopQty" INTEGER NOT NULL DEFAULT 0,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 10,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Product" ("createdAt", "id", "lowStockThreshold", "name", "shopQty", "sku", "updatedAt", "warehouseQty") SELECT "createdAt", "id", "lowStockThreshold", "name", "shopQty", "sku", "updatedAt", "warehouseQty" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_name_key" ON "Product"("name");
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");
CREATE TABLE "new_Sale" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transactionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "salespersonId" TEXT,
    "resellerId" TEXT,
    "counterUserId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" REAL,
    "price" REAL NOT NULL,
    "commission" REAL NOT NULL,
    "dayId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Sale_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Sale_resellerId_fkey" FOREIGN KEY ("resellerId") REFERENCES "Reseller" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Sale_counterUserId_fkey" FOREIGN KEY ("counterUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Sale_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "BusinessDay" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Sale" ("commission", "createdAt", "dayId", "id", "price", "productId", "quantity", "salespersonId", "transactionId") SELECT "commission", "createdAt", "dayId", "id", "price", "productId", "quantity", "salespersonId", "transactionId" FROM "Sale";
DROP TABLE "Sale";
ALTER TABLE "new_Sale" RENAME TO "Sale";
UPDATE "Sale" SET "counterUserId" = "salespersonId" WHERE "counterUserId" IS NULL;
CREATE UNIQUE INDEX "Sale_transactionId_key" ON "Sale"("transactionId");
CREATE INDEX "Sale_productId_idx" ON "Sale"("productId");
CREATE INDEX "Sale_resellerId_idx" ON "Sale"("resellerId");
CREATE INDEX "Sale_counterUserId_idx" ON "Sale"("counterUserId");
CREATE INDEX "Sale_dayId_idx" ON "Sale"("dayId");
CREATE INDEX "Sale_createdAt_idx" ON "Sale"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Reseller_fullName_idx" ON "Reseller"("fullName");

-- CreateIndex
CREATE INDEX "Reseller_status_idx" ON "Reseller"("status");
