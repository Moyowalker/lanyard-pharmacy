import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthenticatedUser } from './interfaces/authenticated-user.interface';
import type { LoginDto } from './dto/login.dto';

type DemoUserRecord = {
  id: string;
  email: string;
  password: string;
  roles: AuthenticatedUser['roles'];
  branchIds: string[];
};

const DEMO_USERS: DemoUserRecord[] = [
  {
    id: 'cust-100',
    email: 'ada@example.com',
    password: 'Customer123!',
    roles: ['customer'],
    branchIds: [],
  },
  {
    id: 'staff-001',
    email: 'pharmacist@lanyardpharmacy.com',
    password: 'Pharmacy123!',
    roles: ['pharmacist'],
    branchIds: ['branch-main'],
  },
  {
    id: 'admin-001',
    email: 'admin@lanyardpharmacy.com',
    password: 'Admin123!',
    roles: ['super_admin'],
    branchIds: ['branch-main', 'branch-airport'],
  },
];

@Injectable()
export class IdentityService {
  constructor(private readonly jwtService: JwtService) {}

  login(credentials: LoginDto) {
    const user = DEMO_USERS.find(
      (candidate) =>
        candidate.email.toLowerCase() === credentials.email.toLowerCase() &&
        candidate.password === credentials.password,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload: AuthenticatedUser = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
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