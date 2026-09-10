import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { AddWarehouseStockDto } from './dto/add-warehouse-stock.dto';
import { TransferToShopDto } from './dto/transfer-to-shop.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/types';

// Every warehouse-facing endpoint here is Manager-only — a Counter must
// never be able to read or mutate warehouse-level stock, whether that's
// through the UI or by calling the API directly. Only /shop stays open to
// both roles, since that's the Counter's own shop-floor inventory.
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Roles('MANAGER')
  @Get('warehouse')
  listWarehouse() {
    return this.inventoryService.listWarehouse();
  }

  @Get('shop')
  listShop() {
    return this.inventoryService.listShop();
  }

  @Roles('MANAGER')
  @Get('movements')
  listMovements(
    @Query('productId') productId?: string,
    @Query('type') type?: 'WAREHOUSE_IN' | 'TRANSFER_TO_SHOP',
  ) {
    return this.inventoryService.listMovements({ productId, type });
  }

  @Roles('MANAGER')
  @Post('warehouse-stock')
  addWarehouseStock(@Body() dto: AddWarehouseStockDto, @CurrentUser() user: AuthenticatedUser) {
    return this.inventoryService.addWarehouseStock(dto, user.id);
  }

  @Roles('MANAGER')
  @Post('transfer')
  transferToShop(@Body() dto: TransferToShopDto, @CurrentUser() user: AuthenticatedUser) {
    return this.inventoryService.transferToShop(dto, user.id);
  }
}
