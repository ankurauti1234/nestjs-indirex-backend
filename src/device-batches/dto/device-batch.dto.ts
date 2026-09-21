import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import {
  DeviceBatchType,
  DeviceBatchStatus,
} from '../../database/entities/device-batch.entity.js';

export class CreateDeviceBatchDto {
  @ApiPropertyOptional({
    description: 'Domain batch ID (auto-generated e.g. BAT1001 if omitted)',
    example: 'BAT1001',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  batchId?: string;

  @ApiProperty({ description: 'Name of the device batch', example: 'Q3 Yerevan Meter Deployment' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Batch description', example: 'Deployment lot for Yerevan Central meters' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    enum: DeviceBatchType,
    default: DeviceBatchType.SHARED,
    description: 'Batch type: SHARED (multi-batch), EXCLUSIVE (single-batch), or GLOBAL (admin-only)',
  })
  @IsEnum(DeviceBatchType)
  @IsOptional()
  type?: DeviceBatchType = DeviceBatchType.SHARED;

  @ApiPropertyOptional({
    type: [String],
    description: 'Initial array of device IDs to assign to this batch',
    example: ['IM100042', 'IM100043'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  deviceIds?: string[];
}

export class UpdateDeviceBatchDto {
  @ApiPropertyOptional({ description: 'Name of the device batch' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Batch description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    enum: DeviceBatchStatus,
    description: 'Batch lifecycle status: ACTIVE, ARCHIVED, COMPLETED',
  })
  @IsEnum(DeviceBatchStatus)
  @IsOptional()
  status?: DeviceBatchStatus;
}

export class AddDevicesToBatchDto {
  @ApiProperty({
    type: [String],
    description: 'Array of device IDs to add to batch',
    example: ['IM100044'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  deviceIds: string[];
}

export class RemoveDevicesFromBatchDto {
  @ApiProperty({
    type: [String],
    description: 'Array of device IDs to remove from batch',
    example: ['IM100044'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  deviceIds: string[];
}

export class DeviceBatchQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: DeviceBatchType, description: 'Filter by batch type' })
  @IsEnum(DeviceBatchType)
  @IsOptional()
  type?: DeviceBatchType;

  @ApiPropertyOptional({ enum: DeviceBatchStatus, description: 'Filter by batch status' })
  @IsEnum(DeviceBatchStatus)
  @IsOptional()
  status?: DeviceBatchStatus;
}

export class CandidateDevicesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: DeviceBatchType,
    description: 'Batch type context: if EXCLUSIVE, filters out devices in active exclusive batches',
  })
  @IsEnum(DeviceBatchType)
  @IsOptional()
  batchType?: DeviceBatchType;

  @ApiPropertyOptional({ description: 'Exclude a specific target batch ID when editing existing batch' })
  @IsString()
  @IsOptional()
  targetBatchId?: string;
}

