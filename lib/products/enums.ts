import {
  PRODUCT_CATEGORY_OPTIONS,
  PRODUCT_DEFAULT_CATEGORY,
  PRODUCT_DEFAULT_STATUS,
  PRODUCT_DEFAULT_UNIT,
  PRODUCT_STATUS_ACTIVE,
  PRODUCT_STATUS_INACTIVE,
  PRODUCT_STATUS_OPTIONS,
  PRODUCT_UNIT_OPTIONS,
  type ProductCategoryType,
  type ProductStatusType,
  type ProductUnitType,
} from '@/db/schema/product-enums';

/**
 * Shared product enum values sourced from Drizzle enum declarations.
 */
export const PRODUCT_ENUM_VALUES = {
  category: PRODUCT_CATEGORY_OPTIONS,
  status: PRODUCT_STATUS_OPTIONS,
  unit: PRODUCT_UNIT_OPTIONS,
} as const;

export type { ProductCategoryType, ProductStatusType, ProductUnitType };

/** User-friendly labels for product category enum values. */
export const PRODUCT_CATEGORY_LABELS: Record<ProductCategoryType, string> = {
  FASHION: 'Fashion',
  COSMETIC: 'Kosmetik',
  GENERAL: 'Umum',
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

export {
  PRODUCT_CATEGORY_OPTIONS,
  PRODUCT_DEFAULT_CATEGORY,
  PRODUCT_DEFAULT_STATUS,
  PRODUCT_DEFAULT_UNIT,
  PRODUCT_STATUS_ACTIVE,
  PRODUCT_STATUS_INACTIVE,
  PRODUCT_STATUS_OPTIONS,
  PRODUCT_UNIT_OPTIONS,
};
