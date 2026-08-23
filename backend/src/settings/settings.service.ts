import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // Fixed id makes this a true singleton: two concurrent first-ever requests
  // both racing findFirst()-then-create() could otherwise each insert their
  // own row. upsert() on a fixed id is atomic — Postgres serializes it via
  // the unique/primary-key constraint, so only one row can ever exist.
  private async getOrCreate() {
    return this.prisma.businessSettings.upsert({
      where: { id: 'singleton' },
      update: {},
      create: { id: 'singleton' },
    });
  }

  async get() {
    return this.getOrCreate();
  }

  async update(dto: UpdateSettingsDto, userId: string) {
    const current = await this.getOrCreate();
    const updated = await this.prisma.businessSettings.update({
      where: { id: current.id },
      data: dto,
    });

    await this.auditService.log({
      userId,
      action: 'SETTINGS_UPDATED',
      entityType: 'BusinessSettings',
      entityId: updated.id,
      details: dto as Record<string, unknown>,
    });

    return updated;
  }
}
