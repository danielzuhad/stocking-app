import { z } from 'zod';

import {
  RECEIVING_STATUS_DRAFT,
  RECEIVING_STATUS_POSTED,
} from '@/lib/inventory/enums';

function optionalTrimmedText(maxLength: number) {
  return z.string().trim().max(maxLength).optional();
}

/** Allowed status options during receiving creation flow. */
export const RECEIVING_CREATE_STATUS_OPTIONS = [
  RECEIVING_STATUS_DRAFT,
  RECEIVING_STATUS_POSTED,
] as const;

const createReceivingStatusSchema = z.enum(RECEIVING_CREATE_STATUS_OPTIONS);

/** Item input schema for receiving draft creation. */
export const receivingItemInputSchema = z.object({
  product_variant_id: z.string().uuid(),
  qty: z
    .number()
    .positive('Qty penerimaan harus lebih dari 0.')
    .max(999999999999.99, 'Qty terlalu besar.'),
  note: optionalTrimmedText(300),
});

/** Validation schema for creating receiving draft. */
export const createReceivingDraftSchema = z.object({
  status: createReceivingStatusSchema.default(RECEIVING_STATUS_DRAFT),
  note: optionalTrimmedText(500),
  items: z
    .array(receivingItemInputSchema)
    .min(1, 'Minimal satu item penerimaan.')
    .max(100, 'Maksimal 100 item penerimaan.'),
});

/** Validation schema for receiving draft dialog form (single row input). */
export const createReceivingDraftFormSchema = z.object({
  product_id: z.string().uuid('Produk wajib dipilih.'),
  product_variant_id: z.string().uuid('Varian produk wajib dipilih.'),
  status: createReceivingStatusSchema,
  qty: z
    .number()
    .positive('Qty penerimaan harus lebih dari 0.')
    .max(999999999999.99, 'Qty terlalu besar.'),
  note: optionalTrimmedText(500),
});

/** Validation schema for multi-item receiving create page form. */
export const createReceivingFormSchema = z.object({
  status: createReceivingStatusSchema,
  note: optionalTrimmedText(500),
  items: z
    .array(
      z.object({
        product_id: z.string().uuid('Produk wajib dipilih.'),
        product_variant_id: z.string().uuid('Varian produk wajib dipilih.'),
        qty: z
          .number()
          .positive('Qty penerimaan harus lebih dari 0.')
          .max(999999999999.99, 'Qty terlalu besar.'),
        note: optionalTrimmedText(300),
      }),
    )
    .min(1, 'Minimal satu item penerimaan.')
    .max(100, 'Maksimal 100 item penerimaan.'),
});

/** Validation schema for receiving lifecycle actions (`POSTED` / `VOID`). */
export const receivingLifecycleSchema = z.object({
  receiving_id: z.string().uuid(),
});

/** Item input schema for stock adjustment creation. */
export const stockAdjustmentItemSchema = z.object({
  product_variant_id: z.string().uuid(),
  qty_diff: z
    .number()
    .min(-999999999999.99, 'Qty penyesuaian terlalu kecil.')
    .max(999999999999.99, 'Qty penyesuaian terlalu besar.')
    .refine((value) => value !== 0, {
      message: 'Qty penyesuaian tidak boleh 0.',
    }),
  note: optionalTrimmedText(300),
});

/** Validation schema for posting stock adjustment. */
export const createStockAdjustmentSchema = z.object({
  reason: z.string().trim().min(1, 'Alasan penyesuaian wajib diisi.').max(160),
  note: optionalTrimmedText(500),
  items: z
    .array(stockAdjustmentItemSchema)
    .min(1, 'Minimal satu item penyesuaian.')
    .max(100, 'Maksimal 100 item penyesuaian.'),
});

/** Validation schema for starting stock opname. */
export const startStockOpnameSchema = z.object({
  note: optionalTrimmedText(500),
});

/** Validation schema for updating counted quantity in active stock opname. */
export const updateStockOpnameItemSchema = z.object({
  stock_opname_id: z.string().uuid(),
  stock_opname_item_id: z.string().uuid(),
  counted_qty: z
    .number()
    .min(0, 'Qty hitung fisik tidak boleh negatif.')
    .max(999999999999.99, 'Qty hitung fisik terlalu besar.'),
});

/** Validation schema for finalizing stock opname. */
export const finalizeStockOpnameSchema = z.object({
  stock_opname_id: z.string().uuid(),
});

/** Validation schema for voiding active stock opname. */
export const voidStockOpnameSchema = z.object({
  stock_opname_id: z.string().uuid(),
});

export type CreateReceivingDraftInputType = z.infer<
  typeof createReceivingDraftSchema
>;
export type CreateReceivingDraftFormInputType = z.infer<
  typeof createReceivingDraftFormSchema
>;
export type CreateReceivingFormInputType = z.infer<typeof createReceivingFormSchema>;
export type CreateStockAdjustmentInputType = z.infer<
  typeof createStockAdjustmentSchema
>;
export type StartStockOpnameInputType = z.infer<typeof startStockOpnameSchema>;
