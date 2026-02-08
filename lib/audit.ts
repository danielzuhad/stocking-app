import 'server-only';

import { db } from '@/db';
import { activityLogs } from '@/db/schema';

type ActivityLogTarget = {
  target_type?: string | null;
  target_id?: string | null;
};

type LogActivityInput = {
  company_id: string;
  actor_user_id: string;
  /**
   * Action name (suggested format: `domain.verb`).
   *
   * Examples:
   * - `auth.login_success`
   * - `inventory.adjust.created`
   * - `sales.invoice.posted`
   */
  action: string;
  meta?: Record<string, unknown> | null;
} & ActivityLogTarget;

/**
 * Writes an append-only activity log entry.
 *
 * Prefer calling this inside the same DB transaction as the business mutation
 * so the audit trail is consistent and atomic.
 */
export async function logActivity(
  client: typeof db,
  input: LogActivityInput,
): Promise<void> {
  await client.insert(activityLogs).values({
    company_id: input.company_id,
    actor_user_id: input.actor_user_id,
    action: input.action,
    target_type: input.target_type ?? null,
    target_id: input.target_id ?? null,
    meta: input.meta ?? null,
  });
}
