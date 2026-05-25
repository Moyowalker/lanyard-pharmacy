import { Module } from '@nestjs/common';
import { PlatformUsersRepository } from '../../database/repositories/platform-users.repository';
import { AuditModule } from '../audit/audit.module';
import { IdentityModule } from '../identity/identity.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [IdentityModule, AuditModule],
  controllers: [UsersController],
  providers: [UsersService, PlatformUsersRepository],
})
export class UsersModule {}
