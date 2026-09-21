import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Region } from '../database/entities/region.entity.js';
import { CreateRegionDto, UpdateRegionDto } from './dto/region.dto.js';

@Injectable()
export class RegionsService {
  constructor(
    @InjectRepository(Region)
    private readonly regionRepository: Repository<Region>,
  ) {}

  async findAll(): Promise<Region[]> {
    return this.regionRepository.find({
      order: { id: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Region> {
    const region = await this.regionRepository.findOne({ where: { id } });
    if (!region) {
      throw new NotFoundException(`Region with ID ${id} not found`);
    }
    return region;
  }

  async create(createDto: CreateRegionDto): Promise<Region> {
    const existing = await this.regionRepository.findOne({ where: { name: createDto.name } });
    if (existing) {
      throw new ConflictException(`Region with name "${createDto.name}" already exists`);
    }

    const region = this.regionRepository.create(createDto);
    return this.regionRepository.save(region);
  }

  async update(id: number, updateDto: UpdateRegionDto): Promise<Region> {
    const region = await this.findOne(id);

    if (updateDto.name && updateDto.name !== region.name) {
      const existing = await this.regionRepository.findOne({ where: { name: updateDto.name } });
      if (existing) {
        throw new ConflictException(`Region with name "${updateDto.name}" already exists`);
      }
    }

    Object.assign(region, updateDto);
    return this.regionRepository.save(region);
  }

  async remove(id: number): Promise<{ message: string }> {
    const region = await this.findOne(id);
    await this.regionRepository.remove(region);
    return { message: `Region "${region.name}" deleted successfully` };
  }
}

