import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type TransactionClient = Prisma.TransactionClient;

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(
    params: {
      userId: string;
      action: string;
      entityType: string;
      entityId?: string;
      details?: Record<string, unknown>;
    },
    tx?: TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    await client.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        details: params.details ? JSON.stringify(params.details) : undefined,
      },
    });
  }

  async list(limit = 50, offset = 0, filters: { entityType?: string; entityId?: string } = {}) {
    const where: Prisma.AuditLogWhereInput = {};
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.entityId) where.entityId = filters.entityId;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { logs, total };
  }
}
