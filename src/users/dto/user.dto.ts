import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  IsArray,
  IsUUID,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

export class UserQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by role name' })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}

export class CreateUserDto {
  @ApiProperty({ example: 'John Doe', description: 'User full name' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'john@example.com', description: 'User email address' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123!', description: 'User password (min 6 chars)' })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({
    example: ['a1b2c3d4-5678-90ab-cdef-1234567890ab'],
    description: 'Array of Role UUIDs to assign to the user',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  roleIds?: string[];

  @ApiPropertyOptional({ example: true, description: 'Active status of the user' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Email verification status' })
  @IsOptional()
  @IsBoolean()
  isEmailVerified?: boolean;
}

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'John Updated', description: 'User full name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'john.new@example.com', description: 'User email address' })
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'John Updated', description: 'User full name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'john.new@example.com', description: 'User email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: true, description: 'Active status of the user' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Email verification status' })
  @IsOptional()
  @IsBoolean()
  isEmailVerified?: boolean;
}
