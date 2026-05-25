import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { Roles } from '../../common/auth/roles.decorator';
import type { AuthenticatedUser } from '../identity/interfaces/authenticated-user.interface';
import { CreatePlatformUserDto } from './dto/create-platform-user.dto';
import { UpdatePlatformUserDto } from './dto/update-platform-user.dto';
import { UsersService } from './users.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  listUsers() {
    return this.usersService.listUsers();
  }

  @Post()
  createUser(@Body() body: CreatePlatformUserDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.usersService.createUser(body, actor);
  }

  @Patch(':userId')
  updateUser(
    @Param('userId') userId: string,
    @Body() body: UpdatePlatformUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.usersService.updateUser(userId, body, actor);
  }
}
