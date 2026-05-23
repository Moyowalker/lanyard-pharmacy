import { Suspense } from 'react';
import { CheckoutConfirm } from '../../../components/checkout-confirm';

export default function CheckoutConfirmPage() {
  return (
    <Suspense>
      <CheckoutConfirm />
    </Suspense>
  );
}
