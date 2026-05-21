import { BadRequestException, Injectable } from '@nestjs/common';
import { PRESCRIPTION_TRANSITIONS, type PrescriptionStatus } from './dto/prescription-status';

@Injectable()
export class PrescriptionsWorkflow {
  canTransition(from: PrescriptionStatus, to: PrescriptionStatus) {
    return PRESCRIPTION_TRANSITIONS[from].includes(to);
  }

  requireTransition(from: PrescriptionStatus, to: PrescriptionStatus) {
    if (!this.canTransition(from, to)) {
      throw new BadRequestException(`Invalid prescription transition from ${from} to ${to}`);
    }

    return { from, to };
  }
}