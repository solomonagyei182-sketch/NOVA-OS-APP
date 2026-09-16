import { BadRequestException, HttpException, Injectable } from '@nestjs/common';
import type { Product } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { AddWarehouseStockDto } from './dto/add-warehouse-stock.dto';
import { BulkAddWarehouseStockDto } from './dto/bulk-add-warehouse-stock.dto';
import { TransferToShopDto } from './dto/transfer-to-shop.dto';
import { getStockStatus } from './stock-status';

const MAX_BULK_ROWS = 200;

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

  /**
   * Bulk warehouse stock-in — every row goes through the exact same
   * increment + StockMovement + audit-log steps as addWarehouseStock(),
   * inside one shared transaction so the whole batch is atomic: if any row
   * fails, none of the rows before it are left applied either.
   */
  async addWarehouseStockBulk(dto: BulkAddWarehouseStockDto, userId: string) {
    if (!dto.rows?.length) {
      throw new BadRequestException('At least one row is required.');
    }
    if (dto.rows.length > MAX_BULK_ROWS) {
      throw new BadRequestException(`Bulk entry is limited to ${MAX_BULK_ROWS} rows at a time.`);
    }

    const updatedProducts = await this.prisma.$transaction(
      async (tx) => {
        const products: Product[] = [];
        for (let i = 0; i < dto.rows.length; i++) {
          const row = dto.rows[i];
          try {
            const product = await tx.product.update({
              where: { id: row.productId },
              data: { warehouseQty: { increment: row.quantity } },
            });

            await tx.stockMovement.create({
              data: {
                productId: row.productId,
                type: 'WAREHOUSE_IN',
                quantity: row.quantity,
                performedById: userId,
              },
            });

            products.push(product);
          } catch (err) {
            const message = err instanceof HttpException ? err.message : 'Product not found.';
            throw new BadRequestException(`Row ${i + 1}: ${message}`);
          }
        }

        await this.auditService.log(
          {
            userId,
            action: 'WAREHOUSE_STOCK_BULK_ADDED',
            entityType: 'Product',
            entityId: products[0].id,
            details: {
              count: products.length,
              rows: dto.rows.map((r, i) => ({ productId: r.productId, quantity: r.quantity, newWarehouseQty: products[i].warehouseQty })),
            },
          },
          tx,
        );

        return products;
      },
      { timeout: 15000 + dto.rows.length * 1000 },
    );

    updatedProducts.forEach((p) => this.realtimeGateway.emit('inventory:updated', { productId: p.id }));
    return { count: updatedProducts.length, products: updatedProducts };
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
