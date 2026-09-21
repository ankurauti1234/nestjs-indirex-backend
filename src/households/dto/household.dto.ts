import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { Gender } from '../../database/entities/household-member.entity.js';

export class HouseholdQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter households by region' })
  @IsOptional()
  @IsString()
  region?: string;
}

export class HouseholdMemberQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: Gender, description: 'Filter household members by gender' })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;
}

