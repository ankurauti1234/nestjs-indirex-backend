import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { FieldExecutiveStatus } from '../../database/entities/field-executive.entity.js';

export class CreateFieldExecutiveDto {
  @ApiPropertyOptional({ description: 'Domain executive ID (auto-generated e.g. FE1001 if omitted)', example: 'FE1001' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  executiveId?: string;

  @ApiProperty({ description: 'Full name of field executive', example: 'Arman Petrosyan' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'Mobile phone number', example: '+37491123456' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  phone: string;

  @ApiPropertyOptional({ description: 'Email address (optional)', example: 'arman@inditronics.am' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ enum: FieldExecutiveStatus, default: FieldExecutiveStatus.ACTIVE })
  @IsEnum(FieldExecutiveStatus)
  @IsOptional()
  status?: FieldExecutiveStatus = FieldExecutiveStatus.ACTIVE;

  @ApiPropertyOptional({ description: 'Array of assigned Region IDs', example: [1, 2], type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  regionIds?: number[];
}

export class UpdateFieldExecutiveDto {
  @ApiPropertyOptional({ description: 'Full name of field executive' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Mobile phone number' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ enum: FieldExecutiveStatus })
  @IsEnum(FieldExecutiveStatus)
  @IsOptional()
  status?: FieldExecutiveStatus;

  @ApiPropertyOptional({ description: 'Array of assigned Region IDs', example: [1, 2], type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  regionIds?: number[];
}

export class UpdateFieldExecutiveStatusDto {
  @ApiProperty({ enum: FieldExecutiveStatus, example: FieldExecutiveStatus.INACTIVE })
  @IsEnum(FieldExecutiveStatus)
  @IsNotEmpty()
  status: FieldExecutiveStatus;
}

export class FieldExecutiveQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: FieldExecutiveStatus, description: 'Filter by executive status' })
  @IsEnum(FieldExecutiveStatus)
  @IsOptional()
  status?: FieldExecutiveStatus;

  @ApiPropertyOptional({ description: 'Filter by Region ID (integer)' })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  regionId?: number;
}

