import 'server-only';

import { getServerSession } from 'next-auth/next';
import type { Session } from 'next-auth';

import { authOptions } from '@/auth';
import { err, ok, type ActionResult } from '@/lib/actions/result';

export type CompanyScope = {
  /** Tenant scope for all operational queries/mutations. */
  company_id: string;
  /** Actor (authenticated user id). */
  actor_user_id: string;
  /** Full session (useful for role checks). */
  session: Session;
};

/**
 * Reads the current NextAuth session on the server.
 *
 * Prefer this helper over calling `getServerSession()` directly so auth/guards
 * stay consistent across the codebase.
 */
export async function getAuthSession(): Promise<Session | null> {
  return getServerSession(authOptions);
}

/**
 * Requires an authenticated session for server actions / route handlers.
 *
 * Returns `UNAUTHENTICATED` instead of throwing so callers can handle expected
 * errors via `ActionResult`.
 */
export async function requireAuthSession(): Promise<ActionResult<Session>> {
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

/**
 * Requires an active company scope from the session.
 *
 * Invariants:
 * - `ADMIN/STAFF`: always scoped to their own company.
 * - `SUPERADMIN`: must impersonate a company first (set `active_company_id`).
 */
export async function requireCompanyScope(): Promise<
  ActionResult<CompanyScope>
> {
  const sessionResult = await requireAuthSession();
  if (!sessionResult.ok) return sessionResult;

  const company_id = sessionResult.data.active_company_id;
  if (!company_id) {
    return err(
      'FORBIDDEN',
      sessionResult.data.user.system_role === 'SUPERADMIN'
        ? 'Pilih company dulu (impersonation).'
        : 'Company context tidak ditemukan.',
    );
  }

  const actor_user_id = sessionResult.data.user.id;

  return ok({
    company_id,
    actor_user_id,
    session: sessionResult.data,
  });
}

/**
 * Permission gate (MVP baseline).
 *
 * - `SUPERADMIN`: always allowed.
 * - `ADMIN`: always allowed for company module.
 * - `STAFF`: denied until permission model is implemented.
 */
export function requireCompanyAdminOrSuperadmin(
  scope: CompanyScope,
): ActionResult<{ allowed: true }> {
  const systemRole = scope.session.user.system_role;
  if (systemRole === 'SUPERADMIN') return ok({ allowed: true });

  if (scope.session.user.membership_role === 'ADMIN') {
    return ok({ allowed: true });
  }

  return err('FORBIDDEN', 'Akses ditolak.');
}

/**
 * Requires an active company scope and admin/superadmin access.
 *
 * Use this as a default `authorize()` guard for most company-scoped modules
 * until company-level permissions are implemented.
 *
 * Invariants:
 * - tenant scope is taken from session (`active_company_id`)
 * - `SUPERADMIN` must impersonate a company first
 */
export async function requireCompanyAdminOrSuperadminScope(): Promise<
  ActionResult<CompanyScope>
> {
  const scopeResult = await requireCompanyScope();
  if (!scopeResult.ok) return scopeResult;

  const allowed = requireCompanyAdminOrSuperadmin(scopeResult.data);
  if (!allowed.ok) return allowed;

  return scopeResult;
}
