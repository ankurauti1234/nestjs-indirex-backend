import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

export class CreateHouseholdTvDto {
  @ApiPropertyOptional({
    description: 'TV ID code within household (e.g. TV1, TV2, TV3)',
    example: 'TV1',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  tvId?: string;

  @ApiPropertyOptional({
    description: 'TV location label',
    example: 'Living Room',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  location?: string;

  @ApiPropertyOptional({ description: 'TV brand name', example: 'Samsung' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  brand?: string;

  @ApiPropertyOptional({ description: 'TV model', example: 'QLED 4K 2024' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  model?: string;

  @ApiPropertyOptional({ description: 'Display size in inches', example: 55 })
  @Type(() => Number)
  @IsInt()
  @Min(10)
  @Max(150)
  @IsOptional()
  screenSizeInches?: number;

  @ApiPropertyOptional({
    description: 'Hardware device ID installed on this TV set',
    example: 'IM100042',
  })
  @IsString()
  @IsOptional()
  installedDeviceId?: string;
}

export class UpdateHouseholdTvDto {
  @ApiPropertyOptional({ description: 'TV location label' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  location?: string;

  @ApiPropertyOptional({ description: 'TV brand name' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  brand?: string;

  @ApiPropertyOptional({ description: 'TV model' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  model?: string;

  @ApiPropertyOptional({ description: 'Display size in inches' })
  @Type(() => Number)
  @IsInt()
  @Min(10)
  @Max(150)
  @IsOptional()
  screenSizeInches?: number;

  @ApiPropertyOptional({
    description: 'Hardware device ID installed on this TV set (pass empty string or null to unassign)',
    example: 'IM100042',
  })
  @IsString()
  @IsOptional()
  installedDeviceId?: string;
}

export class HouseholdTvQueryDto extends PaginationQueryDto {}

