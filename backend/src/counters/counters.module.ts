import { Module } from '@nestjs/common';
import { CountersService } from './counters.service';
import { CountersController } from './counters.controller';

@Module({
  controllers: [CountersController],
  providers: [CountersService],
})
export class CountersModule {}
