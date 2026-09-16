import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { AddWarehouseStockDto } from './add-warehouse-stock.dto';

export class BulkAddWarehouseStockDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AddWarehouseStockDto)
  rows: AddWarehouseStockDto[];
}
