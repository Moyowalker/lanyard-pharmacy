import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PlatformUsersRepository } from '../../database/repositories/platform-users.repository';
import { IdentityController } from './identity.controller';
import { IdentityService } from './identity.service';

@Module({
	imports: [
		ConfigModule,
		JwtModule.registerAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: (configService: ConfigService) => ({
				secret: configService.getOrThrow<string>('auth.jwtSecret'),
				signOptions: {
					expiresIn: configService.getOrThrow<string>('auth.accessTokenTtl') as never,
				},
			}),
		}),
	],
	controllers: [IdentityController],
	providers: [IdentityService, PlatformUsersRepository],
	exports: [JwtModule, IdentityService],
})
export class IdentityModule {}