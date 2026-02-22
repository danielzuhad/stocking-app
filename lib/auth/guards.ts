import 'server-only';

import { getServerSession } from 'next-auth/next';
import type { Session } from 'next-auth';

import { authOptions } from '@/auth';
import { err, ok, type ActionResult } from '@/lib/actions/result';
import {
  SYSTEM_ROLE_STAFF,
  SYSTEM_ROLE_SUPERADMIN,
} from '@/lib/auth/enums';

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
export async function requireAuthSession(): Promise<ActionResult<Session>> {
  const session = await getAuthSession();
  if (!session) return err('UNAUTHENTICATED', 'Kamu harus login.');
  return ok(session);
}

type ActiveCompanyScopeType = {
  company_id: string;
};

type ActiveCompanyScopeMessagesType = {
  superadmin_missing_company?: string;
  missing_company?: string;
};

const DEFAULT_SUPERADMIN_MISSING_COMPANY_MESSAGE =
  'Pilih perusahaan dulu untuk mode penyamaran.';
const DEFAULT_MISSING_COMPANY_MESSAGE = 'Perusahaan aktif tidak ditemukan.';
const DEFAULT_STAFF_FORBIDDEN_MESSAGE = 'Akses ditolak.';

/**
 * Resolves active company scope from an authenticated session.
 *
 * Rules:
 * - `SUPERADMIN` must impersonate a company first (`active_company_id` required).
 * - non-superadmin users must also have `active_company_id`.
 */
export function resolveActiveCompanyScopeFromSession(
  session: Session,
  messages?: ActiveCompanyScopeMessagesType,
): ActionResult<ActiveCompanyScopeType> {
  if (!session.active_company_id) {
    if (session.user.system_role === SYSTEM_ROLE_SUPERADMIN) {
      return err(
        'FORBIDDEN',
        messages?.superadmin_missing_company ??
          DEFAULT_SUPERADMIN_MISSING_COMPANY_MESSAGE,
      );
    }

    return err(
      'FORBIDDEN',
      messages?.missing_company ?? DEFAULT_MISSING_COMPANY_MESSAGE,
    );
  }

  return ok({ company_id: session.active_company_id });
}

/**
 * Requires both authentication and active company scope.
 */
export async function requireActiveCompanyScope(
  messages?: ActiveCompanyScopeMessagesType,
): Promise<ActionResult<ActiveCompanyScopeType>> {
  const sessionResult = await requireAuthSession();
  if (!sessionResult.ok) return sessionResult;

  return resolveActiveCompanyScopeFromSession(sessionResult.data, messages);
}

type NonStaffActiveCompanyScopeType = {
  session: Session;
  company_id: string;
};

type NonStaffActiveCompanyScopeMessagesType = ActiveCompanyScopeMessagesType & {
  staff_forbidden?: string;
};

/**
 * Resolves authenticated company scope for users allowed to write/operate data.
 *
 * Rules:
 * - `STAFF` is denied by default (customizable message).
 * - `ADMIN` and `SUPERADMIN` must still have valid `active_company_id`.
 */
export function resolveNonStaffActiveCompanyScopeFromSession(
  session: Session,
  messages?: NonStaffActiveCompanyScopeMessagesType,
): ActionResult<NonStaffActiveCompanyScopeType> {
  if (session.user.system_role === SYSTEM_ROLE_STAFF) {
    return err(
      'FORBIDDEN',
      messages?.staff_forbidden ?? DEFAULT_STAFF_FORBIDDEN_MESSAGE,
    );
  }

  const scopeResult = resolveActiveCompanyScopeFromSession(session, messages);
  if (!scopeResult.ok) return scopeResult;

  return ok({
    session,
    company_id: scopeResult.data.company_id,
  });
}

/**
 * Requires authenticated non-staff user with valid active company scope.
 */
export async function requireNonStaffActiveCompanyScope(
  messages?: NonStaffActiveCompanyScopeMessagesType,
): Promise<ActionResult<NonStaffActiveCompanyScopeType>> {
  const sessionResult = await requireAuthSession();
  if (!sessionResult.ok) return sessionResult;

  return resolveNonStaffActiveCompanyScopeFromSession(sessionResult.data, messages);
}

/**
 * Resolves `SUPERADMIN` role from an already-authenticated session.
 */
export function resolveSuperadminSession(
  session: Session,
): ActionResult<Session> {
  if (session.user.system_role !== SYSTEM_ROLE_SUPERADMIN) {
    return err('FORBIDDEN', 'Akses ditolak.');
  }

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

  return resolveSuperadminSession(sessionResult.data);
}
