'use client';

import type { ColumnDef } from '@tanstack/react-table';

import InputSearch from '@/components/input-search';
import { Badge } from '@/components/ui/badge';
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table';
import { useDataTableUrlPagination } from '@/hooks/use-data-table-url-pagination/use-data-table-url-pagination';
import { formatDateTime } from '@/lib/utils';
import type { SystemLogRowType } from '@/types';

const URL_STATE_KEY = 'dt_system_logs';

const columns: Array<ColumnDef<SystemLogRowType>> = [
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
    accessorKey: 'company_name',
    meta: { label: 'Company' },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Company" />
    ),
    cell: ({ row }) => (
      <div className="min-w-0">
        <div className="truncate font-medium">{row.original.company_name}</div>
        <div className="text-muted-foreground truncate font-mono text-xs">
          {row.original.company_slug} ({row.original.company_id})
        </div>
      </div>
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
];

/**
 * Client table for System Logs (URL-driven pagination).
 */
export function SystemLogsTable({
  data,
  rowCount,
  initialPageIndex,
  initialPageSize,
}: {
  data: SystemLogRowType[];
  rowCount: number;
  initialPageIndex: number;
  initialPageSize: number;
}) {
  const { pagination, onPaginationChange } = useDataTableUrlPagination({
    urlStateKey: URL_STATE_KEY,
    defaultPageIndex: initialPageIndex,
    defaultPageSize: initialPageSize,
  });

  return (
    <DataTable
      columns={columns}
      data={data}
      toolbarActions={<InputSearch />}
      rowCount={rowCount}
      pagination={pagination}
      onPaginationChange={onPaginationChange}
      initialPageIndex={initialPageIndex}
      initialPageSize={initialPageSize}
    />
  );
}
