import 'server-only';

import { getServerSession } from 'next-auth/next';
import type { Session } from 'next-auth';

import { authOptions } from '@/auth';
import { err, ok, type ActionResult } from '@/lib/actions/result';

/**
 * Reads the current NextAuth session on the server.
 *
 * Prefer this helper over calling `getServerSession()` directly so auth/guards
 * stay consistent across the codebase.
 */
async function getAuthSession(): Promise<Session | null> {
  return getServerSession(authOptions);
}

/**
 * Requires an authenticated session for server actions / route handlers.
 *
 * Returns `UNAUTHENTICATED` instead of throwing so callers can handle expected
 * errors via `ActionResult`.
 */
async function requireAuthSession(): Promise<ActionResult<Session>> {
  const session = await getAuthSession();
  if (!session) return err('UNAUTHENTICATED', 'Kamu harus login.');
  return ok(session);
}

/**
 * Requires `SUPERADMIN` role.
 *
 * Note: superadmin is allowed to access all modules, but tenant scope for
 * operational data must still come from impersonation (`active_company_id`).
 */
export async function requireSuperadminSession(): Promise<ActionResult<Session>> {
  const sessionResult = await requireAuthSession();
  if (!sessionResult.ok) return sessionResult;

  if (sessionResult.data.user.system_role !== 'SUPERADMIN') {
    return err('FORBIDDEN', 'Akses ditolak.');
  }

  return sessionResult;
}
