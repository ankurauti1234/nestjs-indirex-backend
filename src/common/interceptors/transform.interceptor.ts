import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponseEnvelope } from '../interfaces/api-response.interface.js';

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponseEnvelope<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponseEnvelope<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const statusCode = response.statusCode || 200;

    return next.handle().pipe(
      map((resData) => {
        // If already formatted, return directly
        if (resData && typeof resData === 'object' && 'success' in resData) {
          return resData;
        }

        // If returned from pagination helper { data: [...], meta: {...} }
        if (
          resData &&
          typeof resData === 'object' &&
          'data' in resData &&
          'meta' in resData
        ) {
          return {
            success: true,
            statusCode,
            data: resData.data,
            meta: resData.meta,
          };
        }

        // Standard object/array/primitive payload
        return {
          success: true,
          statusCode,
          data: resData,
        };
      }),
    );
  }
}

