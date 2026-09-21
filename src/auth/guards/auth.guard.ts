import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { Session } from '../../database/entities/session.entity.js';
import { hashToken } from '../utils/crypto.util.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = request.cookies?.auth_session;

    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    const hashedToken = hashToken(token);
    const session = await this.sessionRepository.findOne({
      where: { sessionToken: hashedToken },
      relations: { user: { roles: true } },
    });

    if (!session || !session.user || !session.user.isActive) {
      throw new UnauthorizedException('Invalid or inactive session');
    }

    if (new Date() > new Date(session.expiresAt)) {
      await this.sessionRepository.remove(session);
      throw new UnauthorizedException('Session expired');
    }

    request.user = session.user;
    request.session = session;

    return true;
  }
}

