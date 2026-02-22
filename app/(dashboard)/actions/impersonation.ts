'use server';

import { eq } from 'drizzle-orm';
import { updateTag } from 'next/cache';
import { z } from 'zod';

import { db } from '@/db';
import { companies } from '@/db/schema';
import { logActivity } from '@/lib/audit';
import { err, errFromZod, ok, type ActionResult } from '@/lib/actions/result';
import { requireSuperadminSession } from '@/lib/auth/guards';
import { SYSTEM_LOGS_CACHE_TAG } from '@/lib/fetchers/cache-tags';

/** Input schema for setting superadmin impersonation. */
const setImpersonationSchema = z.object({
  company_id: z.string().uuid(),
});

/**
 * Invalidates cached system logs after a successful audit write.
 *
 * `updateTag` is used here (instead of time-based waiting) so superadmin
 * sees the latest log row immediately after impersonation actions.
 */
function revalidateSystemLogsCache(): void {
  updateTag(SYSTEM_LOGS_CACHE_TAG);
}

/**
 * Audit + validation for setting superadmin impersonation.
 *
 * The actual `active_company_id` is stored in the JWT (via `useSession().update()`),
 * so `proxy.ts` can enforce tenant scope without DB access.
 */
export async function auditSuperadminImpersonation(
  input: z.infer<typeof setImpersonationSchema>,
): Promise<ActionResult<{ company_id: string }>> {
  const sessionResult = await requireSuperadminSession();
  if (!sessionResult.ok) return sessionResult;
  const session = sessionResult.data;

  const parsed = setImpersonationSchema.safeParse(input);
  if (!parsed.success) return errFromZod(parsed.error);

  const [company] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(eq(companies.id, parsed.data.company_id))
    .limit(1);

  if (!company) return err('NOT_FOUND', 'Perusahaan tidak ditemukan.');

  await logActivity(db, {
    company_id: company.id,
    actor_user_id: session.user.id,
    action: 'superadmin.impersonate.set',
  });
  revalidateSystemLogsCache();

  return ok({ company_id: company.id });
}

/**
 * Audit for clearing superadmin impersonation (if any active company exists).
 */
export async function auditClearSuperadminImpersonation(): Promise<
  ActionResult<{ cleared: true }>
> {
  const sessionResult = await requireSuperadminSession();
  if (!sessionResult.ok) return sessionResult;
  const session = sessionResult.data;

  if (!session.active_company_id) return ok({ cleared: true });

  const [company] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(eq(companies.id, session.active_company_id))
    .limit(1);

  if (!company) return ok({ cleared: true });

  await logActivity(db, {
    company_id: company.id,
    actor_user_id: session.user.id,
    action: 'superadmin.impersonate.clear',
  });
  revalidateSystemLogsCache();

  return ok({ cleared: true });
}
