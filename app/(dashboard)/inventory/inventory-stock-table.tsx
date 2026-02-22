'use client';

import type { ColumnDef } from '@tanstack/react-table';
import * as React from 'react';

import InputSearch from '@/components/input-search';
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table';
import { useDataTableUrlPagination } from '@/hooks/use-data-table-url-pagination/use-data-table-url-pagination';
import { formatDateTime } from '@/lib/utils';
import type { InventoryStockRowType } from '@/types';

const URL_STATE_KEY = 'dt_inventory_stock';

const columns: Array<ColumnDef<InventoryStockRowType>> = [
  {
    accessorKey: 'product_name',
    meta: { label: 'Produk' },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Produk" />
    ),
    cell: ({ row }) => (
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{row.original.product_name}</div>
        <div className="text-muted-foreground truncate text-xs">
          {row.original.variant_name}
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'sku',
    meta: { label: 'SKU' },
    header: ({ column }) => <DataTableColumnHeader column={column} title="SKU" />,
    cell: ({ getValue }) => (
      <span className="font-mono text-xs">{String(getValue() ?? '-')}</span>
    ),
  },
  {
    accessorKey: 'barcode',
    meta: { label: 'Barcode' },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Barcode" />
    ),
    cell: ({ getValue }) => (
      <span className="font-mono text-xs">{String(getValue() ?? '-')}</span>
    ),
  },
  {
    accessorKey: 'current_qty',
    meta: { label: 'Stok' },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Stok" />,
    cell: ({ getValue }) => {
      const value = Number(getValue() ?? 0);
      return <span className="text-sm font-semibold">{value.toLocaleString('id-ID')}</span>;
    },
  },
  {
    accessorKey: 'updated_at',
    meta: { label: 'Diubah' },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Diubah" />
    ),
    cell: ({ getValue }) => (
      <span className="text-muted-foreground text-xs">
        {formatDateTime(new Date(String(getValue())))}
      </span>
    ),
  },
];

/**
 * Client table for inventory stock derived from movement ledger.
 */
export function InventoryStockTable({
  data,
  rowCount,
  initialPageIndex,
  initialPageSize,
}: {
  data: InventoryStockRowType[];
  rowCount: number;
  initialPageIndex: number;
  initialPageSize: number;
}) {
  const { pagination, onPaginationChange, isPending } =
    useDataTableUrlPagination({
      urlStateKey: URL_STATE_KEY,
      defaultPageIndex: initialPageIndex,
      defaultPageSize: initialPageSize,
    });
  const [searchPending, setSearchPending] = React.useState(false);

  return (
    <DataTable
      columns={columns}
      data={data}
      toolbarActions={
        <InputSearch
          placeholder="Cari produk / varian / SKU / barcode"
          onPendingChange={setSearchPending}
          urlStateKey={URL_STATE_KEY}
        />
      }
      rowCount={rowCount}
      pagination={pagination}
      onPaginationChange={onPaginationChange}
      initialPageIndex={initialPageIndex}
      initialPageSize={initialPageSize}
      isLoading={isPending || searchPending}
    />
  );
}
