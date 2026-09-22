import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HouseholdDeviceAction } from '../../database/entities/household-device-history.entity.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

export class CreateHouseholdDeviceHistoryDto {
  @ApiPropertyOptional({
    description: 'TV Set ID within household (e.g. TV1)',
    example: 'TV1',
  })
  @IsString()
  @IsOptional()
  tvId?: string;

  @ApiProperty({
    description: 'Target hardware device ID being deployed/removed',
    example: 'IM100042',
  })
  @IsString()
  deviceId: string;

  @ApiPropertyOptional({
    description: 'Device ID being replaced (if actionType is REPLACED)',
    example: 'IM100041',
  })
  @IsString()
  @IsOptional()
  previousDeviceId?: string;

  @ApiPropertyOptional({
    description: 'Installation action type',
    enum: HouseholdDeviceAction,
    default: HouseholdDeviceAction.INSTALLED,
  })
  @IsEnum(HouseholdDeviceAction)
  @IsOptional()
  actionType?: HouseholdDeviceAction;

  @ApiPropertyOptional({
    description: 'Timestamp when action occurred',
    example: '2026-09-22T10:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  actionDate?: string;

  @ApiPropertyOptional({
    description: 'Reason for action (e.g. Faulty power unit, Initial setup)',
    example: 'Initial setup',
  })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({
    description: 'Field Executive ID who performed the action',
    example: 'FE1001',
  })
  @IsString()
  @IsOptional()
  fieldExecutiveId?: string;

  @ApiPropertyOptional({
    description: 'Additional diagnostic metadata or notes',
  })
  @IsObject()
  @IsOptional()
  notes?: Record<string, any>;
}

export class HouseholdHistoryQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by TV Set ID (e.g. TV1)',
    example: 'TV1',
  })
  @IsString()
  @IsOptional()
  tvId?: string;

  @ApiPropertyOptional({
    description: 'Filter by Device ID (e.g. IM100042)',
    example: 'IM100042',
  })
  @IsString()
  @IsOptional()
  deviceId?: string;

  @ApiPropertyOptional({
    description: 'Filter by Action Type',
    enum: HouseholdDeviceAction,
  })
  @IsEnum(HouseholdDeviceAction)
  @IsOptional()
  actionType?: HouseholdDeviceAction;

  @ApiPropertyOptional({
    description: 'Start date filter (ISO string)',
    example: '2026-01-01T00:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date filter (ISO string)',
    example: '2026-12-31T23:59:59Z',
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;
}
