import {
  createReceivingDraftSchema,
  createReceivingFormSchema,
  createStockAdjustmentSchema,
  updateStockOpnameItemSchema,
} from './inventory';

describe('createReceivingDraftSchema', () => {
  it('accepts valid payload with one item', () => {
    const parsed = createReceivingDraftSchema.safeParse({
      note: 'Penerimaan awal',
      items: [
        {
          product_variant_id: '550e8400-e29b-41d4-a716-446655440000',
          qty: 12,
        },
      ],
    });

    expect(parsed.success).toBe(true);
  });

  it('defaults status to DRAFT when omitted', () => {
    const parsed = createReceivingDraftSchema.safeParse({
      items: [
        {
          product_variant_id: '550e8400-e29b-41d4-a716-446655440000',
          qty: 2,
        },
      ],
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data.status).toBe('DRAFT');
  });

  it('rejects receiving status outside DRAFT/POSTED', () => {
    const parsed = createReceivingDraftSchema.safeParse({
      status: 'VOID',
      items: [
        {
          product_variant_id: '550e8400-e29b-41d4-a716-446655440000',
          qty: 2,
        },
      ],
    });

    expect(parsed.success).toBe(false);
  });

  it('rejects empty items', () => {
    const parsed = createReceivingDraftSchema.safeParse({
      items: [],
    });

    expect(parsed.success).toBe(false);
  });
});

describe('createReceivingFormSchema', () => {
  it('accepts valid multi-item payload', () => {
    const parsed = createReceivingFormSchema.safeParse({
      status: 'POSTED',
      note: 'Penerimaan gabungan',
      items: [
        {
          product_id: '550e8400-e29b-41d4-a716-446655440111',
          product_variant_id: '550e8400-e29b-41d4-a716-446655440000',
          qty: 2,
          note: 'Item A',
        },
        {
          product_id: '550e8400-e29b-41d4-a716-446655440222',
          product_variant_id: '550e8400-e29b-41d4-a716-446655440001',
          qty: 4,
        },
      ],
    });

    expect(parsed.success).toBe(true);
  });

  it('rejects payload without items', () => {
    const parsed = createReceivingFormSchema.safeParse({
      status: 'DRAFT',
      items: [],
    });

    expect(parsed.success).toBe(false);
  });
});

describe('createStockAdjustmentSchema', () => {
  it('rejects zero qty diff', () => {
    const parsed = createStockAdjustmentSchema.safeParse({
      reason: 'Fix',
      items: [
        {
          product_variant_id: '550e8400-e29b-41d4-a716-446655440000',
          qty_diff: 0,
        },
      ],
    });

    expect(parsed.success).toBe(false);
  });

  it('accepts positive/negative qty diff', () => {
    const positive = createStockAdjustmentSchema.safeParse({
      reason: 'Tambah stok',
      items: [
        {
          product_variant_id: '550e8400-e29b-41d4-a716-446655440000',
          qty_diff: 2,
        },
      ],
    });

    const negative = createStockAdjustmentSchema.safeParse({
      reason: 'Kurangi stok',
      items: [
        {
          product_variant_id: '550e8400-e29b-41d4-a716-446655440000',
          qty_diff: -2,
        },
      ],
    });

    expect(positive.success).toBe(true);
    expect(negative.success).toBe(true);
  });
});

describe('updateStockOpnameItemSchema', () => {
  it('rejects negative counted qty', () => {
    const parsed = updateStockOpnameItemSchema.safeParse({
      stock_opname_id: '550e8400-e29b-41d4-a716-446655440000',
      stock_opname_item_id: '550e8400-e29b-41d4-a716-446655440001',
      counted_qty: -1,
    });

    expect(parsed.success).toBe(false);
  });
});
