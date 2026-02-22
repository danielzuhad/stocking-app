import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';

import {
  CreateReceivingForm,
  resolveReceivingVariantSelection,
} from './create-receiving-form';

const refreshMock = jest.fn();
const pushMock = jest.fn();
const createReceivingDraftActionMock = jest.fn();

const PRODUCT_ONE_ID = '550e8400-e29b-41d4-a716-446655440111';
const PRODUCT_TWO_ID = '550e8400-e29b-41d4-a716-446655440222';
const VARIANT_ONE_ID = '550e8400-e29b-41d4-a716-446655440001';
const VARIANT_TWO_ID = '550e8400-e29b-41d4-a716-446655440002';
const VARIANT_THREE_ID = '550e8400-e29b-41d4-a716-446655440003';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}));

jest.mock('../actions', () => ({
  createReceivingDraftAction: (...args: unknown[]) =>
    createReceivingDraftActionMock(...args),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const VARIANT_OPTIONS = [
  {
    product_id: PRODUCT_ONE_ID,
    product_variant_id: VARIANT_ONE_ID,
    product_label: 'Kaos Basic',
    variant_label: 'Hitam / M',
    sku: 'SKU-001',
    barcode: null,
  },
  {
    product_id: PRODUCT_ONE_ID,
    product_variant_id: VARIANT_TWO_ID,
    product_label: 'Kaos Basic',
    variant_label: 'Putih / L',
    sku: 'SKU-002',
    barcode: null,
  },
  {
    product_id: PRODUCT_TWO_ID,
    product_variant_id: VARIANT_THREE_ID,
    product_label: 'Jaket Oversize',
    variant_label: 'Navy / XL',
    sku: 'SKU-003',
    barcode: null,
  },
];

describe('CreateReceivingForm', () => {
  beforeAll(() => {
    if (!HTMLElement.prototype.hasPointerCapture) {
      HTMLElement.prototype.hasPointerCapture = () => false;
    }
    if (!HTMLElement.prototype.setPointerCapture) {
      HTMLElement.prototype.setPointerCapture = () => {};
    }
    if (!HTMLElement.prototype.releasePointerCapture) {
      HTMLElement.prototype.releasePointerCapture = () => {};
    }
    if (!HTMLElement.prototype.scrollIntoView) {
      HTMLElement.prototype.scrollIntoView = () => {};
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    createReceivingDraftActionMock.mockResolvedValue({
      ok: true,
      data: {
        receiving_id: 'receiving-1',
        status: 'DRAFT',
      },
    });
  });

  it('submits single-item draft with default values', async () => {
    const user = userEvent.setup();

    render(<CreateReceivingForm variant_options={VARIANT_OPTIONS} />);
    await user.click(screen.getByRole('button', { name: 'Simpan Draf' }));

    await waitFor(() => {
      expect(createReceivingDraftActionMock).toHaveBeenCalledTimes(1);
    });

    expect(createReceivingDraftActionMock).toHaveBeenCalledWith({
      status: 'DRAFT',
      note: '',
      items: [
        {
          product_variant_id: VARIANT_ONE_ID,
          qty: 1,
          note: '',
        },
      ],
    });
    expect(toast.success).toHaveBeenCalledWith(
      'Draf barang masuk berhasil dibuat.',
    );
    expect(pushMock).toHaveBeenCalledWith('/inventory/receivings');
    expect(refreshMock).toHaveBeenCalled();
  });

  it('auto-resets variant when product changes', async () => {
    const variantOptionsByProduct = new Map([
      [PRODUCT_ONE_ID, [VARIANT_OPTIONS[0]!, VARIANT_OPTIONS[1]!]],
      [PRODUCT_TWO_ID, [VARIANT_OPTIONS[2]!]],
    ]);

    expect(
      resolveReceivingVariantSelection({
        product_id: PRODUCT_TWO_ID,
        current_variant_id: VARIANT_ONE_ID,
        variant_options_by_product: variantOptionsByProduct,
      }),
    ).toBe(VARIANT_THREE_ID);
  });

  it('submits multi-item draft receiving', async () => {
    const user = userEvent.setup();

    render(<CreateReceivingForm variant_options={VARIANT_OPTIONS} />);

    await user.click(screen.getByRole('button', { name: 'Tambah Item' }));

    const qtyInputs = screen.getAllByRole('textbox', { name: 'Qty' });
    await user.clear(qtyInputs[1]!);
    await user.type(qtyInputs[1]!, '5');

    await user.click(screen.getByRole('button', { name: 'Simpan Draf' }));

    await waitFor(() => {
      expect(createReceivingDraftActionMock).toHaveBeenCalledTimes(1);
    });

    expect(createReceivingDraftActionMock).toHaveBeenCalledWith({
      status: 'DRAFT',
      note: '',
      items: [
        {
          product_variant_id: VARIANT_ONE_ID,
          qty: 1,
          note: '',
        },
        {
          product_variant_id: VARIANT_ONE_ID,
          qty: 5,
          note: '',
        },
      ],
    });
    expect(toast.success).toHaveBeenCalledWith('Draf barang masuk berhasil dibuat.');
    expect(pushMock).toHaveBeenCalledWith('/inventory/receivings');
  });
});
