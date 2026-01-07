import { and, desc, eq, sql } from 'drizzle-orm';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { db } from '@/db';
import { activityLogs, companies, users } from '@/db/schema';
import { serializeCreatedAt } from '@/lib/activity/logs.data-table';
import type { ActivityLogRow } from '@/lib/activity/types';
import { requireCompanyAdminOrSuperadminScope } from '@/lib/auth/guards';
import {
  buildDataTableIlikeSearch,
  DataTableIlikeColumn,
} from '@/lib/data-table/drizzle';
import {
  DEFAULT_PAGE_SIZE_OPTIONS,
  getDataTableSearchParams,
  parsePageIndex,
  parsePageSize,
  type PageSearchParams,
} from '@/lib/data-table/page-params';

import { ActivityLogsTable } from './activity-logs-table';

const URL_STATE_KEY = 'dt_activity_logs';

/** Shared search columns across log-like tables. */
const BASE_LOGS_SEARCH_COLUMNS = [
  activityLogs.action,
  users.username,
  activityLogs.target_type,
  activityLogs.target_id,
] satisfies DataTableIlikeColumn[];

/** Company-scoped activity logs (admin/superadmin only). */
export default async function ActivityLogsPage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const scopeResult = await requireCompanyAdminOrSuperadminScope();
  if (!scopeResult.ok) {
    return (
      <EmptyState
        title="Activity Logs"
        description={scopeResult.error.message}
      />
    );
  }

  const scope = scopeResult.data;
  const { pageParam, pageSizeParam, searchParam } = getDataTableSearchParams(
    resolvedSearchParams,
    URL_STATE_KEY,
  );

  const pageIndex = parsePageIndex(pageParam);
  const pageSize = parsePageSize(pageSizeParam, DEFAULT_PAGE_SIZE_OPTIONS[0]);
  const search = searchParam.trim();

  const [company] = await db
    .select({
      id: companies.id,
      name: companies.name,
      slug: companies.slug,
    })
    .from(companies)
    .where(eq(companies.id, scope.company_id))
    .limit(1);

  const searchWhere = buildDataTableIlikeSearch(
    search,
    BASE_LOGS_SEARCH_COLUMNS,
  );

  const whereClause = and(
    eq(activityLogs.company_id, scope.company_id),
    searchWhere,
  );

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(activityLogs)
    .innerJoin(users, eq(users.id, activityLogs.actor_user_id))
    .where(whereClause);

  const rowCount = Number(count ?? 0);

  const rows = await db
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
    .orderBy(desc(activityLogs.created_at))
    .limit(pageSize)
    .offset(pageIndex * pageSize);

  const logs: ActivityLogRow[] = rows.map((row) => ({
    ...serializeCreatedAt(row),
    meta: row.meta ?? null,
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>Activity Logs</CardTitle>
            <div className="text-muted-foreground text-sm">
              Audit trail untuk company aktif.
            </div>
          </div>
          <Badge variant="secondary">
            {rowCount.toLocaleString('id-ID')} logs
          </Badge>
        </CardHeader>
        <CardContent className="text-muted-foreground text-xs">
          Company:{' '}
          <span className="text-foreground font-medium">
            {company?.name ?? '—'}
          </span>{' '}
          <span className="text-muted-foreground">
            ({company?.slug ?? scope.company_id})
          </span>
        </CardContent>
      </Card>

      <ActivityLogsTable
        data={logs}
        rowCount={rowCount}
        initialPageIndex={pageIndex}
        initialPageSize={pageSize}
      />
    </div>
  );
}
