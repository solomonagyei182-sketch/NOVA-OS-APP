import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ResellerStatus } from '@prisma/client';
import { ResellersService } from './resellers.service';
import { CreateResellerDto } from './dto/create-reseller.dto';
import { UpdateResellerDto } from './dto/update-reseller.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types';

@Controller('resellers')
export class ResellersController {
  constructor(private readonly resellersService: ResellersService) {}

  /** Minimal, name-only list for the Sales picker — available to both roles. */
  @Get('active')
  findActive() {
    return this.resellersService.findActive();
  }

  @Roles('MANAGER')
  @Get()
  findAll(@Query('search') search?: string, @Query('status') status?: ResellerStatus) {
    return this.resellersService.findAll({ search, status });
  }

  @Roles('MANAGER')
  @Get(':id')
  findById(@Param('id') id: string) {
    return this.resellersService.findById(id);
  }

  @Roles('MANAGER')
  @Post()
  create(@Body() dto: CreateResellerDto, @CurrentUser() user: AuthenticatedUser) {
    return this.resellersService.create(dto, user.id);
  }

  @Roles('MANAGER')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateResellerDto, @CurrentUser() user: AuthenticatedUser) {
    return this.resellersService.update(id, dto, user.id);
  }
}
