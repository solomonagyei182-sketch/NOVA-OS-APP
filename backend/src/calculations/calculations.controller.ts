import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { CalculationsService } from './calculations.service';

@Controller('calculations')
export class CalculationsController {
  constructor(private readonly calculationsService: CalculationsService) {}

  @Get('daily')
  daily() {
    return this.calculationsService.daily();
  }

  @Get('product-range')
  forProductInRange(
    @Query('productId') productId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    if (!productId || !dateFrom || !dateTo) {
      throw new BadRequestException('productId, dateFrom, and dateTo are required.');
    }
    return this.calculationsService.forProductInRange(productId, dateFrom, dateTo);
  }
}
