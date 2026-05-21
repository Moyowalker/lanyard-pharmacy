import { OrdersWorkflow } from './orders.workflow';

describe('OrdersWorkflow', () => {
  const workflow = new OrdersWorkflow();

  it('allows a valid order transition', () => {
    expect(workflow.requireTransition('pending_review', 'awaiting_payment')).toEqual({
      from: 'pending_review',
      to: 'awaiting_payment',
    });
  });

  it('rejects an invalid order transition', () => {
    expect(() => workflow.requireTransition('delivered', 'processing')).toThrow(
      'Invalid order transition from delivered to processing',
    );
  });
});