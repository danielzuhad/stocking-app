import 'server-only';

import type { SQL, SQLWrapper } from 'drizzle-orm';
import { desc, eq, sql } from 'drizzle-orm';
import type { Session } from 'next-auth';
import { z } from 'zod';

import { db } from '@/db';
import { activityLogs, companies, users } from '@/db/schema';
import { ok, type ActionResult } from '@/lib/actions/result';
import { requireSuperadminSession } from '@/lib/auth/guards';
import { fetchTable, type TableResponse } from '@/lib/fetchers/table';
import { dataTableQuerySchema, type DataTableQuery } from '@/lib/table/types';
import type { SystemLogType } from '@/types';

type SystemLogsTableQueryType = DataTableQuery & {
  q?: string;
};
type SystemLogDbRowType = Omit<SystemLogType, 'created_at'> & {
  created_at: Date;
};

const DEFAULT_ORDER_BY = [desc(activityLogs.created_at)] as const;
const SYSTEM_LOGS_QUERY_SCHEMA = dataTableQuerySchema.extend({
  q: z.string().trim().max(100).optional(),
});
/**
 * Allowed fields for system log text search.
 */
type SystemLogSearchFieldType = Exclude<
  keyof SystemLogType,
  'id' | 'created_at' | 'company_id'
>;

const SYSTEM_LOG_SEARCH_FIELDS = [
  'action',
  'actor_username',
  'company_name',
  'company_slug',
  'target_type',
  'target_id',
] as const satisfies readonly SystemLogSearchFieldType[];

type FetchSystemLogsOptionsType = {
  search_fields?: readonly SystemLogSearchFieldType[];
};

function serializeSystemLogRow(row: SystemLogDbRowType): SystemLogType {
  return {
    ...row,
    created_at: row.created_at.toISOString(),
  };
}

function resolveSearchFields(
  options?: FetchSystemLogsOptionsType,
): readonly SystemLogSearchFieldType[] {
  if (!options?.search_fields?.length) {
    return SYSTEM_LOG_SEARCH_FIELDS;
  }
  return options.search_fields;
}

function getSearchExpression(field: SystemLogSearchFieldType): SQLWrapper {
  switch (field) {
    case 'action':
      return activityLogs.action;
    case 'actor_username':
      return users.username;
    case 'company_name':
      return companies.name;
    case 'company_slug':
      return companies.slug;
    case 'target_type':
      return sql`COALESCE(${activityLogs.target_type}, '')`;
    case 'target_id':
      return sql`COALESCE(${activityLogs.target_id}, '')`;
  }
}

function buildSearchWhere(
  query: SystemLogsTableQueryType,
  searchFields: readonly SystemLogSearchFieldType[],
): SQL | undefined {
  if (!query.q || searchFields.length === 0) return undefined;
  const search = `%${query.q}%`;
  const conditions = searchFields.map(
    (field) => sql`${getSearchExpression(field)} ILIKE ${search}`,
  );

  if (conditions.length === 1) {
    return conditions[0];
  }

  return sql`(${sql.join(conditions, sql` OR `)})`;
}

/**
 * Fetches global (cross-company) activity logs for superadmin.
 *
 * Required:
 * - authenticated session
 * - `SUPERADMIN` role
 * - optional `search_fields` whitelist to control which columns are filtered by `q`
 */
export async function fetchSystemLogsTable(
  input: SystemLogsTableQueryType,
  session?: Session,
  options?: FetchSystemLogsOptionsType,
): Promise<ActionResult<TableResponse<SystemLogType>>> {
  const searchFields = resolveSearchFields(options);

  return fetchTable({
    input,
    schema: SYSTEM_LOGS_QUERY_SCHEMA,
    authorize: session ? async () => ok(session) : requireSuperadminSession,
    table: {
      buildWhere: (_, query): SQL | undefined =>
        buildSearchWhere(query, searchFields),
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
