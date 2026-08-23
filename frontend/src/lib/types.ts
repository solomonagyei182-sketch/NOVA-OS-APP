export type Role = 'MANAGER' | 'COUNTER' | 'PENDING';

/** The two roles a user can actually sign in as — excludes PENDING, which cannot log in at all. */
export type LoginableRole = 'MANAGER' | 'COUNTER';

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export type StaffUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

export type ProductStatus = 'ACTIVE' | 'INACTIVE';

export type Product = {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  costPrice: number | null;
  sellingPrice: number | null;
  warehouseQty: number;
  shopQty: number;
  lowStockThreshold: number;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
};

export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export type ShopStockItem = {
  id: string;
  name: string;
  sku: string | null;
  quantity: number;
  lowStockThreshold: number;
  status: StockStatus;
  updatedAt: string;
};

export type WarehouseStockItem = {
  id: string;
  name: string;
  sku: string | null;
  quantity: number;
  updatedAt: string;
};

export type CustomerTier = 'TIER_1' | 'TIER_2' | 'TIER_3';

export type Customer = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  tier: CustomerTier;
  lastInteractionAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ResellerStatus = 'ACTIVE' | 'INACTIVE';

export type Reseller = {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  status: ResellerStatus;
  createdAt: string;
  updatedAt: string;
};

export type ResellerListItem = Reseller & {
  transactionCount: number;
  totalPurchases: number;
  totalCommission: number;
  lastPurchaseAt: string | null;
};

export type ResellerDetail = Reseller & {
  summary: {
    totalTransactions: number;
    totalQuantityPurchased: number;
    totalAmountSpent: number;
    totalCommissionEarned: number;
    lastPurchaseAt: string | null;
  };
  sales: Sale[];
};

export type SalesSummaryPeriod = {
  totalSales: number;
  transactionCount: number;
  productsSold: number;
  totalCommission: number;
};

export type SalesSummary = {
  today: SalesSummaryPeriod;
  thisWeek: SalesSummaryPeriod;
  thisMonth: SalesSummaryPeriod;
};

export type InventoryStatusReport = {
  totalProducts: number;
  totalWarehouseStock: number;
  totalShopStock: number;
  lowStockProducts: { id: string; name: string; quantity: number; threshold: number }[];
  outOfStockProducts: { id: string; name: string }[];
  recentMovements: StockMovement[];
};

export type StaffPerformance = {
  staffId: string;
  name: string;
  numberOfSales: number;
  totalSalesValue: number;
};

export type ResellerPerformance = {
  resellerId: string;
  fullName: string;
  numberOfTransactions: number;
  totalQuantity: number;
  totalSpent: number;
  totalCommission: number;
};

export type AdminOverview = {
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  totalResellers: number;
  activeResellers: number;
  inactiveResellers: number;
  totalSales: number;
  totalSalesValue: number;
  recentTransactions: Sale[];
  recentlyAddedProducts: Product[];
  recentlyAddedResellers: Reseller[];
};

export type AuditLogEntry = {
  id: string;
  userId: string;
  user: { name: string };
  action: string;
  entityType: string;
  entityId: string | null;
  details: string | null;
  createdAt: string;
};

export type ActiveSession = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  lastActivityAt: string;
};

export type SessionCapacity = { active: number; max: number };

export type ActiveSessionsResponse = {
  sessions: ActiveSession[];
  capacity: {
    manager: SessionCapacity;
    counter: SessionCapacity;
    total: SessionCapacity;
  };
};

export type BusinessSettings = {
  id: string;
  businessName: string | null;
  currencySymbol: string;
  defaultLowStockThreshold: number;
};

export type BusinessDay = {
  id: string;
  date: string;
  status: 'OPEN' | 'CLOSED';
  closedAt: string | null;
  closedById: string | null;
  reopenedAt: string | null;
  reopenedById: string | null;
  closedBy?: { name: string } | null;
  reopenedBy?: { name: string } | null;
};

export type DailyCalculations = {
  date: string;
  products: { productId: string; productName: string; numberSold: number; totalAmount: number }[];
  totalSalesToday: number;
};

export type ProductRangeCalculations = {
  totalQuantitySold: number;
  totalSalesAmount: number;
  transactionCount: number;
  totalCommission: number;
};

export type Sale = {
  id: string;
  transactionId: string;
  productId: string;
  resellerId: string | null;
  counterUserId: string;
  quantity: number;
  unitPrice: number | null;
  price: number;
  commission: number;
  dayId: string;
  createdAt: string;
  product: { name: string };
  reseller: { fullName: string } | null;
  counterUser: { name: string };
};

export type StockMovement = {
  id: string;
  productId: string;
  type: 'WAREHOUSE_IN' | 'TRANSFER_TO_SHOP';
  quantity: number;
  performedById: string;
  createdAt: string;
  product: { name: string };
  performedBy: { name: string };
};
