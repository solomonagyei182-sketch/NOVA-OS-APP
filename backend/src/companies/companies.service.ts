import { Injectable } from '@nestjs/common';
import { CompanyStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompaniesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

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

  async create(dto: CreateCompanyDto) {
    const created = await this.prisma.company.create({
      data: { name: dto.name.trim(), logoUrl: dto.logoUrl || null },
    });
    this.realtimeGateway.emit('company:created', { companyId: created.id });
    return created;
  }

  async update(id: string, dto: UpdateCompanyDto) {
    const updated = await this.prisma.company.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        logoUrl: dto.logoUrl !== undefined ? dto.logoUrl || null : undefined,
        status: dto.status,
      },
    });
    this.realtimeGateway.emit('company:updated', { companyId: updated.id });
    return updated;
  }

  /** Case-insensitive find-or-create — used when a product form supplies a brand-new company name. */
  async findOrCreateByName(name: string) {
    const trimmed = name.trim();
    const existing = await this.prisma.company.findFirst({
      where: { name: { equals: trimmed, mode: 'insensitive' } },
    });
    if (existing) return existing;
    const created = await this.prisma.company.create({ data: { name: trimmed } });
    this.realtimeGateway.emit('company:created', { companyId: created.id });
    return created;
  }
}
