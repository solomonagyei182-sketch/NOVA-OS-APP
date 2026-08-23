import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { AddWarehouseStockDto } from './dto/add-warehouse-stock.dto';
import { TransferToShopDto } from './dto/transfer-to-shop.dto';
import { getStockStatus } from './stock-status';

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async listWarehouse() {
    const products = await this.prisma.product.findMany({ orderBy: { name: 'asc' } });
    return products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      quantity: p.warehouseQty,
      updatedAt: p.updatedAt,
    }));
  }

  async listShop() {
    const products = await this.prisma.product.findMany({ orderBy: { name: 'asc' } });
    return products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      quantity: p.shopQty,
      lowStockThreshold: p.lowStockThreshold,
      status: getStockStatus(p.shopQty, p.lowStockThreshold),
      updatedAt: p.updatedAt,
    }));
  }

  async addWarehouseStock(dto: AddWarehouseStockDto, userId: string) {
    const product = await this.prisma.$transaction(async (tx) => {
      const product = await tx.product.update({
        where: { id: dto.productId },
        data: { warehouseQty: { increment: dto.quantity } },
      });

      await tx.stockMovement.create({
        data: {
          productId: dto.productId,
          type: 'WAREHOUSE_IN',
          quantity: dto.quantity,
          performedById: userId,
        },
      });

      await this.auditService.log(
        {
          userId,
          action: 'WAREHOUSE_STOCK_ADDED',
          entityType: 'Product',
          entityId: product.id,
          details: { quantity: dto.quantity, newWarehouseQty: product.warehouseQty },
        },
        tx,
      );

      return product;
    });

    this.realtimeGateway.emit('inventory:updated', { productId: product.id });
    return product;
  }

  async transferToShop(dto: TransferToShopDto, userId: string) {
    const updated = await this.prisma.$transaction(async (tx) => {
      // Condition the UPDATE itself on having enough stock, rather than reading
      // then writing — under concurrent transfers of the same product, two
      // reads could both pass a separate check before either commits, driving
      // warehouseQty negative. This makes the check-and-decrement one atomic
      // database operation instead.
      const result = await tx.product.updateMany({
        where: { id: dto.productId, warehouseQty: { gte: dto.quantity } },
        data: {
          warehouseQty: { decrement: dto.quantity },
          shopQty: { increment: dto.quantity },
        },
      });

      if (result.count === 0) {
        const product = await tx.product.findUniqueOrThrow({ where: { id: dto.productId } });
        throw new BadRequestException(
          `Not enough stock in the warehouse. Only ${product.warehouseQty} unit(s) available.`,
        );
      }

      const updated = await tx.product.findUniqueOrThrow({ where: { id: dto.productId } });

      await tx.stockMovement.create({
        data: {
          productId: dto.productId,
          type: 'TRANSFER_TO_SHOP',
          quantity: dto.quantity,
          performedById: userId,
        },
      });

      await this.auditService.log(
        {
          userId,
          action: 'STOCK_TRANSFERRED_TO_SHOP',
          entityType: 'Product',
          entityId: updated.id,
          details: {
            quantity: dto.quantity,
            newShopQty: updated.shopQty,
            newWarehouseQty: updated.warehouseQty,
          },
        },
        tx,
      );

      return updated;
    });

    this.realtimeGateway.emit('inventory:updated', { productId: updated.id });
    return updated;
  }

  async listMovements(filters: { productId?: string; type?: 'WAREHOUSE_IN' | 'TRANSFER_TO_SHOP' }) {
    return this.prisma.stockMovement.findMany({
      where: {
        productId: filters.productId,
        type: filters.type,
      },
      include: {
        product: { select: { name: true } },
        performedBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }
}
