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

  private async getOrCreate() {
    const existing = await this.prisma.businessSettings.findFirst();
    if (existing) return existing;
    return this.prisma.businessSettings.create({ data: {} });
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
