import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, SelectQueryBuilder } from 'typeorm';
import {
  DeviceBatch,
  DeviceBatchType,
  DeviceBatchStatus,
} from '../database/entities/device-batch.entity.js';
import { DeviceBatchItem } from '../database/entities/device-batch-item.entity.js';
import { Device } from '../database/entities/device.entity.js';
import { User } from '../database/entities/user.entity.js';
import {
  CreateDeviceBatchDto,
  UpdateDeviceBatchDto,
  AddDevicesToBatchDto,
  RemoveDevicesFromBatchDto,
  DeviceBatchQueryDto,
  CandidateDevicesQueryDto,
} from './dto/device-batch.dto.js';
import {
  paginateQueryBuilder,
} from '../common/utils/pagination.util.js';
import { PaginatedResult } from '../common/interfaces/api-response.interface.js';

@Injectable()
export class DeviceBatchesService {
  constructor(
    @InjectRepository(DeviceBatch)
    private readonly batchRepository: Repository<DeviceBatch>,
    @InjectRepository(DeviceBatchItem)
    private readonly batchItemRepository: Repository<DeviceBatchItem>,
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Helper to check if user is Admin or SuperAdmin
   */
  private isAdminUser(user?: any): boolean {
    if (!user) return false;

    if (Array.isArray(user.roles)) {
      const hasAdminRole = user.roles.some(
        (r: any) => (r.name || r) === 'Super Admin' || (r.name || r) === 'Admin',
      );
      if (hasAdminRole) return true;
    }

    const roleName = user.role?.name || user.roleName;
    if (roleName === 'Super Admin' || roleName === 'Admin') return true;

    if (Array.isArray(user.permissions)) {
      return user.permissions.some(
        (p: any) => (p.name || p) === 'device_batches:write_global',
      );
    }
    return false;
  }

  /**
   * Auto-generate next batchId code (BAT1001, BAT1002, ...)
   */
  private async generateNextBatchId(): Promise<string> {
    const rawResult = await this.batchRepository
      .createQueryBuilder('batch')
      .select('batch.batch_id', 'batchId')
      .where("batch.batch_id LIKE 'BAT%'")
      .getRawMany();

    let maxNum = 1000;
    for (const row of rawResult) {
      if (row.batchId) {
        const match = row.batchId.match(/^BAT(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }
    }
    return `BAT${maxNum + 1}`;
  }

  /**
   * Check for exclusive batch device conflicts
   */
  private async validateExclusiveConflict(
    deviceIds: string[],
    currentBatchId?: string,
  ): Promise<void> {
    if (!deviceIds || deviceIds.length === 0) return;

    const qb = this.batchItemRepository
      .createQueryBuilder('item')
      .innerJoin('item.batch', 'batch')
      .where('item.device_id IN (:...deviceIds)', { deviceIds })
      .andWhere('batch.type = :exclusiveType', {
        exclusiveType: DeviceBatchType.EXCLUSIVE,
      })
      .andWhere('batch.status = :activeStatus', {
        activeStatus: DeviceBatchStatus.ACTIVE,
      });

    if (currentBatchId) {
      qb.andWhere('batch.id != :currentBatchId', { currentBatchId });
    }

    const conflicts = await qb.getMany();
    if (conflicts.length > 0) {
      const conflictingIds = Array.from(new Set(conflicts.map((c) => c.deviceId)));
      throw new ConflictException(
        `The following devices are already assigned to an active EXCLUSIVE batch: ${conflictingIds.join(', ')}`,
      );
    }
  }

  /**
   * Create a new Device Batch
   */
  async create(createDto: CreateDeviceBatchDto, user?: any): Promise<DeviceBatch> {
    const batchType = createDto.type || DeviceBatchType.SHARED;

    // Check GLOBAL permission
    if (batchType === DeviceBatchType.GLOBAL && !this.isAdminUser(user)) {
      throw new ForbiddenException(
        'Only Admin or SuperAdmin roles can create or manage GLOBAL device batches',
      );
    }

    // Auto generate batchId if not provided
    let batchId = createDto.batchId;
    if (!batchId) {
      batchId = await this.generateNextBatchId();
    } else {
      const existing = await this.batchRepository.findOne({ where: { batchId } });
      if (existing) {
        throw new ConflictException(`Device batch with batchId "${batchId}" already exists`);
      }
    }

    // Check device existence and EXCLUSIVE conflicts
    let targetDevices: Device[] = [];
    if (createDto.deviceIds && createDto.deviceIds.length > 0) {
      const uniqueDeviceIds = Array.from(new Set(createDto.deviceIds));
      targetDevices = await this.deviceRepository.findBy({
        deviceId: In(uniqueDeviceIds),
      });

      if (targetDevices.length !== uniqueDeviceIds.length) {
        const foundIds = new Set(targetDevices.map((d) => d.deviceId));
        const missingIds = uniqueDeviceIds.filter((id) => !foundIds.has(id));
        throw new NotFoundException(`Devices not found: ${missingIds.join(', ')}`);
      }

      if (batchType === DeviceBatchType.EXCLUSIVE) {
        await this.validateExclusiveConflict(uniqueDeviceIds);
      }
    }

    const batch = this.batchRepository.create({
      batchId,
      name: createDto.name,
      description: createDto.description,
      type: batchType,
      status: DeviceBatchStatus.ACTIVE,
      createdByUserId: user?.id || null,
      deviceCount: targetDevices.length,
    });

    const savedBatch = await this.batchRepository.save(batch);

    if (targetDevices.length > 0) {
      const items = targetDevices.map((d) =>
        this.batchItemRepository.create({
          batchId: savedBatch.id,
          deviceId: d.deviceId,
        }),
      );
      await this.batchItemRepository.save(items);
    }

    return this.findOne(savedBatch.id);
  }

  /**
   * List device batches (paginated)
   */
  async findAll(queryDto: DeviceBatchQueryDto): Promise<PaginatedResult<DeviceBatch>> {
    const qb = this.batchRepository.createQueryBuilder('batch');

    if (queryDto.type) {
      qb.andWhere('batch.type = :type', { type: queryDto.type });
    }

    if (queryDto.status) {
      qb.andWhere('batch.status = :status', { status: queryDto.status });
    }

    if (queryDto.search) {
      qb.andWhere(
        '(batch.name LIKE :search OR batch.batch_id LIKE :search OR batch.description LIKE :search)',
        { search: `%${queryDto.search}%` },
      );
    }

    const sortOrder = queryDto.sortOrder === 'ASC' ? 'ASC' : 'DESC';
    const sortBy = queryDto.sortBy ? `batch.${queryDto.sortBy}` : 'batch.createdAt';
    qb.orderBy(sortBy, sortOrder);

    return paginateQueryBuilder(qb, queryDto);
  }

  /**
   * Find a single batch by ID or batchId
   */
  async findOne(idOrBatchId: string): Promise<DeviceBatch> {
    const batch = await this.batchRepository.findOne({
      where: [{ id: idOrBatchId }, { batchId: idOrBatchId }],
      relations: { items: true, createdByUser: true },
    });

    if (!batch) {
      throw new NotFoundException(`Device batch "${idOrBatchId}" not found`);
    }

    return batch;
  }

  /**
   * Get candidate devices available for selection
   */
  async getCandidateDevices(
    queryDto: CandidateDevicesQueryDto,
  ): Promise<PaginatedResult<Device>> {
    const qb = this.deviceRepository.createQueryBuilder('device');

    // If batch type is EXCLUSIVE, exclude devices in active exclusive batches
    if (queryDto.batchType === DeviceBatchType.EXCLUSIVE) {
      const subQuery = this.batchItemRepository
        .createQueryBuilder('dbi')
        .innerJoin('dbi.batch', 'db')
        .select('dbi.device_id')
        .where('db.type = :exclusiveType', { exclusiveType: DeviceBatchType.EXCLUSIVE })
        .andWhere('db.status = :activeStatus', { activeStatus: DeviceBatchStatus.ACTIVE });

      if (queryDto.targetBatchId) {
        subQuery.andWhere('db.id != :targetBatchId', {
          targetBatchId: queryDto.targetBatchId,
        });
      }

      qb.andWhere(`device.device_id NOT IN (${subQuery.getQuery()})`);
      qb.setParameters(subQuery.getParameters());
    }

    if (queryDto.search) {
      qb.andWhere(
        '(device.device_name LIKE :search OR device.device_id LIKE :search OR device.cpu_serial LIKE :search)',
        { search: `%${queryDto.search}%` },
      );
    }

    const sortOrder = queryDto.sortOrder === 'ASC' ? 'ASC' : 'DESC';
    const sortBy = queryDto.sortBy ? `device.${queryDto.sortBy}` : 'device.createdAt';
    qb.orderBy(sortBy, sortOrder);

    return paginateQueryBuilder(qb, queryDto);
  }

  /**
   * List devices in a specific batch (paginated)
   */
  async getBatchDevices(
    batchId: string,
    queryDto: CandidateDevicesQueryDto,
  ): Promise<PaginatedResult<Device>> {
    const batch = await this.findOne(batchId);

    const qb = this.deviceRepository
      .createQueryBuilder('device')
      .innerJoin(DeviceBatchItem, 'item', 'item.device_id = device.device_id')
      .where('item.batch_id = :batchId', { batchId: batch.id });

    if (queryDto.search) {
      qb.andWhere(
        '(device.device_name LIKE :search OR device.device_id LIKE :search OR device.cpu_serial LIKE :search)',
        { search: `%${queryDto.search}%` },
      );
    }

    const sortOrder = queryDto.sortOrder === 'ASC' ? 'ASC' : 'DESC';
    const sortBy = queryDto.sortBy ? `device.${queryDto.sortBy}` : 'device.createdAt';
    qb.orderBy(sortBy, sortOrder);

    return paginateQueryBuilder(qb, queryDto);
  }

  /**
   * Add devices to a batch
   */
  async addDevices(
    batchId: string,
    dto: AddDevicesToBatchDto,
    user?: any,
  ): Promise<DeviceBatch> {
    const batch = await this.findOne(batchId);

    if (batch.type === DeviceBatchType.GLOBAL && !this.isAdminUser(user)) {
      throw new ForbiddenException(
        'Only Admin or SuperAdmin roles can manage GLOBAL device batches',
      );
    }

    const uniqueDeviceIds = Array.from(new Set(dto.deviceIds));
    const targetDevices = await this.deviceRepository.findBy({
      deviceId: In(uniqueDeviceIds),
    });

    if (targetDevices.length !== uniqueDeviceIds.length) {
      const foundIds = new Set(targetDevices.map((d) => d.deviceId));
      const missingIds = uniqueDeviceIds.filter((id) => !foundIds.has(id));
      throw new NotFoundException(`Devices not found: ${missingIds.join(', ')}`);
    }

    if (batch.type === DeviceBatchType.EXCLUSIVE) {
      await this.validateExclusiveConflict(uniqueDeviceIds, batch.id);
    }

    // Insert missing items
    const existingItems = await this.batchItemRepository.find({
      where: { batchId: batch.id, deviceId: In(uniqueDeviceIds) },
    });
    const existingDeviceIds = new Set(existingItems.map((i) => i.deviceId));

    const newItems = uniqueDeviceIds
      .filter((id) => !existingDeviceIds.has(id))
      .map((id) =>
        this.batchItemRepository.create({
          batchId: batch.id,
          deviceId: id,
        }),
      );

    if (newItems.length > 0) {
      await this.batchItemRepository.save(newItems);
    }

    // Update count
    const totalCount = await this.batchItemRepository.count({
      where: { batchId: batch.id },
    });
    await this.batchRepository.update(batch.id, { deviceCount: totalCount });

    return this.findOne(batch.id);
  }

  /**
   * Remove devices from a batch
   */
  async removeDevices(
    batchId: string,
    dto: RemoveDevicesFromBatchDto,
    user?: any,
  ): Promise<DeviceBatch> {
    const batch = await this.findOne(batchId);

    if (batch.type === DeviceBatchType.GLOBAL && !this.isAdminUser(user)) {
      throw new ForbiddenException(
        'Only Admin or SuperAdmin roles can manage GLOBAL device batches',
      );
    }

    if (dto.deviceIds && dto.deviceIds.length > 0) {
      const itemsToRemove = await this.batchItemRepository.find({
        where: { batchId: batch.id, deviceId: In(dto.deviceIds) },
      });
      if (itemsToRemove.length > 0) {
        await this.batchItemRepository.remove(itemsToRemove);
      }
    }

    const totalCount = await this.batchItemRepository.count({
      where: { batchId: batch.id },
    });
    await this.batchRepository.update(batch.id, { deviceCount: totalCount });

    return this.findOne(batch.id);
  }

  /**
   * Update batch metadata (name, description, status)
   */
  async update(
    batchId: string,
    dto: UpdateDeviceBatchDto,
    user?: any,
  ): Promise<DeviceBatch> {
    const batch = await this.findOne(batchId);

    if (batch.type === DeviceBatchType.GLOBAL && !this.isAdminUser(user)) {
      throw new ForbiddenException(
        'Only Admin or SuperAdmin roles can manage GLOBAL device batches',
      );
    }

    if (dto.name !== undefined) batch.name = dto.name;
    if (dto.description !== undefined) batch.description = dto.description;
    if (dto.status !== undefined) batch.status = dto.status;

    await this.batchRepository.save(batch);
    return this.findOne(batch.id);
  }

  /**
   * Remove / Delete a device batch
   */
  async remove(batchId: string, user?: any): Promise<{ success: boolean }> {
    const batch = await this.findOne(batchId);

    if (batch.type === DeviceBatchType.GLOBAL && !this.isAdminUser(user)) {
      throw new ForbiddenException(
        'Only Admin or SuperAdmin roles can delete GLOBAL device batches',
      );
    }

    await this.batchRepository.remove(batch);
    return { success: true };
  }
}
