'use server';

import type { SQL } from 'drizzle-orm';
import { and, eq, sql } from 'drizzle-orm';

import { db } from '@/db';
import { activityLogs, users } from '@/db/schema';
import type { ActionResult } from '@/lib/actions/result';
import {
  BASE_LOGS_ORDER_BY_MAP,
  BASE_LOGS_SEARCH_COLUMNS,
  DEFAULT_LOGS_SORT,
  serializeCreatedAt,
} from '@/lib/activity/logs.data-table';
import type { ActivityLogRow, ActivityLogRowDb } from '@/lib/activity/types';
import { requireCompanyAdminOrSuperadminScope } from '@/lib/auth/guards';
import { fetchDataTablePage } from '@/lib/data-table/action';
import {
  buildDataTableIlikeSearch,
  getDataTableOrderBy,
  getDataTableSearchTerm,
} from '@/lib/data-table/drizzle';
import type { DataTablePage, DataTableQuery } from '@/lib/data-table/types';

function serializeActivityLogRow(row: ActivityLogRowDb): ActivityLogRow {
  return {
    ...serializeCreatedAt(row),
    meta: row.meta ?? null,
  };
}

/**
 * Fetches company-scoped activity logs using a serializable DataTable query.
 *
 * Required:
 * - authenticated session
 * - active company scope (via impersonation for superadmin)
 * - admin/superadmin access (MVP baseline)
 */
export async function fetchActivityLogsPage(
  input: DataTableQuery,
): Promise<ActionResult<DataTablePage<ActivityLogRow>>> {
  return fetchDataTablePage({
    input,
    authorize: requireCompanyAdminOrSuperadminScope,
    buildWhere: (scope, query): SQL | undefined => {
      const search = getDataTableSearchTerm(query);
      const searchWhere = buildDataTableIlikeSearch(
        search,
        BASE_LOGS_SEARCH_COLUMNS,
      );
      return and(eq(activityLogs.company_id, scope.company_id), searchWhere);
    },
    buildOrderBy: (_, query) =>
      getDataTableOrderBy(
        query.sorting,
        BASE_LOGS_ORDER_BY_MAP,
        DEFAULT_LOGS_SORT,
      ),
    getRowCount: async (_, whereClause) => {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(activityLogs)
        .innerJoin(users, eq(users.id, activityLogs.actor_user_id))
        .where(whereClause);
      return Number(count ?? 0);
    },
    getRows: (_, whereClause, orderBy, pagination) =>
      db
        .select({
          id: activityLogs.id,
          created_at: activityLogs.created_at,
          action: activityLogs.action,
          actor_username: users.username,
          target_type: activityLogs.target_type,
          target_id: activityLogs.target_id,
          meta: activityLogs.meta,
        })
        .from(activityLogs)
        .innerJoin(users, eq(users.id, activityLogs.actor_user_id))
        .where(whereClause)
        .orderBy(...orderBy)
        .limit(pagination.limit)
        .offset(pagination.offset),
    serializeRow: serializeActivityLogRow,
    errorTag: 'ACTIVITY_LOGS_FETCH_ERROR',
  });
}
