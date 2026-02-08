import 'server-only';

import type { SQL } from 'drizzle-orm';
import { desc, eq, sql } from 'drizzle-orm';
import type { Session } from 'next-auth';

import { db } from '@/db';
import { activityLogs, companies, users } from '@/db/schema';
import { ok, type ActionResult } from '@/lib/actions/result';
import { requireSuperadminSession } from '@/lib/auth/guards';
import { fetchTable, type TableResponse } from '@/lib/fetchers/table';
import type { DataTableQuery } from '@/lib/table/types';
import type { SystemLogDbRowType, SystemLogRowType } from '@/types';

const DEFAULT_ORDER_BY = [desc(activityLogs.created_at)] as const;

function serializeSystemLogRow(row: SystemLogDbRowType): SystemLogRowType {
  return {
    ...row,
    created_at: row.created_at.toISOString(),
  };
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
      buildWhere: (): SQL | undefined => undefined,
      buildOrderBy: () => DEFAULT_ORDER_BY,
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
