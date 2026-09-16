import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { CreateResellerDto } from './create-reseller.dto';

export class BulkCreateResellerDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateResellerDto)
  rows: CreateResellerDto[];
}
