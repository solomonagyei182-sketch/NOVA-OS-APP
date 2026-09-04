import { Body, Controller, ForbiddenException, Get, Param, Post, Query } from '@nestjs/common';
import { StockTransferStatus } from '@prisma/client';
import { StockTransfersService } from './stock-transfers.service';
import { DispatchStockDto } from './dto/dispatch-stock.dto';
import { AcceptStockDto } from './dto/accept-stock.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types';

@Controller('stock-transfers')
export class StockTransfersController {
  constructor(private readonly stockTransfersService: StockTransfersService) {}

  @Roles('MANAGER')
  @Post()
  dispatch(@Body() dto: DispatchStockDto, @CurrentUser() user: AuthenticatedUser) {
    return this.stockTransfersService.dispatch(dto, user.id);
  }

  /** The current user's own inbox of stock awaiting acceptance. */
  @Get('pending')
  listMyPending(@CurrentUser() user: AuthenticatedUser) {
    return this.stockTransfersService.listPendingForUser(user.id);
  }

  @Post(':id/accept')
  accept(@Param('id') id: string, @Body() dto: AcceptStockDto, @CurrentUser() user: AuthenticatedUser) {
    return this.stockTransfersService.accept(id, dto, user.id);
  }

  @Roles('MANAGER')
  @Get()
  listAll(
    @Query('status') status?: StockTransferStatus,
    @Query('assignedToId') assignedToId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.stockTransfersService.listAll({ status, assignedToId, dateFrom, dateTo });
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const transfer = await this.stockTransfersService.findById(id);
    // A Counter may only view their own transfers — enforced here, not just in the UI.
    if (user.role !== 'MANAGER' && transfer.assignedToId !== user.id) {
      throw new ForbiddenException('You do not have permission to view this stock transfer.');
    }
    return transfer;
  }
}
