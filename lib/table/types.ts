import { z } from 'zod';

/**
 * Shared (serializable) query types for table pagination/sorting/search.
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
