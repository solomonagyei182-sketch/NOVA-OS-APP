import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, StockTransferStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { dateToDayString } from '../business-day/date.util';
import { DispatchStockDto } from './dto/dispatch-stock.dto';
import { AcceptStockDto } from './dto/accept-stock.dto';

const transferInclude = {
  product: { select: { id: true, name: true, sku: true } },
  dispatchedBy: { select: { id: true, name: true } },
  assignedTo: { select: { id: true, name: true } },
  acceptance: true,
} satisfies Prisma.StockTransferInclude;

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

@Injectable()
export class StockTransfersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async dispatch(dto: DispatchStockDto, dispatchedById: string) {
    const assignedUser = await this.prisma.user.findUniqueOrThrow({ where: { id: dto.assignedToId } });
    if (assignedUser.role !== 'COUNTER') {
      throw new BadRequestException('Stock can only be dispatched to a Counter account.');
    }
    if (!assignedUser.isActive) {
      throw new BadRequestException('This Counter account is not active.');
    }

    const transfer = await this.prisma.$transaction(async (tx) => {
      // Same atomic conditional-decrement pattern used everywhere else in
      // inventory — the WHERE clause makes the stock check and the decrement
      // one database operation, safe under concurrent dispatches.
      const result = await tx.product.updateMany({
        where: { id: dto.productId, warehouseQty: { gte: dto.quantity } },
        data: { warehouseQty: { decrement: dto.quantity } },
      });
      if (result.count === 0) {
        const product = await tx.product.findUniqueOrThrow({ where: { id: dto.productId } });
        throw new BadRequestException(
          `Not enough stock in the warehouse. Only ${product.warehouseQty} unit(s) available.`,
        );
      }

      // transferId only needs to be unique and human-readable, not strictly
      // sequential, so a date + random suffix avoids the count()-then-insert
      // race a per-day counter would need to guard against.
      return tx.stockTransfer.create({
        data: {
          transferId: `ST-${dateToDayString().replace(/-/g, '')}-${randomSuffix()}`,
          productId: dto.productId,
          quantity: dto.quantity,
          dispatchedById,
          assignedToId: dto.assignedToId,
        },
        include: transferInclude,
      });
    });

    await this.auditService.log({
      userId: dispatchedById,
      action: 'STOCK_DISPATCHED',
      entityType: 'StockTransfer',
      entityId: transfer.id,
      details: {
        transferId: transfer.transferId,
        product: transfer.product.name,
        quantity: transfer.quantity,
        assignedTo: transfer.assignedTo.name,
      },
    });

    this.realtimeGateway.emit('stock-transfer:dispatched', { transferId: transfer.id, assignedToId: dto.assignedToId });
    this.realtimeGateway.emit('inventory:updated', { productId: dto.productId });
    return transfer;
  }

  async accept(id: string, dto: AcceptStockDto, counterId: string) {
    const existing = await this.prisma.stockTransfer.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Stock transfer not found.');
    if (existing.assignedToId !== counterId) {
      throw new ForbiddenException('This stock transfer is not assigned to your account.');
    }
    if (existing.status !== 'PENDING') {
      throw new BadRequestException('This stock transfer has already been accepted.');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.stockTransfer.update({
        where: { id },
        data: { status: 'ACCEPTED' },
        include: transferInclude,
      });

      const acceptance = await tx.stockAcceptance.create({
        data: {
          stockTransferId: id,
          acceptedById: counterId,
          latitude: dto.latitude,
          longitude: dto.longitude,
          accuracyMeters: dto.accuracyMeters,
          address: dto.address,
        },
      });

      await tx.product.update({
        where: { id: existing.productId },
        data: { shopQty: { increment: existing.quantity } },
      });

      await tx.stockMovement.create({
        data: {
          productId: existing.productId,
          type: 'TRANSFER_TO_SHOP',
          quantity: existing.quantity,
          performedById: counterId,
        },
      });

      return { transfer: updated, acceptance };
    });

    await this.auditService.log({
      userId: counterId,
      action: 'STOCK_TRANSFER_ACCEPTED',
      entityType: 'StockTransfer',
      entityId: id,
      details: {
        transferId: existing.transferId,
        quantity: existing.quantity,
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
    });

    this.realtimeGateway.emit('stock-transfer:accepted', { transferId: id, assignedToId: counterId });
    this.realtimeGateway.emit('inventory:updated', { productId: existing.productId });
    return result;
  }

  listPendingForUser(userId: string) {
    return this.prisma.stockTransfer.findMany({
      where: { assignedToId: userId, status: 'PENDING' },
      include: transferInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  listAll(filters: {
    status?: StockTransferStatus;
    assignedToId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const where: Prisma.StockTransferWhereInput = {};
    if (filters.status) where.status = filters.status;
    if (filters.assignedToId) where.assignedToId = filters.assignedToId;
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {
        gte: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
        lte: filters.dateTo ? new Date(`${filters.dateTo}T23:59:59.999`) : undefined,
      };
    }

    return this.prisma.stockTransfer.findMany({
      where,
      include: transferInclude,
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  findById(id: string) {
    return this.prisma.stockTransfer.findUniqueOrThrow({ where: { id }, include: transferInclude });
  }
}
