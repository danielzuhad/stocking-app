import { EmptyState } from '@/components/ui/empty-state';
import {
  getDataTableQueryFromSearchParams,
  getTextQueryFromSearchParams,
  type PageSearchParams,
} from '@/lib/table/page-params';

import { ActivityLogsTable } from './activity-logs-table';
import { fetchActivityLogsTable } from './fetcher';

const URL_STATE_KEY = 'dt_activity_logs';

/** Company-scoped activity logs (admin/superadmin only). */
export default async function ActivityLogsPage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const query = getDataTableQueryFromSearchParams(
    resolvedSearchParams,
    URL_STATE_KEY,
  );
  const q = getTextQueryFromSearchParams(resolvedSearchParams, 'q');

  const logsResult = await fetchActivityLogsTable({ ...query, q }, undefined, {
    search_fields: ['action', 'actor_username'],
  });
  if (!logsResult.ok) {
    return (
      <EmptyState
        title="Activity Logs"
        description={logsResult.error.message}
      />
    );
  }

  const { data, meta } = logsResult.data;

  return (
    <div className="space-y-6">
      <ActivityLogsTable
        data={data}
        rowCount={meta.rowCount}
        initialPageIndex={meta.pageIndex}
        initialPageSize={meta.pageSize}
      />
    </div>
  );
}
