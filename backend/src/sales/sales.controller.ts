import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { SalesService, type SalesFilters } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types';

@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  create(@Body() dto: CreateSaleDto, @CurrentUser() user: AuthenticatedUser) {
    return this.salesService.createSale(dto, user.id);
  }

  @Get()
  list(
    @Query('search') search?: string,
    @Query('productId') productId?: string,
    @Query('resellerId') resellerId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('sortBy') sortBy?: SalesFilters['sortBy'],
    @Query('sortDir') sortDir?: SalesFilters['sortDir'],
  ) {
    return this.salesService.listSales({
      search,
      productId,
      resellerId,
      dateFrom,
      dateTo,
      sortBy,
      sortDir,
    });
  }

  @Get('today-summary')
  todaySummary() {
    return this.salesService.todaySummary();
  }

  @Get('trend')
  trend(@Query('days') days?: string) {
    const parsed = days ? Number(days) : 14;
    const clamped = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 90) : 14;
    return this.salesService.trend(clamped);
  }
}
