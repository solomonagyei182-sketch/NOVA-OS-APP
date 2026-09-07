import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { SessionsService } from '../sessions/sessions.service';
import type { AuthenticatedUser } from '../auth/types';

@Roles('MANAGER')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly auditService: AuditService,
    private readonly sessionsService: SessionsService,
  ) {}

  @Get()
  findAll(@Query('search') search?: string, @Query('role') role?: Role) {
    return this.usersService.findAll({ search, role });
  }

  @Post()
  async create(@Body() dto: CreateUserDto, @CurrentUser() user: AuthenticatedUser) {
    const created = await this.usersService.create(dto);
    await this.auditService.log({
      userId: user.id,
      action: 'COUNTER_CREATED',
      entityType: 'User',
      entityId: created.id,
      details: { name: created.name, role: created.role },
    });
    return created;
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const updated = await this.usersService.update(id, dto);
    if (dto.isActive !== undefined) {
      // Deactivating a user should end their access everywhere immediately,
      // not just block their *next* request — this also forces their
      // already-open tabs to sign out live via the same session:ended event
      // ADMIN_DROP uses, instead of leaving a stale session in the UI.
      if (dto.isActive === false) {
        await this.sessionsService.dropUserSessions(id, user.id).catch(() => undefined);
      }
      await this.auditService.log({
        userId: user.id,
        action: 'USER_STATUS_CHANGED',
        entityType: 'User',
        entityId: updated.id,
        details: { name: updated.name, isActive: dto.isActive },
      });
    } else {
      await this.auditService.log({
        userId: user.id,
        action: 'STAFF_UPDATED',
        entityType: 'User',
        entityId: updated.id,
      });
    }
    return updated;
  }
}
