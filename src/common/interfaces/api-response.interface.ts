export interface PaginatedMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginatedMeta;
}

export interface ApiResponseEnvelope<T> {
  success: boolean;
  statusCode: number;
  message?: string;
  data: T;
  meta?: PaginatedMeta;
}

