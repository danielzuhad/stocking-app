import { pgEnum } from 'drizzle-orm/pg-core';

/**
 * Drizzle enum declarations for product domain.
 *
 * This module is the single source of truth for enum values used by:
 * - database schema (Drizzle)
 * - validation
 * - UI labels/options
 */
export const productStatusEnum = pgEnum('product_status', ['ACTIVE', 'INACTIVE']);
export const productCategoryEnum = pgEnum('product_category', [
  'FASHION',
  'COSMETIC',
  'GENERAL',
]);
export const productUnitEnum = pgEnum('product_unit', [
  'PCS',
  'BOTTLE',
  'PACK',
  'BOX',
  'SET',
  'OTHER',
]);

/** Product category options derived directly from Drizzle enum declaration. */
export const PRODUCT_CATEGORY_OPTIONS = productCategoryEnum.enumValues;
/** Product status options derived directly from Drizzle enum declaration. */
export const PRODUCT_STATUS_OPTIONS = productStatusEnum.enumValues;
/** Product unit options derived directly from Drizzle enum declaration. */
export const PRODUCT_UNIT_OPTIONS = productUnitEnum.enumValues;

export type ProductCategoryType = (typeof PRODUCT_CATEGORY_OPTIONS)[number];
export type ProductStatusType = (typeof PRODUCT_STATUS_OPTIONS)[number];
export type ProductUnitType = (typeof PRODUCT_UNIT_OPTIONS)[number];

/** Stable product status constants. */
export const PRODUCT_STATUS_ACTIVE: ProductStatusType = 'ACTIVE';
export const PRODUCT_STATUS_INACTIVE: ProductStatusType = 'INACTIVE';

/** Locked/default category for current MVP phase. */
export const PRODUCT_DEFAULT_CATEGORY: ProductCategoryType = 'GENERAL';
/** Default unit used when creating new products. */
export const PRODUCT_DEFAULT_UNIT: ProductUnitType = 'PCS';
/** Default status for new product records. */
export const PRODUCT_DEFAULT_STATUS: ProductStatusType = PRODUCT_STATUS_ACTIVE;
