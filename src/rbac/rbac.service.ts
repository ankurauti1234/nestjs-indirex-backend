import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Role, Permission, User } from '../database/entities/index.js';
import {
  CreateRoleDto,
  UpdateRoleDto,
  SetRolePermissionsDto,
  AddRolePermissionDto,
  CreatePermissionDto,
  UpdatePermissionDto,
  SetUserRolesDto,
  RoleQueryDto,
  PermissionQueryDto,
} from './dto/rbac.dto.js';
import { paginateQueryBuilder } from '../common/utils/pagination.util.js';

@Injectable()
export class RbacService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // --- Roles ---
  async getRoles(queryDto: RoleQueryDto = new RoleQueryDto()) {
    const qb = this.roleRepository.createQueryBuilder('role')
      .leftJoinAndSelect('role.permissions', 'permissions');

    if (queryDto.search) {
      qb.andWhere('(role.name LIKE :search OR role.description LIKE :search)', {
        search: `%${queryDto.search}%`,
      });
    }

    const sortOrder = queryDto.sortOrder === 'ASC' ? 'ASC' : 'DESC';
    const sortBy = queryDto.sortBy ? `role.${queryDto.sortBy}` : 'role.createdAt';
    qb.orderBy(sortBy, sortOrder);

    return paginateQueryBuilder(qb, queryDto);
  }

  async getRole(id: string) {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: { permissions: true },
    });
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }
    return role;
  }

  async createRole(dto: CreateRoleDto) {
    const existing = await this.roleRepository.findOne({ where: { name: dto.name } });
    if (existing) {
      throw new BadRequestException(`Role with name '${dto.name}' already exists`);
    }

    let permissions: Permission[] = [];
    if (dto.permissionIds && dto.permissionIds.length > 0) {
      permissions = await this.permissionRepository.findBy({ id: In(dto.permissionIds) });
    }

    const role = this.roleRepository.create({
      name: dto.name,
      description: dto.description,
      permissions,
    });

    return this.roleRepository.save(role);
  }

  async updateRole(id: string, dto: UpdateRoleDto) {
    const role = await this.getRole(id);
    if (dto.name && dto.name !== role.name) {
      const existing = await this.roleRepository.findOne({ where: { name: dto.name } });
      if (existing) {
        throw new BadRequestException(`Role with name '${dto.name}' already exists`);
      }
      role.name = dto.name;
    }
    if (dto.description !== undefined) role.description = dto.description;
    if (dto.isActive !== undefined) role.isActive = dto.isActive;

    return this.roleRepository.save(role);
  }

  async deleteRole(id: string) {
    const role = await this.getRole(id);
    if (role.isSystem) {
      throw new ForbiddenException('Cannot delete system-protected role');
    }
    await this.roleRepository.remove(role);
    return { message: `Role ${id} deleted successfully` };
  }

  // --- Role Permissions ---
  async getRolePermissions(roleId: string) {
    const role = await this.getRole(roleId);
    return role.permissions || [];
  }

  async setRolePermissions(roleId: string, dto: SetRolePermissionsDto) {
    const role = await this.getRole(roleId);
    const permissions = await this.permissionRepository.findBy({
      id: In(dto.permissionIds || []),
    });
    role.permissions = permissions;
    return this.roleRepository.save(role);
  }

  async addRolePermission(roleId: string, dto: AddRolePermissionDto) {
    const role = await this.getRole(roleId);
    const permission = await this.getPermission(dto.permissionId);

    if (!role.permissions) {
      role.permissions = [];
    }

    const exists = role.permissions.some((p: Permission) => p.id === permission.id);
    if (!exists) {
      role.permissions.push(permission);
      await this.roleRepository.save(role);
    }

    return role;
  }

  async removeRolePermission(roleId: string, permissionId: string) {
    const role = await this.getRole(roleId);
    if (role.permissions) {
      role.permissions = role.permissions.filter((p: Permission) => p.id !== permissionId);
      await this.roleRepository.save(role);
    }
    return { message: `Permission ${permissionId} removed from role ${roleId}` };
  }

  // --- Permissions ---
  async getPermissions(queryDto: PermissionQueryDto = new PermissionQueryDto()) {
    const qb = this.permissionRepository.createQueryBuilder('permission');

    if (queryDto.search) {
      qb.andWhere('(permission.name LIKE :search OR permission.resource LIKE :search OR permission.action LIKE :search)', {
        search: `%${queryDto.search}%`,
      });
    }

    const sortOrder = queryDto.sortOrder === 'ASC' ? 'ASC' : 'DESC';
    const sortBy = queryDto.sortBy ? `permission.${queryDto.sortBy}` : 'permission.createdAt';
    qb.orderBy(sortBy, sortOrder);

    return paginateQueryBuilder(qb, queryDto);
  }

  async getPermission(id: string) {
    const perm = await this.permissionRepository.findOne({ where: { id } });
    if (!perm) {
      throw new NotFoundException(`Permission with ID ${id} not found`);
    }
    return perm;
  }

  async createPermission(dto: CreatePermissionDto) {
    const existing = await this.permissionRepository.findOne({ where: { name: dto.name } });
    if (existing) {
      throw new BadRequestException(`Permission with name '${dto.name}' already exists`);
    }

    const perm = this.permissionRepository.create(dto);
    return this.permissionRepository.save(perm);
  }

  async updatePermission(id: string, dto: UpdatePermissionDto) {
    const perm = await this.getPermission(id);
    if (dto.name && dto.name !== perm.name) {
      const existing = await this.permissionRepository.findOne({ where: { name: dto.name } });
      if (existing) {
        throw new BadRequestException(`Permission with name '${dto.name}' already exists`);
      }
      perm.name = dto.name;
    }

    if (dto.description !== undefined) perm.description = dto.description;
    if (dto.resource !== undefined) perm.resource = dto.resource;
    if (dto.action !== undefined) perm.action = dto.action;
    if (dto.httpMethod !== undefined) perm.httpMethod = dto.httpMethod;
    if (dto.routePath !== undefined) perm.routePath = dto.routePath;
    if (dto.isActive !== undefined) perm.isActive = dto.isActive;

    return this.permissionRepository.save(perm);
  }

  async deletePermission(id: string) {
    const perm = await this.getPermission(id);
    await this.permissionRepository.remove(perm);
    return { message: `Permission ${id} deleted successfully` };
  }

  // --- User Roles ---
  async getUserRoles(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: { roles: { permissions: true } },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return user.roles || [];
  }

  async setUserRoles(userId: string, dto: SetUserRolesDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: { roles: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const roles = await this.roleRepository.findBy({ id: In(dto.roleIds || []) });
    user.roles = roles;
    await this.userRepository.save(user);

    return user.roles;
  }

  async assignUserRole(userId: string, roleId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: { roles: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const role = await this.getRole(roleId);

    if (!user.roles) {
      user.roles = [];
    }

    if (!user.roles.some((r: Role) => r.id === role.id)) {
      user.roles.push(role);
      await this.userRepository.save(user);
    }

    return user.roles;
  }

  async removeUserRole(userId: string, roleId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: { roles: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (user.roles) {
      user.roles = user.roles.filter((r: Role) => r.id !== roleId);
      await this.userRepository.save(user);
    }

    return { message: `Role ${roleId} removed from user ${userId}` };
  }
}

