import { EmptyState } from '@/components/ui/empty-state';
import {
  getDataTableQueryFromSearchParams,
  getTextQueryFromSearchParams,
  type PageSearchParams,
} from '@/lib/table/page-params';

import { fetchInventoryStockTable } from '../fetcher';
import { InventoryStockTable } from '../inventory-stock-table';

const URL_STATE_KEY = 'dt_inventory_stock';

/** Inventory stock list derived from stock movement ledger. */
export default async function InventoryStockPage({
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

  const stockResult = await fetchInventoryStockTable(
    {
      ...query,
      q,
    },
    undefined,
    {
      search_fields: ['product_name', 'variant_name', 'sku', 'barcode'],
    },
  );

  if (!stockResult.ok) {
    return <EmptyState title="Stok Barang" description={stockResult.error.message} />;
  }

  const { data, meta } = stockResult.data;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Stok Barang</h1>
        <p className="text-muted-foreground text-sm">
          Stok terkini dihitung otomatis dari riwayat pergerakan (IN / OUT /
          ADJUST).
        </p>
      </div>

      <InventoryStockTable
        data={data}
        rowCount={meta.rowCount}
        initialPageIndex={meta.pageIndex}
        initialPageSize={meta.pageSize}
      />
    </div>
  );
}
