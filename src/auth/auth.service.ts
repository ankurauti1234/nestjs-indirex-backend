import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import {
  User,
  Role,
  Permission,
  Session,
  PasswordReset,
  EmailVerification,
} from '../database/entities/index.js';
import {
  LoginDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
  ResendVerificationDto,
} from './dto/auth.dto.js';
import { generateToken, hashToken } from './utils/crypto.util.js';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(PasswordReset)
    private readonly passwordResetRepository: Repository<PasswordReset>,
    @InjectRepository(EmailVerification)
    private readonly emailVerificationRepository: Repository<EmailVerification>,
  ) {}

  async login(dto: LoginDto, userAgent?: string, ipAddress?: string) {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
      relations: { roles: { permissions: true } },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials or inactive account');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const rawSessionToken = generateToken();
    const rawRefreshToken = generateToken();

    const session = this.sessionRepository.create({
      userId: user.id,
      sessionToken: hashToken(rawSessionToken),
      refreshToken: hashToken(rawRefreshToken),
      userAgent,
      ipAddress,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    await this.sessionRepository.save(session);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        roles: user.roles?.map((r: Role) => r.name) || [],
      },
      sessionToken: rawSessionToken,
      refreshToken: rawRefreshToken,
    };
  }

  async logout(sessionToken: string) {
    const hashed = hashToken(sessionToken);
    const session = await this.sessionRepository.findOne({ where: { sessionToken: hashed } });
    if (session) {
      await this.sessionRepository.remove(session);
    }
    return { message: 'Logged out successfully' };
  }

  async getMe(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: { roles: { permissions: true } },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const permissions = new Set<string>();
    user.roles?.forEach((role: Role) => {
      role.permissions?.forEach((perm: Permission) => {
        permissions.add(perm.name);
      });
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roles: user.roles?.map((r: Role) => ({ id: r.id, name: r.name, description: r.description })) || [],
      permissions: Array.from(permissions),
    };
  }

  async refreshSession(refreshToken: string, userAgent?: string, ipAddress?: string) {
    const hashed = hashToken(refreshToken);
    const session = await this.sessionRepository.findOne({
      where: { refreshToken: hashed },
      relations: { user: true },
    });

    if (!session || !session.user || !session.user.isActive) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (new Date() > new Date(session.expiresAt)) {
      await this.sessionRepository.remove(session);
      throw new UnauthorizedException('Refresh token expired');
    }

    await this.sessionRepository.remove(session);

    const newRawSessionToken = generateToken();
    const newRawRefreshToken = generateToken();

    const newSession = this.sessionRepository.create({
      userId: session.user.id,
      sessionToken: hashToken(newRawSessionToken),
      refreshToken: hashToken(newRawRefreshToken),
      userAgent,
      ipAddress,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    await this.sessionRepository.save(newSession);

    return {
      sessionToken: newRawSessionToken,
      refreshToken: newRawRefreshToken,
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isMatch = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestException('Current password does not match');
    }

    user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepository.save(user);

    await this.sessionRepository.delete({ userId: user.id });

    return { message: 'Password changed successfully' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userRepository.findOne({ where: { email: dto.email } });
    if (!user) {
      return { message: 'If the email exists, a password reset link has been created.' };
    }

    const rawToken = generateToken();
    const reset = this.passwordResetRepository.create({
      userId: user.id,
      token: hashToken(rawToken),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    await this.passwordResetRepository.save(reset);

    return {
      message: 'If the email exists, a password reset link has been created.',
      resetToken: rawToken,
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const hashed = hashToken(dto.token);
    const reset = await this.passwordResetRepository.findOne({
      where: { token: hashed },
      relations: { user: true },
    });

    if (!reset || reset.usedAt || new Date() > new Date(reset.expiresAt)) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    const user = reset.user;
    user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepository.save(user);

    reset.usedAt = new Date();
    await this.passwordResetRepository.save(reset);

    await this.sessionRepository.delete({ userId: user.id });

    return { message: 'Password reset successfully' };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const hashed = hashToken(dto.token);
    const verification = await this.emailVerificationRepository.findOne({
      where: { token: hashed },
      relations: { user: true },
    });

    if (!verification || verification.usedAt || new Date() > new Date(verification.expiresAt)) {
      throw new BadRequestException('Invalid or expired email verification token');
    }

    const user = verification.user;
    user.isEmailVerified = true;
    await this.userRepository.save(user);

    verification.usedAt = new Date();
    await this.emailVerificationRepository.save(verification);

    return { message: 'Email verified successfully' };
  }

  async resendVerification(dto: ResendVerificationDto) {
    const user = await this.userRepository.findOne({ where: { email: dto.email } });
    if (!user) {
      return { message: 'Verification link sent if account exists' };
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    const rawToken = generateToken();
    const verification = this.emailVerificationRepository.create({
      userId: user.id,
      token: hashToken(rawToken),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    await this.emailVerificationRepository.save(verification);

    return {
      message: 'Verification link sent',
      verificationToken: rawToken,
    };
  }
}
