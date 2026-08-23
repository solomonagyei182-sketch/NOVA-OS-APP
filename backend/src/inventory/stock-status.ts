export type StockStatus = 'OUT_OF_STOCK' | 'LOW_STOCK' | 'IN_STOCK';

export function getStockStatus(quantity: number, lowStockThreshold: number): StockStatus {
  if (quantity <= 0) return 'OUT_OF_STOCK';
  if (quantity <= lowStockThreshold) return 'LOW_STOCK';
  return 'IN_STOCK';
}
