import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ProductStatus } from '@prisma/client';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CorrectStockDto } from './dto/correct-stock.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditService } from '../audit/audit.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import type { AuthenticatedUser } from '../auth/types';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly auditService: AuditService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  @Get()
  async findAll(
    @Query('search') search?: string,
    @Query('status') status?: ProductStatus,
    @Query('companyId') companyId?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const products = await this.productsService.findAll({ search, status, companyId });
    // Warehouse quantity and cost price are Manager-only information — a
    // Counter must never receive them, even incidentally through a shared
    // product list endpoint used elsewhere for Sales/shop views.
    if (user?.role === 'COUNTER') {
      return products.map(({ warehouseQty: _warehouseQty, costPrice: _costPrice, ...rest }) => rest);
    }
    return products;
  }

  @Roles('MANAGER')
  @Post()
  async create(@Body() dto: CreateProductDto, @CurrentUser() user: AuthenticatedUser) {
    const product = await this.productsService.create(dto);
    await this.auditService.log({
      userId: user.id,
      action: 'PRODUCT_CREATED',
      entityType: 'Product',
      entityId: product.id,
      details: { name: product.name },
    });
    this.realtimeGateway.emit('product:created', { productId: product.id });
    return product;
  }

  @Roles('MANAGER')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const existing = await this.productsService.findById(id);
    const product = await this.productsService.update(id, dto);

    if (dto.status && dto.status !== existing.status) {
      await this.auditService.log({
        userId: user.id,
        action: dto.status === 'ACTIVE' ? 'PRODUCT_ACTIVATED' : 'PRODUCT_DEACTIVATED',
        entityType: 'Product',
        entityId: product.id,
        details: { name: product.name },
      });
    } else {
      // Only the fields actually submitted, each paired with its previous
      // value — not just the new state, so the change is legible on its own
      // in the activity log without cross-referencing anything else.
      const changes: Record<string, { previous: unknown; new: unknown }> = {};
      for (const key of Object.keys(dto) as (keyof UpdateProductDto)[]) {
        if (key === 'status' || dto[key] === undefined) continue;
        const previous = (existing as Record<string, unknown>)[key];
        const next = (product as Record<string, unknown>)[key];
        if (previous !== next) changes[key] = { previous, new: next };
      }
      await this.auditService.log({
        userId: user.id,
        action: 'PRODUCT_UPDATED',
        entityType: 'Product',
        entityId: product.id,
        details: { name: product.name, changes },
      });
    }

    this.realtimeGateway.emit('product:updated', { productId: product.id });
    return product;
  }

  @Roles('MANAGER')
  @Patch(':id/correct-stock')
  async correctStock(
    @Param('id') id: string,
    @Body() dto: CorrectStockDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const { before, after } = await this.productsService.correctStock(id, dto);

    await this.auditService.log({
      userId: user.id,
      action: 'INVENTORY_CORRECTED',
      entityType: 'Product',
      entityId: id,
      details: {
        name: after.name,
        reason: dto.reason,
        previous: { warehouseQty: before.warehouseQty, shopQty: before.shopQty },
        new: { warehouseQty: after.warehouseQty, shopQty: after.shopQty },
      },
    });

    this.realtimeGateway.emit('product:updated', { productId: id });
    this.realtimeGateway.emit('inventory:updated', { productId: id });
    return after;
  }

  @Roles('MANAGER')
  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const deleted = await this.productsService.remove(id);

    await this.auditService.log({
      userId: user.id,
      action: 'PRODUCT_DELETED',
      entityType: 'Product',
      entityId: id,
      details: { name: deleted.name, sku: deleted.sku },
    });

    this.realtimeGateway.emit('product:deleted', { productId: id });
    return { success: true };
  }
}
