import { EmptyState } from '@/components/ui/empty-state';
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
      <EmptyState
        title="Products"
        description={productsResult.error.message}
      />
    );
  }

  const { data, meta } = productsResult.data;

  return (
    <div className="space-y-6">
      <ProductsTable
        data={data}
        rowCount={meta.rowCount}
        initialPageIndex={meta.pageIndex}
        initialPageSize={meta.pageSize}
      />
    </div>
  );
}
