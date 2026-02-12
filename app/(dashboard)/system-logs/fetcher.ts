import 'server-only';

import type { SQL, SQLWrapper } from 'drizzle-orm';
import { desc, eq, sql } from 'drizzle-orm';
import type { Session } from 'next-auth';
import { z } from 'zod';

import { db } from '@/db';
import { activityLogs, companies, users } from '@/db/schema';
import type { ActionResult } from '@/lib/actions/result';
import {
  requireSuperadminSession,
  resolveSuperadminSession,
} from '@/lib/auth/guards';
import { SYSTEM_LOGS_CACHE_TAG } from '@/lib/fetchers/cache-tags';
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
import type { SystemLogType } from '@/types';

/**
 * Template notes (copy-paste for other services):
 * 1) Replace `*_QUERY_SCHEMA` to match route query params.
 * 2) Replace `*_SEARCH_MAP` and `DEFAULT_*_SEARCH_FIELDS`.
 * 3) Replace `*_ROW_SELECT` + base joins in `build*BaseSelect`.
 * 4) Replace `serialize*Row` if DTO needs conversion (Date -> string, etc).
 *
 * Keep these shared pieces unchanged:
 * - `createIlikeSearch` usage for typed search fields/options.
 * - `fetchTable` call pattern (validation/auth/pagination/error handling).
 */
const DEFAULT_ORDER_BY = [desc(activityLogs.created_at)] as const;

/** Input schema for system logs table fetch (pagination + optional query `q`). */
const SYSTEM_LOGS_QUERY_SCHEMA = createDataTableQueryWithSearchSchema();

/** Query type is derived from schema to avoid type/schema drift. */
type SystemLogsTableQueryType = z.infer<typeof SYSTEM_LOGS_QUERY_SCHEMA>;

/** Searchable columns map (field key -> SQL expression). */
const SYSTEM_LOG_SEARCH_MAP = {
  action: activityLogs.action,
  actor_username: users.username,
  company_name: companies.name,
  company_slug: companies.slug,
  target_type: sql`COALESCE(${activityLogs.target_type}, '')`,
  target_id: sql`COALESCE(${activityLogs.target_id}, '')`,
} as const satisfies Record<string, SQLWrapper>;

/** Default fields used when caller does not pass `options.search_fields`. */
const DEFAULT_SYSTEM_LOG_SEARCH_FIELDS = [
  'action',
  'actor_username',
  'company_name',
  'company_slug',
  'target_type',
  'target_id',
] as const satisfies readonly (keyof typeof SYSTEM_LOG_SEARCH_MAP)[];

/** Typed search helper for resolving fields and building `ILIKE` where clause. */
const systemLogSearch = createIlikeSearch({
  fields: SYSTEM_LOG_SEARCH_MAP,
  defaultFields: DEFAULT_SYSTEM_LOG_SEARCH_FIELDS,
});

/** Optional per-call overrides for system logs fetcher behavior. */
type FetchSystemLogsOptionsType = SearchOptionsType<
  typeof SYSTEM_LOG_SEARCH_MAP
> & {
  /** Optional count strategy: `none` can reduce query cost on very large datasets. */
  row_count_mode?: TableRowCountModeType;
};

/** Minimal row selection from joined tables for system logs table responses. */
const SYSTEM_LOG_ROW_SELECT = {
  id: activityLogs.id,
  created_at: activityLogs.created_at,
  action: activityLogs.action,
  company_id: companies.id,
  company_name: companies.name,
  company_slug: companies.slug,
  actor_username: users.username,
  target_type: activityLogs.target_type,
  target_id: activityLogs.target_id,
} as const;

/**
 * Shared joined query used by both rows + count queries.
 *
 * Keeping this in one place avoids join/filter drift between count and list.
 */
function buildSystemLogBaseSelect(whereClause: SQL | undefined) {
  return db
    .select(SYSTEM_LOG_ROW_SELECT)
    .from(activityLogs)
    .innerJoin(companies, eq(companies.id, activityLogs.company_id))
    .innerJoin(users, eq(users.id, activityLogs.actor_user_id))
    .where(whereClause);
}

/**
 * Reads paginated system log rows.
 */
function getSystemLogRows(
  whereClause: SQL | undefined,
  orderBy: typeof DEFAULT_ORDER_BY,
  pagination: TableQueryPaginationType,
) {
  return buildSystemLogBaseSelect(whereClause)
    .orderBy(...orderBy)
    .limit(pagination.limit)
    .offset(pagination.offset);
}

type SystemLogDbRowType = Awaited<ReturnType<typeof getSystemLogRows>>[number];

/**
 * Counts rows using the same base filter/join as `getSystemLogRows`.
 */
async function getSystemLogRowCount(
  whereClause: SQL | undefined,
): Promise<number> {
  const baseQuery = buildSystemLogBaseSelect(whereClause).as(
    'system_logs_count_base',
  );
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(baseQuery);
  return Number(count ?? 0);
}

/**
 * Converts DB row shape into serializable UI/API shape.
 */
function serializeSystemLogRow(row: SystemLogDbRowType): SystemLogType {
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
 * - optional `search_fields` whitelist to control which columns are filtered by `q`
 * - optional `row_count_mode` (`exact` | `none`) for count-query cost control
 */
export async function fetchSystemLogsTable(
  input: SystemLogsTableQueryType,
  session?: Session,
  options?: FetchSystemLogsOptionsType,
): Promise<ActionResult<TableResponse<SystemLogType>>> {
  const searchFields = systemLogSearch.resolveFields(options?.search_fields);
  const cacheSearchFields = [...searchFields].sort().join(',');
  const rowCountMode = options?.row_count_mode ?? 'exact';

  return fetchTable({
    input,
    schema: SYSTEM_LOGS_QUERY_SCHEMA,
    pagination: {
      rowCountMode,
    },
    authorize: session
      ? async () => resolveSuperadminSession(session)
      : requireSuperadminSession,
    table: {
      buildWhere: (_, query) =>
        systemLogSearch.buildWhere(query.q, searchFields),
      buildOrderBy: () => DEFAULT_ORDER_BY,
      getRowCount: (_, whereClause) => getSystemLogRowCount(whereClause),
      getRows: (_, whereClause, orderBy, pagination) =>
        getSystemLogRows(whereClause, orderBy, pagination),
      serializeRow: serializeSystemLogRow,
    },
    cache: {
      getKeyParts: () => [
        'scope:superadmin',
        `search_fields:${cacheSearchFields}`,
        `row_count_mode:${rowCountMode}`,
      ],
      getTags: () => [SYSTEM_LOGS_CACHE_TAG],
      revalidate: 15,
      debug: false,
    },
    errorTag: 'SYSTEM_LOGS_FETCH_ERROR',
  });
}
