import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';

import { CreateAdjustmentDialog } from './create-adjustment-dialog';

const refreshMock = jest.fn();
const createStockAdjustmentActionMock = jest.fn();

const VARIANT_ID = '550e8400-e29b-41d4-a716-446655440001';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}));

jest.mock('../actions', () => ({
  createStockAdjustmentAction: (...args: unknown[]) =>
    createStockAdjustmentActionMock(...args),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const VARIANT_OPTIONS = [
  {
    product_id: '550e8400-e29b-41d4-a716-446655440111',
    product_variant_id: VARIANT_ID,
    product_label: 'Kaos Basic',
    variant_label: 'Hitam / M',
    sku: 'SKU-001',
    barcode: null,
  },
];

describe('CreateAdjustmentDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createStockAdjustmentActionMock.mockResolvedValue({
      ok: true,
      data: { stock_adjustment_id: 'adjustment-1' },
    });
  });

  it('submits stock adjustment from dialog', async () => {
    const user = userEvent.setup();

    render(<CreateAdjustmentDialog variant_options={VARIANT_OPTIONS} />);

    await user.click(screen.getByRole('button', { name: 'Buat Penyesuaian' }));

    const qtyInput = screen.getByLabelText('Selisih Qty (+/-)');
    await user.clear(qtyInput);
    await user.type(qtyInput, '5');

    await user.click(
      screen.getByRole('button', { name: 'Posting Penyesuaian' }),
    );

    await waitFor(() => {
      expect(createStockAdjustmentActionMock).toHaveBeenCalledTimes(1);
    });

    expect(createStockAdjustmentActionMock).toHaveBeenCalledWith({
      reason: 'Koreksi stok',
      note: '',
      items: [
        {
          product_variant_id: VARIANT_ID,
          qty_diff: 5,
        },
      ],
    });
    expect(toast.success).toHaveBeenCalledWith(
      'Penyesuaian stok berhasil diposting.',
    );
    expect(refreshMock).toHaveBeenCalled();
  });

  it('disables trigger when no variant options are available', () => {
    render(<CreateAdjustmentDialog variant_options={[]} />);

    expect(
      screen.getByRole('button', { name: 'Buat Penyesuaian' }),
    ).toBeDisabled();
  });
});
