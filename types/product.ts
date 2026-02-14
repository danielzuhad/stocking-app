export type ProductType = typeof import('@/db/schema').products.$inferSelect;

export type ProductVariantType =
  typeof import('@/db/schema').productVariants.$inferSelect;

/**
 * Serializable row shape used by products table UI/API response.
 */
export type ProductRowType = Pick<
  ProductType,
  'id' | 'company_id' | 'name' | 'category' | 'unit' | 'status'
> & {
  created_at: string;
  updated_at: string;
  variant_count: number;
  variant_names: string[];
};
