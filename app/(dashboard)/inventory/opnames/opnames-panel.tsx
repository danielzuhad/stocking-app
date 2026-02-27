'use client';

import type { ColumnDef } from '@tanstack/react-table';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table';
import { STOCK_OPNAME_STATUS_LABELS } from '@/lib/inventory/enums';
import { formatDateTime } from '@/lib/utils';
import type { StockOpnameRowType } from '@/types';

function OpnameStatusBadge({ status }: { status: StockOpnameRowType['status'] }) {
  const label = STOCK_OPNAME_STATUS_LABELS[status];

  if (status === 'FINALIZED') return <Badge>{label}</Badge>;
  if (status === 'IN_PROGRESS') return <Badge variant="secondary">{label}</Badge>;

  return <Badge variant="outline">{label}</Badge>;
}

function buildColumns(): Array<ColumnDef<StockOpnameRowType>> {
  return [
    {
      accessorKey: 'started_at',
      meta: { label: 'Mulai' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Mulai" />
      ),
      cell: ({ getValue }) => (
        <span className="text-xs">
          {formatDateTime(new Date(String(getValue())))}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      meta: { label: 'Status' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => <OpnameStatusBadge status={row.original.status} />,
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
      accessorKey: 'diff_item_count',
      meta: { label: 'Item Selisih' },
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Item Selisih"
          className="justify-end"
        />
      ),
      cell: ({ getValue }) => (
        <span className="block text-right">{Number(getValue() ?? 0)}</span>
      ),
    },
    {
      accessorKey: 'note',
      meta: { label: 'Catatan' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Catatan" />
      ),
      cell: ({ getValue }) => (
        <span className="text-muted-foreground block max-w-64 truncate text-xs">
          {String(getValue() ?? '-')}
        </span>
      ),
    },
  ];
}

/** Stock opname history list panel. */
export function OpnamesPanel({
  can_write,
  stock_opnames,
}: {
  can_write: boolean;
  stock_opnames: StockOpnameRowType[];
}) {
  const columns = React.useMemo(() => buildColumns(), []);

  const emptyDescription = can_write
    ? 'Klik tombol "Mulai Stok Opname" di atas untuk memulai opname.'
    : 'Belum ada stok opname.';

  return (
    <DataTable
      columns={columns}
      data={stock_opnames}
      enableToolbar={false}
      emptyTitle="Belum ada data stok opname"
      emptyDescription={emptyDescription}
    />
  );
}
