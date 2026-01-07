import { z } from 'zod';

/**
 * Shared (serializable) query types for TanStack DataTable.
 *
 * Use these types for:
 * - client-side fetchers
 * - server actions / route handlers
 *
 * Avoid importing TanStack types into server-only modules.
 */

/** Single sorting instruction (compatible with TanStack `SortingState`). */
export type DataTableSorting = Array<{
  id: string;
  desc?: boolean;
}>;

/** Single column filter (compatible with TanStack `ColumnFiltersState`). */
export type DataTableColumnFilters = Array<{
  id: string;
  value: unknown;
}>;

/** Query payload for server-driven tables. */
export type DataTableQuery = {
  pageIndex: number;
  pageSize: number;
  sorting: DataTableSorting;
  globalFilter: string;
  columnFilters: DataTableColumnFilters;
};

/** Result payload for server-driven tables. */
export type DataTablePage<TData> = {
  rows: TData[];
  rowCount: number;
};

export const dataTableQuerySchema = z.object({
  pageIndex: z.number().int().min(0),
  pageSize: z.number().int().positive().max(500),
  sorting: z
    .array(
      z.object({
        id: z.string().min(1),
        desc: z.boolean().optional(),
      }),
    )
    .default([]),
  globalFilter: z.string().default(''),
  columnFilters: z
    .array(
      z.object({
        id: z.string().min(1),
        value: z.unknown(),
      }),
    )
    .default([]),
});

