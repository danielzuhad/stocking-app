import 'server-only';

import type { SQL, SQLWrapper } from 'drizzle-orm';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import type { Session } from 'next-auth';
import { z } from 'zod';

import { db } from '@/db';
import { products, productVariants } from '@/db/schema';
import type { ActionResult } from '@/lib/actions/result';
import {
  requireActiveCompanyScope,
  resolveActiveCompanyScopeFromSession,
} from '@/lib/auth/guards';
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
import type { ProductRowType } from '@/types';

const DEFAULT_ORDER_BY = [desc(products.created_at)] as const;

/** Input schema for products table fetch (pagination + optional query `q`). */
const PRODUCTS_QUERY_SCHEMA = createDataTableQueryWithSearchSchema();

/** Query type is derived from schema to avoid type/schema drift. */
type ProductsTableQueryType = z.infer<typeof PRODUCTS_QUERY_SCHEMA>;

/** Searchable columns map (field key -> SQL expression). */
const PRODUCTS_SEARCH_MAP = {
  name: products.name,
  category: sql`${products.category}::text`,
  unit: products.unit,
  status: products.status,
} as const satisfies Record<string, SQLWrapper>;

/** Default fields used when caller does not pass `options.search_fields`. */
const DEFAULT_PRODUCTS_SEARCH_FIELDS = [
  'name',
  'category',
  'unit',
  'status',
] as const satisfies readonly (keyof typeof PRODUCTS_SEARCH_MAP)[];

const productsSearch = createIlikeSearch({
  fields: PRODUCTS_SEARCH_MAP,
  defaultFields: DEFAULT_PRODUCTS_SEARCH_FIELDS,
});

/** Optional per-call overrides for products fetcher behavior. */
type FetchProductsOptionsType = SearchOptionsType<typeof PRODUCTS_SEARCH_MAP> & {
  /** Optional count strategy: `none` can reduce query cost on very large datasets. */
  row_count_mode?: TableRowCountModeType;
};

/** Minimal row selection from joined tables for products table responses. */
const PRODUCTS_ROW_SELECT = {
  id: products.id,
  created_at: products.created_at,
  updated_at: products.updated_at,
  company_id: products.company_id,
  name: products.name,
  category: products.category,
  unit: products.unit,
  status: products.status,
  variant_count: sql<number>`count(${productVariants.id})`,
} as const;

/**
 * Shared joined query used by rows query.
 */
function buildProductsBaseSelect(whereClause: SQL | undefined) {
  return db
    .select(PRODUCTS_ROW_SELECT)
    .from(products)
    .leftJoin(
      productVariants,
      and(
        eq(productVariants.company_id, products.company_id),
        eq(productVariants.product_id, products.id),
        isNull(productVariants.deleted_at),
      ),
    )
    .where(whereClause)
    .groupBy(
      products.id,
      products.created_at,
      products.updated_at,
      products.company_id,
      products.name,
      products.category,
      products.unit,
      products.status,
    );
}

/**
 * Reads paginated product rows.
 */
function getProductRows(
  whereClause: SQL | undefined,
  orderBy: typeof DEFAULT_ORDER_BY,
  pagination: TableQueryPaginationType,
) {
  return buildProductsBaseSelect(whereClause)
    .orderBy(...orderBy)
    .limit(pagination.limit)
    .offset(pagination.offset);
}

type ProductDbRowType = Awaited<ReturnType<typeof getProductRows>>[number];

/**
 * Counts products using the same base filter as `getProductRows`.
 */
async function getProductRowCount(whereClause: SQL | undefined): Promise<number> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(products)
    .where(whereClause);

  return Number(count ?? 0);
}

/**
 * Converts DB row shape into serializable UI/API shape.
 */
function serializeProductRow(row: ProductDbRowType): ProductRowType {
  return {
    ...row,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
    variant_count: Number(row.variant_count ?? 0),
  };
}

/**
 * Fetches company-scoped products list.
 *
 * Required:
 * - authenticated session
 * - `active_company_id` (superadmin must impersonate first)
 */
export async function fetchProductsTable(
  input: ProductsTableQueryType,
  session?: Session,
  options?: FetchProductsOptionsType,
): Promise<ActionResult<TableResponse<ProductRowType>>> {
  const searchFields = productsSearch.resolveFields(options?.search_fields);
  const rowCountMode = options?.row_count_mode ?? 'exact';

  return fetchTable({
    input,
    schema: PRODUCTS_QUERY_SCHEMA,
    pagination: { rowCountMode },
    authorize: session
      ? async () => resolveActiveCompanyScopeFromSession(session)
      : requireActiveCompanyScope,
    table: {
      buildWhere: (ctx, query) => {
        const companyWhere = and(
          eq(products.company_id, ctx.company_id),
          isNull(products.deleted_at),
        );
        const searchWhere = productsSearch.buildWhere(query.q, searchFields);
        return searchWhere ? and(companyWhere, searchWhere) : companyWhere;
      },
      buildOrderBy: () => DEFAULT_ORDER_BY,
      getRowCount: (_, whereClause) => getProductRowCount(whereClause),
      getRows: (_, whereClause, orderBy, pagination) =>
        getProductRows(whereClause, orderBy, pagination),
      serializeRow: serializeProductRow,
    },
    errorTag: 'PRODUCTS_FETCH_ERROR',
  });
}
