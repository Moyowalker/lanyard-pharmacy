import { SetMetadata } from '@nestjs/common';

export const BRANCH_SCOPE_KEY = 'branchScope';

export const BranchScoped = () => SetMetadata(BRANCH_SCOPE_KEY, true);