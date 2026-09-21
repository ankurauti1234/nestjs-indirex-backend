import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventType } from '../database/entities/event-type.entity.js';
import { CreateEventTypeDto, UpdateEventTypeDto } from './dto/event-type.dto.js';

@Injectable()
export class EventTypesService {
  constructor(
    @InjectRepository(EventType)
    private readonly eventTypeRepository: Repository<EventType>,
  ) {}

  async findAll(): Promise<EventType[]> {
    return this.eventTypeRepository.find({
      order: { id: 'ASC' },
    });
  }

  async findOne(id: number): Promise<EventType> {
    const eventType = await this.eventTypeRepository.findOne({ where: { id } });
    if (!eventType) {
      throw new NotFoundException(`Event type with ID ${id} not found`);
    }
    return eventType;
  }

  async create(createDto: CreateEventTypeDto): Promise<EventType> {
    const existing = await this.eventTypeRepository.findOne({ where: { name: createDto.name } });
    if (existing) {
      throw new ConflictException(`Event type with name "${createDto.name}" already exists`);
    }

    const eventType = this.eventTypeRepository.create(createDto);
    return this.eventTypeRepository.save(eventType);
  }

  async update(id: number, updateDto: UpdateEventTypeDto): Promise<EventType> {
    const eventType = await this.findOne(id);

    if (updateDto.name && updateDto.name !== eventType.name) {
      const existing = await this.eventTypeRepository.findOne({ where: { name: updateDto.name } });
      if (existing) {
        throw new ConflictException(`Event type with name "${updateDto.name}" already exists`);
      }
    }

    Object.assign(eventType, updateDto);
    return this.eventTypeRepository.save(eventType);
  }

  async remove(id: number): Promise<{ message: string }> {
    const eventType = await this.findOne(id);
    await this.eventTypeRepository.remove(eventType);
    return { message: `Event type "${eventType.name}" deleted successfully` };
  }
}

