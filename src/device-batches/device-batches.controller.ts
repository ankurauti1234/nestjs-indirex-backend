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
import { DeviceBatchesService } from './device-batches.service.js';
import { RequirePermission } from '../auth/decorators/require-permission.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import {
  CreateDeviceBatchDto,
  UpdateDeviceBatchDto,
  AddDevicesToBatchDto,
  RemoveDevicesFromBatchDto,
  DeviceBatchQueryDto,
  CandidateDevicesQueryDto,
} from './dto/device-batch.dto.js';

@ApiTags('Device Batches')
@ApiCookieAuth('auth_session')
@Controller('device-batches')
export class DeviceBatchesController {
  constructor(private readonly batchesService: DeviceBatchesService) {}

  @Post()
  @RequirePermission('device_batches:write')
  @ApiOperation({ summary: 'Create a new device batch (SHARED, EXCLUSIVE, or GLOBAL)' })
  @ApiResponse({ status: 201, description: 'Device batch successfully created' })
  @ApiResponse({ status: 403, description: 'Forbidden (e.g. non-admin attempting GLOBAL batch creation)' })
  @ApiResponse({ status: 409, description: 'Conflict (batchId already exists or exclusive device conflict)' })
  async create(
    @Body() createDto: CreateDeviceBatchDto,
    @CurrentUser() user: any,
  ) {
    return this.batchesService.create(createDto, user);
  }

  @Get()
  @RequirePermission('device_batches:read')
  @ApiOperation({ summary: 'List all device batches with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Paginated device batch list returned' })
  async findAll(@Query() queryDto: DeviceBatchQueryDto) {
    return this.batchesService.findAll(queryDto);
  }

  @Get('candidates')
  @RequirePermission('device_batches:read')
  @ApiOperation({
    summary: 'Get candidate devices available for selection (excludes active EXCLUSIVE devices if batchType=EXCLUSIVE)',
  })
  @ApiResponse({ status: 200, description: 'Paginated candidate devices list returned' })
  async getCandidateDevices(@Query() queryDto: CandidateDevicesQueryDto) {
    return this.batchesService.getCandidateDevices(queryDto);
  }

  @Get(':id')
  @RequirePermission('device_batches:read')
  @ApiOperation({ summary: 'Get single device batch details by ID or batchId' })
  @ApiResponse({ status: 200, description: 'Device batch details returned' })
  @ApiResponse({ status: 404, description: 'Device batch not found' })
  async findOne(@Param('id') id: string) {
    return this.batchesService.findOne(id);
  }

  @Get(':id/devices')
  @RequirePermission('device_batches:read')
  @ApiOperation({ summary: 'List devices assigned to a specific batch with pagination' })
  @ApiResponse({ status: 200, description: 'Paginated batch devices list returned' })
  async getBatchDevices(
    @Param('id') id: string,
    @Query() queryDto: CandidateDevicesQueryDto,
  ) {
    return this.batchesService.getBatchDevices(id, queryDto);
  }

  @Post(':id/devices')
  @RequirePermission('device_batches:write')
  @ApiOperation({ summary: 'Add devices to an existing device batch' })
  @ApiResponse({ status: 200, description: 'Devices added to batch successfully' })
  @ApiResponse({ status: 409, description: 'Exclusive batch conflict' })
  async addDevices(
    @Param('id') id: string,
    @Body() dto: AddDevicesToBatchDto,
    @CurrentUser() user: any,
  ) {
    return this.batchesService.addDevices(id, dto, user);
  }

  @Delete(':id/devices')
  @Post(':id/devices/remove')
  @RequirePermission('device_batches:write')
  @ApiOperation({ summary: 'Remove devices from a device batch' })
  @ApiResponse({ status: 200, description: 'Devices removed from batch successfully' })
  async removeDevices(
    @Param('id') id: string,
    @Body() dto: RemoveDevicesFromBatchDto,
    @CurrentUser() user: any,
  ) {
    return this.batchesService.removeDevices(id, dto, user);
  }

  @Patch(':id')
  @RequirePermission('device_batches:write')
  @ApiOperation({ summary: 'Update device batch metadata (name, description, status)' })
  @ApiResponse({ status: 200, description: 'Device batch updated successfully' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateDeviceBatchDto,
    @CurrentUser() user: any,
  ) {
    return this.batchesService.update(id, updateDto, user);
  }

  @Delete(':id')
  @RequirePermission('device_batches:write')
  @ApiOperation({ summary: 'Delete a device batch' })
  @ApiResponse({ status: 200, description: 'Device batch deleted successfully' })
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.batchesService.remove(id, user);
  }
}
