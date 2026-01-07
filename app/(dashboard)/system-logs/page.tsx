import { desc, eq, sql } from 'drizzle-orm';

import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { db } from '@/db';
import { activityLogs, companies, users } from '@/db/schema';
import { serializeCreatedAt } from '@/lib/activity/logs.data-table';
import type { SystemLogRow } from '@/lib/activity/types';
import { requireSuperadminSession } from '@/lib/auth/guards';
import { buildDataTableIlikeSearch } from '@/lib/data-table/drizzle';
import {
  DEFAULT_PAGE_SIZE_OPTIONS,
  getDataTableSearchParams,
  parsePageIndex,
  parsePageSize,
  type PageSearchParams,
} from '@/lib/data-table/page-params';

import { SystemLogsTable } from './system-logs-table';

const URL_STATE_KEY = 'dt_system_logs';

/** Superadmin-only global logs (cross-company). */
export default async function SystemLogsPage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const sessionResult = await requireSuperadminSession();
  if (!sessionResult.ok) {
    return (
      <EmptyState
        title="System Logs"
        description={sessionResult.error.message}
      />
    );
  }

  const { pageParam, pageSizeParam, searchParam } = getDataTableSearchParams(
    resolvedSearchParams,
    URL_STATE_KEY,
  );

  const pageIndex = parsePageIndex(pageParam);
  const pageSize = parsePageSize(pageSizeParam, DEFAULT_PAGE_SIZE_OPTIONS[0]);
  const search = searchParam.trim();

  const searchWhere = buildDataTableIlikeSearch(search, [
    activityLogs.action,
    users.username,
    activityLogs.target_type,
    activityLogs.target_id,
    companies.name,
    companies.slug,
  ]);
  const whereClause = searchWhere;

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(activityLogs)
    .innerJoin(companies, eq(companies.id, activityLogs.company_id))
    .innerJoin(users, eq(users.id, activityLogs.actor_user_id))
    .where(whereClause);

  const rowCount = Number(count ?? 0);

  const rows = await db
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
    .orderBy(desc(activityLogs.created_at))
    .limit(pageSize)
    .offset(pageIndex * pageSize);

  const logs: SystemLogRow[] = rows.map((row) => serializeCreatedAt(row));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>System Logs</CardTitle>
            <div className="text-muted-foreground text-sm">
              Global audit logs lintas company.
            </div>
          </div>
          <Badge variant="secondary">
            {rowCount.toLocaleString('id-ID')} logs
          </Badge>
        </CardHeader>
      </Card>

      <SystemLogsTable
        data={logs}
        rowCount={rowCount}
        initialPageIndex={pageIndex}
        initialPageSize={pageSize}
      />
    </div>
  );
}
