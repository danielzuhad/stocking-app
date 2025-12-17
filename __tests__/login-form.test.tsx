import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { LoginForm } from '@/app/login/login-form';

describe('LoginForm', () => {
  it('renders username and password fields', () => {
    render(<LoginForm />);

    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Masuk' })).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.click(screen.getByRole('button', { name: 'Masuk' }));

    expect(await screen.findByText('Username wajib diisi')).toBeInTheDocument();
    expect(await screen.findByText('Password wajib diisi')).toBeInTheDocument();
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const passwordInput = screen.getByLabelText('Password');
    expect(passwordInput).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: 'Lihat password' }));
    expect(passwordInput).toHaveAttribute('type', 'text');

    await user.click(
      screen.getByRole('button', { name: 'Sembunyikan password' }),
    );
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('submits when values are provided', async () => {
    const user = userEvent.setup();
    const consoleSpy = jest
      .spyOn(console, 'log')
      .mockImplementation(() => undefined);

    render(<LoginForm />);

    await user.type(screen.getByLabelText('Username'), 'admin');
    await user.type(screen.getByLabelText('Password'), 'password');
    await user.click(screen.getByRole('button', { name: 'Masuk' }));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });
});
