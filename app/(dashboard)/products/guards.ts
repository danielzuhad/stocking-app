import 'server-only';

import type { Session } from 'next-auth';

import { err, ok, type ActionResult } from '@/lib/actions/result';
import {
  requireAuthSession,
  resolveActiveCompanyScopeFromSession,
} from '@/lib/auth/guards';

type ProductsWriteContextType = {
  session: Session;
  company_id: string;
};

/**
 * Resolves write context for product mutations.
 *
 * Rules:
 * - `ADMIN` and `SUPERADMIN` can mutate products.
 * - `STAFF` is read-only.
 * - superadmin must impersonate a company first.
 */
export function resolveProductsWriteContextFromSession(
  session: Session,
): ActionResult<ProductsWriteContextType> {
  if (session.user.system_role === 'STAFF') {
    return err('FORBIDDEN', 'Akses ditolak. Kamu tidak punya izin mengelola products.');
  }

  const scopeResult = resolveActiveCompanyScopeFromSession(session, {
    superadmin_missing_company:
      'Pilih company impersonation dulu untuk mengelola products.',
  });
  if (!scopeResult.ok) return scopeResult;

  return ok({
    session,
    company_id: scopeResult.data.company_id,
  });
}

/**
 * Requires authenticated write context for product mutations.
 */
export async function requireProductsWriteContext(): Promise<
  ActionResult<ProductsWriteContextType>
> {
  const sessionResult = await requireAuthSession();
  if (!sessionResult.ok) return sessionResult;

  return resolveProductsWriteContextFromSession(sessionResult.data);
}
