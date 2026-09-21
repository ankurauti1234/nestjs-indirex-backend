import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceEvent } from '../database/entities/device-event.entity.js';
import { DeviceEventQueryDto } from './dto/device-event-query.dto.js';
import { paginateQueryBuilder } from '../common/utils/pagination.util.js';
import { PaginatedResult } from '../common/interfaces/api-response.interface.js';

@Injectable()
export class DeviceEventsService {
  constructor(
    @InjectRepository(DeviceEvent)
    private readonly deviceEventRepository: Repository<DeviceEvent>,
  ) {}

  async findAll(queryDto: DeviceEventQueryDto): Promise<PaginatedResult<DeviceEvent>> {
    const qb = this.deviceEventRepository.createQueryBuilder('event')
      .leftJoinAndSelect('event.eventType', 'eventType');

    if (queryDto.hhId) {
      qb.andWhere('event.hhId = :hhId', { hhId: queryDto.hhId });
    }

    if (queryDto.deviceId) {
      qb.andWhere('event.deviceId = :deviceId', { deviceId: queryDto.deviceId });
    }

    if (queryDto.eventTypeId !== undefined) {
      qb.andWhere('event.eventTypeId = :eventTypeId', { eventTypeId: queryDto.eventTypeId });
    }

    if (queryDto.eventTypeKey) {
      qb.andWhere('event.eventTypeKey = :eventTypeKey', { eventTypeKey: queryDto.eventTypeKey });
    }

    if (queryDto.startDate) {
      qb.andWhere('event.recordedAt >= :startDate', { startDate: new Date(queryDto.startDate) });
    }

    if (queryDto.endDate) {
      qb.andWhere('event.recordedAt <= :endDate', { endDate: new Date(queryDto.endDate) });
    }

    if (queryDto.search) {
      qb.andWhere(
        '(event.hhId LIKE :search OR event.deviceId LIKE :search OR event.eventTypeKey LIKE :search)',
        { search: `%${queryDto.search}%` },
      );
    }

    // Default order: latest on top (recordedAt DESC)
    const allowedSortFields = ['recordedAt', 'createdAt', 'hhId', 'deviceId', 'eventTypeId'];
    const requestedSortBy = queryDto.sortBy && queryDto.sortBy !== 'createdAt' ? queryDto.sortBy : 'recordedAt';
    const sortBy = allowedSortFields.includes(requestedSortBy) ? requestedSortBy : 'recordedAt';
    const sortOrder = queryDto.sortOrder === 'ASC' ? 'ASC' : 'DESC';

    qb.orderBy(`event.${sortBy}`, sortOrder);

    return paginateQueryBuilder(qb, queryDto);
  }

  async findOne(id: string): Promise<DeviceEvent> {
    const event = await this.deviceEventRepository.findOne({
      where: { id },
      relations: { eventType: true },
    });

    if (!event) {
      throw new NotFoundException(`Device event with ID "${id}" not found`);
    }

    return event;
  }
}

