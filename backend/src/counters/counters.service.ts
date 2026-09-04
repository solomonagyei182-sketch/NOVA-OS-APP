import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const counterSelect = {
  id: true,
  name: true,
  email: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

type DateRangeFilter = { dateFrom?: string; dateTo?: string };

function toDateRange(filters: DateRangeFilter) {
  if (!filters.dateFrom && !filters.dateTo) return undefined;
  return {
    gte: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
    lte: filters.dateTo ? new Date(`${filters.dateTo}T23:59:59.999`) : undefined,
  };
}

@Injectable()
export class CountersService {
  constructor(private readonly prisma: PrismaService) {}

  async listCounters(filters: { search?: string; status?: 'ACTIVE' | 'INACTIVE' }) {
    const where: Prisma.UserWhereInput = { role: 'COUNTER' };
    if (filters.status) where.isActive = filters.status === 'ACTIVE';
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const counters = await this.prisma.user.findMany({ where, select: counterSelect, orderBy: { name: 'asc' } });
    if (counters.length === 0) return [];

    const counterIds = counters.map((c) => c.id);
    const [salesStats, stockStats, lastAcceptance] = await Promise.all([
      this.prisma.sale.groupBy({
        by: ['counterUserId'],
        where: { counterUserId: { in: counterIds } },
        _count: true,
        _sum: { price: true },
      }),
      this.prisma.stockTransfer.groupBy({
        by: ['assignedToId', 'status'],
        where: { assignedToId: { in: counterIds } },
        _count: true,
      }),
      this.prisma.stockAcceptance.findMany({
        where: { acceptedById: { in: counterIds } },
        orderBy: { acceptedAt: 'desc' },
        distinct: ['acceptedById'],
        select: { acceptedById: true, latitude: true, longitude: true, address: true, acceptedAt: true },
      }),
    ]);

    const salesById = new Map(salesStats.map((s) => [s.counterUserId, s]));
    const lastLocationById = new Map(lastAcceptance.map((a) => [a.acceptedById, a]));
    const pendingById = new Map<string, number>();
    const acceptedById = new Map<string, number>();
    for (const row of stockStats) {
      const target = row.status === 'PENDING' ? pendingById : acceptedById;
      target.set(row.assignedToId, row._count);
    }

    return counters.map((counter) => {
      const sales = salesById.get(counter.id);
      const lastLocation = lastLocationById.get(counter.id);
      return {
        ...counter,
        totalSales: sales?._sum.price ?? 0,
        totalTransactions: sales?._count ?? 0,
        pendingStockCount: pendingById.get(counter.id) ?? 0,
        acceptedStockCount: acceptedById.get(counter.id) ?? 0,
        lastKnownLocation: lastLocation
          ? {
              latitude: lastLocation.latitude,
              longitude: lastLocation.longitude,
              address: lastLocation.address,
              acceptedAt: lastLocation.acceptedAt,
            }
          : null,
      };
    });
  }

  async getProfile(counterId: string, filters: DateRangeFilter) {
    const counter = await this.prisma.user.findFirst({ where: { id: counterId, role: 'COUNTER' }, select: counterSelect });
    if (!counter) throw new NotFoundException('Counter account not found.');

    const createdAtRange = toDateRange(filters);

    const [salesAggregate, stockTransfers, lastAcceptance] = await Promise.all([
      this.prisma.sale.aggregate({
        where: { counterUserId: counterId, ...(createdAtRange ? { createdAt: createdAtRange } : {}) },
        _sum: { price: true, quantity: true },
        _count: true,
      }),
      this.prisma.stockTransfer.findMany({
        where: { assignedToId: counterId },
        select: { status: true, quantity: true },
      }),
      this.prisma.stockAcceptance.findFirst({
        where: { acceptedById: counterId },
        orderBy: { acceptedAt: 'desc' },
        select: { latitude: true, longitude: true, address: true, acceptedAt: true },
      }),
    ]);

    const pendingStock = stockTransfers.filter((t) => t.status === 'PENDING');
    const acceptedStock = stockTransfers.filter((t) => t.status === 'ACCEPTED');

    return {
      counter,
      summary: {
        totalSales: salesAggregate._sum.price ?? 0,
        totalTransactions: salesAggregate._count,
        totalProductsSold: salesAggregate._sum.quantity ?? 0,
        pendingStockTransfers: pendingStock.length,
        pendingStockQuantity: pendingStock.reduce((sum, t) => sum + t.quantity, 0),
        acceptedStockTransfers: acceptedStock.length,
        acceptedStockQuantity: acceptedStock.reduce((sum, t) => sum + t.quantity, 0),
      },
      lastKnownLocation: lastAcceptance,
    };
  }
}
