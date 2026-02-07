/**
 * Activity log types derived from Drizzle schema.
 */

import type { CompanyType } from './company';
import type { UserType } from './user';

export type ActivityLogType =
  typeof import('@/db/schema').activityLogs.$inferSelect;
export type ActivityLogInsertType =
  typeof import('@/db/schema').activityLogs.$inferInsert;

export type ActivityLogDbRowType = Pick<
  ActivityLogType,
  'id' | 'created_at' | 'action' | 'target_type' | 'target_id' | 'meta'
> & {
  actor_username: UserType['username'];
};

export type ActivityLogRowType = Omit<ActivityLogDbRowType, 'created_at'> & {
  created_at: string;
};

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
