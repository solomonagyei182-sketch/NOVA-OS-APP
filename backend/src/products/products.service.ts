import { Injectable } from '@nestjs/common';
import { Prisma, ProductStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filters: { search?: string; status?: ProductStatus }) {
    const where: Prisma.ProductWhereInput = {};
    if (filters.status) where.status = filters.status;
    if (filters.search) where.name = { contains: filters.search, mode: 'insensitive' };

    return this.prisma.product.findMany({ where, orderBy: { name: 'asc' } });
  }

  findById(id: string) {
    return this.prisma.product.findUniqueOrThrow({ where: { id } });
  }

  create(dto: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        name: dto.name,
        sku: dto.sku || null,
        category: dto.category,
        costPrice: dto.costPrice,
        sellingPrice: dto.sellingPrice,
        warehouseQty: dto.warehouseQty ?? 0,
        shopQty: dto.shopQty ?? 0,
        lowStockThreshold: dto.lowStockThreshold ?? 10,
      },
    });
  }

  update(id: string, dto: UpdateProductDto) {
    return this.prisma.product.update({
      where: { id },
      data: { ...dto, sku: dto.sku !== undefined ? dto.sku || null : undefined },
    });
  }
}
