import { PartialType, OmitType } from '@nestjs/mapped-types';
import { IsIn, IsOptional } from 'class-validator';
import { ProductStatus } from '@prisma/client';
import { CreateProductDto } from './create-product.dto';

export class UpdateProductDto extends PartialType(
  OmitType(CreateProductDto, ['warehouseQty', 'shopQty'] as const),
) {
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: ProductStatus;
}
