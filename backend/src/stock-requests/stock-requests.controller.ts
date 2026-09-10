import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { StockRequestStatus } from '@prisma/client';
import { StockRequestsService } from './stock-requests.service';
import { CreateStockRequestDto } from './dto/create-stock-request.dto';
import { FulfillStockRequestDto } from './dto/fulfill-stock-request.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types';

@Controller('stock-requests')
export class StockRequestsController {
  constructor(private readonly stockRequestsService: StockRequestsService) {}

  @Roles('COUNTER')
  @Post()
  create(@Body() dto: CreateStockRequestDto, @CurrentUser() user: AuthenticatedUser) {
    return this.stockRequestsService.create(dto, user.id);
  }

  /** The current Counter's own requests, any status. */
  @Get('mine')
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.stockRequestsService.listMine(user.id);
  }

  @Roles('MANAGER')
  @Get('pending')
  listPending() {
    return this.stockRequestsService.listPending();
  }

  @Roles('MANAGER')
  @Get()
  listAll(@Query('status') status?: StockRequestStatus, @Query('requestedById') requestedById?: string) {
    return this.stockRequestsService.listAll({ status, requestedById });
  }

  @Roles('MANAGER')
  @Post(':id/fulfill')
  fulfill(@Param('id') id: string, @Body() dto: FulfillStockRequestDto, @CurrentUser() user: AuthenticatedUser) {
    return this.stockRequestsService.fulfill(id, dto, user.id);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.stockRequestsService.cancel(id, user);
  }
}
