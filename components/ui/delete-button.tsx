'use client';

import * as React from 'react';
import { toast } from 'sonner';

import type { ActionResult } from '@/lib/actions/result';

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

type DeleteButtonActionType<TData> = () => Promise<ActionResult<TData>>;

type DeleteButtonProps<TData> = {
  /** Async delete mutation returning standardized ActionResult. */
  action: DeleteButtonActionType<TData>;
  /** Dialog title text/content. */
  title: React.ReactNode;
  /** Dialog description text/content. */
  description: React.ReactNode;
  /** Optional callback after delete succeeds. */
  on_success?: (data: TData) => void | Promise<void>;
  /** Trigger button label. */
  trigger_label?: string;
  /** Trigger button style variant. */
  trigger_variant?: React.ComponentProps<typeof Button>['variant'];
  /** Trigger button size. */
  trigger_size?: React.ComponentProps<typeof Button>['size'];
  /** Confirm button label in idle state. */
  confirm_label?: string;
  /** Confirm button label while mutation is pending. */
  confirm_pending_label?: string;
  /** Toast message shown on success. */
  success_toast_message?: string;
  /** Fallback toast message for unexpected failures. */
  internal_error_message?: string;
};

/**
 * Reusable destructive confirmation button with standardized ActionResult handling.
 */
export function DeleteButton<TData>({
  action,
  title,
  description,
  on_success,
  trigger_label = 'Hapus',
  trigger_variant = 'destructive',
  trigger_size = 'sm',
  confirm_label = 'Ya, hapus',
  confirm_pending_label = 'Menghapus...',
  success_toast_message = 'Data berhasil dihapus.',
  internal_error_message = 'Sedang ada gangguan sistem. Coba lagi beberapa saat.',
}: DeleteButtonProps<TData>) {
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
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              startTransition(() => {
                void (async () => {
                  try {
                    const result = await action();
                    if (!result.ok) {
                      toast.error(result.error.message);
                      return;
                    }

                    toast.success(success_toast_message);
                    setOpen(false);
                    await on_success?.(result.data);
                  } catch {
                    toast.error(internal_error_message);
                  }
                })();
              });
            }}
            disabled={isPending}
          >
            {isPending ? confirm_pending_label : confirm_label}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
