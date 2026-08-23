import { Controller, Get, Query } from '@nestjs/common';
import { AuditService } from './audit.service';
import { Roles } from '../auth/decorators/roles.decorator';

@Roles('MANAGER')
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  list(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    const parsedLimit = limit ? Math.min(Math.max(Number(limit), 1), 200) : 50;
    const parsedOffset = offset ? Math.max(Number(offset), 0) : 0;
    return this.auditService.list(parsedLimit, parsedOffset);
  }
}
