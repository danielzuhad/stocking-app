'use client';

import { useRouter } from 'next/navigation';
import * as React from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { InventoryVariantOptionType } from '@/types';

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

/** Dialog trigger for posting stock adjustment directly from adjustments page. */
export function CreateAdjustmentDialog({
  variant_options,
}: {
  variant_options: InventoryVariantOptionType[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const [adjustmentVariantId, setAdjustmentVariantId] = React.useState(
    variant_options[0]?.product_variant_id ?? '',
  );
  const [adjustmentQtyDiff, setAdjustmentQtyDiff] = React.useState(0);
  const [adjustmentReason, setAdjustmentReason] = React.useState('Koreksi stok');
  const [adjustmentNote, setAdjustmentNote] = React.useState('');

  const resetForm = React.useCallback(() => {
    setAdjustmentVariantId(variant_options[0]?.product_variant_id ?? '');
    setAdjustmentQtyDiff(0);
    setAdjustmentReason('Koreksi stok');
    setAdjustmentNote('');
  }, [variant_options]);

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

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (!nextOpen && !isPending) {
        resetForm();
      }
    },
    [isPending, resetForm],
  );

  const handleSubmit = React.useCallback(() => {
    if (!adjustmentVariantId) {
      toast.error('Pilih varian produk terlebih dulu.');
      return;
    }

    if (!adjustmentReason.trim()) {
      toast.error('Alasan penyesuaian wajib diisi.');
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
      setOpen(false);
      resetForm();
      router.refresh();
    });
  }, [
    adjustmentNote,
    adjustmentQtyDiff,
    adjustmentReason,
    adjustmentVariantId,
    resetForm,
    router,
  ]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button disabled={variant_options.length === 0}>Buat Penyesuaian</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Buat Penyesuaian Stok</DialogTitle>
          <DialogDescription>
            Catat selisih stok sebagai event ADJUST dengan alasan yang jelas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="adjustment-variant" className="text-sm font-medium">
              Varian
            </label>
            <Select
              value={adjustmentVariantId}
              onValueChange={setAdjustmentVariantId}
              disabled={isPending || variant_options.length === 0}
            >
              <SelectTrigger id="adjustment-variant">
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
            <label htmlFor="adjustment-qty-diff" className="text-sm font-medium">
              Selisih Qty (+/-)
            </label>
            <NumberInput
              id="adjustment-qty-diff"
              value={adjustmentQtyDiff}
              onValueChange={setAdjustmentQtyDiff}
              decimalScale={2}
              allowNegative
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="adjustment-reason" className="text-sm font-medium">
              Alasan
            </label>
            <Input
              id="adjustment-reason"
              value={adjustmentReason}
              onChange={(event) => setAdjustmentReason(event.currentTarget.value)}
              placeholder="Alasan penyesuaian stok"
              disabled={isPending}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="adjustment-note" className="text-sm font-medium">
              Catatan (opsional)
            </label>
            <Textarea
              id="adjustment-note"
              rows={2}
              value={adjustmentNote}
              onChange={(event) => setAdjustmentNote(event.currentTarget.value)}
              placeholder="Catatan tambahan"
              disabled={isPending}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Batal
          </Button>
          <Button
            onClick={handleSubmit}
            isLoading={isPending}
            loadingText="Menyimpan penyesuaian..."
            disabled={variant_options.length === 0}
          >
            Posting Penyesuaian
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
