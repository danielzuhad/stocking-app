import { z } from 'zod';

/** Supported product categories for current MVP. */
export const PRODUCT_CATEGORY_OPTIONS = [
  'FASHION',
  'COSMETIC',
  'GENERAL',
] as const;

/** Supported product status values for current MVP. */
export const PRODUCT_STATUS_OPTIONS = ['ACTIVE', 'INACTIVE'] as const;

/**
 * Optional text validator (trimmed).
 *
 * Empty string normalization is handled at server action boundary.
 */
function optionalTrimmedText(maxLength: number) {
  return z.string().trim().max(maxLength).optional();
}

/** Single product image metadata stored in `products.image` JSONB column. */
export const productImageSchema = z.object({
  file_id: z.string().trim().min(1).max(255),
  url: z.string().url(),
  thumbnail_url: z.string().url().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

/** Variant form row schema used by create/edit product form. */
export const productVariantFormSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().max(120).optional(),
  selling_price: z
    .number()
    .min(0, 'Harga jual tidak boleh negatif.')
    .max(999999999999.99, 'Harga jual terlalu besar.'),
  sku: optionalTrimmedText(100),
  barcode: optionalTrimmedText(120),
  is_default: z.boolean().optional(),
});

/** Shared product form schema (create + update fields). */
export const productFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Nama produk wajib diisi.').max(160),
    category: z.enum(PRODUCT_CATEGORY_OPTIONS),
    unit: z.string().trim().min(1, 'Satuan wajib diisi.').max(40),
    status: z.enum(PRODUCT_STATUS_OPTIONS),
    image: productImageSchema.nullable(),
    has_variants: z.boolean(),
    variants: z
      .array(productVariantFormSchema)
      .max(50, 'Jumlah varian maksimal 50 per produk.'),
  })
  .superRefine((value, ctx) => {
    if (value.has_variants && value.variants.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['variants'],
        message: 'Tambahkan minimal satu varian.',
      });
    }

    if (value.has_variants) {
      value.variants.forEach((variant, index) => {
        if (!variant.name || variant.name.trim().length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['variants', index, 'name'],
            message: 'Nama varian wajib diisi.',
          });
        }
      });
    }

    const seenSku = new Set<string>();
    const seenBarcode = new Set<string>();
    value.variants.forEach((variant, index) => {
      const sku = variant.sku?.trim();
      if (sku) {
        if (seenSku.has(sku.toLowerCase())) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['variants', index, 'sku'],
            message: 'SKU duplikat di daftar varian.',
          });
        }
        seenSku.add(sku.toLowerCase());
      }

      const barcode = variant.barcode?.trim();
      if (barcode) {
        if (seenBarcode.has(barcode.toLowerCase())) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['variants', index, 'barcode'],
            message: 'Barcode duplikat di daftar varian.',
          });
        }
        seenBarcode.add(barcode.toLowerCase());
      }
    });
  });

export type ProductImageInputType = z.infer<typeof productImageSchema>;
export type ProductVariantFormValueType = z.infer<typeof productVariantFormSchema>;
export type ProductFormValuesType = z.infer<typeof productFormSchema>;

/** Validation schema for create product action. */
export const createProductSchema = productFormSchema;

/** Validation schema for update product action. */
export const updateProductSchema = productFormSchema.safeExtend({
  product_id: z.string().uuid(),
});

/** Validation schema for delete product action. */
export const deleteProductSchema = z.object({
  product_id: z.string().uuid(),
});
