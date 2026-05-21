import { Test, TestingModule } from '@nestjs/testing';
import { JwtModule } from '@nestjs/jwt';
import { IdentityController } from './identity.controller';
import { IdentityService } from './identity.service';

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
      providers: [IdentityService],
    }).compile();

    controller = module.get<IdentityController>(IdentityController);
  });

  it('returns an access token for a configured staff user', () => {
    const response = controller.login({
      email: 'pharmacist@lanyardpharmacy.com',
      password: 'Pharmacy123!',
    });

    expect(response.user.email).toBe('pharmacist@lanyardpharmacy.com');
    expect(response.accessToken).toEqual(expect.any(String));
  });
});