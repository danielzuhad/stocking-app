import { EmptyState } from '@/components/ui/empty-state';
import { requireSuperadminSession } from '@/lib/auth/guards';
import {
  getDataTableQueryFromSearchParams,
  type PageSearchParams,
} from '@/lib/table/page-params';

import { fetchSystemLogsTable } from './fetcher';
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

  const query = getDataTableQueryFromSearchParams(
    resolvedSearchParams,
    URL_STATE_KEY,
  );

  const logsResult = await fetchSystemLogsTable(query, sessionResult.data);
  if (!logsResult.ok) {
    return (
      <EmptyState title="System Logs" description={logsResult.error.message} />
    );
  }

  const { data, meta } = logsResult.data;

  return (
    <div className="space-y-6">
      <SystemLogsTable
        data={data}
        rowCount={meta.rowCount}
        initialPageIndex={meta.pageIndex}
        initialPageSize={meta.pageSize}
      />
    </div>
  );
}
