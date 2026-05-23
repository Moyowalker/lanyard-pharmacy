'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { StorefrontProductDetail } from '../../../components/storefront-product-detail';

export default function ProductDetailPage() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const branchId = searchParams.get('branchId') ?? undefined;
  const serviceModeParam = searchParams.get('serviceMode');
  const serviceMode =
    serviceModeParam === 'delivery'
      ? 'delivery'
      : serviceModeParam === 'pickup'
        ? 'pickup'
        : undefined;

  return <StorefrontProductDetail slug={params.slug} initialBranchId={branchId} initialServiceMode={serviceMode} />;
}