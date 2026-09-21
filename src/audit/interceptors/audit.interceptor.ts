import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AuditLogService } from '../audit-log.service.js';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditLogService: AuditLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpCtx = context.switchToHttp();
    const request = httpCtx.getRequest();
    const response = httpCtx.getResponse();

    // Skip audit logging for swagger / static doc routes if desired
    if (request.url?.startsWith('/docs')) {
      return next.handle();
    }

    const startTime = Date.now();

    const sanitizeBody = (body: any) => {
      if (!body || typeof body !== 'object') return body;
      const sanitized = { ...body };
      const sensitiveKeys = ['password', 'currentPassword', 'newPassword', 'token'];
      for (const key of sensitiveKeys) {
        if (key in sanitized) {
          sanitized[key] = '***REDACTED***';
        }
      }
      return sanitized;
    };

    const captureLog = (statusCode: number) => {
      const user = request.user;
      const method = request.method;
      const route = request.route?.path || request.url;
      const ipAddress = request.ip || request.connection?.remoteAddress;
      const userAgent = request.headers?.['user-agent'];
      const payload = sanitizeBody(request.body);
      const action = `${method}:${route}`;

      this.auditLogService.createLog({
        userId: user?.id || null,
        userEmail: user?.email || null,
        action,
        method,
        route,
        statusCode,
        ipAddress,
        userAgent,
        payload: payload && Object.keys(payload).length > 0 ? payload : null,
      });
    };

    return next.handle().pipe(
      tap(() => {
        const statusCode = response.statusCode || 200;
        captureLog(statusCode);
      }),
      catchError((err) => {
        const statusCode = err.status || err.statusCode || 500;
        captureLog(statusCode);
        throw err;
      }),
    );
  }
}

