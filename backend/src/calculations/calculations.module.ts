import { Module } from '@nestjs/common';
import { CalculationsService } from './calculations.service';
import { CalculationsController } from './calculations.controller';
import { BusinessDayModule } from '../business-day/business-day.module';

@Module({
  imports: [BusinessDayModule],
  controllers: [CalculationsController],
  providers: [CalculationsService],
})
export class CalculationsModule {}
