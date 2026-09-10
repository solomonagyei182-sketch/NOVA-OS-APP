import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, StockRequestStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { StockTransfersService } from '../stock-transfers/stock-transfers.service';
import { dateToDayString } from '../business-day/date.util';
import { CreateStockRequestDto } from './dto/create-stock-request.dto';
import { FulfillStockRequestDto } from './dto/fulfill-stock-request.dto';
import type { AuthenticatedUser } from '../auth/types';

const requestInclude = {
  product: { select: { id: true, name: true, sku: true } },
  requestedBy: { select: { id: true, name: true } },
  fulfilledBy: { select: { id: true, name: true } },
  fulfilledTransfer: { select: { id: true, transferId: true, status: true } },
} satisfies Prisma.StockRequestInclude;

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

@Injectable()
export class StockRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly stockTransfersService: StockTransfersService,
  ) {}

  async create(dto: CreateStockRequestDto, requestedById: string) {
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException('Product not found.');

    const request = await this.prisma.stockRequest.create({
      data: {
        requestId: `SR-${dateToDayString().replace(/-/g, '')}-${randomSuffix()}`,
        productId: dto.productId,
        quantity: dto.quantity,
        note: dto.note,
        requestedById,
      },
      include: requestInclude,
    });

    await this.auditService.log({
      userId: requestedById,
      action: 'STOCK_REQUESTED',
      entityType: 'StockRequest',
      entityId: request.id,
      details: { requestId: request.requestId, product: product.name, quantity: dto.quantity },
    });

    this.realtimeGateway.emit('stock-request:created', { requestId: request.id, requestedById });
    return request;
  }

  listMine(requestedById: string) {
    return this.prisma.stockRequest.findMany({
      where: { requestedById },
      include: requestInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  listPending() {
    return this.prisma.stockRequest.findMany({
      where: { status: 'PENDING' },
      include: requestInclude,
      orderBy: { createdAt: 'asc' },
    });
  }

  listAll(filters: { status?: StockRequestStatus; requestedById?: string }) {
    const where: Prisma.StockRequestWhereInput = {};
    if (filters.status) where.status = filters.status;
    if (filters.requestedById) where.requestedById = filters.requestedById;

    return this.prisma.stockRequest.findMany({
      where,
      include: requestInclude,
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  async fulfill(id: string, dto: FulfillStockRequestDto, managerId: string) {
    const existing = await this.prisma.stockRequest.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Stock request not found.');
    if (existing.status !== 'PENDING') {
      throw new BadRequestException('This stock request has already been resolved.');
    }

    // Reuses the existing dispatch flow entirely — same atomic warehouse
    // decrement, same StockTransfer + acceptance handoff to the Counter, so
    // fulfilling a request behaves exactly like a normal dispatch downstream.
    const transfer = await this.stockTransfersService.dispatch(
      {
        productId: existing.productId,
        quantity: dto.quantity ?? existing.quantity,
        assignedToId: existing.requestedById,
      },
      managerId,
    );

    const updated = await this.prisma.stockRequest.update({
      where: { id },
      data: {
        status: 'FULFILLED',
        fulfilledById: managerId,
        fulfilledAt: new Date(),
        fulfilledTransferId: transfer.id,
      },
      include: requestInclude,
    });

    await this.auditService.log({
      userId: managerId,
      action: 'STOCK_REQUEST_FULFILLED',
      entityType: 'StockRequest',
      entityId: id,
      details: { requestId: existing.requestId, transferId: transfer.transferId, quantity: transfer.quantity },
    });

    this.realtimeGateway.emit('stock-request:fulfilled', {
      requestId: id,
      requestedById: existing.requestedById,
      transferId: transfer.id,
    });
    return updated;
  }

  async cancel(id: string, user: AuthenticatedUser) {
    const existing = await this.prisma.stockRequest.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Stock request not found.');
    if (user.role !== 'MANAGER' && existing.requestedById !== user.id) {
      throw new ForbiddenException('You can only cancel your own stock requests.');
    }
    if (existing.status !== 'PENDING') {
      throw new BadRequestException('This stock request has already been resolved.');
    }

    const updated = await this.prisma.stockRequest.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: requestInclude,
    });

    await this.auditService.log({
      userId: user.id,
      action: 'STOCK_REQUEST_CANCELLED',
      entityType: 'StockRequest',
      entityId: id,
      details: { requestId: existing.requestId },
    });

    this.realtimeGateway.emit('stock-request:cancelled', { requestId: id, requestedById: existing.requestedById });
    return updated;
  }
}
