import { Injectable } from '@nestjs/common';
import { CompanyStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filters: { search?: string; status?: CompanyStatus }) {
    const where: Prisma.CompanyWhereInput = {};
    if (filters.status) where.status = filters.status;
    if (filters.search) where.name = { contains: filters.search, mode: 'insensitive' };

    return this.prisma.company.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });
  }

  findActive() {
    return this.prisma.company.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  create(dto: CreateCompanyDto) {
    return this.prisma.company.create({
      data: { name: dto.name.trim(), logoUrl: dto.logoUrl || null },
    });
  }

  update(id: string, dto: UpdateCompanyDto) {
    return this.prisma.company.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        logoUrl: dto.logoUrl !== undefined ? dto.logoUrl || null : undefined,
        status: dto.status,
      },
    });
  }

  /** Case-insensitive find-or-create — used when a product form supplies a brand-new company name. */
  async findOrCreateByName(name: string) {
    const trimmed = name.trim();
    const existing = await this.prisma.company.findFirst({
      where: { name: { equals: trimmed, mode: 'insensitive' } },
    });
    if (existing) return existing;
    return this.prisma.company.create({ data: { name: trimmed } });
  }
}
