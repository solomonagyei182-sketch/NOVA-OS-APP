import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SaleStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { BusinessDayService } from '../business-day/business-day.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CreateSaleDto } from './dto/create-sale.dto';
import { CorrectSaleDto } from './dto/correct-sale.dto';
import { DeleteSaleDto } from './dto/delete-sale.dto';
import { dateToDayString } from '../business-day/date.util';
import type { AuthenticatedUser } from '../auth/types';

export type SalesFilters = {
  search?: string;
  productId?: string;
  resellerId?: string;
  counterUserId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'createdAt' | 'price' | 'commission' | 'transactionDate';
  sortDir?: 'asc' | 'desc';
  /** Defaults to ACTIVE-only — every existing caller keeps seeing exactly
   * what it always did. DELETED/ALL are opt-in for the Transaction History
   * view, which is the only place deleted transactions should ever surface. */
  status?: SaleStatus | 'ALL';
};

const saleInclude = {
  product: { select: { name: true } },
  reseller: { select: { fullName: true } },
  counterUser: { select: { name: true } },
  day: { select: { status: true } },
  deletedBy: { select: { name: true } },
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
    const todayStr = dateToDayString();
    const transactionDateStr = dto.transactionDate ?? todayStr;
    const isHistorical = transactionDateStr !== todayStr;

    if (transactionDateStr > todayStr) {
      throw new BadRequestException('Transaction date cannot be in the future.');
    }
    if (isHistorical && !dto.reason?.trim()) {
      throw new BadRequestException('A reason is required when adding a transaction for a past date.');
    }

    const day = await this.businessDayService.getOrCreateForDate(transactionDateStr);

    if (day.status === 'CLOSED') {
      throw new BadRequestException(
        isHistorical
          ? `${transactionDateStr} is closed. Ask a manager to reopen that day before adding a transaction to it.`
          : "Today's transactions are closed. Ask a manager to reopen the day before recording new sales.",
      );
    }

    const reseller = await this.prisma.reseller.findUniqueOrThrow({ where: { id: dto.resellerId } });
    if (reseller.status !== 'ACTIVE') {
      throw new BadRequestException('This reseller is inactive and cannot be selected for new sales.');
    }

    const quantity = dto.quantity ?? 1;
    const total = dto.unitPrice * quantity;
    // Historical entries keep their true entry timestamp via createdAt's
    // default; only the calendar date portion is backdated for reporting.
    const transactionDate = new Date(`${transactionDateStr}T12:00:00.000Z`);

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
          transactionDate,
        },
        include: saleInclude,
      });

      await this.auditService.log(
        {
          userId: actingUserId,
          action: isHistorical ? 'SALE_ADDED_HISTORICAL' : 'SALE_CREATED',
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
            transactionDate: transactionDateStr,
            ...(isHistorical ? { reason: dto.reason } : {}),
          },
        },
        tx,
      );

      return sale;
      // A slow Neon round-trip can otherwise exceed Prisma's default 5s
      // transaction budget mid-write and fail a perfectly legitimate sale
      // with a confusing "conflict" error — this is a genuinely observed
      // failure mode, not a hypothetical one.
    }, { timeout: 15000 });

    this.realtimeGateway.emit('sale:created', { saleId: sale.id, transactionId: sale.transactionId });
    this.realtimeGateway.emit('inventory:updated', { productId: sale.productId });
    return sale;
  }

  /**
   * Corrects a mistaken sale in place — never creates a second transaction.
   * Inventory is adjusted by the exact delta between the old and new
   * quantity (or fully reversed and reapplied if the product itself was
   * wrong), atomically, so every downstream calculation (which all read
   * straight off the Sale table) reflects the fix on its next query with no
   * separate propagation step needed.
   */
  async correctSale(id: string, dto: CorrectSaleDto, actingUser: AuthenticatedUser) {
    const existing = await this.prisma.sale.findUnique({ where: { id }, include: saleInclude });
    if (!existing) throw new NotFoundException('Sale not found.');

    if (existing.status === 'DELETED') {
      throw new BadRequestException('This transaction has been deleted and cannot be edited.');
    }
    if (actingUser.role !== 'MANAGER' && existing.counterUserId !== actingUser.id) {
      throw new ForbiddenException('You can only correct your own sales.');
    }
    if (existing.day.status === 'CLOSED') {
      throw new BadRequestException(
        "This sale's business day is closed. Ask a manager to reopen the day before correcting it.",
      );
    }

    const newProductId = dto.productId ?? existing.productId;
    const newQuantity = dto.quantity ?? existing.quantity;
    const newUnitPrice = dto.unitPrice ?? existing.unitPrice ?? 0;
    const newCommission = dto.commission ?? existing.commission;
    const newResellerId = dto.resellerId ?? existing.resellerId;

    if (dto.resellerId && dto.resellerId !== existing.resellerId) {
      const reseller = await this.prisma.reseller.findUniqueOrThrow({ where: { id: dto.resellerId } });
      if (reseller.status !== 'ACTIVE') {
        throw new BadRequestException('This reseller is inactive and cannot be selected.');
      }
    }

    const newPrice = newUnitPrice * newQuantity;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (newProductId === existing.productId) {
        const delta = newQuantity - existing.quantity;
        if (delta > 0) {
          const result = await tx.product.updateMany({
            where: { id: newProductId, shopQty: { gte: delta } },
            data: { shopQty: { decrement: delta } },
          });
          if (result.count === 0) {
            throw new BadRequestException("Not enough stock available to increase this sale's quantity.");
          }
        } else if (delta < 0) {
          await tx.product.update({ where: { id: newProductId }, data: { shopQty: { increment: -delta } } });
        }
      } else {
        const newProduct = await tx.product.findUniqueOrThrow({ where: { id: newProductId } });
        if (newProduct.status !== 'ACTIVE') {
          throw new BadRequestException('The corrected product is inactive and cannot be sold.');
        }
        // Restore the original product's stock in full, then apply the new
        // product's decrement as one atomic conditional update — if that
        // fails, the whole transaction (including the restore) rolls back.
        await tx.product.update({
          where: { id: existing.productId },
          data: { shopQty: { increment: existing.quantity } },
        });
        const result = await tx.product.updateMany({
          where: { id: newProductId, shopQty: { gte: newQuantity } },
          data: { shopQty: { decrement: newQuantity } },
        });
        if (result.count === 0) {
          throw new BadRequestException(
            `Not enough stock of the corrected product. Only ${newProduct.shopQty} unit(s) available.`,
          );
        }
      }

      const sale = await tx.sale.update({
        where: { id },
        data: {
          productId: newProductId,
          resellerId: newResellerId,
          quantity: newQuantity,
          unitPrice: newUnitPrice,
          price: newPrice,
          commission: newCommission,
        },
        include: saleInclude,
      });

      await this.auditService.log(
        {
          userId: actingUser.id,
          action: 'SALE_CORRECTED',
          entityType: 'Sale',
          entityId: id,
          details: {
            transactionId: existing.transactionId,
            reason: dto.reason,
            previous: {
              product: existing.product.name,
              reseller: existing.reseller?.fullName ?? null,
              quantity: existing.quantity,
              unitPrice: existing.unitPrice,
              price: existing.price,
              commission: existing.commission,
            },
            new: {
              product: sale.product.name,
              reseller: sale.reseller?.fullName ?? null,
              quantity: newQuantity,
              unitPrice: newUnitPrice,
              price: newPrice,
              commission: newCommission,
            },
          },
        },
        tx,
      );

      return sale;
    }, { timeout: 15000 });

    this.realtimeGateway.emit('sale:updated', { saleId: id });
    this.realtimeGateway.emit('inventory:updated', { productId: newProductId });
    if (newProductId !== existing.productId) {
      this.realtimeGateway.emit('inventory:updated', { productId: existing.productId });
    }
    return updated;
  }

  /**
   * Soft-deletes a sale — the row is never physically removed. Its
   * inventory impact is reversed (stock restored) so active views are
   * accurate; excluding DELETED from every ACTIVE-scoped query is what
   * removes it from totals, not any separate reversal math for
   * revenue/commission (those are just fields on the row itself).
   */
  async deleteSale(id: string, dto: DeleteSaleDto, actingUser: AuthenticatedUser) {
    const existing = await this.prisma.sale.findUnique({ where: { id }, include: saleInclude });
    if (!existing) throw new NotFoundException('Sale not found.');

    if (existing.status === 'DELETED') {
      throw new BadRequestException('This transaction has already been deleted.');
    }
    if (actingUser.role !== 'MANAGER' && existing.counterUserId !== actingUser.id) {
      throw new ForbiddenException('You can only delete your own sales.');
    }
    if (existing.day.status === 'CLOSED') {
      throw new BadRequestException(
        "This sale's business day is closed. Ask a manager to reopen the day before deleting it.",
      );
    }

    const deleted = await this.prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: existing.productId },
        data: { shopQty: { increment: existing.quantity } },
      });

      const sale = await tx.sale.update({
        where: { id },
        data: {
          status: 'DELETED',
          deletedAt: new Date(),
          deletedById: actingUser.id,
        },
        include: saleInclude,
      });

      await this.auditService.log(
        {
          userId: actingUser.id,
          action: 'SALE_DELETED',
          entityType: 'Sale',
          entityId: id,
          details: {
            transactionId: existing.transactionId,
            reason: dto.reason,
            product: existing.product.name,
            reseller: existing.reseller?.fullName ?? null,
            quantity: existing.quantity,
            price: existing.price,
            commission: existing.commission,
            transactionDate: existing.transactionDate.toISOString().slice(0, 10),
          },
        },
        tx,
      );

      return sale;
    }, { timeout: 15000 });

    this.realtimeGateway.emit('sale:updated', { saleId: id });
    this.realtimeGateway.emit('inventory:updated', { productId: existing.productId });
    return deleted;
  }

  async listSales(filters: SalesFilters) {
    const conditions: Prisma.SaleWhereInput[] = [];

    if (filters.productId) conditions.push({ productId: filters.productId });
    if (filters.resellerId) conditions.push({ resellerId: filters.resellerId });
    if (filters.counterUserId) conditions.push({ counterUserId: filters.counterUserId });
    // Defaults to ACTIVE-only. 'ALL' is the only way to see DELETED rows —
    // deliberately opt-in so no existing caller starts seeing them for free.
    if (filters.status !== 'ALL') {
      conditions.push({ status: filters.status ?? 'ACTIVE' });
    }

    if (filters.dateFrom || filters.dateTo) {
      conditions.push({
        transactionDate: {
          gte: filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00.000Z`) : undefined,
          lte: filters.dateTo ? new Date(`${filters.dateTo}T23:59:59.999Z`) : undefined,
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
      orderBy: { [filters.sortBy ?? 'transactionDate']: filters.sortDir ?? 'desc' },
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
        where: { transactionDate: { gte: dayStart, lte: dayEnd }, status: 'ACTIVE' },
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
      where: { dayId: day.id, status: 'ACTIVE' },
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
