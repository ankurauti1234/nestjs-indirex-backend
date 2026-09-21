import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth } from '@nestjs/swagger';
import { FieldExecutivesService } from './field-executives.service.js';
import {
  CreateFieldExecutiveDto,
  UpdateFieldExecutiveDto,
  UpdateFieldExecutiveStatusDto,
  FieldExecutiveQueryDto,
} from './dto/field-executive.dto.js';
import { RequirePermission } from '../auth/decorators/require-permission.decorator.js';

@ApiTags('Field Executives')
@ApiCookieAuth('auth_session')
@Controller('field-executives')
export class FieldExecutivesController {
  constructor(private readonly fieldExecutivesService: FieldExecutivesService) {}

  @Get()
  @RequirePermission('field_executives:read')
  @ApiOperation({ summary: 'List field executives with pagination, search, status, and region filters' })
  @ApiResponse({ status: 200, description: 'Paginated list of field executives' })
  async findAll(@Query() queryDto: FieldExecutiveQueryDto) {
    return this.fieldExecutivesService.findAll(queryDto);
  }

  @Get(':id')
  @RequirePermission('field_executives:read')
  @ApiOperation({ summary: 'Get single field executive details by UUID or executiveId (e.g. FE1001)' })
  @ApiResponse({ status: 200, description: 'Field executive detail' })
  @ApiResponse({ status: 404, description: 'Field executive not found' })
  async findOne(@Param('id') id: string) {
    return this.fieldExecutivesService.findOne(id);
  }

  @Post()
  @RequirePermission('field_executives:write')
  @ApiOperation({ summary: 'Create new field executive and assign regions (Admin, SuperAdmin & Developer allowed)' })
  @ApiResponse({ status: 201, description: 'Field executive created successfully' })
  @ApiResponse({ status: 409, description: 'Conflict: Phone or Email already exists' })
  async create(@Body() createDto: CreateFieldExecutiveDto) {
    return this.fieldExecutivesService.create(createDto);
  }

  @Patch(':id')
  @RequirePermission('field_executives:write')
  @ApiOperation({ summary: 'Update field executive profile or assigned regionIds' })
  @ApiResponse({ status: 200, description: 'Field executive updated successfully' })
  @ApiResponse({ status: 404, description: 'Field executive not found' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateFieldExecutiveDto,
  ) {
    return this.fieldExecutivesService.update(id, updateDto);
  }

  @Patch(':id/status')
  @RequirePermission('field_executives:write')
  @ApiOperation({ summary: 'Quick update status (ACTIVE, INACTIVE, ON_LEAVE, TERMINATED)' })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateFieldExecutiveStatusDto,
  ) {
    return this.fieldExecutivesService.updateStatus(id, dto);
  }

  @Delete(':id')
  @RequirePermission('field_executives:write')
  @ApiOperation({ summary: 'Delete field executive record' })
  @ApiResponse({ status: 200, description: 'Field executive deleted successfully' })
  async remove(@Param('id') id: string) {
    return this.fieldExecutivesService.remove(id);
  }
}

