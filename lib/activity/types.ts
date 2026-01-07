/**
 * Shared Activity Log row types derived from Drizzle schema.
 *
 * Notes:
 * - Keep these as type-only exports (no runtime code) so they can be reused by
 *   both server modules (actions/queries) and client modules (table columns) via
 *   `import type`.
 * - When schema changes, these types update automatically.
 */

type ActivityLogModel = typeof import('@/db/schema').activityLogs.$inferSelect;
type CompanyModel = typeof import('@/db/schema').companies.$inferSelect;
type UserModel = typeof import('@/db/schema').users.$inferSelect;

/** Raw DB row shape for company-scoped Activity Logs (before serialization). */
export type ActivityLogRowDb = Pick<
  ActivityLogModel,
  'id' | 'created_at' | 'action' | 'target_type' | 'target_id' | 'meta'
> & {
  actor_username: UserModel['username'];
};

/** Serializable row shape for Activity Logs (safe to send to client). */
export type ActivityLogRow = Omit<ActivityLogRowDb, 'created_at'> & {
  created_at: string;
};

/** Raw DB row shape for global (cross-company) System Logs (before serialization). */
export type SystemLogRowDb = Pick<
  ActivityLogModel,
  'id' | 'created_at' | 'action' | 'target_type' | 'target_id'
> & {
  company_id: CompanyModel['id'];
  company_name: CompanyModel['name'];
  company_slug: CompanyModel['slug'];
  actor_username: UserModel['username'];
};

/** Serializable row shape for System Logs (safe to send to client). */
export type SystemLogRow = Omit<SystemLogRowDb, 'created_at'> & {
  created_at: string;
};

