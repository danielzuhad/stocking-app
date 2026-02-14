import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { SYSTEM_ROLE_STAFF } from '@/lib/auth/enums';
import { requireAuthSession } from '@/lib/auth/guards';
import {
  getDataTableQueryFromSearchParams,
  getTextQueryFromSearchParams,
  type PageSearchParams,
} from '@/lib/table/page-params';

import { fetchProductsTable } from './fetcher';
import { ProductsTable } from './products-table';

const URL_STATE_KEY = 'dt_products';

/** Company-scoped products list (tenant-safe). */
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  const sessionResult = await requireAuthSession();
  const can_write =
    sessionResult.ok && sessionResult.data.user.system_role !== SYSTEM_ROLE_STAFF;

  const resolvedSearchParams = await Promise.resolve(searchParams);
  const query = getDataTableQueryFromSearchParams(
    resolvedSearchParams,
    URL_STATE_KEY,
  );
  const q = getTextQueryFromSearchParams(resolvedSearchParams, 'q');

  const productsResult = await fetchProductsTable({ ...query, q }, undefined, {
    search_fields: ['name', 'category', 'unit'],
  });
  if (!productsResult.ok) {
    return (
      <EmptyState title="Products" description={productsResult.error.message} />
    );
  }

  const { data, meta } = productsResult.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Products</h1>
          <p className="text-muted-foreground text-sm">
            Kelola master produk, varian, dan image.
          </p>
        </div>
        {can_write ? (
          <Button asChild>
            <Link href="/products/new">Tambah Produk</Link>
          </Button>
        ) : null}
      </div>
      <ProductsTable
        data={data}
        rowCount={meta.rowCount}
        initialPageIndex={meta.pageIndex}
        initialPageSize={meta.pageSize}
        can_write={can_write}
      />
    </div>
  );
}
