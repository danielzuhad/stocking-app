'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { formatDateTime } from '@/lib/utils';
import type { InventoryVariantOptionType, StockAdjustmentRowType } from '@/types';

import { createStockAdjustmentAction } from '../actions';

function buildVariantLabel(option: InventoryVariantOptionType): string {
  const codes = [option.sku, option.barcode].filter(Boolean).join(' • ');
  const variantPart =
    option.variant_label.toLowerCase() === 'default'
      ? option.product_label
      : `${option.product_label} - ${option.variant_label}`;

  if (!codes) return variantPart;
  return `${variantPart} (${codes})`;
}

/** Stock adjustment form + history panel. */
export function AdjustmentsPanel({
  can_write,
  variant_options,
  stock_adjustments,
}: {
  can_write: boolean;
  variant_options: InventoryVariantOptionType[];
  stock_adjustments: StockAdjustmentRowType[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  const [adjustmentVariantId, setAdjustmentVariantId] = React.useState(
    variant_options[0]?.product_variant_id ?? '',
  );
  const [adjustmentQtyDiff, setAdjustmentQtyDiff] = React.useState(0);
  const [adjustmentReason, setAdjustmentReason] = React.useState('Koreksi stok');
  const [adjustmentNote, setAdjustmentNote] = React.useState('');

  React.useEffect(() => {
    if (variant_options.length === 0) {
      setAdjustmentVariantId('');
      return;
    }

    if (
      !variant_options.some(
        (option) => option.product_variant_id === adjustmentVariantId,
      )
    ) {
      setAdjustmentVariantId(variant_options[0]!.product_variant_id);
    }
  }, [adjustmentVariantId, variant_options]);

  const submitStockAdjustment = () => {
    if (!adjustmentVariantId) {
      toast.error('Pilih varian produk terlebih dulu.');
      return;
    }

    if (adjustmentQtyDiff === 0) {
      toast.error('Selisih qty tidak boleh 0.');
      return;
    }

    startTransition(async () => {
      const result = await createStockAdjustmentAction({
        reason: adjustmentReason,
        note: adjustmentNote,
        items: [
          {
            product_variant_id: adjustmentVariantId,
            qty_diff: adjustmentQtyDiff,
          },
        ],
      });

      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }

      toast.success('Penyesuaian stok berhasil diposting.');
      setAdjustmentQtyDiff(0);
      setAdjustmentNote('');
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      {can_write ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Posting Penyesuaian Stok</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <div className="text-sm font-medium">Varian</div>
              <Select
                value={adjustmentVariantId}
                onValueChange={setAdjustmentVariantId}
                disabled={isPending || variant_options.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih varian" />
                </SelectTrigger>
                <SelectContent>
                  {variant_options.map((option) => (
                    <SelectItem
                      key={option.product_variant_id}
                      value={option.product_variant_id}
                    >
                      {buildVariantLabel(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <div className="text-sm font-medium">Selisih Qty (+/-)</div>
              <NumberInput
                value={adjustmentQtyDiff}
                onValueChange={setAdjustmentQtyDiff}
                decimalScale={2}
                allowNegative
              />
            </div>

            <div className="space-y-1">
              <div className="text-sm font-medium">Alasan</div>
              <Input
                value={adjustmentReason}
                onChange={(event) => setAdjustmentReason(event.currentTarget.value)}
                placeholder="Alasan penyesuaian stok"
                disabled={isPending}
              />
            </div>

            <div className="space-y-1">
              <div className="text-sm font-medium">Catatan (opsional)</div>
              <Textarea
                rows={2}
                value={adjustmentNote}
                onChange={(event) => setAdjustmentNote(event.currentTarget.value)}
                placeholder="Catatan tambahan"
                disabled={isPending}
              />
            </div>

            <Button
              onClick={submitStockAdjustment}
              isLoading={isPending}
              loadingText="Menyimpan penyesuaian..."
              disabled={variant_options.length === 0}
            >
              Posting Penyesuaian
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Riwayat Penyesuaian Terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Alasan</TableHead>
                  <TableHead className="text-right">Item</TableHead>
                  <TableHead className="text-right">Selisih</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stock_adjustments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground text-center">
                      Belum ada penyesuaian stok.
                    </TableCell>
                  </TableRow>
                ) : (
                  stock_adjustments.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-xs">
                        {formatDateTime(new Date(row.created_at))}
                      </TableCell>
                      <TableCell>
                        <div className="min-w-0">
                          <div className="truncate text-sm">{row.reason}</div>
                          <div className="text-muted-foreground truncate text-xs">
                            {row.note ?? '-'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{row.item_count}</TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            row.total_qty_diff > 0
                              ? 'text-emerald-600'
                              : row.total_qty_diff < 0
                                ? 'text-destructive'
                                : 'text-muted-foreground'
                          }
                        >
                          {row.total_qty_diff.toLocaleString('id-ID')}
                        </span>
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
