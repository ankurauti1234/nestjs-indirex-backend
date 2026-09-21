import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRegionDto {
  @ApiProperty({ description: 'Region name (e.g. Yerevan Central, Shirak, Lori)', example: 'Yerevan Central' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: 'Region code (e.g. AM-YEV)', example: 'AM-YEV' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  code?: string;

  @ApiPropertyOptional({ description: 'Detailed description of region coverage' })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateRegionDto {
  @ApiPropertyOptional({ description: 'Region name' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Region code' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  code?: string;

  @ApiPropertyOptional({ description: 'Detailed description' })
  @IsString()
  @IsOptional()
  description?: string;
}

