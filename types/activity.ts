import { CompanyType } from './company';
import { UserType } from './user';

export type ActivityLogType =
  typeof import('@/db/schema').activityLogs.$inferSelect;

/**
 * Serializable row shape used by system logs UI/API response.
 */
export type SystemLogType = Pick<
  ActivityLogType,
  'id' | 'action' | 'target_type' | 'target_id'
> & {
  created_at: string;
  company_id: CompanyType['id'];
  company_name: CompanyType['name'];
  company_slug: CompanyType['slug'];
  actor_username: UserType['username'];
};
