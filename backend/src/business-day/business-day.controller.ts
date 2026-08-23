import { Controller, Get, Param, Post } from '@nestjs/common';
import { BusinessDayService } from './business-day.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/types';

@Controller('business-days')
export class BusinessDayController {
  constructor(private readonly businessDayService: BusinessDayService) {}

  @Get('today')
  today() {
    return this.businessDayService.getOrCreateToday();
  }

  @Get()
  list() {
    return this.businessDayService.list();
  }

  @Post('close')
  close(@CurrentUser() user: AuthenticatedUser) {
    return this.businessDayService.closeToday(user.id);
  }

  @Roles('MANAGER')
  @Post(':id/reopen')
  reopen(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.businessDayService.reopen(id, user.id);
  }
}
