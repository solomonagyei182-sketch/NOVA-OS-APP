import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { BusinessDayService } from '../business-day/business-day.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CreateSaleDto } from './dto/create-sale.dto';
import { dateToDayString } from '../business-day/date.util';

export type SalesFilters = {
  search?: string;
  productId?: string;
  resellerId?: string;
  counterUserId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'createdAt' | 'price' | 'commission';
  sortDir?: 'asc' | 'desc';
};

const saleInclude = {
  product: { select: { name: true } },
  reseller: { select: { fullName: true } },
  counterUser: { select: { name: true } },
} satisfies Prisma.SaleInclude;

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly businessDayService: BusinessDayService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async createSale(dto: CreateSaleDto, actingUserId: string) {
    const day = await this.businessDayService.getOrCreateToday();

    if (day.status === 'CLOSED') {
      throw new BadRequestException(
        "Today's transactions are closed. Ask a manager to reopen the day before recording new sales.",
      );
    }

    const reseller = await this.prisma.reseller.findUniqueOrThrow({ where: { id: dto.resellerId } });
    if (reseller.status !== 'ACTIVE') {
      throw new BadRequestException('This reseller is inactive and cannot be selected for new sales.');
    }

    const quantity = dto.quantity ?? 1;
    const total = dto.unitPrice * quantity;

    const sale = await this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUniqueOrThrow({ where: { id: dto.productId } });

      if (product.status !== 'ACTIVE') {
        throw new BadRequestException('This product is inactive and cannot be selected for new sales.');
      }

      // Condition the UPDATE on having enough stock rather than checking then
      // writing separately — under concurrent sales of the same product, two
      // reads could both pass a standalone check before either commits,
      // driving shopQty negative. This makes it one atomic database operation.
      const result = await tx.product.updateMany({
        where: { id: dto.productId, shopQty: { gte: quantity } },
        data: { shopQty: { decrement: quantity } },
      });
      if (result.count === 0) {
        throw new BadRequestException('Insufficient stock available.');
      }
      const updatedProduct = await tx.product.findUniqueOrThrow({ where: { id: dto.productId } });

      // Atomic increment on the day row — safe under concurrent writers (Postgres
      // serializes UPDATEs to the same row), unlike a count()-then-insert approach
      // which two simultaneous sales could both read before either commits.
      const updatedDay = await tx.businessDay.update({
        where: { id: day.id },
        data: { saleCounter: { increment: 1 } },
      });
      const transactionId = `SL-${day.date.replace(/-/g, '')}-${String(updatedDay.saleCounter).padStart(4, '0')}`;

      const sale = await tx.sale.create({
        data: {
          transactionId,
          productId: dto.productId,
          resellerId: dto.resellerId,
          counterUserId: actingUserId,
          quantity,
          unitPrice: dto.unitPrice,
          price: total,
          commission: dto.commission,
          dayId: day.id,
        },
        include: saleInclude,
      });

      await this.auditService.log(
        {
          userId: actingUserId,
          action: 'SALE_CREATED',
          entityType: 'Sale',
          entityId: sale.id,
          details: {
            transactionId: sale.transactionId,
            product: product.name,
            reseller: reseller.fullName,
            quantity,
            unitPrice: dto.unitPrice,
            total,
            commission: dto.commission,
            remainingShopQty: updatedProduct.shopQty,
          },
        },
        tx,
      );

      return sale;
    });

    this.realtimeGateway.emit('sale:created', { saleId: sale.id, transactionId: sale.transactionId });
    this.realtimeGateway.emit('inventory:updated', { productId: sale.productId });
    return sale;
  }

  async listSales(filters: SalesFilters) {
    const conditions: Prisma.SaleWhereInput[] = [];

    if (filters.productId) conditions.push({ productId: filters.productId });
    if (filters.resellerId) conditions.push({ resellerId: filters.resellerId });
    if (filters.counterUserId) conditions.push({ counterUserId: filters.counterUserId });

    if (filters.dateFrom || filters.dateTo) {
      conditions.push({
        createdAt: {
          gte: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
          lte: filters.dateTo ? new Date(`${filters.dateTo}T23:59:59.999`) : undefined,
        },
      });
    }

    if (filters.search) {
      conditions.push({
        OR: [
          { transactionId: { contains: filters.search, mode: 'insensitive' } },
          { product: { name: { contains: filters.search, mode: 'insensitive' } } },
          { reseller: { fullName: { contains: filters.search, mode: 'insensitive' } } },
          { counterUser: { name: { contains: filters.search, mode: 'insensitive' } } },
        ],
      });
    }

    return this.prisma.sale.findMany({
      where: conditions.length > 0 ? { AND: conditions } : undefined,
      include: saleInclude,
      orderBy: { [filters.sortBy ?? 'createdAt']: filters.sortDir ?? 'desc' },
      take: 500,
    });
  }

  async trend(days: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const results: { date: string; totalSales: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const dayStart = new Date(today);
      dayStart.setDate(dayStart.getDate() - i);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const aggregate = await this.prisma.sale.aggregate({
        where: { createdAt: { gte: dayStart, lte: dayEnd } },
        _sum: { price: true },
      });

      results.push({
        date: dateToDayString(dayStart),
        totalSales: aggregate._sum.price ?? 0,
      });
    }

    return results;
  }

  async todaySummary() {
    const date = dateToDayString();
    const day = await this.businessDayService.findByDate(date);
    if (!day) return { totalSales: 0, transactionCount: 0, totalCommission: 0 };

    const aggregate = await this.prisma.sale.aggregate({
      where: { dayId: day.id },
      _sum: { price: true, commission: true },
      _count: true,
    });

    return {
      totalSales: aggregate._sum.price ?? 0,
      transactionCount: aggregate._count,
      totalCommission: aggregate._sum.commission ?? 0,
    };
  }
}
