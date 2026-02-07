'use client';

import type { ColumnDef } from '@tanstack/react-table';

import { Badge } from '@/components/ui/badge';
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table';
import type { ActivityLogRowType } from '@/types';
import { formatDateTime } from '@/lib/utils';

const columns: Array<ColumnDef<ActivityLogRowType>> = [
  {
    accessorKey: 'created_at',
    meta: { label: 'Waktu' },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Waktu" />
    ),
    cell: ({ getValue }) => (
      <span className="text-muted-foreground text-sm">
        {formatDateTime(new Date(String(getValue())))}
      </span>
    ),
  },
  {
    accessorKey: 'action',
    meta: { label: 'Aksi' },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Aksi" />
    ),
    cell: ({ getValue }) => (
      <Badge variant="outline" className="font-mono">
        {String(getValue())}
      </Badge>
    ),
  },
  {
    accessorKey: 'actor_username',
    meta: { label: 'Aktor' },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Aktor" />
    ),
    cell: ({ getValue }) => (
      <span className="text-sm font-medium">{String(getValue())}</span>
    ),
  },
  {
    id: 'target',
    accessorFn: (row) =>
      `${row.target_type ?? ''} ${row.target_id ?? ''}`.trim(),
    meta: { label: 'Target' },
    enableSorting: false,
    cell: ({ row }) => (
      <span className="text-muted-foreground font-mono text-xs">
        {row.original.target_type ?? '—'}
        {row.original.target_id ? `:${row.original.target_id}` : ''}
      </span>
    ),
  },
  {
    id: 'meta',
    accessorFn: (row) => (row.meta ? JSON.stringify(row.meta) : ''),
    meta: { label: 'Meta' },
    enableSorting: false,
    cell: ({ row }) => {
      if (!row.original.meta)
        return <span className="text-muted-foreground">—</span>;
      const text = JSON.stringify(row.original.meta);
      return (
        <span className="text-muted-foreground block max-w-lg truncate font-mono text-xs">
          {text}
        </span>
      );
    },
  },
];

/**
 * Client table for Activity Logs (URL-driven pagination).
 */
export function ActivityLogsTable({
  data,
  rowCount,
  initialPageIndex,
  initialPageSize,
}: {
  data: ActivityLogRowType[];
  rowCount: number;
  initialPageIndex: number;
  initialPageSize: number;
}) {
  return (
    <DataTable
      columns={columns}
      data={data}
      rowCount={rowCount}
      initialPageIndex={initialPageIndex}
      initialPageSize={initialPageSize}
      enableUrlState
      urlStateKey="dt_activity_logs"
    />
  );
}
