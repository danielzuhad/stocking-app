import {
  STOCK_MOVEMENT_ADJUST,
  STOCK_MOVEMENT_IN,
  STOCK_MOVEMENT_OUT,
  type StockMovementTypeType,
} from '@/lib/inventory/enums';

/**
 * Converts movement type + qty into signed stock delta.
 *
 * Rules:
 * - `IN`: `+qty`
 * - `OUT`: `-qty`
 * - `ADJUST`: signed `qty` as-is
 */
export function toSignedStockDelta(input: {
  type: StockMovementTypeType;
  qty: number;
}): number {
  if (input.type === STOCK_MOVEMENT_IN) return input.qty;
  if (input.type === STOCK_MOVEMENT_OUT) return input.qty * -1;
  if (input.type === STOCK_MOVEMENT_ADJUST) return input.qty;
  return 0;
}

/**
 * Aggregates item diffs by variant id (sums duplicate entries safely).
 */
export function mergeVariantDiffs(
  diffs: Array<{ product_variant_id: string; qty_diff: number }>,
): Map<string, number> {
  const map = new Map<string, number>();

  for (const diff of diffs) {
    map.set(
      diff.product_variant_id,
      (map.get(diff.product_variant_id) ?? 0) + diff.qty_diff,
    );
  }

  return map;
}

/**
 * Checks whether applying diffs would produce negative stock.
 */
export function findNegativeStockVariant(
  currentBalances: Map<string, number>,
  diffs: Map<string, number>,
): { product_variant_id: string; next_qty: number } | null {
  for (const [product_variant_id, qty_diff] of diffs.entries()) {
    const currentQty = currentBalances.get(product_variant_id) ?? 0;
    const nextQty = currentQty + qty_diff;
    if (nextQty < 0) {
      return {
        product_variant_id,
        next_qty: nextQty,
      };
    }
  }

  return null;
}
