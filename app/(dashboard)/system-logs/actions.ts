'use server';

import type { ActionResult } from '@/lib/actions/result';
import type { SystemLogRow } from '@/lib/activity/types';
import { fetchSystemLogsPage } from '@/lib/activity/system-logs.data-table';
import type { DataTablePage, DataTableQuery } from '@/lib/data-table/types';

/**
 * Server action wrapper for the System Logs `DataTable`.
 *
 * Query details live in `lib/activity/system-logs.data-table.ts` so pages only need
 * this single exported function.
 */
export async function getSystemLogsPage(
  input: DataTableQuery,
): Promise<ActionResult<DataTablePage<SystemLogRow>>> {
  return fetchSystemLogsPage(input);
}
