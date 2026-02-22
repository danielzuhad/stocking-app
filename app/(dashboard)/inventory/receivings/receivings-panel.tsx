'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table';
import {
  RECEIVING_STATUS_DRAFT,
  RECEIVING_STATUS_LABELS,
} from '@/lib/inventory/enums';
import { formatDateTime } from '@/lib/utils';
import type { ReceivingRowType } from '@/types';

import { postReceivingAction, voidReceivingAction } from '../actions';

function ReceivingStatusBadge({
  status,
}: {
  status: ReceivingRowType['status'];
}) {
  const label = RECEIVING_STATUS_LABELS[status];

  if (status === 'POSTED') return <Badge>{label}</Badge>;
  if (status === 'DRAFT') return <Badge variant="secondary">{label}</Badge>;

  return <Badge variant="outline">{label}</Badge>;
}

function buildColumns(input: {
  can_write: boolean;
  is_pending: boolean;
  on_post: (receiving_id: string) => void;
  on_void: (receiving_id: string) => void;
}): Array<ColumnDef<ReceivingRowType>> {
  const baseColumns: Array<ColumnDef<ReceivingRowType>> = [
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
      accessorKey: 'status',
      meta: { label: 'Status' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => <ReceivingStatusBadge status={row.original.status} />,
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
      accessorKey: 'total_qty',
      meta: { label: 'Total Qty' },
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Total Qty"
          className="justify-end"
        />
      ),
      cell: ({ getValue }) => (
        <span className="block text-right">
          {Number(getValue() ?? 0).toLocaleString('id-ID')}
        </span>
      ),
    },
    {
      accessorKey: 'note',
      meta: { label: 'Catatan' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Catatan" />
      ),
      cell: ({ getValue }) => (
        <span className="text-muted-foreground block max-w-56 truncate text-xs">
          {String(getValue() ?? '-')}
        </span>
      ),
    },
  ];

  if (!input.can_write) return baseColumns;

  return [
    ...baseColumns,
    {
      id: 'actions',
      meta: { label: 'Aksi' },
      enableSorting: false,
      enableHiding: false,
      header: () => <div className="text-right">Aksi</div>,
      cell: ({ row }) => {
        if (row.original.status !== RECEIVING_STATUS_DRAFT) {
          return (
            <span className="text-muted-foreground block text-right text-xs">
              -
            </span>
          );
        }

        return (
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => input.on_post(row.original.id)}
              disabled={input.is_pending}
            >
              Posting
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => input.on_void(row.original.id)}
              disabled={input.is_pending}
            >
              Batalkan
            </Button>
          </div>
        );
      },
    },
  ];
}

/** Receivings table panel with post/void row actions. */
export function ReceivingsPanel({
  can_write,
  receivings,
}: {
  can_write: boolean;
  receivings: ReceivingRowType[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  const handlePostReceiving = React.useCallback(
    (receivingId: string) => {
      startTransition(async () => {
        const result = await postReceivingAction({ receiving_id: receivingId });
        if (!result.ok) {
          toast.error(result.error.message);
          return;
        }

        toast.success('Barang masuk berhasil diposting.');
        router.refresh();
      });
    },
    [router, startTransition],
  );

  const handleVoidReceiving = React.useCallback(
    (receivingId: string) => {
      startTransition(async () => {
        const result = await voidReceivingAction({ receiving_id: receivingId });
        if (!result.ok) {
          toast.error(result.error.message);
          return;
        }

        toast.success('Barang masuk berhasil dibatalkan.');
        router.refresh();
      });
    },
    [router, startTransition],
  );

  const columns = React.useMemo(
    () =>
      buildColumns({
        can_write,
        is_pending: isPending,
        on_post: handlePostReceiving,
        on_void: handleVoidReceiving,
      }),
    [can_write, handlePostReceiving, handleVoidReceiving, isPending],
  );

  const emptyDescription = can_write
    ? 'Klik tombol "Buat Barang Masuk" di atas untuk mulai mencatat.'
    : 'Belum ada barang masuk tercatat.';

  return (
    <DataTable
      columns={columns}
      data={receivings}
      enableToolbar={false}
      isLoading={isPending}
      loadingText="Memproses data barang masuk..."
      emptyTitle="Belum ada data barang masuk"
      emptyDescription={emptyDescription}
    />
  );
}
