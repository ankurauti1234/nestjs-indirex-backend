import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Device,
  DeviceStatus,
  DeviceEnvironment,
  DeviceProvisioningToken,
  DeviceCertificate,
  DeviceOperation,
  CertStatus,
} from '../database/entities/index.js';
import {
  CreateDeviceDto,
  UpdateDeviceStatusDto,
  UpdateDeviceDto,
  CreateProvisioningTokenDto,
  CreateCertificateDto,
  DeviceQueryDto,
} from './dto/device.dto.js';
import { paginateQueryBuilder } from '../common/utils/pagination.util.js';

import { HouseholdsService } from '../households/households.service.js';
import { HouseholdHistoryQueryDto } from '../households/dto/household-history.dto.js';

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,

    @InjectRepository(DeviceProvisioningToken)
    private readonly tokenRepository: Repository<DeviceProvisioningToken>,

    @InjectRepository(DeviceCertificate)
    private readonly certRepository: Repository<DeviceCertificate>,

    @InjectRepository(DeviceOperation)
    private readonly operationRepository: Repository<DeviceOperation>,

    private readonly householdsService: HouseholdsService,
  ) {}

  async create(dto: CreateDeviceDto) {
    const deviceId = dto.deviceId || `IM${Math.floor(100000 + Math.random() * 900000)}`;

    const existingDevice = await this.deviceRepository.findOne({
      where: { deviceId },
    });
    if (existingDevice) {
      throw new BadRequestException(
        `Device with device_id '${deviceId}' already exists`,
      );
    }

    if (dto.cpuSerial) {
      const existingCpu = await this.deviceRepository.findOne({
        where: { cpuSerial: dto.cpuSerial },
      });
      if (existingCpu) {
        throw new BadRequestException(
          `Device with cpu_serial '${dto.cpuSerial}' already exists`,
        );
      }
    }

    const device = this.deviceRepository.create({
      deviceId,
      deviceName: dto.deviceName,
      cpuSerial: dto.cpuSerial || undefined,
      status: dto.status || DeviceStatus.MANUFACTURED,
      environment: dto.environment || DeviceEnvironment.DEVELOPMENT,
      manufacturedAt: dto.manufacturedAt ? new Date(dto.manufacturedAt) : new Date(),
      metadata: dto.metadata || {},
    });

    const savedDevice = await this.deviceRepository.save(device);

    // Initialize corresponding DeviceOperation record
    const operation = this.operationRepository.create({
      deviceId: savedDevice.deviceId,
      lastSeenAt: new Date(),
    });
    await this.operationRepository.save(operation);

    return this.findOne(savedDevice.deviceId);
  }

  async findAll(queryDto: DeviceQueryDto = new DeviceQueryDto()) {
    const qb = this.deviceRepository.createQueryBuilder('device')
      .leftJoinAndSelect('device.operation', 'operation')
      .leftJoinAndSelect('device.certificates', 'certificates')
      .leftJoinAndSelect('device.provisioningTokens', 'provisioningTokens');

    if (queryDto.status) {
      qb.andWhere('device.status = :status', { status: queryDto.status });
    }

    if (queryDto.environment) {
      qb.andWhere('device.environment = :environment', { environment: queryDto.environment });
    }

    if (queryDto.search) {
      qb.andWhere(
        '(device.deviceId LIKE :search OR device.deviceName LIKE :search OR device.cpuSerial LIKE :search)',
        { search: `%${queryDto.search}%` },
      );
    }

    const sortOrder = queryDto.sortOrder === 'ASC' ? 'ASC' : 'DESC';
    const sortBy = queryDto.sortBy ? `device.${queryDto.sortBy}` : 'device.createdAt';
    qb.orderBy(sortBy, sortOrder);

    return paginateQueryBuilder(qb, queryDto);
  }

  async findOne(deviceId: string) {
    const device = await this.deviceRepository.findOne({
      where: { deviceId },
      relations: { operation: true, certificates: true, provisioningTokens: true },
    });

    if (!device) {
      throw new NotFoundException(`Device with device_id '${deviceId}' not found`);
    }

    return device;
  }

  async updateStatus(deviceId: string, dto: UpdateDeviceStatusDto) {
    const device = await this.findOne(deviceId);
    device.status = dto.status;

    if (dto.status === DeviceStatus.ACTIVE && device.operation) {
      if (!device.operation.activatedAt) {
        device.operation.activatedAt = new Date();
      }
      device.operation.lastSeenAt = new Date();
      await this.operationRepository.save(device.operation);
    }

    await this.deviceRepository.save(device);
    return this.findOne(deviceId);
  }

  async update(deviceId: string, dto: UpdateDeviceDto) {
    const device = await this.findOne(deviceId);

    if (dto.deviceName !== undefined) device.deviceName = dto.deviceName;
    if (dto.cpuSerial !== undefined) device.cpuSerial = dto.cpuSerial;
    if (dto.status !== undefined) device.status = dto.status;
    if (dto.environment !== undefined) device.environment = dto.environment;
    if (dto.metadata !== undefined) {
      device.metadata = { ...device.metadata, ...dto.metadata };
    }

    await this.deviceRepository.save(device);
    return this.findOne(deviceId);
  }

  async remove(deviceId: string) {
    const device = await this.findOne(deviceId);
    await this.deviceRepository.remove(device);
    return { message: `Device ${deviceId} removed successfully` };
  }

  async createProvisioningToken(deviceId: string, dto: CreateProvisioningTokenDto) {
    const device = await this.findOne(deviceId);
    const token = dto.token || `PROV-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    const expiresAt = dto.expiresAt
      ? new Date(dto.expiresAt)
      : new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hour default

    const provToken = this.tokenRepository.create({
      deviceId: device.deviceId,
      token,
      otpCode: dto.otpCode || undefined,
      expiresAt,
    });

    await this.tokenRepository.save(provToken);
    return this.findOne(deviceId);
  }

  async createCertificate(deviceId: string, dto: CreateCertificateDto) {
    const device = await this.findOne(deviceId);

    const cert = this.certRepository.create({
      deviceId: device.deviceId,
      certificateId: dto.certificateId,
      certificateArn: dto.certificateArn,
      status: dto.status || CertStatus.ACTIVE,
      issuedAt: new Date(),
    });

    await this.certRepository.save(cert);

    // Update operation status
    if (device.operation) {
      device.operation.provisionedAt = new Date();
      await this.operationRepository.save(device.operation);
    }

    return this.findOne(deviceId);
  }

  async recordHeartbeat(deviceId: string, ipAddress?: string) {
    let operation = await this.operationRepository.findOne({ where: { deviceId } });
    if (!operation) {
      operation = this.operationRepository.create({ deviceId });
    }
    operation.lastSeenAt = new Date();
    await this.operationRepository.save(operation);
  }

  async findInstallationHistory(
    deviceId: string,
    queryDto: HouseholdHistoryQueryDto = new HouseholdHistoryQueryDto(),
  ) {
    await this.findOne(deviceId);
    return this.householdsService.findDeviceInstallationHistory(deviceId, queryDto);
  }
}

