import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth } from '@nestjs/swagger';
import { DevicesService } from './devices.service.js';
import { RequirePermission } from '../auth/decorators/require-permission.decorator.js';
import {
  CreateDeviceDto,
  UpdateDeviceStatusDto,
  UpdateDeviceDto,
  CreateProvisioningTokenDto,
  CreateCertificateDto,
  DeviceQueryDto,
} from './dto/device.dto.js';

@ApiTags('Devices')
@ApiCookieAuth('auth_session')
@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post()
  @RequirePermission('devices:create')
  @ApiOperation({ summary: 'Register/create a device (Requires devices:create permission)' })
  @ApiResponse({ status: 201, description: 'Device registered successfully' })
  @ApiResponse({ status: 400, description: 'Device with device_id or cpu_serial already exists' })
  @ApiResponse({ status: 403, description: 'Forbidden: Insufficient permissions' })
  async create(@Body() dto: CreateDeviceDto) {
    return this.devicesService.create(dto);
  }

  @Get()
  @RequirePermission('devices:read')
  @ApiOperation({ summary: 'List all devices with pagination and filters (Requires devices:read permission / Accessible by Developer, Admin, Super Admin)' })
  @ApiResponse({ status: 200, description: 'Paginated list of devices with operations, certificates, and provisioning tokens' })
  @ApiResponse({ status: 403, description: 'Forbidden: Insufficient permissions' })
  async findAll(@Query() queryDto: DeviceQueryDto) {
    return this.devicesService.findAll(queryDto);
  }

  @Get(':id')
  @RequirePermission('devices:read')
  @ApiOperation({ summary: 'Get device details by device_id (Requires devices:read permission)' })
  @ApiResponse({ status: 200, description: 'Device details' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  async findOne(@Param('id') id: string) {
    return this.devicesService.findOne(id);
  }

  @Patch(':id/status')
  @RequirePermission('devices:write_status')
  @ApiOperation({ summary: 'Change device lifecycle status (Requires devices:write_status permission)' })
  @ApiResponse({ status: 200, description: 'Device status updated' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  @ApiResponse({ status: 403, description: 'Forbidden: Insufficient permissions' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateDeviceStatusDto,
  ) {
    return this.devicesService.updateStatus(id, dto);
  }

  @Patch(':id')
  @RequirePermission('devices:write')
  @ApiOperation({ summary: 'Update device metadata & attributes (Requires devices:write permission)' })
  @ApiResponse({ status: 200, description: 'Device updated' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDeviceDto,
  ) {
    return this.devicesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('devices:delete')
  @ApiOperation({ summary: 'Delete/remove a device (Requires devices:delete permission)' })
  @ApiResponse({ status: 200, description: 'Device removed' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  async remove(@Param('id') id: string) {
    return this.devicesService.remove(id);
  }

  @Post(':id/tokens')
  @RequirePermission('devices:create')
  @ApiOperation({ summary: 'Issue a new provisioning/OTP token for a device' })
  @ApiResponse({ status: 201, description: 'Provisioning token issued' })
  async createProvisioningToken(
    @Param('id') id: string,
    @Body() dto: CreateProvisioningTokenDto,
  ) {
    return this.devicesService.createProvisioningToken(id, dto);
  }

  @Post(':id/certificates')
  @RequirePermission('devices:create')
  @ApiOperation({ summary: 'Register an AWS IoT Certificate for a device' })
  @ApiResponse({ status: 201, description: 'Certificate registered' })
  async createCertificate(
    @Param('id') id: string,
    @Body() dto: CreateCertificateDto,
  ) {
    return this.devicesService.createCertificate(id, dto);
  }
}
