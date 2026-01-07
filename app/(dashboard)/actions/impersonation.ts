'use server';

import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/db';
import { companies } from '@/db/schema';
import { logActivity } from '@/lib/activity/log';
import { err, errFromZod, ok, type ActionResult } from '@/lib/actions/result';
import { requireSuperadminSession } from '@/lib/auth/guards';

/** Input schema for setting superadmin impersonation. */
const setImpersonationSchema = z.object({
  company_id: z.string().uuid(),
});

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

  if (!company) return err('NOT_FOUND', 'Company tidak ditemukan.');

  await logActivity(db, {
    company_id: company.id,
    actor_user_id: session.user.id,
    action: 'superadmin.impersonate.set',
  });

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

  return ok({ cleared: true });
}
