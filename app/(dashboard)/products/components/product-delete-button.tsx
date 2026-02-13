'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

import { deleteProductAction } from '../actions';

/**
 * Confirmed delete button for soft-deleting a product.
 */
export function ProductDeleteButton({
  product_id,
  product_name,
  redirect_to,
  trigger_label = 'Hapus',
  trigger_variant = 'destructive',
  trigger_size = 'sm',
}: {
  product_id: string;
  product_name: string;
  redirect_to?: string;
  trigger_label?: string;
  trigger_variant?: React.ComponentProps<typeof Button>['variant'];
  trigger_size?: React.ComponentProps<typeof Button>['size'];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant={trigger_variant} size={trigger_size}>
          {trigger_label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus produk ini?</AlertDialogTitle>
          <AlertDialogDescription>
            Produk <strong>{product_name}</strong> akan di-soft delete bersama
            varian terkait. Riwayat audit tetap tersimpan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              startTransition(async () => {
                const result = await deleteProductAction({ product_id });
                if (!result.ok) {
                  toast.error(result.error.message);
                  return;
                }

                toast.success('Produk berhasil dihapus.');
                setOpen(false);

                if (redirect_to) {
                  router.push(redirect_to);
                } else {
                  router.refresh();
                }
              });
            }}
            disabled={isPending}
          >
            {isPending ? 'Menghapus...' : 'Ya, hapus'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
