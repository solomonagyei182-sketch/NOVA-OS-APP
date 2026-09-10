import { Module } from '@nestjs/common';
import { StockRequestsService } from './stock-requests.service';
import { StockRequestsController } from './stock-requests.controller';
import { StockTransfersModule } from '../stock-transfers/stock-transfers.module';

@Module({
  imports: [StockTransfersModule],
  controllers: [StockRequestsController],
  providers: [StockRequestsService],
  exports: [StockRequestsService],
})
export class StockRequestsModule {}
