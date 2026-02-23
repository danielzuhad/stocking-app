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
const fetchReceivingVariantOptionsByProductActionMock = jest.fn();

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
  fetchReceivingVariantOptionsByProductAction: (...args: unknown[]) =>
    fetchReceivingVariantOptionsByProductActionMock(...args),
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
const PRODUCT_OPTIONS = [
  {
    product_id: PRODUCT_ONE_ID,
    product_label: 'Kaos Basic',
  },
  {
    product_id: PRODUCT_TWO_ID,
    product_label: 'Jaket Oversize',
  },
];

async function selectProductAndVariantForItem(
  user: ReturnType<typeof userEvent.setup>,
  itemIndex: number,
): Promise<void> {
  const productSelect = screen.getAllByRole('combobox', {
    name: 'Produk',
  })[itemIndex];
  if (!productSelect) throw new Error('Product select is not available.');

  await user.click(productSelect);
  await user.click(screen.getByRole('option', { name: 'Kaos Basic' }));
  await waitFor(() => {
    expect(
      fetchReceivingVariantOptionsByProductActionMock,
    ).toHaveBeenCalledWith({
      product_id: PRODUCT_ONE_ID,
    });
  });

  const variantSelect = screen.getAllByRole('combobox', {
    name: 'Varian',
  })[itemIndex];
  if (!variantSelect) throw new Error('Variant select is not available.');

  await waitFor(() => {
    expect(variantSelect).not.toBeDisabled();
  });

  await user.click(variantSelect);
  await user.click(screen.getByRole('option', { name: /Hitam \/ M/ }));
}

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
    fetchReceivingVariantOptionsByProductActionMock.mockImplementation(
      (input: { product_id: string }) => ({
        ok: true,
        data: VARIANT_OPTIONS.filter(
          (option) => option.product_id === input.product_id,
        ),
      }),
    );
  });

  it('keeps qty input empty initially and submits after user fills it', async () => {
    const user = userEvent.setup();

    render(<CreateReceivingForm product_options={PRODUCT_OPTIONS} />);
    const qtyInput = screen.getByRole('textbox', { name: 'Qty' });
    expect(qtyInput).toHaveValue('');

    await selectProductAndVariantForItem(user, 0);
    await user.type(qtyInput, '1');
    await user.click(screen.getByRole('button', { name: /Simpan/ }));

    await waitFor(() => {
      expect(createReceivingDraftActionMock).toHaveBeenCalledTimes(1);
    });

    expect(createReceivingDraftActionMock).toHaveBeenCalledWith({
      status: 'POSTED',
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

  it('does not show variant error right after product is selected', async () => {
    const user = userEvent.setup();
    let resolveVariantFetch:
      | ((value: { ok: true; data: typeof VARIANT_OPTIONS }) => void)
      | undefined;

    fetchReceivingVariantOptionsByProductActionMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveVariantFetch = resolve;
        }),
    );

    render(<CreateReceivingForm product_options={PRODUCT_OPTIONS} />);

    const productSelect = screen.getByRole('combobox', { name: 'Produk' });
    await user.click(productSelect);
    await user.click(screen.getByRole('option', { name: 'Kaos Basic' }));

    await waitFor(() => {
      expect(
        fetchReceivingVariantOptionsByProductActionMock,
      ).toHaveBeenCalledWith({
        product_id: PRODUCT_ONE_ID,
      });
    });

    expect(
      screen.queryByText('Varian produk wajib dipilih.'),
    ).not.toBeInTheDocument();

    resolveVariantFetch?.({
      ok: true,
      data: VARIANT_OPTIONS.filter(
        (option) => option.product_id === PRODUCT_ONE_ID,
      ),
    });

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Varian' })).not.toBeDisabled();
    });
  });

  it('clears variant when current variant does not match selected product', async () => {
    expect(
      resolveReceivingVariantSelection({
        current_variant_id: VARIANT_ONE_ID,
        variants: [VARIANT_OPTIONS[2]!],
      }),
    ).toBe('');
  });

  it('submits multi-item draft receiving', async () => {
    const user = userEvent.setup();

    render(<CreateReceivingForm product_options={PRODUCT_OPTIONS} />);

    await user.click(screen.getByRole('button', { name: 'Tambah Item' }));

    const qtyInputs = screen.getAllByRole('textbox', { name: 'Qty' });
    expect(qtyInputs[0]).toHaveValue('');
    expect(qtyInputs[1]).toHaveValue('');
    await selectProductAndVariantForItem(user, 0);
    await selectProductAndVariantForItem(user, 1);
    await user.type(qtyInputs[0]!, '1');
    await user.type(qtyInputs[1]!, '5');

    await user.click(screen.getByRole('button', { name: /Simpan/ }));

    await waitFor(() => {
      expect(createReceivingDraftActionMock).toHaveBeenCalledTimes(1);
    });

    expect(createReceivingDraftActionMock).toHaveBeenCalledWith({
      status: 'POSTED',
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
    expect(toast.success).toHaveBeenCalledWith(
      'Draf barang masuk berhasil dibuat.',
    );
    expect(pushMock).toHaveBeenCalledWith('/inventory/receivings');
  });
});
