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

type ConfirmActionButtonActionType<TData> = () => Promise<ActionResult<TData>>;

type ConfirmActionButtonPropsType<TData> = {
  /** Async mutation returning standardized ActionResult. */
  action: ConfirmActionButtonActionType<TData>;
  /** Dialog title text/content. */
  title: React.ReactNode;
  /** Dialog description text/content. */
  description: React.ReactNode;
  /** Optional callback after mutation succeeds. */
  on_success?: (data: TData) => void | Promise<void>;
  /** Trigger button label. */
  trigger_label: string;
  /** Trigger button style variant. */
  trigger_variant?: React.ComponentProps<typeof Button>['variant'];
  /** Trigger button size. */
  trigger_size?: React.ComponentProps<typeof Button>['size'];
  /** Confirm button style variant. */
  confirm_variant?: React.ComponentProps<typeof Button>['variant'];
  /** Confirm button label in idle state. */
  confirm_label?: string;
  /** Confirm button label while mutation is pending. */
  confirm_pending_label?: string;
  /** Cancel button label. */
  cancel_label?: string;
  /** Toast message shown on success. */
  success_toast_message?: string;
  /** Fallback toast message for unexpected failures. */
  internal_error_message?: string;
  /** Disables trigger while true. */
  disabled?: boolean;
};

/**
 * Reusable confirmation button with standardized ActionResult handling.
 *
 * Use this for any action that needs explicit user confirmation before mutation.
 */
export function ConfirmActionButton<TData>({
  action,
  title,
  description,
  on_success,
  trigger_label,
  trigger_variant = 'default',
  trigger_size = 'sm',
  confirm_variant = 'default',
  confirm_label = 'Ya, lanjutkan',
  confirm_pending_label = 'Memproses...',
  cancel_label = 'Batal',
  success_toast_message = 'Aksi berhasil diproses.',
  internal_error_message = 'Sedang ada gangguan sistem. Coba lagi beberapa saat.',
  disabled = false,
}: ConfirmActionButtonPropsType<TData>) {
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant={trigger_variant}
          size={trigger_size}
          disabled={disabled}
        >
          {trigger_label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {cancel_label}
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              variant={confirm_variant}
              disabled={isPending}
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
            >
              {isPending ? confirm_pending_label : confirm_label}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
