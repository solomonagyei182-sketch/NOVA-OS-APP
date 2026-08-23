import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { dateToDayString } from './date.util';

@Injectable()
export class BusinessDayService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async getOrCreateToday() {
    const date = dateToDayString();
    return this.prisma.businessDay.upsert({
      where: { date },
      update: {},
      create: { date, status: 'OPEN' },
    });
  }

  findByDate(date: string) {
    return this.prisma.businessDay.findUnique({ where: { date } });
  }

  list() {
    return this.prisma.businessDay.findMany({
      orderBy: { date: 'desc' },
      include: {
        closedBy: { select: { name: true } },
        reopenedBy: { select: { name: true } },
      },
    });
  }

  async closeToday(userId: string) {
    const day = await this.getOrCreateToday();
    if (day.status === 'CLOSED') {
      throw new BadRequestException("Today's transactions are already closed.");
    }

    const updated = await this.prisma.businessDay.update({
      where: { id: day.id },
      data: { status: 'CLOSED', closedAt: new Date(), closedById: userId },
    });

    await this.auditService.log({
      userId,
      action: 'DAY_CLOSED',
      entityType: 'BusinessDay',
      entityId: updated.id,
      details: { date: updated.date },
    });

    this.realtimeGateway.emit('day:closed', { date: updated.date });
    return updated;
  }

  async reopen(dayId: string, userId: string) {
    const day = await this.prisma.businessDay.findUniqueOrThrow({ where: { id: dayId } });
    if (day.status === 'OPEN') {
      throw new BadRequestException('This day is already open.');
    }

    const updated = await this.prisma.businessDay.update({
      where: { id: dayId },
      data: { status: 'OPEN', reopenedAt: new Date(), reopenedById: userId },
    });

    await this.auditService.log({
      userId,
      action: 'DAY_REOPENED',
      entityType: 'BusinessDay',
      entityId: updated.id,
      details: { date: updated.date },
    });

    this.realtimeGateway.emit('day:reopened', { date: updated.date });
    return updated;
  }
}
