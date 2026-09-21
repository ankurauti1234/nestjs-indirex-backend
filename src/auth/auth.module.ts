import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AuthGuard } from './guards/auth.guard.js';
import { RbacGuard } from './guards/rbac.guard.js';
import {
  User,
  Role,
  Permission,
  Session,
  PasswordReset,
  EmailVerification,
} from '../database/entities/index.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Role,
      Permission,
      Session,
      PasswordReset,
      EmailVerification,
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, RbacGuard],
  exports: [AuthService, AuthGuard, RbacGuard],
})
export class AuthModule {}

