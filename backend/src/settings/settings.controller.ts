import { Body, Controller, Get, Patch } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types';

@Roles('MANAGER')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  get() {
    return this.settingsService.get();
  }

  @Patch()
  update(@Body() dto: UpdateSettingsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.update(dto, user.id);
  }
}
