import 'server-only';

import { and, desc, eq, isNull, sql, type SQLWrapper } from 'drizzle-orm';
import type { Session } from 'next-auth';
import { z } from 'zod';

import { db } from '@/db';
import {
  products,
  productVariants,
  receivingItems,
  receivings,
  stockAdjustmentItems,
  stockAdjustments,
  stockMovements,
  stockOpnameItems,
  stockOpnames,
} from '@/db/schema';
import { ok, type ActionResult } from '@/lib/actions/result';
import {
  requireActiveCompanyScope,
  resolveActiveCompanyScopeFromSession,
} from '@/lib/auth/guards';
import {
  STOCK_MOVEMENT_IN,
  STOCK_MOVEMENT_OUT,
  STOCK_OPNAME_STATUS_IN_PROGRESS,
} from '@/lib/inventory/enums';
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
import type {
  ActiveStockOpnameType,
  InventoryStockRowType,
  InventoryVariantOptionType,
  ReceivingRowType,
  StockAdjustmentRowType,
  StockOpnameRowType,
} from '@/types';

const DEFAULT_ORDER_BY = [desc(productVariants.updated_at)] as const;

/** Input schema for inventory stock table fetch (pagination + optional query `q`). */
const INVENTORY_STOCK_QUERY_SCHEMA = createDataTableQueryWithSearchSchema();

/** Query type is derived from schema to avoid type/schema drift. */
type InventoryStockTableQueryType = z.infer<typeof INVENTORY_STOCK_QUERY_SCHEMA>;

/** Searchable columns map (field key -> SQL expression). */
const INVENTORY_STOCK_SEARCH_MAP = {
  product_name: products.name,
  variant_name: productVariants.name,
  sku: sql`coalesce(${productVariants.sku}, '')`,
  barcode: sql`coalesce(${productVariants.barcode}, '')`,
} as const satisfies Record<string, SQLWrapper>;

/** Default fields used when caller does not pass `options.search_fields`. */
const DEFAULT_INVENTORY_STOCK_SEARCH_FIELDS = [
  'product_name',
  'variant_name',
  'sku',
  'barcode',
] as const satisfies readonly (keyof typeof INVENTORY_STOCK_SEARCH_MAP)[];

const inventoryStockSearch = createIlikeSearch({
  fields: INVENTORY_STOCK_SEARCH_MAP,
  defaultFields: DEFAULT_INVENTORY_STOCK_SEARCH_FIELDS,
});

/** Optional per-call overrides for inventory stock fetcher behavior. */
type FetchInventoryStockOptionsType = SearchOptionsType<
  typeof INVENTORY_STOCK_SEARCH_MAP
> & {
  row_count_mode?: TableRowCountModeType;
};

/**
 * Converts SQL numeric value into JavaScript number safely.
 */
function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

const stockQtySql = sql<string>`coalesce(
  sum(
    case
      when ${stockMovements.type} = ${STOCK_MOVEMENT_IN} then ${stockMovements.qty}
      when ${stockMovements.type} = ${STOCK_MOVEMENT_OUT} then ${stockMovements.qty} * -1
      else ${stockMovements.qty}
    end
  ),
  0
)`;

/** Minimal row selection for inventory stock table responses. */
const INVENTORY_STOCK_ROW_SELECT = {
  product_variant_id: productVariants.id,
  product_id: products.id,
  product_name: products.name,
  variant_name: productVariants.name,
  sku: productVariants.sku,
  barcode: productVariants.barcode,
  current_qty: stockQtySql,
  updated_at: productVariants.updated_at,
} as const;

/**
 * Shared joined query used by rows query.
 */
function buildInventoryStockBaseSelect(whereClause: ReturnType<typeof and>) {
  return db
    .select(INVENTORY_STOCK_ROW_SELECT)
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.product_id))
    .leftJoin(
      stockMovements,
      and(
        eq(stockMovements.company_id, productVariants.company_id),
        eq(stockMovements.product_variant_id, productVariants.id),
      ),
    )
    .where(whereClause)
    .groupBy(
      productVariants.id,
      products.id,
      products.name,
      productVariants.name,
      productVariants.sku,
      productVariants.barcode,
      productVariants.updated_at,
    );
}

/**
 * Reads paginated stock rows from movement ledger.
 */
function getInventoryStockRows(
  whereClause: ReturnType<typeof and>,
  orderBy: typeof DEFAULT_ORDER_BY,
  pagination: TableQueryPaginationType,
) {
  return buildInventoryStockBaseSelect(whereClause)
    .orderBy(...orderBy)
    .limit(pagination.limit)
    .offset(pagination.offset);
}

type InventoryStockDbRowType = Awaited<
  ReturnType<typeof getInventoryStockRows>
>[number];

/**
 * Counts active product variants for the same base filter.
 */
async function getInventoryStockRowCount(
  whereClause: ReturnType<typeof and>,
): Promise<number> {
  const baseQuery = db
    .select({ id: productVariants.id })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.product_id))
    .where(whereClause)
    .as('inventory_stock_count_base');

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(baseQuery);

  return Number(count ?? 0);
}

/**
 * Converts DB row shape into serializable UI/API shape.
 */
function serializeInventoryStockRow(row: InventoryStockDbRowType): InventoryStockRowType {
  return {
    product_variant_id: row.product_variant_id,
    product_id: row.product_id,
    product_name: row.product_name,
    variant_name: row.variant_name,
    sku: row.sku,
    barcode: row.barcode,
    current_qty: toNumber(row.current_qty),
    updated_at: row.updated_at.toISOString(),
  };
}

/**
 * Fetches inventory stock table derived from stock movement ledger.
 *
 * Required:
 * - authenticated session
 * - active company scope
 */
export async function fetchInventoryStockTable(
  input: InventoryStockTableQueryType,
  session?: Session,
  options?: FetchInventoryStockOptionsType,
): Promise<ActionResult<TableResponse<InventoryStockRowType>>> {
  const searchFields = inventoryStockSearch.resolveFields(options?.search_fields);
  const rowCountMode = options?.row_count_mode ?? 'exact';

  return fetchTable({
    input,
    schema: INVENTORY_STOCK_QUERY_SCHEMA,
    pagination: { rowCountMode },
    authorize: session
      ? async () => resolveActiveCompanyScopeFromSession(session)
      : requireActiveCompanyScope,
    table: {
      buildWhere: (ctx, query) => {
        const companyWhere = and(
          eq(productVariants.company_id, ctx.company_id),
          eq(products.company_id, ctx.company_id),
          isNull(productVariants.deleted_at),
          isNull(products.deleted_at),
        );
        const searchWhere = inventoryStockSearch.buildWhere(query.q, searchFields);

        if (!searchWhere) return companyWhere;
        return and(companyWhere, searchWhere);
      },
      buildOrderBy: () => DEFAULT_ORDER_BY,
      getRowCount: (_, whereClause) => getInventoryStockRowCount(whereClause),
      getRows: (_, whereClause, orderBy, pagination) =>
        getInventoryStockRows(whereClause, orderBy, pagination),
      serializeRow: serializeInventoryStockRow,
    },
    errorTag: 'INVENTORY_STOCK_FETCH_ERROR',
  });
}

/**
 * Fetches active variant options for inventory mutation forms.
 */
export async function fetchInventoryVariantOptions(
  session?: Session,
): Promise<ActionResult<InventoryVariantOptionType[]>> {
  const scopeResult = session
    ? resolveActiveCompanyScopeFromSession(session)
    : await requireActiveCompanyScope();

  if (!scopeResult.ok) return scopeResult;

  const rows = await db
    .select({
      product_id: products.id,
      product_variant_id: productVariants.id,
      product_label: products.name,
      variant_label: productVariants.name,
      sku: productVariants.sku,
      barcode: productVariants.barcode,
    })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.product_id))
    .where(
      and(
        eq(productVariants.company_id, scopeResult.data.company_id),
        eq(products.company_id, scopeResult.data.company_id),
        isNull(productVariants.deleted_at),
        isNull(products.deleted_at),
      ),
    )
    .orderBy(products.name, productVariants.name);

  return ok(rows);
}

/**
 * Fetches recent receiving rows for current company.
 */
export async function fetchRecentReceivings(
  input?: { limit?: number },
  session?: Session,
): Promise<ActionResult<ReceivingRowType[]>> {
  const scopeResult = session
    ? resolveActiveCompanyScopeFromSession(session)
    : await requireActiveCompanyScope();

  if (!scopeResult.ok) return scopeResult;

  const limit = Math.max(1, Math.min(input?.limit ?? 20, 100));

  const rows = await db
    .select({
      id: receivings.id,
      status: receivings.status,
      note: receivings.note,
      created_at: receivings.created_at,
      posted_at: receivings.posted_at,
      item_count: sql<number>`count(${receivingItems.id})`,
      total_qty: sql<string>`coalesce(sum(${receivingItems.qty}), 0)`,
    })
    .from(receivings)
    .leftJoin(
      receivingItems,
      and(
        eq(receivingItems.company_id, receivings.company_id),
        eq(receivingItems.receiving_id, receivings.id),
      ),
    )
    .where(eq(receivings.company_id, scopeResult.data.company_id))
    .groupBy(
      receivings.id,
      receivings.status,
      receivings.note,
      receivings.created_at,
      receivings.posted_at,
    )
    .orderBy(desc(receivings.created_at))
    .limit(limit);

  return ok(
    rows.map((row) => ({
      id: row.id,
      status: row.status,
      note: row.note,
      created_at: row.created_at.toISOString(),
      posted_at: row.posted_at ? row.posted_at.toISOString() : null,
      item_count: Number(row.item_count ?? 0),
      total_qty: toNumber(row.total_qty),
    })),
  );
}

/**
 * Fetches recent stock adjustment rows for current company.
 */
export async function fetchRecentStockAdjustments(
  input?: { limit?: number },
  session?: Session,
): Promise<ActionResult<StockAdjustmentRowType[]>> {
  const scopeResult = session
    ? resolveActiveCompanyScopeFromSession(session)
    : await requireActiveCompanyScope();

  if (!scopeResult.ok) return scopeResult;

  const limit = Math.max(1, Math.min(input?.limit ?? 20, 100));

  const rows = await db
    .select({
      id: stockAdjustments.id,
      reason: stockAdjustments.reason,
      note: stockAdjustments.note,
      created_at: stockAdjustments.created_at,
      item_count: sql<number>`count(${stockAdjustmentItems.id})`,
      total_qty_diff: sql<string>`coalesce(sum(${stockAdjustmentItems.qty_diff}), 0)`,
    })
    .from(stockAdjustments)
    .leftJoin(
      stockAdjustmentItems,
      and(
        eq(stockAdjustmentItems.company_id, stockAdjustments.company_id),
        eq(stockAdjustmentItems.stock_adjustment_id, stockAdjustments.id),
      ),
    )
    .where(eq(stockAdjustments.company_id, scopeResult.data.company_id))
    .groupBy(
      stockAdjustments.id,
      stockAdjustments.reason,
      stockAdjustments.note,
      stockAdjustments.created_at,
    )
    .orderBy(desc(stockAdjustments.created_at))
    .limit(limit);

  return ok(
    rows.map((row) => ({
      id: row.id,
      reason: row.reason,
      note: row.note,
      created_at: row.created_at.toISOString(),
      item_count: Number(row.item_count ?? 0),
      total_qty_diff: toNumber(row.total_qty_diff),
    })),
  );
}

/**
 * Fetches recent stock opname rows for current company.
 */
export async function fetchRecentStockOpnames(
  input?: { limit?: number },
  session?: Session,
): Promise<ActionResult<StockOpnameRowType[]>> {
  const scopeResult = session
    ? resolveActiveCompanyScopeFromSession(session)
    : await requireActiveCompanyScope();

  if (!scopeResult.ok) return scopeResult;

  const limit = Math.max(1, Math.min(input?.limit ?? 20, 100));

  const rows = await db
    .select({
      id: stockOpnames.id,
      status: stockOpnames.status,
      note: stockOpnames.note,
      started_at: stockOpnames.started_at,
      finalized_at: stockOpnames.finalized_at,
      item_count: sql<number>`count(${stockOpnameItems.id})`,
      diff_item_count: sql<number>`sum(case when ${stockOpnameItems.diff_qty} <> 0 then 1 else 0 end)`,
    })
    .from(stockOpnames)
    .leftJoin(
      stockOpnameItems,
      and(
        eq(stockOpnameItems.company_id, stockOpnames.company_id),
        eq(stockOpnameItems.stock_opname_id, stockOpnames.id),
      ),
    )
    .where(eq(stockOpnames.company_id, scopeResult.data.company_id))
    .groupBy(
      stockOpnames.id,
      stockOpnames.status,
      stockOpnames.note,
      stockOpnames.started_at,
      stockOpnames.finalized_at,
    )
    .orderBy(desc(stockOpnames.created_at))
    .limit(limit);

  return ok(
    rows.map((row) => ({
      id: row.id,
      status: row.status,
      note: row.note,
      started_at: row.started_at.toISOString(),
      finalized_at: row.finalized_at ? row.finalized_at.toISOString() : null,
      item_count: Number(row.item_count ?? 0),
      diff_item_count: Number(row.diff_item_count ?? 0),
    })),
  );
}

/**
 * Fetches active (`IN_PROGRESS`) stock opname detail including item rows.
 */
export async function fetchActiveStockOpname(
  session?: Session,
): Promise<ActionResult<ActiveStockOpnameType | null>> {
  const scopeResult = session
    ? resolveActiveCompanyScopeFromSession(session)
    : await requireActiveCompanyScope();

  if (!scopeResult.ok) return scopeResult;

  const [activeOpname] = await db
    .select({
      stock_opname_id: stockOpnames.id,
      status: stockOpnames.status,
      note: stockOpnames.note,
      started_at: stockOpnames.started_at,
    })
    .from(stockOpnames)
    .where(
      and(
        eq(stockOpnames.company_id, scopeResult.data.company_id),
        eq(stockOpnames.status, STOCK_OPNAME_STATUS_IN_PROGRESS),
      ),
    )
    .orderBy(desc(stockOpnames.created_at))
    .limit(1);

  if (!activeOpname) return ok(null);

  const items = await db
    .select({
      stock_opname_item_id: stockOpnameItems.id,
      product_variant_id: stockOpnameItems.product_variant_id,
      product_label: products.name,
      variant_label: productVariants.name,
      system_qty: stockOpnameItems.system_qty,
      counted_qty: stockOpnameItems.counted_qty,
      diff_qty: stockOpnameItems.diff_qty,
    })
    .from(stockOpnameItems)
    .innerJoin(
      productVariants,
      eq(productVariants.id, stockOpnameItems.product_variant_id),
    )
    .innerJoin(products, eq(products.id, productVariants.product_id))
    .where(
      and(
        eq(stockOpnameItems.company_id, scopeResult.data.company_id),
        eq(stockOpnameItems.stock_opname_id, activeOpname.stock_opname_id),
      ),
    )
    .orderBy(products.name, productVariants.name);

  return ok({
    stock_opname_id: activeOpname.stock_opname_id,
    status: activeOpname.status,
    note: activeOpname.note,
    started_at: activeOpname.started_at.toISOString(),
    items: items.map((item) => ({
      stock_opname_item_id: item.stock_opname_item_id,
      product_variant_id: item.product_variant_id,
      product_label: item.product_label,
      variant_label: item.variant_label,
      system_qty: toNumber(item.system_qty),
      counted_qty: toNumber(item.counted_qty),
      diff_qty: toNumber(item.diff_qty),
    })),
  });
}
