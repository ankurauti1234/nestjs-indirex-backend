import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateEventTypeDto {
  @ApiProperty({ description: 'Event type name/key (e.g. MEDIA_SPORTS_HIGHLIGHT)', example: 'MEDIA_SPORTS_HIGHLIGHT' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: 'Detailed explanation of event trigger' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Category grouping (e.g. media, system, device, network)' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  category?: string;
}

export class UpdateEventTypeDto {
  @ApiPropertyOptional({ description: 'Event type name/key' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Detailed explanation of event trigger' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Category grouping' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  category?: string;
}

