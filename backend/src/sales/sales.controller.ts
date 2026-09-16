import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { SalesService, type SalesFilters } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { CorrectSaleDto } from './dto/correct-sale.dto';
import { DeleteSaleDto } from './dto/delete-sale.dto';
import { BulkCreateSaleDto } from './dto/bulk-create-sale.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types';

@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  create(@Body() dto: CreateSaleDto, @CurrentUser() user: AuthenticatedUser) {
    return this.salesService.createSale(dto, user.id);
  }

  // No @Roles guard — same authorization as single create(): a Counter may
  // bulk-record sales exactly as they could one at a time. Bulk Entry changes
  // how a sale is entered, never who is allowed to enter one.
  @Post('bulk')
  createBulk(@Body() dto: BulkCreateSaleDto, @CurrentUser() user: AuthenticatedUser) {
    return this.salesService.createSalesBulk(dto, user);
  }

  // No @Roles guard — a Counter may correct their own recent sale, a Manager
  // may correct any sale; the service enforces exactly that boundary.
  @Patch(':id')
  correct(@Param('id') id: string, @Body() dto: CorrectSaleDto, @CurrentUser() user: AuthenticatedUser) {
    return this.salesService.correctSale(id, dto, user);
  }

  // Same ownership boundary as correct() — enforced in the service, not here.
  @Patch(':id/delete')
  delete(@Param('id') id: string, @Body() dto: DeleteSaleDto, @CurrentUser() user: AuthenticatedUser) {
    return this.salesService.deleteSale(id, dto, user);
  }

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('search') search?: string,
    @Query('productId') productId?: string,
    @Query('resellerId') resellerId?: string,
    @Query('counterUserId') counterUserId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('sortBy') sortBy?: SalesFilters['sortBy'],
    @Query('sortDir') sortDir?: SalesFilters['sortDir'],
    @Query('status') status?: SalesFilters['status'],
  ) {
    // A Counter can only ever see their own sales — their id is forced here
    // server-side, ignoring whatever counterUserId they might pass, so this
    // can't be bypassed by editing the request. Only a Manager may look up
    // another account's transactions (used by Counter Management).
    const scopedCounterUserId = user.role === 'MANAGER' ? counterUserId : user.id;

    return this.salesService.listSales({
      search,
      productId,
      resellerId,
      counterUserId: scopedCounterUserId,
      dateFrom,
      dateTo,
      sortBy,
      sortDir,
      status,
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
