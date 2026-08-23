import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CustomerTier } from '@prisma/client';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types';

@Roles('MANAGER')
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  findAll(@Query('search') search?: string, @Query('tier') tier?: CustomerTier) {
    return this.customersService.findAll({ search, tier });
  }

  @Post()
  create(@Body() dto: CreateCustomerDto, @CurrentUser() user: AuthenticatedUser) {
    return this.customersService.create(dto, user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.customersService.update(id, dto, user.id);
  }
}
