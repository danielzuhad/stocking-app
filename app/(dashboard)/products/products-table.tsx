'use client';

import type { ColumnDef } from '@tanstack/react-table';
import * as React from 'react';

import InputSearch from '@/components/input-search';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table';
import { DeleteButton } from '@/components/ui/delete-button';
import { useDataTableUrlPagination } from '@/hooks/use-data-table-url-pagination/use-data-table-url-pagination';
import {
  PRODUCT_CATEGORY_LABELS,
  PRODUCT_STATUS_ACTIVE,
  PRODUCT_STATUS_LABELS,
  PRODUCT_UNIT_LABELS,
  type ProductCategoryType,
  type ProductStatusType,
  type ProductUnitType,
} from '@/lib/products/enums';
import { formatDateTime } from '@/lib/utils';
import type { ProductRowType } from '@/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { deleteProductAction } from './actions';

const URL_STATE_KEY = 'dt_products';

function buildColumns(
  can_write: boolean,
  onDeleteSuccess: () => void,
): Array<ColumnDef<ProductRowType>> {
  const baseColumns: Array<ColumnDef<ProductRowType>> = [
    {
      accessorKey: 'name',
      meta: { label: 'Produk' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Produk" />
      ),
      cell: ({ row }) => (
        <div className="min-w-0">
          <div className="text-muted-foreground truncate text-xs">
            {
              PRODUCT_CATEGORY_LABELS[
                row.original.category as ProductCategoryType
              ]
            }
          </div>
          <div className="truncate text-sm font-medium">
            {row.original.name}
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
        <span className="text-sm">
          {PRODUCT_UNIT_LABELS[getValue() as ProductUnitType]}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      meta: { label: 'Status' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ getValue }) => {
        const status = getValue() as ProductStatusType;
        return (
          <Badge
            variant={status === PRODUCT_STATUS_ACTIVE ? 'default' : 'secondary'}
          >
            {PRODUCT_STATUS_LABELS[status]}
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
      cell: ({ row }) => {
        const variantCount = Number(row.original.variant_count ?? 0);
        const variantNames = row.original.variant_names;
        const visibleVariantNames = variantNames.slice(0, 2);
        const hiddenVariantCount = Math.max(0, variantNames.length - 2);

        return (
          <div className="min-w-0">
            <div className="text-sm font-medium">{variantCount}</div>
            {visibleVariantNames.length > 0 ? (
              <div className="text-muted-foreground truncate text-xs">
                {visibleVariantNames.join(', ')}
                {hiddenVariantCount > 0 ? ` +${hiddenVariantCount} lagi` : ''}
              </div>
            ) : null}
          </div>
        );
      },
    },
    {
      id: 'stock',
      meta: { label: 'Stok' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Stok" />
      ),
      cell: () => (
        <span className="text-muted-foreground text-xs">
          Belum tersedia
        </span>
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
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/products/${row.original.id}/edit`}>Edit</Link>
          </Button>
          <DeleteButton
            action={() => deleteProductAction({ product_id: row.original.id })}
            title="Hapus produk ini?"
            description={
              <>
                Produk <strong>{row.original.name}</strong> akan dihapus
                permanen bersama varian terkait.
              </>
            }
            trigger_label="Hapus"
            success_toast_message="Produk berhasil dihapus."
            on_success={onDeleteSuccess}
          />
        </div>
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
  const router = useRouter();
  const { pagination, onPaginationChange, isPending } =
    useDataTableUrlPagination({
      urlStateKey: URL_STATE_KEY,
      defaultPageIndex: initialPageIndex,
      defaultPageSize: initialPageSize,
    });
  const [searchPending, setSearchPending] = React.useState(false);
  const isLoading = isPending || searchPending;
  const columns = React.useMemo(
    () =>
      buildColumns(can_write, () => {
        router.refresh();
      }),
    [can_write, router],
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      toolbarActions={
        <InputSearch
          placeholder="Cari nama / kategori / SKU / barcode"
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
