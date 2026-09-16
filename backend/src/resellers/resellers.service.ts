import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, Reseller, ResellerStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CreateResellerDto } from './dto/create-reseller.dto';
import { BulkCreateResellerDto } from './dto/bulk-create-reseller.dto';
import { UpdateResellerDto } from './dto/update-reseller.dto';

const MAX_BULK_ROWS = 200;

@Injectable()
export class ResellersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  findActive() {
    return this.prisma.reseller.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, fullName: true },
      orderBy: { fullName: 'asc' },
    });
  }

  async findAll(filters: { search?: string; status?: ResellerStatus }) {
    const where: Prisma.ResellerWhereInput = {};
    if (filters.status) where.status = filters.status;
    if (filters.search) {
      where.OR = [
        { fullName: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const resellers = await this.prisma.reseller.findMany({ where, orderBy: { fullName: 'asc' } });
    if (resellers.length === 0) return [];

    const stats = await this.prisma.sale.groupBy({
      by: ['resellerId'],
      where: { resellerId: { in: resellers.map((r) => r.id) } },
      _count: true,
      _sum: { price: true, commission: true },
      _max: { createdAt: true },
    });
    const statsById = new Map(stats.map((s) => [s.resellerId, s]));

    return resellers.map((r) => {
      const s = statsById.get(r.id);
      return {
        ...r,
        transactionCount: s?._count ?? 0,
        totalPurchases: s?._sum.price ?? 0,
        totalCommission: s?._sum.commission ?? 0,
        lastPurchaseAt: s?._max.createdAt ?? null,
      };
    });
  }

  async findById(id: string) {
    const reseller = await this.prisma.reseller.findUniqueOrThrow({ where: { id } });

    const [aggregate, sales] = await Promise.all([
      this.prisma.sale.aggregate({
        where: { resellerId: id },
        _count: true,
        _sum: { quantity: true, price: true, commission: true },
        _max: { createdAt: true },
      }),
      this.prisma.sale.findMany({
        where: { resellerId: id },
        include: {
          product: { select: { name: true } },
          counterUser: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    return {
      ...reseller,
      summary: {
        totalTransactions: aggregate._count,
        totalQuantityPurchased: aggregate._sum.quantity ?? 0,
        totalAmountSpent: aggregate._sum.price ?? 0,
        totalCommissionEarned: aggregate._sum.commission ?? 0,
        lastPurchaseAt: aggregate._max.createdAt,
      },
      sales,
    };
  }

  async create(dto: CreateResellerDto, userId: string) {
    const reseller = await this.prisma.reseller.create({ data: dto });

    await this.auditService.log({
      userId,
      action: 'RESELLER_CREATED',
      entityType: 'Reseller',
      entityId: reseller.id,
      details: { fullName: reseller.fullName },
    });

    this.realtimeGateway.emit('reseller:created', { resellerId: reseller.id });
    return reseller;
  }

  /** Bulk reseller creation — every row inside one transaction, all-or-nothing. */
  async createBulk(dto: BulkCreateResellerDto, userId: string) {
    if (!dto.rows?.length) {
      throw new BadRequestException('At least one row is required.');
    }
    if (dto.rows.length > MAX_BULK_ROWS) {
      throw new BadRequestException(`Bulk entry is limited to ${MAX_BULK_ROWS} rows at a time.`);
    }

    const resellers = await this.prisma.$transaction(async (tx) => {
      const created: Reseller[] = [];
      for (const row of dto.rows) {
        created.push(await tx.reseller.create({ data: row }));
      }
      return created;
    }, { timeout: 15000 + dto.rows.length * 1000 });

    await this.auditService.log({
      userId,
      action: 'RESELLERS_BULK_CREATED',
      entityType: 'Reseller',
      entityId: resellers[0].id,
      details: { count: resellers.length, names: resellers.map((r) => r.fullName) },
    });

    resellers.forEach((r) => this.realtimeGateway.emit('reseller:created', { resellerId: r.id }));
    return { count: resellers.length, resellers };
  }

  async update(id: string, dto: UpdateResellerDto, userId: string) {
    const existing = await this.prisma.reseller.findUniqueOrThrow({ where: { id } });
    const reseller = await this.prisma.reseller.update({ where: { id }, data: dto });

    if (dto.status && dto.status !== existing.status) {
      await this.auditService.log({
        userId,
        action: dto.status === 'ACTIVE' ? 'RESELLER_ACTIVATED' : 'RESELLER_DEACTIVATED',
        entityType: 'Reseller',
        entityId: reseller.id,
        details: { fullName: reseller.fullName },
      });
    } else {
      await this.auditService.log({
        userId,
        action: 'RESELLER_UPDATED',
        entityType: 'Reseller',
        entityId: reseller.id,
      });
    }

    this.realtimeGateway.emit('reseller:updated', { resellerId: reseller.id });
    return reseller;
  }
}
