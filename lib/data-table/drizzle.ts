import 'server-only';

import { asc, desc, ilike, or } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { SQLWrapper } from 'drizzle-orm/sql/sql';

import type { DataTableQuery } from './types';

export type DataTableOrderByMap = Record<string, SQLWrapper>;
export type DataTableIlikeColumn = Parameters<typeof ilike>[0];

/**
 * Gets a normalized search term from a `DataTableQuery`.
 *
 * Priority:
 * 1) `globalFilter` (trimmed)
 * 2) first `columnFilters[].value` when it is a string
 */
export function getDataTableSearchTerm(query: DataTableQuery): string {
  const global = query.globalFilter.trim();
  if (global) return global;

  const first = query.columnFilters[0]?.value;
  return typeof first === 'string' ? first.trim() : '';
}

/**
 * Builds a case-insensitive `ILIKE` search clause across multiple columns.
 *
 * Returns `undefined` when the term is empty, so it can be safely passed into
 * `and(...)` or used as `.where(...)` conditionally.
 */
export function buildDataTableIlikeSearch(
  term: string,
  columns: DataTableIlikeColumn[],
): SQL | undefined {
  const search = term.trim();
  if (!search) return undefined;
  if (columns.length === 0) return undefined;

  const like = `%${search}%`;
  const filters = columns.map((col) => ilike(col, like));

  return filters.length === 1 ? filters[0] : or(...filters);
}

/**
 * Resolves Drizzle `orderBy(...)` clauses from a serializable sorting payload.
 *
 * Unknown sort ids are ignored. If the resolved list is empty, this falls back
 * to `defaultSorting`.
 */
export function getDataTableOrderBy(
  sorting: DataTableQuery['sorting'],
  columnMap: DataTableOrderByMap,
  defaultSorting: DataTableQuery['sorting'] = [],
): SQL[] {
  const resolve = (items: DataTableQuery['sorting']): SQL[] =>
    items
      .map((s) => {
        const col = columnMap[s.id];
        if (!col) return null;
        return s.desc ? desc(col) : asc(col);
      })
      .filter((value): value is SQL => Boolean(value));

  const effective = sorting.length > 0 ? sorting : defaultSorting;
  const resolved = resolve(effective);
  if (resolved.length > 0) return resolved;

  return resolve(defaultSorting);
}
