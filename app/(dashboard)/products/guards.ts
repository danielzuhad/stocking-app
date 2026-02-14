import 'server-only';

import type { Session } from 'next-auth';

import { type ActionResult } from '@/lib/actions/result';
import {
  requireNonStaffActiveCompanyScope,
  resolveNonStaffActiveCompanyScopeFromSession,
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
  return resolveNonStaffActiveCompanyScopeFromSession(session, {
    staff_forbidden: 'Akses ditolak. Kamu tidak punya izin mengelola products.',
    superadmin_missing_company:
      'Pilih company impersonation dulu untuk mengelola products.',
  });
}

/**
 * Requires authenticated write context for product mutations.
 */
export async function requireProductsWriteContext(): Promise<
  ActionResult<ProductsWriteContextType>
> {
  return requireNonStaffActiveCompanyScope({
    staff_forbidden: 'Akses ditolak. Kamu tidak punya izin mengelola products.',
    superadmin_missing_company:
      'Pilih company impersonation dulu untuk mengelola products.',
  });
}
