import { OrderDetail } from '../../../components/order-detail';

type Props = { params: Promise<{ id: string }> };

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params;
  return <OrderDetail orderId={id} />;
}
