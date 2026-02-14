import 'server-only';

import type { SQL, SQLWrapper } from 'drizzle-orm';
import { and, desc, eq, sql } from 'drizzle-orm';
import type { Session } from 'next-auth';
import { z } from 'zod';

import { db } from '@/db';
import { activityLogs, users } from '@/db/schema';
import { ok, type ActionResult } from '@/lib/actions/result';
import {
  requireAuthSession,
  resolveNonStaffActiveCompanyScopeFromSession,
} from '@/lib/auth/guards';
import {
  createIlikeSearch,
  type SearchOptionsType,
} from '@/lib/fetchers/search';
import {
  fetchTable,
  type TableQueryPaginationType,
  type TableResponse,
  type TableRowCountModeType,
} from '@/lib/fetchers/table';
import { createDataTableQueryWithSearchSchema } from '@/lib/table/types';
import type { ActivityLogRowType } from '@/types';

type ActivityLogContextType = {
  company_id: string;
};

const DEFAULT_ORDER_BY = [desc(activityLogs.created_at)] as const;

/** Input schema for activity logs table fetch (pagination + optional query `q`). */
const ACTIVITY_LOGS_QUERY_SCHEMA = createDataTableQueryWithSearchSchema();

/** Query type is derived from schema to avoid type/schema drift. */
type ActivityLogsTableQueryType = z.infer<typeof ACTIVITY_LOGS_QUERY_SCHEMA>;

/** Searchable columns map (field key -> SQL expression). */
const ACTIVITY_LOG_SEARCH_MAP = {
  action: activityLogs.action,
  actor_username: users.username,
  target_type: sql`COALESCE(${activityLogs.target_type}, '')`,
  target_id: sql`COALESCE(${activityLogs.target_id}, '')`,
} as const satisfies Record<string, SQLWrapper>;

/** Default fields used when caller does not pass `options.search_fields`. */
const DEFAULT_ACTIVITY_LOG_SEARCH_FIELDS = [
  'action',
  'actor_username',
  'target_type',
  'target_id',
] as const satisfies readonly (keyof typeof ACTIVITY_LOG_SEARCH_MAP)[];

const activityLogSearch = createIlikeSearch({
  fields: ACTIVITY_LOG_SEARCH_MAP,
  defaultFields: DEFAULT_ACTIVITY_LOG_SEARCH_FIELDS,
});

/** Optional per-call overrides for activity logs fetcher behavior. */
type FetchActivityLogsOptionsType = SearchOptionsType<
  typeof ACTIVITY_LOG_SEARCH_MAP
> & {
  /** Optional count strategy: `none` can reduce query cost on very large datasets. */
  row_count_mode?: TableRowCountModeType;
};

/** Minimal row selection from joined tables for activity logs table responses. */
const ACTIVITY_LOG_ROW_SELECT = {
  id: activityLogs.id,
  created_at: activityLogs.created_at,
  company_id: activityLogs.company_id,
  action: activityLogs.action,
  actor_username: users.username,
  target_type: activityLogs.target_type,
  target_id: activityLogs.target_id,
} as const;

/**
 * Returns company-scoped context from session for activity log access.
 *
 * Rules:
 * - `ADMIN` can access company logs from `active_company_id`.
 * - `SUPERADMIN` can access only when impersonating a company.
 * - `STAFF` is denied.
 */
function resolveActivityLogContextFromSession(
  session: Session,
): ActionResult<ActivityLogContextType> {
  const scopeResult = resolveNonStaffActiveCompanyScopeFromSession(session, {
    staff_forbidden: 'Akses activity logs hanya untuk admin.',
    superadmin_missing_company:
      'Pilih company impersonation dulu untuk melihat activity logs.',
  });
  if (!scopeResult.ok) return scopeResult;

  return ok({ company_id: scopeResult.data.company_id });
}

/**
 * Reads authenticated company-scoped context for activity logs.
 */
async function requireActivityLogContext(): Promise<
  ActionResult<ActivityLogContextType>
> {
  const sessionResult = await requireAuthSession();
  if (!sessionResult.ok) return sessionResult;

  return resolveActivityLogContextFromSession(sessionResult.data);
}

/**
 * Shared joined query used by both rows + count queries.
 *
 * Keeping this in one place avoids join/filter drift between count and list.
 */
function buildActivityLogBaseSelect(whereClause: SQL | undefined) {
  return db
    .select(ACTIVITY_LOG_ROW_SELECT)
    .from(activityLogs)
    .innerJoin(users, eq(users.id, activityLogs.actor_user_id))
    .where(whereClause);
}

/**
 * Reads paginated activity log rows.
 */
function getActivityLogRows(
  whereClause: SQL | undefined,
  orderBy: typeof DEFAULT_ORDER_BY,
  pagination: TableQueryPaginationType,
) {
  return buildActivityLogBaseSelect(whereClause)
    .orderBy(...orderBy)
    .limit(pagination.limit)
    .offset(pagination.offset);
}

type ActivityLogDbRowType = Awaited<ReturnType<typeof getActivityLogRows>>[number];

/**
 * Counts rows using the same base filter/join as `getActivityLogRows`.
 */
async function getActivityLogRowCount(whereClause: SQL | undefined): Promise<number> {
  const baseQuery = buildActivityLogBaseSelect(whereClause).as(
    'activity_logs_count_base',
  );
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(baseQuery);
  return Number(count ?? 0);
}

/**
 * Converts DB row shape into serializable UI/API shape.
 */
function serializeActivityLogRow(row: ActivityLogDbRowType): ActivityLogRowType {
  return {
    ...row,
    created_at: row.created_at.toISOString(),
  };
}

/**
 * Fetches company-scoped activity logs for admin/superadmin.
 *
 * Required:
 * - authenticated session
 * - `ADMIN` or `SUPERADMIN`
 * - `active_company_id` (superadmin must impersonate first)
 */
export async function fetchActivityLogsTable(
  input: ActivityLogsTableQueryType,
  session?: Session,
  options?: FetchActivityLogsOptionsType,
): Promise<ActionResult<TableResponse<ActivityLogRowType>>> {
  const searchFields = activityLogSearch.resolveFields(options?.search_fields);
  const rowCountMode = options?.row_count_mode ?? 'exact';

  return fetchTable({
    input,
    schema: ACTIVITY_LOGS_QUERY_SCHEMA,
    pagination: { rowCountMode },
    authorize: session
      ? async () => resolveActivityLogContextFromSession(session)
      : requireActivityLogContext,
    table: {
      buildWhere: (ctx, query) => {
        const companyWhere = eq(activityLogs.company_id, ctx.company_id);
        const searchWhere = activityLogSearch.buildWhere(query.q, searchFields);
        return searchWhere ? and(companyWhere, searchWhere) : companyWhere;
      },
      buildOrderBy: () => DEFAULT_ORDER_BY,
      getRowCount: (_, whereClause) => getActivityLogRowCount(whereClause),
      getRows: (_, whereClause, orderBy, pagination) =>
        getActivityLogRows(whereClause, orderBy, pagination),
      serializeRow: serializeActivityLogRow,
    },
    errorTag: 'ACTIVITY_LOGS_FETCH_ERROR',
  });
}
