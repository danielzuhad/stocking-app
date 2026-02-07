import 'server-only';

import { activityLogs, users } from '@/db/schema';
import type {
  DataTableIlikeColumn,
  DataTableOrderByMap,
} from '@/lib/table/drizzle';
import type { DataTableQuery } from '@/lib/table/types';

/** Default sorting for log-like tables: newest first. */
export const DEFAULT_LOGS_SORT: DataTableQuery['sorting'] = [
  { id: 'created_at', desc: true },
];

/** Shared sortable columns across log-like tables. */
export const BASE_LOGS_ORDER_BY_MAP = {
  created_at: activityLogs.created_at,
  action: activityLogs.action,
  actor_username: users.username,
} satisfies DataTableOrderByMap;

/** Shared search columns across log-like tables. */
export const BASE_LOGS_SEARCH_COLUMNS = [
  activityLogs.action,
  users.username,
  activityLogs.target_type,
  activityLogs.target_id,
] satisfies DataTableIlikeColumn[];

/**
 * Serializes a `created_at: Date` field into an ISO string for client-safe rows.
 */
export function serializeCreatedAt<T extends { created_at: Date }>(
  row: T,
): Omit<T, 'created_at'> & { created_at: string } {
  return {
    ...row,
    created_at: row.created_at.toISOString(),
  };
}
