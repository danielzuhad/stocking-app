/**
 * Shared product enum values used by DB schema, validation, and UI.
 *
 * Keep all product enum values in this module so one change propagates
 * consistently across Drizzle schema + Zod + form components.
 */
export const PRODUCT_ENUM_VALUES = {
  category: ['FASHION', 'COSMETIC', 'GENERAL'],
  status: ['ACTIVE', 'INACTIVE'],
  unit: ['PCS', 'BOTTLE', 'PACK', 'BOX', 'SET', 'OTHER'],
} as const;

export type ProductCategoryType = (typeof PRODUCT_ENUM_VALUES.category)[number];
export type ProductStatusType = (typeof PRODUCT_ENUM_VALUES.status)[number];
export type ProductUnitType = (typeof PRODUCT_ENUM_VALUES.unit)[number];

/** User-friendly labels for product category enum values. */
export const PRODUCT_CATEGORY_LABELS: Record<ProductCategoryType, string> = {
  FASHION: 'Fashion',
  COSMETIC: 'Cosmetic',
  GENERAL: 'General',
};

/** User-friendly labels for product status enum values. */
export const PRODUCT_STATUS_LABELS: Record<ProductStatusType, string> = {
  ACTIVE: 'Aktif',
  INACTIVE: 'Nonaktif',
};

/** User-friendly labels for product unit enum values. */
export const PRODUCT_UNIT_LABELS: Record<ProductUnitType, string> = {
  PCS: 'Pcs',
  BOTTLE: 'Botol',
  PACK: 'Pack',
  BOX: 'Box',
  SET: 'Set',
  OTHER: 'Lainnya',
};

/** Locked category for current MVP phase. */
export const PRODUCT_DEFAULT_CATEGORY: ProductCategoryType = 'GENERAL';
/** Default unit used when creating new products. */
export const PRODUCT_DEFAULT_UNIT: ProductUnitType = 'PCS';
/** Default product status for new records. */
export const PRODUCT_DEFAULT_STATUS: ProductStatusType = 'ACTIVE';
