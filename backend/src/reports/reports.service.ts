import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { endOfDay, endOfMonth, startOfDay, startOfMonth, startOfWeek } from './date-ranges';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async salesSummary() {
    const now = new Date();
    const periods: Record<string, [Date, Date]> = {
      today: [startOfDay(now), endOfDay(now)],
      thisWeek: [startOfWeek(now), endOfDay(now)],
      thisMonth: [startOfMonth(now), endOfDay(now)],
    };

    const results: Record<
      string,
      { totalSales: number; transactionCount: number; productsSold: number; totalCommission: number }
    > = {};

    for (const [key, [from, to]] of Object.entries(periods)) {
      const aggregate = await this.prisma.sale.aggregate({
        where: { createdAt: { gte: from, lte: to } },
        _sum: { price: true, commission: true, quantity: true },
        _count: true,
      });
      results[key] = {
        totalSales: aggregate._sum.price ?? 0,
        transactionCount: aggregate._count,
        productsSold: aggregate._sum.quantity ?? 0,
        totalCommission: aggregate._sum.commission ?? 0,
      };
    }

    return results;
  }

  async inventoryStatus() {
    const products = await this.prisma.product.findMany();
    const lowStock = products.filter((p) => p.shopQty > 0 && p.shopQty <= p.lowStockThreshold);
    const outOfStock = products.filter((p) => p.shopQty <= 0);

    const recentMovements = await this.prisma.stockMovement.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        product: { select: { name: true } },
        performedBy: { select: { name: true } },
      },
    });

    return {
      totalProducts: products.length,
      totalWarehouseStock: products.reduce((sum, p) => sum + p.warehouseQty, 0),
      totalShopStock: products.reduce((sum, p) => sum + p.shopQty, 0),
      lowStockProducts: lowStock.map((p) => ({ id: p.id, name: p.name, quantity: p.shopQty, threshold: p.lowStockThreshold })),
      outOfStockProducts: outOfStock.map((p) => ({ id: p.id, name: p.name })),
      recentMovements,
    };
  }

  /**
   * Staff performance tracks sales volume/value only. Commission belongs to the
   * Reseller on the sale, never to the staff member who recorded it — see
   * resellerPerformance() / resellerCommissionHistory() for commission reporting.
   */
  async staffPerformance(month?: number, year?: number) {
    const now = new Date();
    const y = year ?? now.getFullYear();
    const m = (month ?? now.getMonth() + 1) - 1;
    const from = startOfMonth(new Date(y, m, 1));
    const to = endOfMonth(new Date(y, m, 1));

    const sales = await this.prisma.sale.findMany({
      where: { createdAt: { gte: from, lte: to } },
      select: {
        counterUserId: true,
        price: true,
        counterUser: { select: { name: true } },
      },
    });

    const byStaff = new Map<
      string,
      { staffId: string; name: string; numberOfSales: number; totalSalesValue: number }
    >();

    for (const sale of sales) {
      const entry = byStaff.get(sale.counterUserId) ?? {
        staffId: sale.counterUserId,
        name: sale.counterUser.name,
        numberOfSales: 0,
        totalSalesValue: 0,
      };
      entry.numberOfSales += 1;
      entry.totalSalesValue += sale.price;
      byStaff.set(sale.counterUserId, entry);
    }

    return Array.from(byStaff.values()).sort((a, b) => b.totalSalesValue - a.totalSalesValue);
  }

  private resolveRange(filters: { month?: number; year?: number; dateFrom?: string; dateTo?: string }) {
    if (filters.dateFrom && filters.dateTo) {
      return {
        from: new Date(filters.dateFrom),
        to: new Date(`${filters.dateTo}T23:59:59.999`),
      };
    }
    const now = new Date();
    const y = filters.year ?? now.getFullYear();
    const m = (filters.month ?? now.getMonth() + 1) - 1;
    return { from: startOfMonth(new Date(y, m, 1)), to: endOfMonth(new Date(y, m, 1)) };
  }

  /** Commission earned per Reseller — always the manually entered amount, never a calculated percentage. */
  async resellerPerformance(filters: {
    month?: number;
    year?: number;
    dateFrom?: string;
    dateTo?: string;
    resellerId?: string;
  }) {
    const { from, to } = this.resolveRange(filters);

    const sales = await this.prisma.sale.findMany({
      where: {
        createdAt: { gte: from, lte: to },
        resellerId: filters.resellerId ?? { not: null },
      },
      select: {
        resellerId: true,
        price: true,
        quantity: true,
        commission: true,
        reseller: { select: { fullName: true } },
      },
    });

    const byReseller = new Map<
      string,
      {
        resellerId: string;
        fullName: string;
        numberOfTransactions: number;
        totalQuantity: number;
        totalSpent: number;
        totalCommission: number;
      }
    >();

    for (const sale of sales) {
      if (!sale.resellerId || !sale.reseller) continue;
      const entry = byReseller.get(sale.resellerId) ?? {
        resellerId: sale.resellerId,
        fullName: sale.reseller.fullName,
        numberOfTransactions: 0,
        totalQuantity: 0,
        totalSpent: 0,
        totalCommission: 0,
      };
      entry.numberOfTransactions += 1;
      entry.totalQuantity += sale.quantity;
      entry.totalSpent += sale.price;
      entry.totalCommission += sale.commission;
      byReseller.set(sale.resellerId, entry);
    }

    return Array.from(byReseller.values()).sort((a, b) => b.totalCommission - a.totalCommission);
  }

  async adminOverview() {
    const [
      totalProducts,
      activeProducts,
      totalResellers,
      activeResellers,
      salesAggregate,
      recentTransactions,
      recentlyAddedProducts,
      recentlyAddedResellers,
    ] = await Promise.all([
      this.prisma.product.count(),
      this.prisma.product.count({ where: { status: 'ACTIVE' } }),
      this.prisma.reseller.count(),
      this.prisma.reseller.count({ where: { status: 'ACTIVE' } }),
      this.prisma.sale.aggregate({ _count: true, _sum: { price: true } }),
      this.prisma.sale.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { product: { select: { name: true } }, reseller: { select: { fullName: true } } },
      }),
      this.prisma.product.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
      this.prisma.reseller.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
    ]);

    return {
      totalProducts,
      activeProducts,
      inactiveProducts: totalProducts - activeProducts,
      totalResellers,
      activeResellers,
      inactiveResellers: totalResellers - activeResellers,
      totalSales: salesAggregate._count,
      totalSalesValue: salesAggregate._sum.price ?? 0,
      recentTransactions,
      recentlyAddedProducts,
      recentlyAddedResellers,
    };
  }
}
