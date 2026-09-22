import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Household,
  HouseholdMember,
  HouseholdTv,
  Device,
  Gender,
} from '../database/entities/index.js';
import {
  HouseholdQueryDto,
  HouseholdMemberQueryDto,
} from './dto/household.dto.js';
import {
  CreateHouseholdTvDto,
  UpdateHouseholdTvDto,
  HouseholdTvQueryDto,
} from './dto/household-tv.dto.js';
import { paginateQueryBuilder } from '../common/utils/pagination.util.js';

export const MAX_ALLOWED_TVS_PER_HOUSEHOLD = 5;

@Injectable()
export class HouseholdsService implements OnModuleInit {
  constructor(
    @InjectRepository(Household)
    private readonly householdRepository: Repository<Household>,
    @InjectRepository(HouseholdMember)
    private readonly memberRepository: Repository<HouseholdMember>,
    @InjectRepository(HouseholdTv)
    private readonly tvRepository: Repository<HouseholdTv>,
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
  ) {}

  async onModuleInit() {
    await this.seedInitialHouseholds();
  }

  private async seedInitialHouseholds() {
    const count = await this.householdRepository.count();
    if (count === 0) {
      // Seed initial households HH1000 (1 TV) and HH1001 (2 TVs)
      const hh1000 = this.householdRepository.create({
        hhId: 'HH1000',
        region: 'North Zone',
        totalTvs: 1,
        metadata: { district: 'Central' },
      });
      await this.householdRepository.save(hh1000);

      const hh1001 = this.householdRepository.create({
        hhId: 'HH1001',
        region: 'South Zone',
        totalTvs: 2,
        metadata: { district: 'Coastal' },
      });
      await this.householdRepository.save(hh1001);

      // Seed per-household members (M1, M2 per household)
      const m1 = this.memberRepository.create({
        hhId: 'HH1000',
        memberId: 'M1',
        dob: '1985-05-12',
        gender: Gender.MALE,
      });

      const m2 = this.memberRepository.create({
        hhId: 'HH1000',
        memberId: 'M2',
        dob: '1988-08-24',
        gender: Gender.FEMALE,
      });

      const m3 = this.memberRepository.create({
        hhId: 'HH1001',
        memberId: 'M1',
        dob: '1992-11-03',
        gender: Gender.FEMALE,
      });

      const m4 = this.memberRepository.create({
        hhId: 'HH1001',
        memberId: 'M2',
        dob: '1990-01-15',
        gender: Gender.MALE,
      });

      const m5 = this.memberRepository.create({
        hhId: 'HH1001',
        memberId: 'M3',
        dob: '2015-07-20',
        gender: Gender.MALE,
      });

      await this.memberRepository.save([m1, m2, m3, m4, m5]);

      // Seed TV sets: HH1000 gets 1 TV, HH1001 gets 2 TVs
      const tv1 = this.tvRepository.create({
        hhId: 'HH1000',
        tvId: 'TV1',
        location: 'Living Room',
        brand: 'Samsung',
        model: 'QLED 4K 55"',
        screenSizeInches: 55,
      });

      const tv2 = this.tvRepository.create({
        hhId: 'HH1001',
        tvId: 'TV1',
        location: 'Main Hall',
        brand: 'Sony',
        model: 'Bravia 65"',
        screenSizeInches: 65,
      });

      const tv3 = this.tvRepository.create({
        hhId: 'HH1001',
        tvId: 'TV2',
        location: 'Master Bedroom',
        brand: 'LG',
        model: 'OLED 43"',
        screenSizeInches: 43,
      });

      await this.tvRepository.save([tv1, tv2, tv3]);
    }
  }

  async findAll(queryDto: HouseholdQueryDto = new HouseholdQueryDto()) {
    const qb = this.householdRepository
      .createQueryBuilder('hh')
      .leftJoinAndSelect('hh.members', 'members')
      .leftJoinAndSelect('hh.tvs', 'tvs')
      .leftJoinAndSelect('tvs.installedDevice', 'installedDevice');

    if (queryDto.region) {
      qb.andWhere('hh.region = :region', { region: queryDto.region });
    }

    if (queryDto.search) {
      qb.andWhere('(hh.hhId LIKE :search OR hh.region LIKE :search)', {
        search: `%${queryDto.search}%`,
      });
    }

    const sortOrder = queryDto.sortOrder === 'ASC' ? 'ASC' : 'DESC';
    const sortBy = queryDto.sortBy ? `hh.${queryDto.sortBy}` : 'hh.createdAt';
    qb.orderBy(sortBy, sortOrder);

    return paginateQueryBuilder(qb, queryDto);
  }

  async findOne(hhId: string) {
    const household = await this.householdRepository.findOne({
      where: { hhId },
      relations: { members: true, tvs: { installedDevice: true } },
    });

    if (!household) {
      throw new NotFoundException(`Household with ID '${hhId}' not found`);
    }

    return household;
  }

  async findMembers(
    hhId: string,
    queryDto: HouseholdMemberQueryDto = new HouseholdMemberQueryDto(),
  ) {
    // Verify household exists
    await this.findOne(hhId);

    const qb = this.memberRepository
      .createQueryBuilder('member')
      .where('member.hhId = :hhId', { hhId });

    if (queryDto.gender) {
      qb.andWhere('member.gender = :gender', { gender: queryDto.gender });
    }

    if (queryDto.search) {
      qb.andWhere('member.memberId LIKE :search', { search: `%${queryDto.search}%` });
    }

    const sortOrder = queryDto.sortOrder === 'ASC' ? 'ASC' : 'DESC';
    const sortBy = queryDto.sortBy ? `member.${queryDto.sortBy}` : 'member.memberId';
    qb.orderBy(sortBy, sortOrder);

    return paginateQueryBuilder(qb, queryDto);
  }

  async findOneMember(hhId: string, memberId: string) {
    const member = await this.memberRepository.findOne({
      where: { hhId, memberId },
    });

    if (!member) {
      throw new NotFoundException(
        `Member '${memberId}' in household '${hhId}' not found`,
      );
    }

    return member;
  }

  // --- Household TV Operations ---

  async findTvs(
    hhId: string,
    queryDto: HouseholdTvQueryDto = new HouseholdTvQueryDto(),
  ) {
    await this.findOne(hhId);

    const qb = this.tvRepository
      .createQueryBuilder('tv')
      .leftJoinAndSelect('tv.installedDevice', 'device')
      .where('tv.hhId = :hhId', { hhId });

    if (queryDto.search) {
      qb.andWhere(
        '(tv.tvId LIKE :search OR tv.location LIKE :search OR tv.brand LIKE :search)',
        { search: `%${queryDto.search}%` },
      );
    }

    const sortOrder = queryDto.sortOrder === 'ASC' ? 'ASC' : 'DESC';
    const sortBy = queryDto.sortBy ? `tv.${queryDto.sortBy}` : 'tv.tvId';
    qb.orderBy(sortBy, sortOrder);

    return paginateQueryBuilder(qb, queryDto);
  }

  async findOneTv(hhId: string, tvId: string) {
    const tv = await this.tvRepository.findOne({
      where: { hhId, tvId },
      relations: { installedDevice: true },
    });

    if (!tv) {
      throw new NotFoundException(`TV set '${tvId}' in household '${hhId}' not found`);
    }

    return tv;
  }

  async createTv(hhId: string, dto: CreateHouseholdTvDto) {
    await this.findOne(hhId);

    // Enforce max 5 TVs limit per household
    const existingCount = await this.tvRepository.count({ where: { hhId } });
    if (existingCount >= MAX_ALLOWED_TVS_PER_HOUSEHOLD) {
      throw new BadRequestException(
        `Household '${hhId}' has reached the maximum allowed limit of ${MAX_ALLOWED_TVS_PER_HOUSEHOLD} TV sets`,
      );
    }

    // Auto generate tvId (TV1, TV2, ...) if not supplied
    let tvId = dto.tvId;
    if (!tvId) {
      tvId = `TV${existingCount + 1}`;
    } else {
      const existingTv = await this.tvRepository.findOne({ where: { hhId, tvId } });
      if (existingTv) {
        throw new ConflictException(
          `TV set '${tvId}' already exists in household '${hhId}'`,
        );
      }
    }

    // Check device existence if installedDeviceId is passed
    if (dto.installedDeviceId) {
      const device = await this.deviceRepository.findOne({
        where: { deviceId: dto.installedDeviceId },
      });
      if (!device) {
        throw new NotFoundException(
          `Device with ID '${dto.installedDeviceId}' not found`,
        );
      }
    }

    const tv = this.tvRepository.create({
      hhId,
      tvId,
      location: dto.location,
      brand: dto.brand,
      model: dto.model,
      screenSizeInches: dto.screenSizeInches,
      installedDeviceId: dto.installedDeviceId || undefined,
    });

    const savedTv = await this.tvRepository.save(tv);

    // Update totalTvs count on Household
    const updatedCount = await this.tvRepository.count({ where: { hhId } });
    await this.householdRepository.update(hhId, { totalTvs: updatedCount });

    return this.findOneTv(hhId, savedTv.tvId);
  }

  async updateTv(hhId: string, tvId: string, dto: UpdateHouseholdTvDto) {
    const tv = await this.findOneTv(hhId, tvId);

    if (dto.location !== undefined) tv.location = dto.location;
    if (dto.brand !== undefined) tv.brand = dto.brand;
    if (dto.model !== undefined) tv.model = dto.model;
    if (dto.screenSizeInches !== undefined)
      tv.screenSizeInches = dto.screenSizeInches;

    if (dto.installedDeviceId !== undefined) {
      if (dto.installedDeviceId && dto.installedDeviceId.trim() !== '') {
        const device = await this.deviceRepository.findOne({
          where: { deviceId: dto.installedDeviceId },
        });
        if (!device) {
          throw new NotFoundException(
            `Device with ID '${dto.installedDeviceId}' not found`,
          );
        }
        tv.installedDeviceId = dto.installedDeviceId;
      } else {
        tv.installedDeviceId = undefined;
      }
    }

    await this.tvRepository.save(tv);
    return this.findOneTv(hhId, tv.tvId);
  }

  async removeTv(hhId: string, tvId: string) {
    const tv = await this.findOneTv(hhId, tvId);
    await this.tvRepository.remove(tv);

    // Update totalTvs count on Household
    const updatedCount = await this.tvRepository.count({ where: { hhId } });
    await this.householdRepository.update(hhId, { totalTvs: updatedCount });

    return {
      success: true,
      message: `TV set '${tvId}' deleted successfully from household '${hhId}'`,
    };
  }
}
