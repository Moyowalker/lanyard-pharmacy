import { Test, TestingModule } from '@nestjs/testing';
import { JwtModule } from '@nestjs/jwt';
import { PlatformUsersRepository } from '../../database/repositories/platform-users.repository';
import { IdentityController } from './identity.controller';
import { IdentityService } from './identity.service';
import { hashPassword } from './password-hash';

describe('IdentityController', () => {
  let controller: IdentityController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'test-secret-that-is-long-enough',
        }),
      ],
      controllers: [IdentityController],
      providers: [
        IdentityService,
        {
          provide: PlatformUsersRepository,
          useValue: {
            findByEmail: async (email: string) => {
              if (email !== 'pharmacist@lanyardpharmacy.com') {
                return null;
              }

              return {
                id: 'usr-pharm-001',
                firstName: 'Lead',
                lastName: 'Pharmacist',
                email,
                passwordHash: hashPassword('Pharmacy123!'),
                roles: ['pharmacist'],
                branchIds: ['branch-main'],
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
              };
            },
          },
        },
      ],
    }).compile();

    controller = module.get<IdentityController>(IdentityController);
  });

  it('returns an access token for a configured staff user', async () => {
    const response = await controller.login({
      email: 'pharmacist@lanyardpharmacy.com',
      password: 'Pharmacy123!',
    });

    expect(response.user.email).toBe('pharmacist@lanyardpharmacy.com');
    expect(response.accessToken).toEqual(expect.any(String));
  });
});