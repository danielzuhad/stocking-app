'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';

import { ProductDeleteButton } from './product-delete-button';

/**
 * Row-level actions for products table.
 */
export function ProductRowActions({
  product_id,
  product_name,
}: {
  product_id: string;
  product_name: string;
}) {
  return (
    <div className="flex items-center justify-end gap-2">
      <Button variant="outline" size="sm" asChild>
        <Link href={`/products/${product_id}/edit`}>Edit</Link>
      </Button>
      <ProductDeleteButton
        product_id={product_id}
        product_name={product_name}
        trigger_label="Hapus"
      />
    </div>
  );
}
