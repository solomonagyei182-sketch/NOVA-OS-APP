import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma, ProductStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CompaniesService } from '../companies/companies.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CorrectStockDto } from './dto/correct-stock.dto';

const productInclude = {
  company: { select: { id: true, name: true } },
  // Lets callers tell "safe to permanently delete" from "has real history,
  // archive instead" without a second round trip.
  _count: { select: { sales: true, stockTransfers: true, stockMovements: true, stockRequests: true } },
} satisfies Prisma.ProductInclude;

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly companiesService: CompaniesService,
  ) {}

  findAll(filters: { search?: string; status?: ProductStatus; companyId?: string }) {
    const where: Prisma.ProductWhereInput = {};
    if (filters.status) where.status = filters.status;
    if (filters.companyId) where.companyId = filters.companyId;
    if (filters.search) where.name = { contains: filters.search, mode: 'insensitive' };

    return this.prisma.product.findMany({ where, orderBy: { name: 'asc' }, include: productInclude });
  }

  findById(id: string) {
    return this.prisma.product.findUniqueOrThrow({ where: { id }, include: productInclude });
  }

  /** Resolves a company selection to an id: creates/reuses by name if newCompanyName was supplied. */
  private async resolveCompanyId(companyId?: string, newCompanyName?: string): Promise<string | null> {
    if (newCompanyName?.trim()) {
      const company = await this.companiesService.findOrCreateByName(newCompanyName);
      return company.id;
    }
    return companyId || null;
  }

  async create(dto: CreateProductDto) {
    const companyId = await this.resolveCompanyId(dto.companyId, dto.newCompanyName);
    return this.prisma.product.create({
      data: {
        name: dto.name,
        sku: dto.sku || null,
        category: dto.category,
        companyId,
        costPrice: dto.costPrice,
        sellingPrice: dto.sellingPrice,
        warehouseQty: dto.warehouseQty ?? 0,
        shopQty: dto.shopQty ?? 0,
        lowStockThreshold: dto.lowStockThreshold ?? 10,
      },
      include: productInclude,
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    const { newCompanyName, ...rest } = dto;
    const companyId =
      dto.companyId !== undefined || newCompanyName
        ? await this.resolveCompanyId(dto.companyId, newCompanyName)
        : undefined;

    return this.prisma.product.update({
      where: { id },
      data: { ...rest, sku: dto.sku !== undefined ? dto.sku || null : undefined, companyId },
      include: productInclude,
    });
  }

  /**
   * A direct correction of the current stock figure — distinct from the
   * additive stock-in/transfer/dispatch flows, which only ever move stock
   * relative to what's already there. This overwrites it outright, for when
   * the figure itself was wrong (e.g. someone typed 500 instead of 50).
   */
  async correctStock(id: string, dto: CorrectStockDto) {
    if (dto.warehouseQty === undefined && dto.shopQty === undefined) {
      throw new ConflictException('Provide at least one corrected quantity.');
    }
    const before = await this.prisma.product.findUniqueOrThrow({ where: { id }, include: productInclude });
    const after = await this.prisma.product.update({
      where: { id },
      data: {
        warehouseQty: dto.warehouseQty,
        shopQty: dto.shopQty,
      },
      include: productInclude,
    });
    return { before, after };
  }

  /**
   * Permanently removes a product — only ever safe when nothing references
   * it. A product with any sales/transfer/movement/request history is
   * rejected here (the DB's own FK constraints would block it anyway) so the
   * caller gets a clear, actionable error instead of a raw 500.
   */
  async remove(id: string) {
    const product = await this.prisma.product.findUniqueOrThrow({ where: { id }, include: productInclude });
    const totalHistory =
      product._count.sales + product._count.stockTransfers + product._count.stockMovements + product._count.stockRequests;
    if (totalHistory > 0) {
      throw new ConflictException(
        'This product has transaction history and cannot be permanently deleted. Archive it (Stop Selling) instead to preserve historical records.',
      );
    }
    await this.prisma.product.delete({ where: { id } });
    return product;
  }
}
