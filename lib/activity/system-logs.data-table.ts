import 'server-only';

import { eq, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

import { db } from '@/db';
import { activityLogs, companies, users } from '@/db/schema';
import type { ActionResult } from '@/lib/actions/result';
import type { SystemLogRow, SystemLogRowDb } from '@/lib/activity/types';
import { requireSuperadminSession } from '@/lib/auth/guards';
import { fetchDataTablePage } from '@/lib/data-table/action';
import {
  buildDataTableIlikeSearch,
  getDataTableOrderBy,
  getDataTableSearchTerm,
  type DataTableOrderByMap,
} from '@/lib/data-table/drizzle';
import type { DataTablePage, DataTableQuery } from '@/lib/data-table/types';

import {
  BASE_LOGS_ORDER_BY_MAP,
  BASE_LOGS_SEARCH_COLUMNS,
  DEFAULT_LOGS_SORT,
  serializeCreatedAt,
} from './logs.data-table';

const ORDER_BY_MAP: DataTableOrderByMap = {
  ...BASE_LOGS_ORDER_BY_MAP,
  company_name: companies.name,
  company_slug: companies.slug,
};

const SEARCH_COLUMNS = [...BASE_LOGS_SEARCH_COLUMNS, companies.name, companies.slug];

function serializeSystemLogRow(row: SystemLogRowDb): SystemLogRow {
  return serializeCreatedAt(row);
}

/**
 * Fetches global (cross-company) activity logs for superadmin.
 *
 * Required:
 * - authenticated session
 * - `SUPERADMIN` role
 */
export async function fetchSystemLogsPage(
  input: DataTableQuery,
): Promise<ActionResult<DataTablePage<SystemLogRow>>> {
  return fetchDataTablePage({
    input,
    authorize: requireSuperadminSession,
    buildWhere: (_, query): SQL | undefined => {
      const search = getDataTableSearchTerm(query);
      return buildDataTableIlikeSearch(search, SEARCH_COLUMNS);
    },
    buildOrderBy: (_, query) =>
      getDataTableOrderBy(query.sorting, ORDER_BY_MAP, DEFAULT_LOGS_SORT),
    getRowCount: async (_, whereClause) => {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(activityLogs)
        .innerJoin(companies, eq(companies.id, activityLogs.company_id))
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
          company_id: companies.id,
          company_name: companies.name,
          company_slug: companies.slug,
          actor_username: users.username,
          target_type: activityLogs.target_type,
          target_id: activityLogs.target_id,
        })
        .from(activityLogs)
        .innerJoin(companies, eq(companies.id, activityLogs.company_id))
        .innerJoin(users, eq(users.id, activityLogs.actor_user_id))
        .where(whereClause)
        .orderBy(...orderBy)
        .limit(pagination.limit)
        .offset(pagination.offset),
    serializeRow: serializeSystemLogRow,
    errorTag: 'SYSTEM_LOGS_FETCH_ERROR',
  });
}

