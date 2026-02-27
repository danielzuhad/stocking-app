'use client';

import type { ColumnDef } from '@tanstack/react-table';
import * as React from 'react';

import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table';
import { formatDateTime } from '@/lib/utils';
import type { StockAdjustmentRowType } from '@/types';

function buildColumns(): Array<ColumnDef<StockAdjustmentRowType>> {
  return [
    {
      accessorKey: 'created_at',
      meta: { label: 'Waktu' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Waktu" />
      ),
      cell: ({ getValue }) => (
        <span className="text-xs">
          {formatDateTime(new Date(String(getValue())))}
        </span>
      ),
    },
    {
      accessorKey: 'reason',
      meta: { label: 'Alasan' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Alasan" />
      ),
      cell: ({ row }) => (
        <div className="min-w-0">
          <div className="truncate text-sm">{row.original.reason}</div>
          <div className="text-muted-foreground truncate text-xs">
            {row.original.note ?? '-'}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'item_count',
      meta: { label: 'Item' },
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Item"
          className="justify-end"
        />
      ),
      cell: ({ getValue }) => (
        <span className="block text-right">{Number(getValue() ?? 0)}</span>
      ),
    },
    {
      accessorKey: 'total_qty_diff',
      meta: { label: 'Selisih' },
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Selisih"
          className="justify-end"
        />
      ),
      cell: ({ getValue }) => {
        const qtyDiff = Number(getValue() ?? 0);
        const toneClass =
          qtyDiff > 0
            ? 'text-emerald-600'
            : qtyDiff < 0
              ? 'text-destructive'
              : 'text-muted-foreground';

        return (
          <span className={`block text-right ${toneClass}`}>
            {qtyDiff.toLocaleString('id-ID')}
          </span>
        );
      },
    },
  ];
}

/** Stock adjustment history table panel. */
export function AdjustmentsPanel({
  can_write,
  stock_adjustments,
}: {
  can_write: boolean;
  stock_adjustments: StockAdjustmentRowType[];
}) {
  const columns = React.useMemo(() => buildColumns(), []);

  const emptyDescription = can_write
    ? 'Klik tombol "Buat Penyesuaian" di atas untuk mulai mencatat.'
    : 'Belum ada penyesuaian stok.';

  return (
    <DataTable
      columns={columns}
      data={stock_adjustments}
      enableToolbar={false}
      emptyTitle="Belum ada data penyesuaian stok"
      emptyDescription={emptyDescription}
    />
  );
}
