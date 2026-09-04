import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ProductStatus } from '@prisma/client';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
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
  findAll(
    @Query('search') search?: string,
    @Query('status') status?: ProductStatus,
    @Query('companyId') companyId?: string,
  ) {
    return this.productsService.findAll({ search, status, companyId });
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
      await this.auditService.log({
        userId: user.id,
        action: 'PRODUCT_UPDATED',
        entityType: 'Product',
        entityId: product.id,
        details: dto as Record<string, unknown>,
      });
    }

    this.realtimeGateway.emit('product:updated', { productId: product.id });
    return product;
  }
}
