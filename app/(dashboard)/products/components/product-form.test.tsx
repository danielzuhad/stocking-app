import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';

import { PRODUCT_STATUS_ACTIVE } from '@/lib/products/enums';
import type { ProductFormValuesType } from '@/lib/validation/products';

import { ProductForm } from './product-form';

const pushMock = jest.fn();
const refreshMock = jest.fn();
const createProductActionMock = jest.fn();
const updateProductActionMock = jest.fn();
const deleteProductActionMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}));

jest.mock('../actions', () => ({
  createProductAction: (...args: unknown[]) => createProductActionMock(...args),
  updateProductAction: (...args: unknown[]) => updateProductActionMock(...args),
  deleteProductAction: (...args: unknown[]) => deleteProductActionMock(...args),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/components/ui/image-preview-dialog', () => ({
  ImagePreviewDialog: () => (
    <div data-testid="product-image-preview-dialog">Image Preview Dialog</div>
  ),
}));

jest.mock('@/components/ui/delete-button', () => ({
  DeleteButton: () => (
    <button type="button" data-testid="product-delete-button">
      Delete Product
    </button>
  ),
}));

function buildInitialValues(
  overrides?: Partial<ProductFormValuesType>,
): ProductFormValuesType {
  return {
    name: 'Produk Lama',
    category: 'GENERAL',
    unit: 'PCS',
    status: PRODUCT_STATUS_ACTIVE,
    image: null,
    has_variants: false,
    variants: [
      {
        name: '',
        selling_price: 0,
        sku: '',
        barcode: '',
        is_default: true,
      },
    ],
    ...overrides,
  };
}

describe('ProductForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createProductActionMock.mockResolvedValue({
      ok: true,
      data: { product_id: 'product-1' },
    });
    updateProductActionMock.mockResolvedValue({
      ok: true,
      data: { product_id: 'product-1' },
    });
    deleteProductActionMock.mockResolvedValue({
      ok: true,
      data: { product_id: 'product-1' },
    });
  });

  it('renders create mode with locked category and one starter variant row', () => {
    render(<ProductForm mode="create" />);
    const categoryInput = screen.getByRole('combobox', { name: 'Kategori' });

    expect(screen.getByLabelText('Nama produk')).toBeInTheDocument();
    expect(categoryInput).toBeDisabled();
    expect(categoryInput).toHaveTextContent('General');
    expect(screen.getByText('Varian 1')).toBeInTheDocument();
    expect(screen.queryByText('Varian 2')).not.toBeInTheDocument();
  });

  it('allows adding a new variant row', async () => {
    const user = userEvent.setup();
    render(<ProductForm mode="create" />);

    await user.click(screen.getByRole('button', { name: 'Tambah varian' }));

    expect(screen.getByText('Varian 2')).toBeInTheDocument();
  });

  it('keeps at least one variant row when user deletes the only row', async () => {
    const user = userEvent.setup();
    render(<ProductForm mode="create" />);

    expect(screen.getAllByPlaceholderText('Contoh: Hitam / L')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Hapus' }));

    await waitFor(() => {
      expect(screen.getAllByPlaceholderText('Contoh: Hitam / L')).toHaveLength(1);
    });
  });

  it('submits create payload without variants when variant row stays blank', async () => {
    const user = userEvent.setup();
    render(<ProductForm mode="create" />);

    await user.type(screen.getByLabelText('Nama produk'), 'Kaos Basic');
    await user.click(screen.getByRole('button', { name: 'Simpan produk' }));

    await waitFor(() => {
      expect(createProductActionMock).toHaveBeenCalledTimes(1);
    });

    const payload = createProductActionMock.mock.calls[0]?.[0] as {
      name: string;
      category: string;
      has_variants: boolean;
      variants: unknown[];
    };

    expect(payload.name).toBe('Kaos Basic');
    expect(payload.category).toBe('GENERAL');
    expect(payload.has_variants).toBe(false);
    expect(payload.variants).toEqual([]);
    expect(updateProductActionMock).not.toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith('/products');
    expect(refreshMock).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('Produk berhasil dibuat.');
  });

  it('submits create payload with variant mode when variant has data', async () => {
    const user = userEvent.setup();
    render(<ProductForm mode="create" />);

    await user.type(screen.getByLabelText('Nama produk'), 'Serum Wajah');
    await user.type(screen.getByLabelText('Nama varian'), '50ml');

    const sellingPriceInput = screen.getByLabelText('Harga jual');
    await user.clear(sellingPriceInput);
    await user.type(sellingPriceInput, '120000');

    await user.click(screen.getByRole('button', { name: 'Simpan produk' }));

    await waitFor(() => {
      expect(createProductActionMock).toHaveBeenCalledTimes(1);
    });

    const payload = createProductActionMock.mock.calls[0]?.[0] as {
      has_variants: boolean;
      variants: Array<{
        name: string;
        selling_price: number;
        is_default: boolean;
      }>;
    };

    expect(payload.has_variants).toBe(true);
    expect(payload.variants).toHaveLength(1);
    expect(payload.variants[0]).toMatchObject({
      name: '50ml',
      selling_price: 120000,
      is_default: true,
    });
  });

  it('uses update action on edit mode and shows delete action', async () => {
    const user = userEvent.setup();
    render(
      <ProductForm
        mode="edit"
        product_id="product-1"
        initial_values={buildInitialValues()}
      />,
    );

    expect(screen.getByTestId('product-delete-button')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Nama produk'));
    await user.type(screen.getByLabelText('Nama produk'), 'Produk Update');
    await user.click(screen.getByRole('button', { name: 'Simpan perubahan' }));

    await waitFor(() => {
      expect(updateProductActionMock).toHaveBeenCalledTimes(1);
    });

    const payload = updateProductActionMock.mock.calls[0]?.[0] as {
      product_id: string;
      name: string;
    };

    expect(payload.product_id).toBe('product-1');
    expect(payload.name).toBe('Produk Update');
    expect(createProductActionMock).not.toHaveBeenCalled();
  });

  it('shows validation error when selected file is not an image', async () => {
    const { container } = render(<ProductForm mode="create" />);
    const fileInput = container.querySelector('input[type="file"]');

    expect(fileInput).toBeInTheDocument();
    if (!fileInput) return;

    const invalidFile = new File(['not-an-image'], 'bad.txt', {
      type: 'text/plain',
    });
    fireEvent.change(fileInput, {
      target: { files: [invalidFile] },
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('File harus berupa gambar.');
    });
  });
});
