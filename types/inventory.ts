export type StockMovementType =
  typeof import('@/db/schema').stockMovements.$inferSelect;

export type ReceivingType = typeof import('@/db/schema').receivings.$inferSelect;
export type ReceivingItemType =
  typeof import('@/db/schema').receivingItems.$inferSelect;

export type StockAdjustmentType =
  typeof import('@/db/schema').stockAdjustments.$inferSelect;
export type StockAdjustmentItemType =
  typeof import('@/db/schema').stockAdjustmentItems.$inferSelect;

export type StockOpnameType = typeof import('@/db/schema').stockOpnames.$inferSelect;
export type StockOpnameItemType =
  typeof import('@/db/schema').stockOpnameItems.$inferSelect;

/** Serializable row shape for inventory stock table. */
export type InventoryStockRowType = {
  product_variant_id: string;
  product_id: string;
  product_name: string;
  variant_name: string;
  sku: string | null;
  barcode: string | null;
  current_qty: number;
  updated_at: string;
};

/** Option row for inventory item selectors. */
export type InventoryVariantOptionType = {
  product_id: string;
  product_variant_id: string;
  product_label: string;
  variant_label: string;
  sku: string | null;
  barcode: string | null;
};

/** Serializable row shape for receiving history list. */
export type ReceivingRowType = Pick<ReceivingType, 'id' | 'status' | 'note'> & {
  created_at: string;
  posted_at: string | null;
  item_count: number;
  total_qty: number;
};

/** Serializable row shape for stock adjustment history list. */
export type StockAdjustmentRowType =
  Pick<StockAdjustmentType, 'id' | 'reason' | 'note'> & {
    created_at: string;
    item_count: number;
    total_qty_diff: number;
  };

/** Serializable row shape for stock opname history list. */
export type StockOpnameRowType = Pick<StockOpnameType, 'id' | 'status' | 'note'> & {
  started_at: string;
  finalized_at: string | null;
  item_count: number;
  diff_item_count: number;
};

/** Serializable row shape for active stock opname items. */
export type ActiveStockOpnameItemRowType = {
  stock_opname_item_id: string;
  product_variant_id: string;
  product_label: string;
  variant_label: string;
  system_qty: number;
  counted_qty: number;
  diff_qty: number;
};

/** Serializable shape for active stock opname detail. */
export type ActiveStockOpnameType = {
  stock_opname_id: string;
  status: StockOpnameType['status'];
  note: string | null;
  started_at: string;
  items: ActiveStockOpnameItemRowType[];
};
