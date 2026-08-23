import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { AddWarehouseStockDto } from './dto/add-warehouse-stock.dto';
import { TransferToShopDto } from './dto/transfer-to-shop.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('warehouse')
  listWarehouse() {
    return this.inventoryService.listWarehouse();
  }

  @Get('shop')
  listShop() {
    return this.inventoryService.listShop();
  }

  @Get('movements')
  listMovements(
    @Query('productId') productId?: string,
    @Query('type') type?: 'WAREHOUSE_IN' | 'TRANSFER_TO_SHOP',
  ) {
    return this.inventoryService.listMovements({ productId, type });
  }

  @Post('warehouse-stock')
  addWarehouseStock(@Body() dto: AddWarehouseStockDto, @CurrentUser() user: AuthenticatedUser) {
    return this.inventoryService.addWarehouseStock(dto, user.id);
  }

  @Post('transfer')
  transferToShop(@Body() dto: TransferToShopDto, @CurrentUser() user: AuthenticatedUser) {
    return this.inventoryService.transferToShop(dto, user.id);
  }
}
