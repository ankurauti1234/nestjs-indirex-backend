import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth } from '@nestjs/swagger';
import { UsersService } from './users.service.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { RequirePermission } from '../auth/decorators/require-permission.decorator.js';
import { CreateUserDto, UpdateProfileDto, UpdateUserDto, UserQueryDto } from './dto/user.dto.js';

@ApiTags('Users')
@ApiCookieAuth('auth_session')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @RequirePermission('users:write')
  @ApiOperation({ summary: 'Create a new user and assign roles (Requires users:write permission / Admin or Super Admin only)' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'User with email already exists' })
  @ApiResponse({ status: 403, description: 'Forbidden: Insufficient permissions' })
  async createUser(@Body() dto: CreateUserDto) {
    return this.usersService.createUser(dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({ status: 200, description: 'Returns active user profile' })
  async getProfile(@CurrentUser('id') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current authenticated user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Get()
  @RequirePermission('users:read')
  @ApiOperation({ summary: 'List all users with pagination and filters (Requires users:read permission)' })
  @ApiResponse({ status: 200, description: 'Paginated list of registered users' })
  @ApiResponse({ status: 403, description: 'Forbidden: Insufficient permissions' })
  async findAll(@Query() queryDto: UserQueryDto) {
    return this.usersService.findAll(queryDto);
  }

  @Get(':id')
  @RequirePermission('users:read')
  @ApiOperation({ summary: 'Get a user by ID (Requires users:read permission)' })
  @ApiResponse({ status: 200, description: 'Returns user details' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('users:write')
  @ApiOperation({ summary: 'Update a user by ID (Requires users:write permission)' })
  @ApiResponse({ status: 200, description: 'User details updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateUser(id, dto);
  }

  @Delete(':id')
  @RequirePermission('users:delete')
  @ApiOperation({ summary: 'Deactivate/delete a user (Requires users:delete permission)' })
  @ApiResponse({ status: 200, description: 'User deactivated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async removeUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.removeUser(id);
  }
}
