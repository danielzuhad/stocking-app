import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';

import { DeleteButton } from './delete-button';

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('DeleteButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows success toast and calls on_success when action succeeds', async () => {
    const user = userEvent.setup();
    const actionMock = jest.fn().mockResolvedValue({
      ok: true,
      data: { id: '1' },
    });
    const onSuccessMock = jest.fn();

    render(
      <DeleteButton
        action={actionMock}
        title="Hapus data?"
        description="Data akan dihapus."
        on_success={onSuccessMock}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Hapus' }));
    await user.click(screen.getByRole('button', { name: 'Ya, hapus' }));

    await waitFor(() => {
      expect(actionMock).toHaveBeenCalledTimes(1);
    });
    expect(toast.success).toHaveBeenCalledWith('Data berhasil dihapus.');
    expect(onSuccessMock).toHaveBeenCalledWith({ id: '1' });
  });

  it('shows error toast when action returns failed ActionResult', async () => {
    const user = userEvent.setup();
    const actionMock = jest.fn().mockResolvedValue({
      ok: false,
      error: {
        code: 'INTERNAL',
        message: 'Gagal hapus data.',
      },
    });

    render(
      <DeleteButton
        action={actionMock}
        title="Hapus data?"
        description="Data akan dihapus."
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Hapus' }));
    await user.click(screen.getByRole('button', { name: 'Ya, hapus' }));

    await waitFor(() => {
      expect(actionMock).toHaveBeenCalledTimes(1);
    });
    expect(toast.error).toHaveBeenCalledWith('Gagal hapus data.');
    expect(toast.success).not.toHaveBeenCalled();
  });
});
