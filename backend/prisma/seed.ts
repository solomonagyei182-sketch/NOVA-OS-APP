import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Optional local-dev convenience only — demo catalog data, nothing account-related.
// A fresh deployment gets its first Manager account through the in-app setup wizard
// (shown automatically whenever the account table is empty), not from this script,
// so the workspace's first login is never tied to a hardcoded name or password.
async function main() {
  const products: { name: string; sku: string; warehouseQty: number; shopQty: number; lowStockThreshold: number }[] = [
    { name: 'Bag of Rice (50kg)', sku: 'RICE-50', warehouseQty: 120, shopQty: 30, lowStockThreshold: 10 },
    { name: 'Vegetable Oil (5L)', sku: 'OIL-5L', warehouseQty: 80, shopQty: 20, lowStockThreshold: 8 },
    { name: 'Detergent Powder (1kg)', sku: 'DET-1KG', warehouseQty: 200, shopQty: 45, lowStockThreshold: 15 },
    { name: 'Bottled Water (Carton)', sku: 'WATER-CTN', warehouseQty: 150, shopQty: 5, lowStockThreshold: 10 },
    { name: 'Sugar (1kg)', sku: 'SUGAR-1KG', warehouseQty: 90, shopQty: 0, lowStockThreshold: 12 },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { name: product.name },
      update: {},
      create: product,
    });
  }

  console.log('Seed complete: 5 demo products. Sign in and use the setup wizard to create the first account.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
