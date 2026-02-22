import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';

import { ReceivingsPanel } from './receivings-panel';

const refreshMock = jest.fn();
const postReceivingActionMock = jest.fn();
const voidReceivingActionMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}));

jest.mock('../actions', () => ({
  postReceivingAction: (...args: unknown[]) => postReceivingActionMock(...args),
  voidReceivingAction: (...args: unknown[]) => voidReceivingActionMock(...args),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const RECEIVING_ROWS = [
  {
    id: 'receiving-1',
    status: 'DRAFT' as const,
    note: 'Pengiriman pagi',
    created_at: '2026-02-22T10:00:00.000Z',
    posted_at: null,
    item_count: 1,
    total_qty: 12,
  },
];

describe('ReceivingsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    postReceivingActionMock.mockResolvedValue({
      ok: true,
      data: { receiving_id: 'receiving-1' },
    });
    voidReceivingActionMock.mockResolvedValue({
      ok: true,
      data: { receiving_id: 'receiving-1' },
    });
  });

  it('shows row actions for draft rows and posts receiving', async () => {
    const user = userEvent.setup();

    render(<ReceivingsPanel can_write receivings={RECEIVING_ROWS} />);

    await user.click(screen.getByRole('button', { name: 'Posting' }));

    await waitFor(() => {
      expect(postReceivingActionMock).toHaveBeenCalledTimes(1);
    });

    expect(postReceivingActionMock).toHaveBeenCalledWith({
      receiving_id: 'receiving-1',
    });
    expect(toast.success).toHaveBeenCalledWith(
      'Barang masuk berhasil diposting.',
    );
  });

  it('hides row write controls for read-only users', () => {
    render(<ReceivingsPanel can_write={false} receivings={RECEIVING_ROWS} />);

    expect(
      screen.queryByRole('button', { name: 'Posting' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Batalkan' }),
    ).not.toBeInTheDocument();
  });
});
