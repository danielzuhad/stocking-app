import 'server-only';

import type { Session } from 'next-auth';

import type { ActionResult } from '@/lib/actions/result';
import {
  requireNonStaffActiveCompanyScope,
  resolveNonStaffActiveCompanyScopeFromSession,
} from '@/lib/auth/guards';

type InventoryWriteContextType = {
  session: Session;
  company_id: string;
};

/**
 * Resolves write context for inventory mutations.
 *
 * Rules:
 * - `ADMIN` and `SUPERADMIN` can mutate inventory.
 * - `STAFF` is denied by default until per-permission RBAC is introduced.
 * - superadmin must impersonate a company first.
 */
export function resolveInventoryWriteContextFromSession(
  session: Session,
): ActionResult<InventoryWriteContextType> {
  return resolveNonStaffActiveCompanyScopeFromSession(session, {
    staff_forbidden: 'Akses ditolak. Kamu tidak punya izin mengelola stok.',
    superadmin_missing_company:
      'Pilih perusahaan dulu untuk mode penyamaran sebelum mengelola stok.',
  });
}

/**
 * Requires authenticated write context for inventory mutations.
 */
export async function requireInventoryWriteContext(): Promise<
  ActionResult<InventoryWriteContextType>
> {
  return requireNonStaffActiveCompanyScope({
    staff_forbidden: 'Akses ditolak. Kamu tidak punya izin mengelola stok.',
    superadmin_missing_company:
      'Pilih perusahaan dulu untuk mode penyamaran sebelum mengelola stok.',
  });
}
