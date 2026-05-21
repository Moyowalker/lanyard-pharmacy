import { PrescriptionsWorkflow } from './prescriptions.workflow';

describe('PrescriptionsWorkflow', () => {
  const workflow = new PrescriptionsWorkflow();

  it('allows a valid prescription transition', () => {
    expect(workflow.requireTransition('submitted', 'under_review')).toEqual({
      from: 'submitted',
      to: 'under_review',
    });
  });

  it('rejects an invalid prescription transition', () => {
    expect(() => workflow.requireTransition('approved', 'submitted')).toThrow(
      'Invalid prescription transition from approved to submitted',
    );
  });
});