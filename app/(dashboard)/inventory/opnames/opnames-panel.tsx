'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NumberInput } from '@/components/ui/number-input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { STOCK_OPNAME_STATUS_LABELS } from '@/lib/inventory/enums';
import { formatDateTime } from '@/lib/utils';
import type { ActiveStockOpnameType, StockOpnameRowType } from '@/types';

import {
  finalizeStockOpnameAction,
  startStockOpnameAction,
  updateStockOpnameItemCountedQtyAction,
  voidStockOpnameAction,
} from '../actions';

function OpnameStatusBadge({ status }: { status: StockOpnameRowType['status'] }) {
  const label = STOCK_OPNAME_STATUS_LABELS[status];

  if (status === 'FINALIZED') return <Badge>{label}</Badge>;
  if (status === 'IN_PROGRESS') return <Badge variant="secondary">{label}</Badge>;

  return <Badge variant="outline">{label}</Badge>;
}

/** Stock opname flow panel (start/update/finalize/void + history). */
export function OpnamesPanel({
  can_write,
  active_stock_opname,
  stock_opnames,
}: {
  can_write: boolean;
  active_stock_opname: ActiveStockOpnameType | null;
  stock_opnames: StockOpnameRowType[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  const [startOpnameNote, setStartOpnameNote] = React.useState('');
  const [countedQtyByItemId, setCountedQtyByItemId] = React.useState<
    Record<string, number>
  >({});

  React.useEffect(() => {
    if (!active_stock_opname) {
      setCountedQtyByItemId({});
      return;
    }

    const initialMap = Object.fromEntries(
      active_stock_opname.items.map((item) => [
        item.stock_opname_item_id,
        item.counted_qty,
      ]),
    );
    setCountedQtyByItemId(initialMap);
  }, [active_stock_opname]);

  const handleStartStockOpname = () => {
    startTransition(async () => {
      const result = await startStockOpnameAction({
        note: startOpnameNote,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }

      toast.success('Stok opname dimulai. Posting mutasi stok sekarang diblokir.');
      setStartOpnameNote('');
      router.refresh();
    });
  };

  const handleSaveCountedQty = (stockOpnameItemId: string) => {
    if (!active_stock_opname) return;

    const countedQty = countedQtyByItemId[stockOpnameItemId] ?? 0;

    startTransition(async () => {
      const result = await updateStockOpnameItemCountedQtyAction({
        stock_opname_id: active_stock_opname.stock_opname_id,
        stock_opname_item_id: stockOpnameItemId,
        counted_qty: countedQty,
      });

      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }

      toast.success('Qty hitung fisik diperbarui.');
      router.refresh();
    });
  };

  const handleFinalizeStockOpname = () => {
    if (!active_stock_opname) return;

    startTransition(async () => {
      const result = await finalizeStockOpnameAction({
        stock_opname_id: active_stock_opname.stock_opname_id,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }

      toast.success('Stok opname berhasil difinalisasi.');
      router.refresh();
    });
  };

  const handleVoidStockOpname = () => {
    if (!active_stock_opname) return;

    startTransition(async () => {
      const result = await voidStockOpnameAction({
        stock_opname_id: active_stock_opname.stock_opname_id,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }

      toast.success('Stok opname dibatalkan.');
      router.refresh();
    });
  };

  const activeOpnameDiffCount =
    active_stock_opname?.items.filter((item) => item.diff_qty !== 0).length ?? 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Stok Opname Aktif</CardTitle>
          {active_stock_opname ? (
            <Badge variant="secondary">
              Aktif: {active_stock_opname.stock_opname_id.slice(0, 8)}
            </Badge>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {!active_stock_opname ? (
            can_write ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="text-sm font-medium">Catatan (opsional)</div>
                  <Textarea
                    rows={2}
                    value={startOpnameNote}
                    onChange={(event) =>
                      setStartOpnameNote(event.currentTarget.value)
                    }
                    placeholder="Catatan stok opname"
                    disabled={isPending}
                  />
                </div>

                <Button
                  onClick={handleStartStockOpname}
                  isLoading={isPending}
                  loadingText="Memulai opname..."
                >
                  Mulai Stok Opname
                </Button>
              </div>
            ) : (
              <div className="text-muted-foreground text-sm">
                Belum ada stok opname aktif.
              </div>
            )
          ) : (
            <div className="space-y-4">
              <div className="text-muted-foreground text-sm">
                Dimulai: {formatDateTime(new Date(active_stock_opname.started_at))}
                {active_stock_opname.note ? ` • ${active_stock_opname.note}` : ''}
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Varian</TableHead>
                      <TableHead className="text-right">Sistem</TableHead>
                      <TableHead className="text-right">Hitung Fisik</TableHead>
                      <TableHead className="text-right">Selisih</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {active_stock_opname.items.map((item) => {
                      const countedQty =
                        countedQtyByItemId[item.stock_opname_item_id] ??
                        item.counted_qty;
                      const diffQty = countedQty - item.system_qty;

                      return (
                        <TableRow key={item.stock_opname_item_id}>
                          <TableCell>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium">
                                {item.product_label}
                              </div>
                              <div className="text-muted-foreground truncate text-xs">
                                {item.variant_label}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {item.system_qty.toLocaleString('id-ID')}
                          </TableCell>
                          <TableCell>
                            <div className="ml-auto w-36">
                              <NumberInput
                                value={countedQty}
                                onValueChange={(value) => {
                                  setCountedQtyByItemId((current) => ({
                                    ...current,
                                    [item.stock_opname_item_id]: value,
                                  }));
                                }}
                                decimalScale={2}
                                allowNegative={false}
                                disabled={!can_write}
                              />
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={
                                diffQty > 0
                                  ? 'text-emerald-600'
                                  : diffQty < 0
                                    ? 'text-destructive'
                                    : 'text-muted-foreground'
                              }
                            >
                              {diffQty.toLocaleString('id-ID')}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {can_write ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleSaveCountedQty(item.stock_opname_item_id)
                                }
                                disabled={isPending}
                              >
                                Simpan
                              </Button>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="text-muted-foreground text-sm">
                Item selisih: {activeOpnameDiffCount} dari{' '}
                {active_stock_opname.items.length}
              </div>

              {can_write ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={handleFinalizeStockOpname}
                    isLoading={isPending}
                    loadingText="Memproses finalisasi..."
                  >
                    Finalisasi Opname
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleVoidStockOpname}
                    disabled={isPending}
                  >
                    Batalkan Opname
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Riwayat Stok Opname Terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mulai</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Item</TableHead>
                  <TableHead className="text-right">Item Selisih</TableHead>
                  <TableHead>Catatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stock_opnames.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground text-center">
                      Belum ada stok opname.
                    </TableCell>
                  </TableRow>
                ) : (
                  stock_opnames.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-xs">
                        {formatDateTime(new Date(row.started_at))}
                      </TableCell>
                      <TableCell>
                        <OpnameStatusBadge status={row.status} />
                      </TableCell>
                      <TableCell className="text-right">{row.item_count}</TableCell>
                      <TableCell className="text-right">{row.diff_item_count}</TableCell>
                      <TableCell className="text-muted-foreground max-w-xs truncate text-xs">
                        {row.note ?? '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
