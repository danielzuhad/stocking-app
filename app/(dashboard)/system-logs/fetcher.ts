import 'server-only';

import type { SQL } from 'drizzle-orm';
import { eq, sql } from 'drizzle-orm';
import type { Session } from 'next-auth';

import { db } from '@/db';
import { activityLogs, companies, users } from '@/db/schema';
import { ok, type ActionResult } from '@/lib/actions/result';
import { requireSuperadminSession } from '@/lib/auth/guards';
import { fetchTable, type TableResponse } from '@/lib/fetchers/table';
import {
  buildDataTableIlikeSearch,
  getDataTableOrderBy,
  getDataTableSearchTerm,
  type DataTableOrderByMap,
} from '@/lib/table/drizzle';
import type { DataTableQuery } from '@/lib/table/types';
import {
  BASE_LOGS_ORDER_BY_MAP,
  BASE_LOGS_SEARCH_COLUMNS,
  DEFAULT_LOGS_SORT,
  serializeCreatedAt,
} from '@/lib/logs';
import type { SystemLogDbRowType, SystemLogRowType } from '@/types';

const ORDER_BY_MAP: DataTableOrderByMap = {
  ...BASE_LOGS_ORDER_BY_MAP,
  company_name: companies.name,
  company_slug: companies.slug,
};

const SEARCH_COLUMNS = [...BASE_LOGS_SEARCH_COLUMNS, companies.name, companies.slug];

function serializeSystemLogRow(row: SystemLogDbRowType): SystemLogRowType {
  return serializeCreatedAt(row);
}

/**
 * Fetches global (cross-company) activity logs for superadmin.
 *
 * Required:
 * - authenticated session
 * - `SUPERADMIN` role
 */
export async function fetchSystemLogsTable(
  input: DataTableQuery,
  session?: Session,
): Promise<ActionResult<TableResponse<SystemLogRowType>>> {
  return fetchTable({
    input,
    authorize: session
      ? async () => ok(session)
      : requireSuperadminSession,
    table: {
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
    },
    errorTag: 'SYSTEM_LOGS_FETCH_ERROR',
  });
}
