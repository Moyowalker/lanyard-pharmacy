import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import type { AuthenticatedUser } from '../identity/interfaces/authenticated-user.interface';
import { CreatePaymentAttemptDto } from './dto/create-payment-attempt.dto';
import { ReconcilePaymentWebhookDto } from './dto/reconcile-payment-webhook.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('providers')
  listProviders() {
    return this.paymentsService.getSupportedProviders();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'pharmacist', 'branch_manager', 'support_admin', 'super_admin')
  @Post('attempts')
  createAttempt(@Body() body: CreatePaymentAttemptDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.paymentsService.createAttempt(body, actor);
  }

  @Post('webhooks')
  reconcileWebhook(@Body() body: ReconcilePaymentWebhookDto) {
    return this.paymentsService.reconcileWebhook(body);
  }
}