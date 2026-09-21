import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth } from '@nestjs/swagger';
import { EventTypesService } from './event-types.service.js';
import { CreateEventTypeDto, UpdateEventTypeDto } from './dto/event-type.dto.js';
import { RequirePermission } from '../auth/decorators/require-permission.decorator.js';

@ApiTags('Event Types')
@ApiCookieAuth('auth_session')
@Controller('event-types')
export class EventTypesController {
  constructor(private readonly eventTypesService: EventTypesService) {}

  @Get()
  @RequirePermission('event_types:read')
  @ApiOperation({ summary: 'Get all event types (No pagination)' })
  @ApiResponse({ status: 200, description: 'Return complete array of event types' })
  async findAll() {
    return this.eventTypesService.findAll();
  }

  @Get(':id')
  @RequirePermission('event_types:read')
  @ApiOperation({ summary: 'Get single event type by ID' })
  @ApiResponse({ status: 200, description: 'Return event type detail' })
  @ApiResponse({ status: 404, description: 'Event type not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.eventTypesService.findOne(id);
  }

  @Post()
  @RequirePermission('event_types:write')
  @ApiOperation({ summary: 'Create new event type (Admin, SuperAdmin & Developer allowed)' })
  @ApiResponse({ status: 201, description: 'Event type created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden: Insufficient permissions' })
  @ApiResponse({ status: 409, description: 'Conflict: Event type name already exists' })
  async create(@Body() createDto: CreateEventTypeDto) {
    return this.eventTypesService.create(createDto);
  }

  @Patch(':id')
  @RequirePermission('event_types:write')
  @ApiOperation({ summary: 'Edit event type by ID (Admin, SuperAdmin & Developer allowed)' })
  @ApiResponse({ status: 200, description: 'Event type updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden: Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Event type not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateEventTypeDto,
  ) {
    return this.eventTypesService.update(id, updateDto);
  }

  @Delete(':id')
  @RequirePermission('event_types:write')
  @ApiOperation({ summary: 'Delete event type by ID (Admin, SuperAdmin & Developer allowed)' })
  @ApiResponse({ status: 200, description: 'Event type deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden: Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Event type not found' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.eventTypesService.remove(id);
  }
}

