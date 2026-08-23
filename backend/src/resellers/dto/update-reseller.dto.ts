import { PartialType } from '@nestjs/mapped-types';
import { IsIn, IsOptional } from 'class-validator';
import { ResellerStatus } from '@prisma/client';
import { CreateResellerDto } from './create-reseller.dto';

export class UpdateResellerDto extends PartialType(CreateResellerDto) {
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: ResellerStatus;
}
