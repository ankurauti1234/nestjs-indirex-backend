import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth } from '@nestjs/swagger';
import { DeviceEventsService } from './device-events.service.js';
import { DeviceEventQueryDto } from './dto/device-event-query.dto.js';
import { RequirePermission } from '../auth/decorators/require-permission.decorator.js';

@ApiTags('Device Events')
@ApiCookieAuth('auth_session')
@Controller('device-events')
export class DeviceEventsController {
  constructor(private readonly deviceEventsService: DeviceEventsService) {}

  @Get()
  @RequirePermission('events:read')
  @ApiOperation({ summary: 'Get device events with search filters and pagination (latest on top)' })
  @ApiResponse({ status: 200, description: 'Return paginated list of device events' })
  async findAll(@Query() queryDto: DeviceEventQueryDto) {
    return this.deviceEventsService.findAll(queryDto);
  }

  @Get(':id')
  @RequirePermission('events:read')
  @ApiOperation({ summary: 'Get single device event detail by ID' })
  @ApiResponse({ status: 200, description: 'Return device event details' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async findOne(@Param('id') id: string) {
    return this.deviceEventsService.findOne(id);
  }
}
