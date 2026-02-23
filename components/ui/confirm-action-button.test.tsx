import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';

import { ConfirmActionButton } from './confirm-action-button';

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('ConfirmActionButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('executes action only after confirmation and calls success callback', async () => {
    const user = userEvent.setup();
    const actionMock = jest.fn().mockResolvedValue({
      ok: true,
      data: { id: 'abc' },
    });
    const onSuccessMock = jest.fn();

    render(
      <ConfirmActionButton
        action={actionMock}
        title="Posting dokumen ini?"
        description="Dokumen akan diposting."
        trigger_label="Posting"
        confirm_label="Ya, posting"
        on_success={onSuccessMock}
        success_toast_message="Posting berhasil."
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Posting' }));
    expect(actionMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Ya, posting' }));

    await waitFor(() => {
      expect(actionMock).toHaveBeenCalledTimes(1);
    });
    expect(toast.success).toHaveBeenCalledWith('Posting berhasil.');
    expect(onSuccessMock).toHaveBeenCalledWith({ id: 'abc' });
  });

  it('shows error toast when action returns failed ActionResult', async () => {
    const user = userEvent.setup();
    const actionMock = jest.fn().mockResolvedValue({
      ok: false,
      error: {
        code: 'CONFLICT',
        message: 'Dokumen tidak bisa diproses.',
      },
    });

    render(
      <ConfirmActionButton
        action={actionMock}
        title="Batalkan dokumen ini?"
        description="Dokumen akan dibatalkan."
        trigger_label="Batalkan"
        trigger_variant="destructive"
        confirm_variant="destructive"
        confirm_label="Ya, batalkan"
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Batalkan' }));
    await user.click(screen.getByRole('button', { name: 'Ya, batalkan' }));

    await waitFor(() => {
      expect(actionMock).toHaveBeenCalledTimes(1);
    });
    expect(toast.error).toHaveBeenCalledWith('Dokumen tidak bisa diproses.');
    expect(toast.success).not.toHaveBeenCalled();
  });
});
