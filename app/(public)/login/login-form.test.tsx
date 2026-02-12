import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';

import { LoginForm } from '@/app/(public)/login/login-form';
import { AUTH_ERROR } from '@/lib/auth/errors';

const pushMock = jest.fn();
const refreshMock = jest.fn();
const signInMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
  useSearchParams: () => ({
    get: () => null,
  }),
}));

jest.mock('next-auth/react', () => ({
  signIn: (...args: unknown[]) => signInMock(...args),
}));

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
  },
}));

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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
    signInMock.mockResolvedValue({
      error: null,
      ok: true,
      status: 200,
      url: '/dashboard',
    });

    render(<LoginForm />);

    await user.type(screen.getByLabelText('Username'), 'admin');
    await user.type(screen.getByLabelText('Password'), 'password');
    await user.click(screen.getByRole('button', { name: 'Masuk' }));

    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledWith('credentials', {
        username: 'admin',
        password: 'password',
        redirect: false,
        callbackUrl: '/',
      });
      expect(pushMock).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('shows a safe error message when auth service is unavailable', async () => {
    const user = userEvent.setup();
    signInMock.mockResolvedValue({
      error: AUTH_ERROR.SERVICE_UNAVAILABLE,
      ok: false,
      status: 401,
      url: null,
    });

    render(<LoginForm />);

    await user.type(screen.getByLabelText('Username'), 'admin');
    await user.type(screen.getByLabelText('Password'), 'password');
    await user.click(screen.getByRole('button', { name: 'Masuk' }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Sedang ada gangguan sistem. Coba lagi beberapa saat.',
      );
    });
  });
});
