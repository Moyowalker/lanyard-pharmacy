import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PlatformUsersRepository } from '../../database/repositories/platform-users.repository';
import type { AuthenticatedUser } from './interfaces/authenticated-user.interface';
import type { LoginDto } from './dto/login.dto';
import { verifyPassword } from './password-hash';

@Injectable()
export class IdentityService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly platformUsersRepository: PlatformUsersRepository,
  ) {}

  async login(credentials: LoginDto) {
    const normalizedEmail = credentials.email.trim().toLowerCase();
    const user = await this.platformUsersRepository.findByEmail(normalizedEmail);

    if (!user || !user.isActive || !verifyPassword(credentials.password, user.passwordHash)) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload: AuthenticatedUser = {
      sub: user.id,
      email: user.email,
      roles: user.roles as AuthenticatedUser['roles'],
      branchIds: user.branchIds,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: payload,
    };
  }

  getProfile(user: AuthenticatedUser) {
    return user;
  }
}