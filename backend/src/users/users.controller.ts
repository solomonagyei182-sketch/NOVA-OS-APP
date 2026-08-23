import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../auth/types';

@Roles('MANAGER')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly auditService: AuditService,
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
