import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

export class RoleQueryDto extends PaginationQueryDto {}
export class PermissionQueryDto extends PaginationQueryDto {}

export class CreateRoleDto {
  @ApiProperty({ example: 'Manager', description: 'Unique role name' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Managerial role for team leads', description: 'Role description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: ['c6b7e123-4567-89ab-cdef-0123456789ab'], description: 'List of permission UUIDs' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  permissionIds?: string[];
}

export class UpdateRoleDto {
  @ApiPropertyOptional({ example: 'Senior Manager', description: 'Updated role name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Updated description', description: 'Updated role description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: true, description: 'Role active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SetRolePermissionsDto {
  @ApiProperty({ example: ['c6b7e123-4567-89ab-cdef-0123456789ab'], description: 'List of permission UUIDs to assign to role' })
  @IsArray()
  @IsUUID('4', { each: true })
  permissionIds: string[];
}

export class AddRolePermissionDto {
  @ApiProperty({ example: 'c6b7e123-4567-89ab-cdef-0123456789ab', description: 'Permission UUID to add to role' })
  @IsNotEmpty()
  @IsUUID('4')
  permissionId: string;
}

export class CreatePermissionDto {
  @ApiProperty({ example: 'reports:export', description: 'Unique permission name' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Export monthly reports', description: 'Permission description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'reports', description: 'Target resource' })
  @IsNotEmpty()
  @IsString()
  resource: string;

  @ApiProperty({ example: 'export', description: 'Target action' })
  @IsNotEmpty()
  @IsString()
  action: string;

  @ApiPropertyOptional({ example: 'GET', description: 'HTTP method constraint' })
  @IsOptional()
  @IsString()
  httpMethod?: string;

  @ApiPropertyOptional({ example: '/reports/export', description: 'API route path constraint' })
  @IsOptional()
  @IsString()
  routePath?: string;
}

export class UpdatePermissionDto {
  @ApiPropertyOptional({ example: 'reports:export', description: 'Permission name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Export monthly reports', description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'reports', description: 'Target resource' })
  @IsOptional()
  @IsString()
  resource?: string;

  @ApiPropertyOptional({ example: 'export', description: 'Target action' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ example: 'GET', description: 'HTTP method constraint' })
  @IsOptional()
  @IsString()
  httpMethod?: string;

  @ApiPropertyOptional({ example: '/reports/export', description: 'Route path' })
  @IsOptional()
  @IsString()
  routePath?: string;

  @ApiPropertyOptional({ example: true, description: 'Permission active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SetUserRolesDto {
  @ApiProperty({ example: ['a1b2c3d4-5678-90ab-cdef-1234567890ab'], description: 'List of role UUIDs' })
  @IsArray()
  @IsUUID('4', { each: true })
  roleIds: string[];
}
