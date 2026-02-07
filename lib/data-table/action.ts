import 'server-only';

import type { ActionResult } from '@/lib/actions/result';
import { err, errFromZod, ok } from '@/lib/actions/result';
import { getErrorPresentation } from '@/lib/errors/presentation';

import {
  dataTableQuerySchema,
  type DataTablePage,
  type DataTableQuery,
} from './types';

export type DataTablePagination = {
  pageIndex: number;
  pageSize: number;
  limit: number;
  offset: number;
};

/**
 * Normalizes pagination values from a `DataTableQuery`.
 */
export function getDataTablePagination(
  query: DataTableQuery,
): DataTablePagination {
  const limit = query.pageSize;
  const offset = query.pageIndex * query.pageSize;

  return {
    pageIndex: query.pageIndex,
    pageSize: query.pageSize,
    limit,
    offset,
  };
}

export type DataTableActionOptions<TContext, TWhere, TOrderBy, TRowDb, TRow> = {
  input: DataTableQuery;
  authorize: () => Promise<ActionResult<TContext>>;
  buildWhere: (ctx: TContext, query: DataTableQuery) => TWhere;
  buildOrderBy: (ctx: TContext, query: DataTableQuery) => TOrderBy;
  getRowCount: (ctx: TContext, where: TWhere) => Promise<number>;
  getRows: (
    ctx: TContext,
    where: TWhere,
    orderBy: TOrderBy,
    pagination: DataTablePagination,
  ) => Promise<TRowDb[]>;
  serializeRow: (row: TRowDb, ctx: TContext) => TRow;
  errorTag: string;
  userErrorMessage?: string;
};

/**
 * Standard helper to implement server-driven `DataTable` fetchers (server actions / route handlers).
 *
 * Handles:
 * - `DataTableQuery` validation
 * - auth/tenant guard via `authorize`
 * - rowCount + rows fetching
 * - safe error response for infra errors
 */
export async function fetchDataTablePage<
  TContext,
  TWhere,
  TOrderBy,
  TRowDb,
  TRow,
>(
  options: DataTableActionOptions<TContext, TWhere, TOrderBy, TRowDb, TRow>,
): Promise<ActionResult<DataTablePage<TRow>>> {
  const parsed = dataTableQuerySchema.safeParse(options.input);
  if (!parsed.success) return errFromZod(parsed.error);

  const authResult = await options.authorize();
  if (!authResult.ok) return authResult;

  const query = parsed.data;
  const pagination = getDataTablePagination(query);
  const ctx = authResult.data;
  const where = options.buildWhere(ctx, query);
  const orderBy = options.buildOrderBy(ctx, query);

  try {
    const [rowCount, rows] = await Promise.all([
      options.getRowCount(ctx, where),
      options.getRows(ctx, where, orderBy, pagination),
    ]);

    return ok({
      rowCount,
      rows: rows.map((row) => options.serializeRow(row, ctx)),
    });
  } catch (error) {
    const presentation = getErrorPresentation({ error });
    console.error(options.errorTag, presentation.developer);
    return err(
      'INTERNAL',
      options.userErrorMessage ??
        'Sedang ada gangguan sistem. Coba lagi beberapa saat.',
    );
  }
}
