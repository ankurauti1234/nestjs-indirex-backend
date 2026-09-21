import { Repository, SelectQueryBuilder, FindManyOptions, ObjectLiteral } from 'typeorm';
import { PaginationQueryDto } from '../dto/pagination-query.dto.js';
import { PaginatedResult } from '../interfaces/api-response.interface.js';

export async function paginateRepository<T extends ObjectLiteral>(
  repository: Repository<T>,
  queryDto: PaginationQueryDto,
  options: FindManyOptions<T> = {},
): Promise<PaginatedResult<T>> {
  const page = Math.max(1, Number(queryDto.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(queryDto.limit) || 10));
  const skip = (page - 1) * limit;

  const [items, totalItems] = await repository.findAndCount({
    ...options,
    take: limit,
    skip,
  });

  const totalPages = Math.ceil(totalItems / limit) || 1;

  return {
    data: items,
    meta: {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}

export async function paginateQueryBuilder<T extends ObjectLiteral>(
  queryBuilder: SelectQueryBuilder<T>,
  queryDto: PaginationQueryDto,
): Promise<PaginatedResult<T>> {
  const page = Math.max(1, Number(queryDto.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(queryDto.limit) || 10));
  const skip = (page - 1) * limit;

  queryBuilder.skip(skip).take(limit);

  const [items, totalItems] = await queryBuilder.getManyAndCount();
  const totalPages = Math.ceil(totalItems / limit) || 1;

  return {
    data: items,
    meta: {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}

