'use client';

import type { ColumnDef } from '@tanstack/react-table';
import * as React from 'react';

import InputSearch from '@/components/input-search';
import { Badge } from '@/components/ui/badge';
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table';
import { useDataTableUrlPagination } from '@/hooks/use-data-table-url-pagination/use-data-table-url-pagination';
import { formatDateTime } from '@/lib/utils';
import type { ProductRowType } from '@/types';
import { ProductRowActions } from './components/product-row-actions';

const URL_STATE_KEY = 'dt_products';

function buildColumns(can_write: boolean): Array<ColumnDef<ProductRowType>> {
  const baseColumns: Array<ColumnDef<ProductRowType>> = [
    {
      accessorKey: 'name',
      meta: { label: 'Produk' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Produk" />
      ),
      cell: ({ row }) => (
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">
            {row.original.name}
          </div>
          <div className="text-muted-foreground truncate text-xs">
            {row.original.category}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'unit',
      meta: { label: 'Satuan' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Satuan" />
      ),
      cell: ({ getValue }) => (
        <span className="text-sm">{String(getValue())}</span>
      ),
    },
    {
      accessorKey: 'status',
      meta: { label: 'Status' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ getValue }) => {
        const status = String(getValue());
        return (
          <Badge variant={status === 'ACTIVE' ? 'default' : 'secondary'}>
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'variant_count',
      meta: { label: 'Varian' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Varian" />
      ),
      cell: ({ getValue }) => (
        <span className="text-sm font-medium">{Number(getValue() ?? 0)}</span>
      ),
    },
    {
      accessorKey: 'updated_at',
      meta: { label: 'Diubah' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Diubah" />
      ),
      cell: ({ getValue }) => (
        <span className="text-muted-foreground text-sm">
          {formatDateTime(new Date(String(getValue())))}
        </span>
      ),
    },
  ];

  if (!can_write) return baseColumns;

  return [
    ...baseColumns,
    {
      id: 'actions',
      meta: { label: 'Aksi' },
      enableSorting: false,
      enableHiding: false,
      header: 'Aksi',
      cell: ({ row }) => (
        <ProductRowActions
          product_id={row.original.id}
          product_name={row.original.name}
        />
      ),
    },
  ];
}

/**
 * Client table for company products (URL-driven pagination).
 */
export function ProductsTable({
  data,
  rowCount,
  initialPageIndex,
  initialPageSize,
  can_write,
}: {
  data: ProductRowType[];
  rowCount: number;
  initialPageIndex: number;
  initialPageSize: number;
  can_write: boolean;
}) {
  const { pagination, onPaginationChange, isPending } =
    useDataTableUrlPagination({
      urlStateKey: URL_STATE_KEY,
      defaultPageIndex: initialPageIndex,
      defaultPageSize: initialPageSize,
    });
  const [searchPending, setSearchPending] = React.useState(false);
  const isLoading = isPending || searchPending;
  const columns = React.useMemo(() => buildColumns(can_write), [can_write]);

  return (
    <DataTable
      columns={columns}
      data={data}
      toolbarActions={
        <InputSearch
          placeholder="Cari nama / kategori "
          onPendingChange={setSearchPending}
          urlStateKey={URL_STATE_KEY}
        />
      }
      rowCount={rowCount}
      pagination={pagination}
      onPaginationChange={onPaginationChange}
      initialPageIndex={initialPageIndex}
      initialPageSize={initialPageSize}
      isLoading={isLoading}
    />
  );
}
