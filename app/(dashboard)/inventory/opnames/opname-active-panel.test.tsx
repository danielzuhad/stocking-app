import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';

import { OpnameActivePanel } from './opname-active-panel';

const refreshMock = jest.fn();
const startStockOpnameActionMock = jest.fn();
const updateStockOpnameItemCountedQtyActionMock = jest.fn();
const finalizeStockOpnameActionMock = jest.fn();
const voidStockOpnameActionMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}));

jest.mock('../actions', () => ({
  startStockOpnameAction: (...args: unknown[]) =>
    startStockOpnameActionMock(...args),
  updateStockOpnameItemCountedQtyAction: (...args: unknown[]) =>
    updateStockOpnameItemCountedQtyActionMock(...args),
  finalizeStockOpnameAction: (...args: unknown[]) =>
    finalizeStockOpnameActionMock(...args),
  voidStockOpnameAction: (...args: unknown[]) =>
    voidStockOpnameActionMock(...args),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('OpnameActivePanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    startStockOpnameActionMock.mockResolvedValue({
      ok: true,
      data: { stock_opname_id: 'opname-1' },
    });
  });

  it('starts stock opname when there is no active opname', async () => {
    const user = userEvent.setup();

    render(<OpnameActivePanel can_write active_stock_opname={null} />);

    await user.type(screen.getByLabelText('Catatan (opsional)'), 'Cycle count Q1');
    await user.click(screen.getByRole('button', { name: 'Mulai Stok Opname' }));

    await waitFor(() => {
      expect(startStockOpnameActionMock).toHaveBeenCalledTimes(1);
    });

    expect(startStockOpnameActionMock).toHaveBeenCalledWith({
      note: 'Cycle count Q1',
    });
    expect(toast.success).toHaveBeenCalledWith(
      'Stok opname dimulai. Posting mutasi stok sekarang diblokir.',
    );
    expect(refreshMock).toHaveBeenCalled();
  });

  it('shows read-only message when user cannot write', () => {
    render(<OpnameActivePanel can_write={false} active_stock_opname={null} />);

    expect(
      screen.getByText('Anda tidak memiliki akses untuk memulai stok opname.'),
    ).toBeInTheDocument();
  });
});
