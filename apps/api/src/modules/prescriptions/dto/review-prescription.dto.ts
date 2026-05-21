import { IsIn } from 'class-validator';

export const PRESCRIPTION_REVIEW_ACTIONS = ['approve', 'reject', 'request_clarification'] as const;

export type PrescriptionReviewAction = (typeof PRESCRIPTION_REVIEW_ACTIONS)[number];

export class ReviewPrescriptionDto {
  @IsIn(PRESCRIPTION_REVIEW_ACTIONS)
  action!: PrescriptionReviewAction;
}