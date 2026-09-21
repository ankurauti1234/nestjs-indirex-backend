import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Param,
  Query,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth } from '@nestjs/swagger';
import { RbacService } from './rbac.service.js';
import { RequirePermission } from '../auth/decorators/require-permission.decorator.js';
import {
  CreateRoleDto,
  UpdateRoleDto,
  SetRolePermissionsDto,
  AddRolePermissionDto,
  CreatePermissionDto,
  UpdatePermissionDto,
  SetUserRolesDto,
  RoleQueryDto,
  PermissionQueryDto,
} from './dto/rbac.dto.js';

@ApiTags('RBAC - Role & Permission Management')
@ApiCookieAuth('auth_session')
@Controller()
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  // --- Roles APIs ---
  @Get('roles')
  @RequirePermission('roles:read')
  @ApiOperation({ summary: 'List all roles with pagination and search (Requires roles:read permission)' })
  @ApiResponse({ status: 200, description: 'Paginated list of roles' })
  async getRoles(@Query() queryDto: RoleQueryDto) {
    return this.rbacService.getRoles(queryDto);
  }

  @Post('roles')
  @RequirePermission('roles:write')
  @ApiOperation({ summary: 'Create a new role (Requires roles:write permission)' })
  @ApiResponse({ status: 201, description: 'Role created' })
  async createRole(@Body() dto: CreateRoleDto) {
    return this.rbacService.createRole(dto);
  }

  @Get('roles/:id')
  @RequirePermission('roles:read')
  @ApiOperation({ summary: 'Get role details by ID (Requires roles:read permission)' })
  @ApiResponse({ status: 200, description: 'Role details with permissions' })
  async getRole(@Param('id', ParseUUIDPipe) id: string) {
    return this.rbacService.getRole(id);
  }

  @Patch('roles/:id')
  @RequirePermission('roles:write')
  @ApiOperation({ summary: 'Update a role (Requires roles:write permission)' })
  @ApiResponse({ status: 200, description: 'Role updated' })
  async updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.rbacService.updateRole(id, dto);
  }

  @Delete('roles/:id')
  @RequirePermission('roles:delete')
  @ApiOperation({ summary: 'Delete/deactivate a role (Requires roles:delete permission)' })
  @ApiResponse({ status: 200, description: 'Role deleted' })
  async deleteRole(@Param('id', ParseUUIDPipe) id: string) {
    return this.rbacService.deleteRole(id);
  }

  // --- Role Permissions APIs ---
  @Get('roles/:id/permissions')
  @RequirePermission('roles:read')
  @ApiOperation({ summary: 'Get permissions assigned to a role (Requires roles:read permission)' })
  @ApiResponse({ status: 200, description: 'List of permissions assigned to role' })
  async getRolePermissions(@Param('id', ParseUUIDPipe) id: string) {
    return this.rbacService.getRolePermissions(id);
  }

  @Put('roles/:id/permissions')
  @RequirePermission('roles:write')
  @ApiOperation({ summary: 'Replace permissions assigned to a role (Requires roles:write permission)' })
  @ApiResponse({ status: 200, description: 'Role permissions replaced' })
  async setRolePermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetRolePermissionsDto,
  ) {
    return this.rbacService.setRolePermissions(id, dto);
  }

  @Post('roles/:id/permissions')
  @RequirePermission('roles:write')
  @ApiOperation({ summary: 'Add a permission to a role (Requires roles:write permission)' })
  @ApiResponse({ status: 201, description: 'Permission added to role' })
  async addRolePermission(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddRolePermissionDto,
  ) {
    return this.rbacService.addRolePermission(id, dto);
  }

  @Delete('roles/:id/permissions/:permissionId')
  @RequirePermission('roles:write')
  @ApiOperation({ summary: 'Remove a permission from a role (Requires roles:write permission)' })
  @ApiResponse({ status: 200, description: 'Permission removed from role' })
  async removeRolePermission(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('permissionId', ParseUUIDPipe) permissionId: string,
  ) {
    return this.rbacService.removeRolePermission(id, permissionId);
  }

  // --- Permissions APIs ---
  @Get('permissions')
  @RequirePermission('permissions:read')
  @ApiOperation({ summary: 'List available permissions with pagination and search (Requires permissions:read permission)' })
  @ApiResponse({ status: 200, description: 'Paginated list of permissions' })
  async getPermissions(@Query() queryDto: PermissionQueryDto) {
    return this.rbacService.getPermissions(queryDto);
  }

  @Post('permissions')
  @RequirePermission('permissions:write')
  @ApiOperation({ summary: 'Create a permission dynamically (Requires permissions:write permission)' })
  @ApiResponse({ status: 201, description: 'Permission created' })
  async createPermission(@Body() dto: CreatePermissionDto) {
    return this.rbacService.createPermission(dto);
  }

  @Patch('permissions/:id')
  @RequirePermission('permissions:write')
  @ApiOperation({ summary: 'Update a permission (Requires permissions:write permission)' })
  @ApiResponse({ status: 200, description: 'Permission updated' })
  async updatePermission(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePermissionDto,
  ) {
    return this.rbacService.updatePermission(id, dto);
  }

  @Delete('permissions/:id')
  @RequirePermission('permissions:delete')
  @ApiOperation({ summary: 'Delete/deactivate a permission (Requires permissions:delete permission)' })
  @ApiResponse({ status: 200, description: 'Permission deleted' })
  async deletePermission(@Param('id', ParseUUIDPipe) id: string) {
    return this.rbacService.deletePermission(id);
  }

  // --- User Roles APIs ---
  @Get('users/:id/roles')
  @RequirePermission('roles:read')
  @ApiOperation({ summary: 'Get user assigned roles (Requires roles:read permission)' })
  @ApiResponse({ status: 200, description: 'List of roles assigned to user' })
  async getUserRoles(@Param('id', ParseUUIDPipe) id: string) {
    return this.rbacService.getUserRoles(id);
  }

  @Put('users/:id/roles')
  @RequirePermission('roles:write')
  @ApiOperation({ summary: 'Replace user assigned roles (Requires roles:write permission)' })
  @ApiResponse({ status: 200, description: 'User roles replaced' })
  async setUserRoles(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetUserRolesDto,
  ) {
    return this.rbacService.setUserRoles(id, dto);
  }

  @Post('users/:id/roles/:roleId')
  @RequirePermission('roles:write')
  @ApiOperation({ summary: 'Assign a role to a user (Requires roles:write permission)' })
  @ApiResponse({ status: 201, description: 'Role assigned to user' })
  async assignUserRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
  ) {
    return this.rbacService.assignUserRole(id, roleId);
  }

  @Delete('users/:id/roles/:roleId')
  @RequirePermission('roles:write')
  @ApiOperation({ summary: 'Remove a role from a user (Requires roles:write permission)' })
  @ApiResponse({ status: 200, description: 'Role removed from user' })
  async removeUserRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
  ) {
    return this.rbacService.removeUserRole(id, roleId);
  }
}
