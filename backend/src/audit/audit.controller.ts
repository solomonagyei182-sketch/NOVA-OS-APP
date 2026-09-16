import { Controller, ForbiddenException, Get, Query } from '@nestjs/common';
import { AuditService } from './audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types';

// No blanket @Roles('MANAGER') here — a Manager sees everything, but a
// Counter is allowed a narrow slice: the history of one Sale they own,
// requested explicitly by id. Every other query (unfiltered, or any other
// entityType) stays Manager-only, enforced below.
@Controller('audit-logs')
export class AuditController {
  constructor(
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
  ) {
    if (user.role !== 'MANAGER') {
      if (entityType !== 'Sale' || !entityId) {
        throw new ForbiddenException('You do not have permission to view this activity log.');
      }
      const sale = await this.prisma.sale.findUnique({ where: { id: entityId }, select: { counterUserId: true } });
      if (!sale || sale.counterUserId !== user.id) {
        throw new ForbiddenException('You can only view the history of your own transactions.');
      }
    }

    const parsedLimit = limit ? Math.min(Math.max(Number(limit), 1), 200) : 50;
    const parsedOffset = offset ? Math.max(Number(offset), 0) : 0;
    return this.auditService.list(parsedLimit, parsedOffset, { entityType, entityId });
  }
}
