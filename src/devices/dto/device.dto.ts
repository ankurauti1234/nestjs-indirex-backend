import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeviceEnvironment, DeviceStatus } from '../../database/entities/device.entity.js';
import { CertStatus } from '../../database/entities/device-certificate.entity.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

export class CreateDeviceDto {
  @ApiPropertyOptional({ example: 'IM100042', description: 'Unique device identifier (auto-generated if omitted)' })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiProperty({ example: 'Substation Meter Alpha', description: 'Human-readable device name' })
  @IsNotEmpty()
  @IsString()
  deviceName: string;

  @ApiPropertyOptional({ example: 'CPU-SERIAL-99887766', description: 'Hardware CPU MCU serial number' })
  @IsOptional()
  @IsString()
  cpuSerial?: string;

  @ApiPropertyOptional({
    example: DeviceStatus.MANUFACTURED,
    enum: DeviceStatus,
    description: 'Initial device lifecycle status',
  })
  @IsOptional()
  @IsEnum(DeviceStatus)
  status?: DeviceStatus;

  @ApiPropertyOptional({
    example: DeviceEnvironment.DEVELOPMENT,
    enum: DeviceEnvironment,
    description: 'Deployment environment',
  })
  @IsOptional()
  @IsEnum(DeviceEnvironment)
  environment?: DeviceEnvironment;

  @ApiPropertyOptional({ example: '2026-09-15T12:00:00.000Z', description: 'Manufacturing timestamp' })
  @IsOptional()
  @IsDateString()
  manufacturedAt?: string;

  @ApiPropertyOptional({
    example: { location: 'Substation Bay 3', installer: 'Tech-A' },
    description: 'Additional device-specific metadata payload',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateDeviceStatusDto {
  @ApiProperty({
    example: DeviceStatus.ACTIVE,
    enum: DeviceStatus,
    description: 'Device lifecycle status',
  })
  @IsNotEmpty()
  @IsEnum(DeviceStatus)
  status: DeviceStatus;
}

export class UpdateDeviceDto {
  @ApiPropertyOptional({ example: 'Substation Meter Alpha Updated', description: 'Device name' })
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiPropertyOptional({ example: 'CPU-SERIAL-99887766-UPDATED', description: 'Hardware CPU serial' })
  @IsOptional()
  @IsString()
  cpuSerial?: string;

  @ApiPropertyOptional({
    example: DeviceStatus.VERIFIED,
    enum: DeviceStatus,
    description: 'Device status',
  })
  @IsOptional()
  @IsEnum(DeviceStatus)
  status?: DeviceStatus;

  @ApiPropertyOptional({
    example: DeviceEnvironment.PRODUCTION,
    enum: DeviceEnvironment,
    description: 'Deployment environment',
  })
  @IsOptional()
  @IsEnum(DeviceEnvironment)
  environment?: DeviceEnvironment;

  @ApiPropertyOptional({
    example: { location: 'Substation Bay 4' },
    description: 'Additional device metadata',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class CreateProvisioningTokenDto {
  @ApiPropertyOptional({ example: 'PROV-TOK-998877665544', description: 'Custom provisioning token (auto-generated if omitted)' })
  @IsOptional()
  @IsString()
  token?: string;

  @ApiPropertyOptional({ example: '948201', description: 'Manager OTP verification code' })
  @IsOptional()
  @IsString()
  otpCode?: string;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z', description: 'Expiration timestamp' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class CreateCertificateDto {
  @ApiProperty({ example: 'a1b2c3d4e5f67890', description: 'AWS IoT Certificate ID' })
  @IsNotEmpty()
  @IsString()
  certificateId: string;

  @ApiProperty({ example: 'arn:aws:iot:us-east-1:123456789012:cert/a1b2c3d4e5f67890', description: 'AWS IoT Certificate ARN' })
  @IsNotEmpty()
  @IsString()
  certificateArn: string;

  @ApiPropertyOptional({
    example: CertStatus.ACTIVE,
    enum: CertStatus,
    description: 'Certificate status',
  })
  @IsOptional()
  @IsEnum(CertStatus)
  status?: CertStatus;
}

export class DeviceQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: DeviceStatus, description: 'Filter by device status' })
  @IsEnum(DeviceStatus)
  @IsOptional()
  status?: DeviceStatus;

  @ApiPropertyOptional({ enum: DeviceEnvironment, description: 'Filter by deployment environment' })
  @IsEnum(DeviceEnvironment)
  @IsOptional()
  environment?: DeviceEnvironment;
}

