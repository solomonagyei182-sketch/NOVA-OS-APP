import { Controller, Get, Param, Query } from '@nestjs/common';
import { CountersService } from './counters.service';
import { Roles } from '../auth/decorators/roles.decorator';

@Roles('MANAGER')
@Controller('counters')
export class CountersController {
  constructor(private readonly countersService: CountersService) {}

  @Get()
  listCounters(@Query('search') search?: string, @Query('status') status?: 'ACTIVE' | 'INACTIVE') {
    return this.countersService.listCounters({ search, status });
  }

  @Get(':id/profile')
  getProfile(
    @Param('id') id: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.countersService.getProfile(id, { dateFrom, dateTo });
  }
}
