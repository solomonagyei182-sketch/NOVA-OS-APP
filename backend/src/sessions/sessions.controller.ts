import { Controller, Get, Param, Post } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types';

@Roles('MANAGER')
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get('active')
  listActive() {
    return this.sessionsService.listActive();
  }

  @Post(':userId/drop')
  dropUserSessions(@Param('userId') userId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.sessionsService.dropUserSessions(userId, user.id);
  }
}
