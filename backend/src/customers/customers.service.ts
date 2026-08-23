import { Injectable } from '@nestjs/common';
import { CustomerTier, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  findAll(filters: { search?: string; tier?: CustomerTier }) {
    const conditions: Prisma.CustomerWhereInput[] = [];
    if (filters.tier) conditions.push({ tier: filters.tier });
    if (filters.search) {
      conditions.push({
        OR: [
          { fullName: { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } },
          { phone: { contains: filters.search } },
        ],
      });
    }

    return this.prisma.customer.findMany({
      where: conditions.length > 0 ? { AND: conditions } : undefined,
      orderBy: { fullName: 'asc' },
    });
  }

  async create(dto: CreateCustomerDto, userId: string) {
    const customer = await this.prisma.customer.create({
      data: { ...dto, lastInteractionAt: new Date() },
    });

    await this.auditService.log({
      userId,
      action: 'CUSTOMER_CREATED',
      entityType: 'Customer',
      entityId: customer.id,
      details: { fullName: customer.fullName, tier: customer.tier },
    });

    this.realtimeGateway.emit('customer:created', { customerId: customer.id });
    return customer;
  }

  async update(id: string, dto: UpdateCustomerDto, userId: string) {
    const existing = await this.prisma.customer.findUniqueOrThrow({ where: { id } });

    const customer = await this.prisma.customer.update({
      where: { id },
      data: { ...dto, lastInteractionAt: new Date() },
    });

    if (dto.tier && dto.tier !== existing.tier) {
      await this.auditService.log({
        userId,
        action: 'CUSTOMER_TIER_CHANGED',
        entityType: 'Customer',
        entityId: customer.id,
        details: { from: existing.tier, to: customer.tier },
      });
    } else {
      await this.auditService.log({
        userId,
        action: 'CUSTOMER_UPDATED',
        entityType: 'Customer',
        entityId: customer.id,
      });
    }

    this.realtimeGateway.emit('customer:updated', { customerId: customer.id });
    return customer;
  }
}
