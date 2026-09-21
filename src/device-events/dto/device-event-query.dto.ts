import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

export class DeviceEventQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by Household ID (e.g. HH1000)' })
  @IsString()
  @IsOptional()
  hhId?: string;

  @ApiPropertyOptional({ description: 'Filter by Device ID (e.g. IM100042)' })
  @IsString()
  @IsOptional()
  deviceId?: string;

  @ApiPropertyOptional({ description: 'Filter by Event Type ID (integer e.g. 1)' })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  eventTypeId?: number;

  @ApiPropertyOptional({ description: 'Filter by Event Type Key (e.g. telemetry, alarm, tamper)' })
  @IsString()
  @IsOptional()
  eventTypeKey?: string;

  @ApiPropertyOptional({ description: 'Filter events on or after this ISO date-time string (e.g. 2026-09-01T00:00:00Z)' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Filter events on or before this ISO date-time string (e.g. 2026-09-30T23:59:59Z)' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ default: 'recordedAt', description: 'Field to sort by' })
  @IsString()
  @IsOptional()
  override sortBy?: string = 'recordedAt';
}

