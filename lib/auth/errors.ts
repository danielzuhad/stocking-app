/**
 * Auth-related (safe) error codes and helpers for client presentation.
 *
 * Never show raw server/NextAuth error strings to end users because they may
 * contain internal details (SQL, stack traces, etc).
 */

/** Stable safe error codes thrown from `CredentialsProvider.authorize()`. */
export const AUTH_ERROR = {
  /** Infrastructure issue (e.g., DB down). */
  SERVICE_UNAVAILABLE: 'AUTH_SERVICE_UNAVAILABLE',
} as const;

export type AuthErrorCode = (typeof AUTH_ERROR)[keyof typeof AUTH_ERROR];

/**
 * Maps NextAuth `signIn()` error strings into a safe, user-friendly message.
 *
 * - `CredentialsSignin` is the canonical invalid-credentials signal from NextAuth.
 * - Custom codes must be thrown explicitly from `authorize()` (see `auth.ts`).
 */
export function getLoginErrorMessage(error: string | null | undefined): string {
  if (!error) return 'Gagal memproses login. Coba lagi.';

  if (error === 'CredentialsSignin') {
    return 'Username atau password salah.';
  }

  if (error === AUTH_ERROR.SERVICE_UNAVAILABLE) {
    return 'Sedang ada gangguan sistem. Coba lagi beberapa saat.';
  }

  return 'Gagal memproses login. Coba lagi.';
}

