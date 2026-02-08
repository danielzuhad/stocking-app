/**
 * Shared type exports derived from Drizzle schema.
 *
 * Keep this module type-only (no runtime exports).
 */

type CompanyType = typeof import('@/db/schema').companies.$inferSelect;
type UserType = typeof import('@/db/schema').users.$inferSelect;
type ActivityLogType = typeof import('@/db/schema').activityLogs.$inferSelect;

export type SystemLogDbRowType = Pick<
  ActivityLogType,
  'id' | 'created_at' | 'action' | 'target_type' | 'target_id'
> & {
  company_id: CompanyType['id'];
  company_name: CompanyType['name'];
  company_slug: CompanyType['slug'];
  actor_username: UserType['username'];
};

export type SystemLogRowType = Omit<SystemLogDbRowType, 'created_at'> & {
  created_at: string;
};
