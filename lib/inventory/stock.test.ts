import {
  STOCK_MOVEMENT_ADJUST,
  STOCK_MOVEMENT_IN,
  STOCK_MOVEMENT_OUT,
} from '@/lib/inventory/enums';

import {
  findNegativeStockVariant,
  mergeVariantDiffs,
  toSignedStockDelta,
} from './stock';

describe('toSignedStockDelta', () => {
  it('returns positive qty for IN', () => {
    expect(toSignedStockDelta({ type: STOCK_MOVEMENT_IN, qty: 12 })).toBe(12);
  });

  it('returns negative qty for OUT', () => {
    expect(toSignedStockDelta({ type: STOCK_MOVEMENT_OUT, qty: 5 })).toBe(-5);
  });

  it('keeps signed qty for ADJUST', () => {
    expect(toSignedStockDelta({ type: STOCK_MOVEMENT_ADJUST, qty: -3 })).toBe(-3);
    expect(toSignedStockDelta({ type: STOCK_MOVEMENT_ADJUST, qty: 8 })).toBe(8);
  });
});

describe('mergeVariantDiffs', () => {
  it('sums duplicated variant entries into one map value', () => {
    const merged = mergeVariantDiffs([
      { product_variant_id: 'v1', qty_diff: 3 },
      { product_variant_id: 'v2', qty_diff: -1 },
      { product_variant_id: 'v1', qty_diff: 2 },
    ]);

    expect(merged.get('v1')).toBe(5);
    expect(merged.get('v2')).toBe(-1);
  });
});

describe('findNegativeStockVariant', () => {
  it('returns null when all resulting balances stay non-negative', () => {
    const current = new Map([
      ['v1', 10],
      ['v2', 2],
    ]);
    const diffs = new Map([
      ['v1', -3],
      ['v2', 1],
    ]);

    expect(findNegativeStockVariant(current, diffs)).toBeNull();
  });

  it('returns first variant causing negative stock', () => {
    const current = new Map([
      ['v1', 10],
      ['v2', 2],
    ]);
    const diffs = new Map([
      ['v1', -3],
      ['v2', -5],
    ]);

    expect(findNegativeStockVariant(current, diffs)).toEqual({
      product_variant_id: 'v2',
      next_qty: -3,
    });
  });
});
