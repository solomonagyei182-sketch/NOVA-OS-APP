import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { Roles } from '../auth/decorators/roles.decorator';

@Roles('MANAGER')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales-summary')
  salesSummary() {
    return this.reportsService.salesSummary();
  }

  @Get('inventory-status')
  inventoryStatus() {
    return this.reportsService.inventoryStatus();
  }

  @Get('staff-performance')
  staffPerformance(@Query('month') month?: string, @Query('year') year?: string) {
    return this.reportsService.staffPerformance(
      month ? Number(month) : undefined,
      year ? Number(year) : undefined,
    );
  }

  @Get('reseller-performance')
  resellerPerformance(
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('resellerId') resellerId?: string,
  ) {
    return this.reportsService.resellerPerformance({
      month: month ? Number(month) : undefined,
      year: year ? Number(year) : undefined,
      dateFrom,
      dateTo,
      resellerId,
    });
  }

  @Get('admin-overview')
  adminOverview() {
    return this.reportsService.adminOverview();
  }
}
