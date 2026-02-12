'use client';

import type { ColumnDef } from '@tanstack/react-table';
import * as React from 'react';

import InputSearch from '@/components/input-search';
import { Badge } from '@/components/ui/badge';
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table';
import { useDataTableUrlPagination } from '@/hooks/use-data-table-url-pagination/use-data-table-url-pagination';
import { formatDateTime } from '@/lib/utils';
import type { ActivityLogRowType } from '@/types';

const URL_STATE_KEY = 'dt_activity_logs';

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
    header: 'Target',
    cell: ({ row }) => (
      <span className="text-muted-foreground font-mono text-xs">
        {row.original.target_type ?? '-'}
        {row.original.target_id ? `:${row.original.target_id}` : ''}
      </span>
    ),
  },
];

/**
 * Client table for company activity logs (URL-driven pagination).
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
  const { pagination, onPaginationChange, isPending } =
    useDataTableUrlPagination({
      urlStateKey: URL_STATE_KEY,
      defaultPageIndex: initialPageIndex,
      defaultPageSize: initialPageSize,
    });
  const [searchPending, setSearchPending] = React.useState(false);
  const isLoading = isPending || searchPending;

  return (
    <DataTable
      columns={columns}
      data={data}
      toolbarActions={
        <InputSearch
          placeholder="Cari aksi / aktor"
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
