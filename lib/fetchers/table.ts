import 'server-only';

import { unstable_cache } from 'next/cache';
import type { ZodSchema } from 'zod';

import { err, errFromZod, ok, type ActionResult } from '@/lib/actions/result';
import { getErrorPresentation } from '@/lib/errors/presentation';
import { dataTableQuerySchema, type DataTableQuery } from '@/lib/table/types';

export type TableRowCountModeType = 'exact' | 'none';

export type TableQueryPaginationType = {
  pageIndex: number;
  pageSize: number;
  limit: number;
  offset: number;
};

type TableMeta = {
  pageIndex: number;
  pageSize: number;
  rowCount: number;
  pageCount: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  rowCountMode: TableRowCountModeType;
};

export type TableResponse<TData> = {
  data: TData[];
  meta: TableMeta;
};

type TablePaginationOptions = {
  /** Hard cap for page size (useful to prevent expensive queries). */
  maxPageSize?: number;
  /** Skip `count(*)` when set to `none` (meta will be best-effort). */
  rowCountMode?: TableRowCountModeType;
};

/**
 * Optional cache controls for `fetchTable`.
 *
 * Keep caching feature-local and only enable it for read-heavy, low-volatility lists.
 * To avoid cross-tenant leaks, key parts must include all access scopes that can
 * change result data (for example: company, impersonation target, role scope).
 */
type TableCacheOptions<TInput extends DataTableQuery, TContext> = {
  /**
   * Extra key parts to scope cache safely.
   *
   * Must include tenant and permission scope where relevant (for example:
   * `activeCompanyId`, role, or impersonation target).
   */
  getKeyParts: (ctx: TContext, query: TInput) => readonly string[];
  /**
   * Optional cache tags for explicit invalidation via `revalidateTag`.
   */
  getTags?: (ctx: TContext, query: TInput) => readonly string[];
  /**
   * Cache revalidation time in seconds.
   *
   * Use small values for list/table data (for example 5-30s).
   */
  revalidate?: number | false;
  /**
   * Enables cache debug logs (server-side only).
   *
   * Useful to inspect computed key parts and detect `HIT` vs `MISS`.
   */
  debug?: boolean;
};

type TableFetcherOptions<
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
      pagination: TableQueryPaginationType,
    ) => Promise<TRowDb[]>;
    serializeRow: (row: TRowDb, ctx: TContext) => TRow;
  };
  pagination?: TablePaginationOptions;
  /**
   * Optional server cache for read-heavy tables.
   *
   * Keep this opt-in and feature-local; not all table data should be cached.
   */
  cache?: TableCacheOptions<TInput, TContext>;
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

function getPagination(query: DataTableQuery): TableQueryPaginationType {
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
  pagination: TableQueryPaginationType,
): Pick<TableMeta, 'pageCount' | 'hasNextPage' | 'hasPrevPage'> {
  const pageCount =
    rowCount === 0 ? 0 : Math.ceil(rowCount / pagination.pageSize);
  const hasNextPage = pagination.pageIndex + 1 < pageCount;
  const hasPrevPage = pagination.pageIndex > 0;

  return { pageCount, hasNextPage, hasPrevPage };
}

function getApproximateMeta(
  pagination: TableQueryPaginationType,
  rowsLength: number,
): Pick<TableMeta, 'pageCount' | 'hasNextPage' | 'hasPrevPage'> {
  const hasNextPage = rowsLength === pagination.pageSize;
  const pageCount = hasNextPage
    ? pagination.pageIndex + 2
    : pagination.pageIndex + 1;
  const hasPrevPage = pagination.pageIndex > 0;

  return { pageCount, hasNextPage, hasPrevPage };
}

/**
 * Fetches a paginated table response with metadata for server-rendered DataTables.
 *
 * - Validates input with Zod
 * - Enforces auth/tenant scope via `authorize`
 * - Runs `count + rows` in parallel when possible
 * - When `cache` is provided, wraps the DB query in Next.js `unstable_cache`
 *   using: `errorTag + normalized query + cache key parts`.
 *
 * Cache flow (optional):
 * 1. Parse and normalize query.
 * 2. Build tenant-scoped context, where, and order.
 * 3. Build one async query executor (`runTableQuery`).
 * 4. If `cache` exists, cache executor with `keyParts/tags/revalidate`;
 *    otherwise execute directly.
 *
 * Syntax:
 * ```ts
 * // No cache (default)
 * await fetchTable({
 *   input,
 *   schema,
 *   authorize,
 *   table,
 *   errorTag: 'SYSTEM_LOGS_FETCH_FAILED',
 * });
 *
 * // With cache (optional)
 * await fetchTable({
 *   input,
 *   schema,
 *   authorize,
 *   table,
 *   errorTag: 'SYSTEM_LOGS_FETCH_FAILED',
 *   cache: {
 *     getKeyParts: (ctx, query) => [
 *       `company:${ctx.activeCompanyId}`,
 *       `role:${ctx.role}`,
 *       `page:${query.pageIndex}`,
 *       `size:${query.pageSize}`,
 *     ],
 *     getTags: (ctx) => [`system-logs:${ctx.activeCompanyId}`],
 *     revalidate: 15,
 *     debug: true, // logs key + HIT/MISS to server console
 *   },
 * });
 *
 * // Invalidate after mutation (only if you use getTags)
 * // import { revalidateTag } from 'next/cache';
 * // revalidateTag(`system-logs:${activeCompanyId}`);
 * ```
 */
export async function fetchTable<
  TInput extends DataTableQuery,
  TContext,
  TWhere,
  TOrderBy,
  TRowDb,
  TRow,
>(
  options: TableFetcherOptions<
    TInput,
    TContext,
    TWhere,
    TOrderBy,
    TRowDb,
    TRow
  >,
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
  const runTableQuery = async (): Promise<TableResponse<TRow>> => {
    if (rowCountMode === 'none') {
      const rows = await options.table.getRows(ctx, where, orderBy, pagination);
      const rowCount = pagination.pageIndex * pagination.pageSize + rows.length;
      const meta = getApproximateMeta(pagination, rows.length);

      return {
        data: rows.map((row) => options.table.serializeRow(row, ctx)),
        meta: {
          pageIndex: pagination.pageIndex,
          pageSize: pagination.pageSize,
          rowCount,
          rowCountMode,
          ...meta,
        },
      };
    }

    if (!options.table.getRowCount) {
      throw new Error('Table configuration missing row count handler.');
    }

    const [rowCount, rows] = await Promise.all([
      options.table.getRowCount(ctx, where),
      options.table.getRows(ctx, where, orderBy, pagination),
    ]);

    const meta = getRowCountMeta(rowCount, pagination);

    return {
      data: rows.map((row) => options.table.serializeRow(row, ctx)),
      meta: {
        pageIndex: pagination.pageIndex,
        pageSize: pagination.pageSize,
        rowCount,
        rowCountMode,
        ...meta,
      },
    };
  };

  try {
    if (options.cache) {
      // Base key always includes `errorTag` and query to separate each table + params.
      // Feature code must add tenant/permission scope via `getKeyParts`.
      const keyParts = [
        options.errorTag,
        JSON.stringify(query),
        ...options.cache.getKeyParts(ctx, query),
      ];
      const tags = options.cache.getTags?.(ctx, query);
      const debug = options.cache.debug === true;
      if (debug) {
        console.info('[table-cache] key', {
          errorTag: options.errorTag,
          keyParts,
          tags,
          revalidate: options.cache.revalidate,
        });
      }

      let isMiss = false;
      const runTableQueryWithDebug = async () => {
        isMiss = true;
        return runTableQuery();
      };
      const cachedQuery = unstable_cache(runTableQueryWithDebug, keyParts, {
        revalidate: options.cache.revalidate,
        tags: tags ? [...tags] : undefined,
      });

      const response = await cachedQuery();
      if (debug) {
        console.info('[table-cache] result', {
          errorTag: options.errorTag,
          status: isMiss ? 'MISS' : 'HIT',
          keyParts,
        });
      }

      return ok(response);
    }

    return ok(await runTableQuery());
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
