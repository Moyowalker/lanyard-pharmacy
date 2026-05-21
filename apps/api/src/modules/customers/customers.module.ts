import { Module } from '@nestjs/common';
import { CustomersRepository } from '../../database/repositories/customers.repository';
import { IdentityModule } from '../identity/identity.module';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

@Module({
	imports: [IdentityModule],
	controllers: [CustomersController],
	providers: [CustomersService, CustomersRepository],
})
export class CustomersModule {}