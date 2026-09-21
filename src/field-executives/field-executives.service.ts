import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  FieldExecutive,
  FieldExecutiveStatus,
} from '../database/entities/field-executive.entity.js';
import { Region } from '../database/entities/region.entity.js';
import {
  CreateFieldExecutiveDto,
  UpdateFieldExecutiveDto,
  UpdateFieldExecutiveStatusDto,
  FieldExecutiveQueryDto,
} from './dto/field-executive.dto.js';
import { paginateQueryBuilder } from '../common/utils/pagination.util.js';
import { PaginatedResult } from '../common/interfaces/api-response.interface.js';

@Injectable()
export class FieldExecutivesService {
  constructor(
    @InjectRepository(FieldExecutive)
    private readonly fieldExecutiveRepository: Repository<FieldExecutive>,
    @InjectRepository(Region)
    private readonly regionRepository: Repository<Region>,
  ) {}

  private async generateNextExecutiveId(): Promise<string> {
    const latest = await this.fieldExecutiveRepository.findOne({
      where: {},
      order: { createdAt: 'DESC' },
    });

    if (!latest || !latest.executiveId) {
      return 'FE1001';
    }

    const match = latest.executiveId.match(/^FE(\d+)$/i);
    if (match) {
      const nextNum = parseInt(match[1], 10) + 1;
      return `FE${nextNum}`;
    }

    return `FE${Date.now().toString().slice(-4)}`;
  }

  async findAll(queryDto: FieldExecutiveQueryDto): Promise<PaginatedResult<FieldExecutive>> {
    const qb = this.fieldExecutiveRepository
      .createQueryBuilder('exec')
      .leftJoinAndSelect('exec.regions', 'region');

    if (queryDto.status) {
      qb.andWhere('exec.status = :status', { status: queryDto.status });
    }

    if (queryDto.regionId) {
      qb.andWhere('region.id = :regionId', { regionId: queryDto.regionId });
    }

    if (queryDto.search) {
      qb.andWhere(
        '(exec.name LIKE :search OR exec.phone LIKE :search OR exec.email LIKE :search OR exec.executiveId LIKE :search)',
        { search: `%${queryDto.search}%` },
      );
    }

    const allowedSortFields = ['createdAt', 'name', 'executiveId', 'status'];
    const sortBy = allowedSortFields.includes(queryDto.sortBy || '') ? queryDto.sortBy! : 'createdAt';
    const sortOrder = queryDto.sortOrder === 'ASC' ? 'ASC' : 'DESC';

    qb.orderBy(`exec.${sortBy}`, sortOrder);

    return paginateQueryBuilder(qb, queryDto);
  }

  async findOne(idOrExecutiveId: string): Promise<FieldExecutive> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrExecutiveId);

    const where = isUuid
      ? { id: idOrExecutiveId }
      : { executiveId: idOrExecutiveId };

    const executive = await this.fieldExecutiveRepository.findOne({
      where,
      relations: { regions: true },
    });

    if (!executive) {
      throw new NotFoundException(`Field executive "${idOrExecutiveId}" not found`);
    }

    return executive;
  }

  async create(createDto: CreateFieldExecutiveDto): Promise<FieldExecutive> {
    // Unique phone check
    const existingPhone = await this.fieldExecutiveRepository.findOne({ where: { phone: createDto.phone } });
    if (existingPhone) {
      throw new ConflictException(`Field executive with phone "${createDto.phone}" already exists`);
    }

    // Unique email check if provided
    if (createDto.email) {
      const existingEmail = await this.fieldExecutiveRepository.findOne({ where: { email: createDto.email } });
      if (existingEmail) {
        throw new ConflictException(`Field executive with email "${createDto.email}" already exists`);
      }
    }

    const executiveId = createDto.executiveId || (await this.generateNextExecutiveId());

    // Fetch regions if provided
    let regions: Region[] = [];
    if (createDto.regionIds && createDto.regionIds.length > 0) {
      regions = await this.regionRepository.findBy({ id: In(createDto.regionIds) });
    }

    const executive = this.fieldExecutiveRepository.create({
      ...createDto,
      executiveId,
      regions,
    });

    return this.fieldExecutiveRepository.save(executive);
  }

  async update(id: string, updateDto: UpdateFieldExecutiveDto): Promise<FieldExecutive> {
    const executive = await this.findOne(id);

    if (updateDto.phone && updateDto.phone !== executive.phone) {
      const existingPhone = await this.fieldExecutiveRepository.findOne({ where: { phone: updateDto.phone } });
      if (existingPhone) {
        throw new ConflictException(`Field executive with phone "${updateDto.phone}" already exists`);
      }
    }

    if (updateDto.email && updateDto.email !== executive.email) {
      const existingEmail = await this.fieldExecutiveRepository.findOne({ where: { email: updateDto.email } });
      if (existingEmail) {
        throw new ConflictException(`Field executive with email "${updateDto.email}" already exists`);
      }
    }

    if (updateDto.regionIds) {
      if (updateDto.regionIds.length > 0) {
        executive.regions = await this.regionRepository.findBy({ id: In(updateDto.regionIds) });
      } else {
        executive.regions = [];
      }
    }

    Object.assign(executive, {
      name: updateDto.name ?? executive.name,
      phone: updateDto.phone ?? executive.phone,
      email: updateDto.email ?? executive.email,
      status: updateDto.status ?? executive.status,
    });

    return this.fieldExecutiveRepository.save(executive);
  }

  async updateStatus(id: string, dto: UpdateFieldExecutiveStatusDto): Promise<FieldExecutive> {
    const executive = await this.findOne(id);
    executive.status = dto.status;
    return this.fieldExecutiveRepository.save(executive);
  }

  async remove(id: string): Promise<{ message: string }> {
    const executive = await this.findOne(id);
    await this.fieldExecutiveRepository.remove(executive);
    return { message: `Field executive "${executive.name}" (${executive.executiveId}) deleted successfully` };
  }
}

