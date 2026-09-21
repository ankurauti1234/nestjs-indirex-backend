import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth } from '@nestjs/swagger';
import { RegionsService } from './regions.service.js';
import { CreateRegionDto, UpdateRegionDto } from './dto/region.dto.js';
import { RequirePermission } from '../auth/decorators/require-permission.decorator.js';

@ApiTags('Regions')
@ApiCookieAuth('auth_session')
@Controller('regions')
export class RegionsController {
  constructor(private readonly regionsService: RegionsService) {}

  @Get()
  @RequirePermission('regions:read')
  @ApiOperation({ summary: 'Get all regions (Unpaginated for UI dropdowns)' })
  @ApiResponse({ status: 200, description: 'Return list of all regions' })
  async findAll() {
    return this.regionsService.findAll();
  }

  @Get(':id')
  @RequirePermission('regions:read')
  @ApiOperation({ summary: 'Get single region details by ID' })
  @ApiResponse({ status: 200, description: 'Return region detail' })
  @ApiResponse({ status: 404, description: 'Region not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.regionsService.findOne(id);
  }

  @Post()
  @RequirePermission('regions:write')
  @ApiOperation({ summary: 'Create new region (Admin, SuperAdmin & Developer allowed)' })
  @ApiResponse({ status: 201, description: 'Region created successfully' })
  @ApiResponse({ status: 409, description: 'Conflict: Region name already exists' })
  async create(@Body() createDto: CreateRegionDto) {
    return this.regionsService.create(createDto);
  }

  @Patch(':id')
  @RequirePermission('regions:write')
  @ApiOperation({ summary: 'Update region details by ID' })
  @ApiResponse({ status: 200, description: 'Region updated successfully' })
  @ApiResponse({ status: 404, description: 'Region not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateRegionDto,
  ) {
    return this.regionsService.update(id, updateDto);
  }

  @Delete(':id')
  @RequirePermission('regions:write')
  @ApiOperation({ summary: 'Delete region by ID' })
  @ApiResponse({ status: 200, description: 'Region deleted successfully' })
  @ApiResponse({ status: 404, description: 'Region not found' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.regionsService.remove(id);
  }
}

