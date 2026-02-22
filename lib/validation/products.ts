import { z } from 'zod';

import {
  PRODUCT_DEFAULT_CATEGORY,
  PRODUCT_ENUM_VALUES,
} from '@/lib/products/enums';

/** Supported product categories (single source from shared enum values). */
export const PRODUCT_CATEGORY_OPTIONS = PRODUCT_ENUM_VALUES.category;
/** Supported product status values (single source from shared enum values). */
export const PRODUCT_STATUS_OPTIONS = PRODUCT_ENUM_VALUES.status;
/** Supported product unit values (single source from shared enum values). */
export const PRODUCT_UNIT_OPTIONS = PRODUCT_ENUM_VALUES.unit;
/** Category currently locked for this MVP phase. */
export const PRODUCT_LOCKED_CATEGORY = PRODUCT_DEFAULT_CATEGORY;

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
  opening_stock: z
    .number()
    .min(0, 'Stok awal tidak boleh negatif.')
    .max(999999999999.99, 'Stok awal terlalu besar.')
    .optional(),
  is_default: z.boolean().optional(),
});

/** Shared product form schema (create + update fields). */
export const productFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Nama produk wajib diisi.').max(160),
    category: z.enum(PRODUCT_CATEGORY_OPTIONS),
    unit: z.enum(PRODUCT_UNIT_OPTIONS),
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
export type ProductVariantFormValueType = z.infer<
  typeof productVariantFormSchema
>;
export type ProductFormValuesType = z.infer<typeof productFormSchema>;

/**
 * Returns one empty starter variant row for product form UX.
 */
export function createEmptyProductVariant(options?: {
  is_default?: boolean;
}): ProductVariantFormValueType {
  return {
    name: '',
    selling_price: 0,
    sku: '',
    barcode: '',
    opening_stock: 0,
    is_default: options?.is_default ?? false,
  };
}

/**
 * Checks whether variant row is still blank and can be ignored on submit.
 */
export function isProductVariantBlank(
  variant: ProductVariantFormValueType,
): boolean {
  return (
    !variant.name?.trim() &&
    !variant.sku?.trim() &&
    !variant.barcode?.trim() &&
    Number(variant.selling_price) === 0
  );
}

/**
 * Normalizes product form payload so one empty starter row does not force variant mode.
 */
export function normalizeProductFormPayload(
  values: ProductFormValuesType,
): ProductFormValuesType {
  const meaningfulVariants = values.variants.filter(
    (variant) => !isProductVariantBlank(variant),
  );

  if (meaningfulVariants.length === 0) {
    const fallbackOpeningStock = values.variants[0]?.opening_stock ?? 0;

    return {
      ...values,
      has_variants: false,
      variants:
        fallbackOpeningStock > 0
          ? [
              {
                ...createEmptyProductVariant({ is_default: true }),
                opening_stock: fallbackOpeningStock,
              },
            ]
          : [],
    };
  }

  const requestedDefaultIndex = meaningfulVariants.findIndex((variant) =>
    Boolean(variant.is_default),
  );
  const defaultIndex = requestedDefaultIndex >= 0 ? requestedDefaultIndex : 0;

  return {
    ...values,
    has_variants: true,
    variants: meaningfulVariants.map((variant, index) => ({
      ...variant,
      is_default: index === defaultIndex,
    })),
  };
}

type ProductVariantInferenceInputType = {
  is_default: boolean;
  name: string;
  selling_price: string | number;
  sku: string | null;
  barcode: string | null;
};

/**
 * Heuristic for deciding whether form should open in multi-variant mode.
 */
export function inferProductHasVariants(
  variants: ProductVariantInferenceInputType[],
): boolean {
  if (variants.length > 1) return true;
  if (variants.length === 0) return false;

  const [variant] = variants;
  if (!variant) return false;

  return (
    !variant.is_default ||
    variant.name !== 'Default' ||
    Number(variant.selling_price) !== 0 ||
    variant.sku !== null ||
    variant.barcode !== null
  );
}

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
