import { Injectable } from '@nestjs/common';
import { Prisma, ProductStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CompaniesService } from '../companies/companies.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

const productInclude = {
  company: { select: { id: true, name: true } },
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
}
