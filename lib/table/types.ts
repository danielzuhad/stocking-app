import { z } from 'zod';

/**
 * Shared (serializable) query types for server-driven table pagination.
 */

/** Query payload for server-driven tables. */
export type DataTableQuery = {
  pageIndex: number;
  pageSize: number;
};

export const dataTableQuerySchema = z.object({
  pageIndex: z.number().int().min(0),
  pageSize: z.number().int().positive().max(500),
});

type DataTableQueryWithSearchSchemaOptionsType = {
  maxLength?: number;
};

/**
 * Builds a shared query schema for table endpoints that support optional `q` text search.
 */
export function createDataTableQueryWithSearchSchema(
  options?: DataTableQueryWithSearchSchemaOptionsType,
) {
  const maxLength = options?.maxLength ?? 100;
  return dataTableQuerySchema.extend({
    q: z.string().trim().max(maxLength).optional(),
  });
}
