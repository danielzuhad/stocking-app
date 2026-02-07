import 'server-only';

import type { ZodSchema } from 'zod';

import { err, errFromZod, ok, type ActionResult } from '@/lib/actions/result';
import { dataTableQuerySchema, type DataTableQuery } from '@/lib/table/types';
import { getErrorPresentation } from '@/lib/errors/presentation';

export type TableRowCountMode = 'exact' | 'none';

export type TableMeta = {
  pageIndex: number;
  pageSize: number;
  rowCount: number;
  pageCount: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  rowCountMode: TableRowCountMode;
};

export type TableResponse<TData> = {
  data: TData[];
  meta: TableMeta;
};

export type TablePaginationOptions = {
  /** Hard cap for page size (useful to prevent expensive queries). */
  maxPageSize?: number;
  /** Skip `count(*)` when set to `none` (meta will be best-effort). */
  rowCountMode?: TableRowCountMode;
};

export type TablePagination = {
  pageIndex: number;
  pageSize: number;
  limit: number;
  offset: number;
};

export type TableFetcherOptions<
  TInput extends DataTableQuery,
  TContext,
  TWhere,
  TOrderBy,
  TRowDb,
  TRow,
> = {
  input: unknown;
  schema?: ZodSchema<TInput>;
  authorize?: () => Promise<ActionResult<TContext>>;
  table: {
    buildWhere: (ctx: TContext, query: TInput) => TWhere;
    buildOrderBy: (ctx: TContext, query: TInput) => TOrderBy;
    getRowCount?: (ctx: TContext, where: TWhere) => Promise<number>;
    getRows: (
      ctx: TContext,
      where: TWhere,
      orderBy: TOrderBy,
      pagination: TablePagination,
    ) => Promise<TRowDb[]>;
    serializeRow: (row: TRowDb, ctx: TContext) => TRow;
  };
  pagination?: TablePaginationOptions;
  errorTag: string;
  userErrorMessage?: string;
};

function normalizeQuery<T extends DataTableQuery>(
  query: T,
  options?: TablePaginationOptions,
): T {
  const maxPageSize = options?.maxPageSize;
  if (!maxPageSize || query.pageSize <= maxPageSize) return query;
  return { ...query, pageSize: maxPageSize };
}

function getPagination(query: DataTableQuery): TablePagination {
  const limit = query.pageSize;
  const offset = query.pageIndex * query.pageSize;

  return {
    pageIndex: query.pageIndex,
    pageSize: query.pageSize,
    limit,
    offset,
  };
}

function getRowCountMeta(
  rowCount: number,
  pagination: TablePagination,
): Pick<TableMeta, 'pageCount' | 'hasNextPage' | 'hasPrevPage'> {
  const pageCount = rowCount === 0 ? 0 : Math.ceil(rowCount / pagination.pageSize);
  const hasNextPage = pagination.pageIndex + 1 < pageCount;
  const hasPrevPage = pagination.pageIndex > 0;

  return { pageCount, hasNextPage, hasPrevPage };
}

function getApproximateMeta(
  pagination: TablePagination,
  rowsLength: number,
): Pick<TableMeta, 'pageCount' | 'hasNextPage' | 'hasPrevPage'> {
  const hasNextPage = rowsLength === pagination.pageSize;
  const pageCount = hasNextPage ? pagination.pageIndex + 2 : pagination.pageIndex + 1;
  const hasPrevPage = pagination.pageIndex > 0;

  return { pageCount, hasNextPage, hasPrevPage };
}

/**
 * Fetches a paginated table response with metadata for server-rendered DataTables.
 *
 * - Validates input with Zod
 * - Enforces auth/tenant scope via `authorize`
 * - Runs `count + rows` in parallel when possible
 */
export async function fetchTable<
  TInput extends DataTableQuery,
  TContext,
  TWhere,
  TOrderBy,
  TRowDb,
  TRow,
>(
  options: TableFetcherOptions<TInput, TContext, TWhere, TOrderBy, TRowDb, TRow>,
): Promise<ActionResult<TableResponse<TRow>>> {
  const schema = (options.schema ?? dataTableQuerySchema) as ZodSchema<TInput>;
  const parsed = schema.safeParse(options.input);
  if (!parsed.success) return errFromZod(parsed.error);

  const authResult = options.authorize
    ? await options.authorize()
    : ok({} as TContext);
  if (!authResult.ok) return authResult;

  const rowCountMode = options.pagination?.rowCountMode ?? 'exact';
  const query = normalizeQuery(parsed.data, options.pagination);
  const pagination = getPagination(query);
  const ctx = authResult.data;
  const where = options.table.buildWhere(ctx, query);
  const orderBy = options.table.buildOrderBy(ctx, query);

  try {
    if (rowCountMode === 'none') {
      const rows = await options.table.getRows(
        ctx,
        where,
        orderBy,
        pagination,
      );
      const rowCount = pagination.pageIndex * pagination.pageSize + rows.length;
      const meta = getApproximateMeta(pagination, rows.length);

      return ok({
        data: rows.map((row) => options.table.serializeRow(row, ctx)),
        meta: {
          pageIndex: pagination.pageIndex,
          pageSize: pagination.pageSize,
          rowCount,
          rowCountMode,
          ...meta,
        },
      });
    }

    if (!options.table.getRowCount) {
      return err('INTERNAL', 'Table configuration missing row count handler.');
    }

    const [rowCount, rows] = await Promise.all([
      options.table.getRowCount(ctx, where),
      options.table.getRows(ctx, where, orderBy, pagination),
    ]);

    const meta = getRowCountMeta(rowCount, pagination);

    return ok({
      data: rows.map((row) => options.table.serializeRow(row, ctx)),
      meta: {
        pageIndex: pagination.pageIndex,
        pageSize: pagination.pageSize,
        rowCount,
        rowCountMode,
        ...meta,
      },
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
