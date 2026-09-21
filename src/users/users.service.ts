import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, Role, Permission } from '../database/entities/index.js';
import { CreateUserDto, UpdateProfileDto, UpdateUserDto, UserQueryDto } from './dto/user.dto.js';
import { paginateQueryBuilder } from '../common/utils/pagination.util.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async createUser(dto: CreateUserDto) {
    const existing = await this.userRepository.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new BadRequestException(`User with email '${dto.email}' already exists`);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    let roles: Role[] = [];

    if (dto.roleIds && dto.roleIds.length > 0) {
      roles = await this.roleRepository.findBy({ id: In(dto.roleIds) });
    } else {
      const defaultUserRole = await this.roleRepository.findOne({ where: { name: 'User' } });
      if (defaultUserRole) {
        roles = [defaultUserRole];
      }
    }

    const user = this.userRepository.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
      isEmailVerified: dto.isEmailVerified !== undefined ? dto.isEmailVerified : true,
      roles,
    });

    const saved = await this.userRepository.save(user);

    return {
      id: saved.id,
      name: saved.name,
      email: saved.email,
      isActive: saved.isActive,
      isEmailVerified: saved.isEmailVerified,
      createdAt: saved.createdAt,
      roles: saved.roles?.map((r: Role) => r.name) || [],
    };
  }

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: { roles: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roles: user.roles?.map((r: Role) => r.name) || [],
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.email && dto.email !== user.email) {
      const existing = await this.userRepository.findOne({ where: { email: dto.email } });
      if (existing) {
        throw new BadRequestException('Email already in use');
      }
      user.email = dto.email;
      user.isEmailVerified = false;
    }

    if (dto.name) {
      user.name = dto.name;
    }

    const saved = await this.userRepository.save(user);
    return {
      id: saved.id,
      name: saved.name,
      email: saved.email,
      isActive: saved.isActive,
      isEmailVerified: saved.isEmailVerified,
      updatedAt: saved.updatedAt,
    };
  }

  async findAll(queryDto: UserQueryDto = new UserQueryDto()) {
    const qb = this.userRepository.createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'roles');

    if (queryDto.role) {
      qb.andWhere('roles.name = :role', { role: queryDto.role });
    }

    if (queryDto.isActive !== undefined) {
      qb.andWhere('user.isActive = :isActive', { isActive: queryDto.isActive });
    }

    if (queryDto.search) {
      qb.andWhere(
        '(user.name LIKE :search OR user.email LIKE :search)',
        { search: `%${queryDto.search}%` },
      );
    }

    const sortOrder = queryDto.sortOrder === 'ASC' ? 'ASC' : 'DESC';
    const sortBy = queryDto.sortBy ? `user.${queryDto.sortBy}` : 'user.createdAt';
    qb.orderBy(sortBy, sortOrder);

    const result = await paginateQueryBuilder(qb, queryDto);

    return {
      data: result.data.map((u: User) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        isActive: u.isActive,
        isEmailVerified: u.isEmailVerified,
        createdAt: u.createdAt,
        roles: u.roles?.map((r: Role) => r.name) || [],
      })),
      meta: result.meta,
    };
  }

  async findOne(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: { roles: { permissions: true } },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roles: user.roles?.map((r: Role) => ({
        id: r.id,
        name: r.name,
        permissions: r.permissions?.map((p: Permission) => p.name) || [],
      })) || [],
    };
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (dto.email && dto.email !== user.email) {
      const existing = await this.userRepository.findOne({ where: { email: dto.email } });
      if (existing) {
        throw new BadRequestException('Email already in use');
      }
      user.email = dto.email;
    }

    if (dto.name !== undefined) user.name = dto.name;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;
    if (dto.isEmailVerified !== undefined) user.isEmailVerified = dto.isEmailVerified;

    const saved = await this.userRepository.save(user);
    return {
      id: saved.id,
      name: saved.name,
      email: saved.email,
      isActive: saved.isActive,
      isEmailVerified: saved.isEmailVerified,
      updatedAt: saved.updatedAt,
    };
  }

  async removeUser(id: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    user.isActive = false;
    await this.userRepository.save(user);

    return { message: `User ${id} deactivated successfully` };
  }
}
